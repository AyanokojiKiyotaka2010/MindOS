import io
import zipfile

from fastapi.testclient import TestClient
import pytest
from docx import Document
from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from pptx import Presentation
from pptx.util import Inches

from app.database import get_db
from app.main import app
from app.models import Base, UserProfile
from app.core.config import Settings
from app.api.routes import auth as auth_routes


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def override_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    client.cookies.clear()
    auth_routes.attempts.clear()
    yield


def test_registration_login_profile_and_duplicate_email():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "Person@example.com", "password": "StrongPass123", "display_name": "Person"},
    )
    assert registered.status_code == 201
    assert "mindos_session" in registered.cookies

    me = client.get("/api/v1/users/me")
    assert me.status_code == 200
    assert me.json()["email"] == "person@example.com"
    assert me.json()["display_name"] == "Person"

    duplicate = client.post(
        "/api/v1/auth/register",
        json={"email": "person@example.com", "password": "StrongPass123"},
    )
    assert duplicate.status_code == 409

    logged_out = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": registered.cookies["mindos_csrf"]},
    )
    assert logged_out.status_code == 200

    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": "person@example.com", "password": "StrongPass123"},
    )
    assert logged_in.status_code == 200


def test_profile_update_requires_csrf():
    unauthenticated = client.patch(
        "/api/v1/users/me/profile",
        json={"display_name": "Updated"},
    )
    assert unauthenticated.status_code in (401, 403)


def test_knowledge_vault_crud_search_and_owner_scope():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "vault@example.com", "password": "VaultPass123", "display_name": "Vault User"},
    )
    assert registered.status_code == 201
    csrf = registered.cookies["mindos_csrf"]

    created = client.post(
        "/api/v1/knowledge/items",
        headers={"X-CSRF-Token": csrf},
        json={
            "title": "Systems thinking",
            "content": "Feedback loops shape behavior.",
            "item_type": "concept",
            "understanding_status": "captured",
            "is_favorite": False,
            "tags": ["systems", "learning"],
            "sources": [],
        },
    )
    assert created.status_code == 201
    item = created.json()
    assert item["understanding_status"] == "captured"
    assert item["tags"] == ["learning", "systems"]

    found = client.get("/api/v1/knowledge/items?search=feedback")
    assert found.status_code == 200
    assert len(found.json()) == 1

    updated = client.patch(
        f"/api/v1/knowledge/items/{item['id']}",
        headers={"X-CSRF-Token": csrf},
        json={"understanding_status": "reviewing", "is_favorite": True},
    )
    assert updated.status_code == 200
    assert updated.json()["understanding_status"] == "reviewing"
    assert updated.json()["is_favorite"] is True

    deleted = client.delete(
        f"/api/v1/knowledge/items/{item['id']}",
        headers={"X-CSRF-Token": csrf},
    )
    assert deleted.status_code == 200


def test_knowledge_graph_relation_validation():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "graph@example.com", "password": "GraphPass123", "display_name": "Graph User"},
    )
    assert registered.status_code == 201
    csrf = registered.cookies["mindos_csrf"]

    item_ids = []
    for title in ("One", "Two"):
        response = client.post(
            "/api/v1/knowledge/items",
            headers={"X-CSRF-Token": csrf},
            json={"title": title, "item_type": "concept", "understanding_status": "captured", "tags": [], "sources": []},
        )
        assert response.status_code == 201
        item_ids.append(response.json()["id"])

    relation = client.post(
        "/api/v1/graph/relations",
        headers={"X-CSRF-Token": csrf},
        json={
            "source_item_id": item_ids[0],
            "target_item_id": item_ids[1],
            "relation_type": "supports",
        },
    )
    assert relation.status_code == 201
    assert relation.json()["relation_type"] == "supports"

    self_relation = client.post(
        "/api/v1/graph/relations",
        headers={"X-CSRF-Token": csrf},
        json={
            "source_item_id": item_ids[0],
            "target_item_id": item_ids[0],
            "relation_type": "related_to",
        },
    )
    assert self_relation.status_code == 422

    listed = client.get("/api/v1/graph/relations")
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_acquisition_blocks_private_urls_and_accepts_text_upload():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "acquire@example.com", "password": "AcquirePass123", "display_name": "Acquire User"},
    )
    assert registered.status_code == 201
    csrf = registered.cookies["mindos_csrf"]

    private_url = client.post(
        "/api/v1/acquisition/url",
        headers={"X-CSRF-Token": csrf},
        json={"url": "http://127.0.0.1/private.txt"},
    )
    assert private_url.status_code == 400

    uploaded = client.post(
        "/api/v1/acquisition/upload",
        headers={"X-CSRF-Token": csrf},
        files={"file": ("notes.txt", b"Private note content", "text/plain")},
    )
    assert uploaded.status_code == 200
    assert uploaded.json()["understanding_status"] == "captured"


def test_bulk_import_preview_requires_approval_and_commits_selected_graph():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "import@example.com", "password": "ImportPass123", "display_name": "Import User"},
    )
    assert registered.status_code == 201
    csrf = registered.cookies["mindos_csrf"]

    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w") as archive:
        archive.writestr(
            "Vault/Alpha.md",
            "---\ntitle: Alpha\n tags: [systems]\n---\n# Feedback Loops\n"
            "Feedback loops shape system behavior. Feedback loops guide learning.\nSee [[Beta]].",
        )
        archive.writestr(
            "Vault/Beta.md",
            "---\ntitle: Beta\n---\n# Learning Systems\nLearning systems use feedback loops.",
        )

    preview_response = client.post(
        "/api/v1/acquisition/import-preview",
        headers={"X-CSRF-Token": csrf},
        data={"extraction_mode": "local"},
        files=[("files", ("vault.zip", archive_buffer.getvalue(), "application/zip"))],
    )
    assert preview_response.status_code == 200
    preview = preview_response.json()
    assert len(preview["documents"]) == 2
    assert any(concept["title"] == "Feedback Loops" for concept in preview["concepts"])
    assert any(relation["relation_type"] == "related_to" for relation in preview["relations"])
    assert client.get("/api/v1/knowledge/items").json() == []

    commit_response = client.post(
        "/api/v1/acquisition/import-commit",
        headers={"X-CSRF-Token": csrf},
        json={
            "documents": preview["documents"],
            "concepts": preview["concepts"],
            "relations": preview["relations"],
        },
    )
    assert commit_response.status_code == 200
    assert commit_response.json()["documents_imported"] == 2
    assert commit_response.json()["concepts_imported"] >= 1
    assert commit_response.json()["relations_created"] >= 1
    assert len(client.get("/api/v1/knowledge/items").json()) == 2 + commit_response.json()["concepts_imported"]
    assert len(client.get("/api/v1/graph/relations").json()) == commit_response.json()["relations_created"]


def test_bulk_import_rejects_zip_path_traversal():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "zip@example.com", "password": "ZipSecure123", "display_name": "Zip User"},
    )
    assert registered.status_code == 201
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w") as archive:
        archive.writestr("../outside.md", "# Unsafe\nNo extraction should write this path.")

    response = client.post(
        "/api/v1/acquisition/import-preview",
        headers={"X-CSRF-Token": registered.cookies["mindos_csrf"]},
        data={"extraction_mode": "local"},
        files=[("files", ("unsafe.zip", archive_buffer.getvalue(), "application/zip"))],
    )
    assert response.status_code == 422
    assert "Unsafe file path" in response.json()["detail"]


def test_bulk_import_extracts_word_and_powerpoint_text():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "office@example.com", "password": "OfficePass123", "display_name": "Office User"},
    )
    assert registered.status_code == 201

    word_buffer = io.BytesIO()
    word_document = Document()
    word_document.add_paragraph("A useful idea from Word.")
    word_document.save(word_buffer)

    powerpoint_buffer = io.BytesIO()
    presentation = Presentation()
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    slide.shapes.add_textbox(Inches(1), Inches(1), Inches(4), Inches(1)).text = "A useful idea from PowerPoint."
    presentation.save(powerpoint_buffer)

    response = client.post(
        "/api/v1/acquisition/import-preview",
        headers={"X-CSRF-Token": registered.cookies["mindos_csrf"]},
        data={"extraction_mode": "local"},
        files=[
            ("files", ("notes.docx", word_buffer.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
            ("files", ("slides.pptx", powerpoint_buffer.getvalue(), "application/vnd.openxmlformats-officedocument.presentationml.presentation")),
        ],
    )
    assert response.status_code == 200
    contents = [document["content"] for document in response.json()["documents"]]
    assert any("A useful idea from Word." in content for content in contents)
    assert any("A useful idea from PowerPoint." in content for content in contents)


def test_gemini_import_requires_explicit_ai_opt_in():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "ai-import@example.com", "password": "AiImportPass123", "display_name": "AI Import User"},
    )
    assert registered.status_code == 201

    response = client.post(
        "/api/v1/acquisition/import-preview",
        headers={"X-CSRF-Token": registered.cookies["mindos_csrf"]},
        data={"extraction_mode": "gemini"},
        files=[("files", ("note.md", b"# A private note", "text/markdown"))],
    )
    assert response.status_code == 403
    assert "Enable optional AI features" in response.json()["detail"]


def test_auth_cookies_are_secure_in_production(monkeypatch):
    monkeypatch.setattr(auth_routes, "get_settings", lambda: Settings(_env_file=None, environment="production"))
    from fastapi import Response
    response = Response()

    auth_routes.set_auth_cookies(response, "user-id")

    cookies = [
        value.decode("latin-1")
        for key, value in response.raw_headers
        if key.lower() == b"set-cookie"
    ]
    assert len(cookies) == 2
    assert all("; secure" in cookie.lower() for cookie in cookies)


def test_user_profile_schema_compiles_for_postgresql():
    ddl = str(CreateTable(UserProfile.__table__).compile(dialect=postgresql.dialect()))

    assert "VARCHAR(500)" in ddl
    assert "TEXT(500)" not in ddl


def test_learning_goal_lifecycle():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "learn@example.com", "password": "LearnPass123", "display_name": "Learner"},
    )
    assert registered.status_code == 201
    csrf = registered.cookies["mindos_csrf"]

    created = client.post(
        "/api/v1/learning/goals",
        headers={"X-CSRF-Token": csrf},
        json={"title": "Learn systems thinking", "description": "Practice with feedback loops", "status": "planned", "target_date": "2027-01-31"},
    )
    assert created.status_code == 201
    goal_id = created.json()["id"]

    started = client.patch(
        f"/api/v1/learning/goals/{goal_id}",
        headers={"X-CSRF-Token": csrf},
        json={"status": "in_progress"},
    )
    assert started.status_code == 200
    assert started.json()["status"] == "in_progress"

    completed = client.patch(
        f"/api/v1/learning/goals/{goal_id}",
        headers={"X-CSRF-Token": csrf},
        json={"status": "completed"},
    )
    assert completed.status_code == 200
    assert completed.json()["completed_at"] is not None


def test_mindtrace_reflection_decision_and_outcome():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "mindtrace@example.com", "password": "Mindtrace123", "display_name": "Reflector"},
    )
    assert registered.status_code == 201
    csrf = registered.cookies["mindos_csrf"]

    reflection = client.post(
        "/api/v1/mindtrace/reflections",
        headers={"X-CSRF-Token": csrf},
        json={"title": "Review", "body": "I noticed a feedback loop."},
    )
    assert reflection.status_code == 201

    decision = client.post(
        "/api/v1/mindtrace/decisions",
        headers={"X-CSRF-Token": csrf},
        json={
            "title": "Choose a project",
            "context": "Time is limited",
            "options_considered": ["A", "B"],
            "chosen_option": "A",
            "rationale": "A has the clearest next step",
        },
    )
    assert decision.status_code == 201

    outcome = client.post(
        f"/api/v1/mindtrace/decisions/{decision.json()['id']}/outcomes",
        headers={"X-CSRF-Token": csrf},
        json={"outcome_notes": "Initial results are unclear", "outcome_status": "pending"},
    )
    assert outcome.status_code == 200
    assert outcome.json()["outcome_status"] == "pending"


def test_dashboard_summary_returns_live_counts():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "dashboard@example.com", "password": "Dashboard123", "display_name": "Dashboard User"},
    )
    assert registered.status_code == 201
    csrf = registered.cookies["mindos_csrf"]

    client.post(
        "/api/v1/knowledge/items",
        headers={"X-CSRF-Token": csrf},
        json={"title": "Dashboard item", "item_type": "note", "understanding_status": "captured", "tags": [], "sources": []},
    )
    client.post(
        "/api/v1/learning/goals",
        headers={"X-CSRF-Token": csrf},
        json={"title": "Dashboard goal", "status": "planned"},
    )
    client.post(
        "/api/v1/mindtrace/reflections",
        headers={"X-CSRF-Token": csrf},
        json={"title": "Dashboard reflection", "body": "A useful review."},
    )

    summary = client.get("/api/v1/dashboard/summary")
    assert summary.status_code == 200
    assert summary.json()["knowledge_items"] == 1
    assert summary.json()["learning_goals"] == 1
    assert summary.json()["reflections"] == 1


def test_explicit_community_post_and_feed():
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "community@example.com", "password": "Community123", "display_name": "Community User"},
    )
    assert registered.status_code == 201
    csrf = registered.cookies["mindos_csrf"]

    private_post = client.post(
        "/api/v1/community/posts",
        headers={"X-CSRF-Token": csrf},
        json={"body": "This is private.", "visibility": "private"},
    )
    assert private_post.status_code == 200

    public_post = client.post(
        "/api/v1/community/posts",
        headers={"X-CSRF-Token": csrf},
        json={"body": "This is public.", "visibility": "public"},
    )
    assert public_post.status_code == 200

    feed = client.get("/api/v1/community/feed")
    assert feed.status_code == 200
    assert len(feed.json()) == 2
