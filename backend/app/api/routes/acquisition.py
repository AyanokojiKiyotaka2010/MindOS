from pathlib import Path, PurePosixPath
from secrets import token_hex
from urllib.parse import unquote, urlparse

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.acquisition import validate_import_url
from app.core.config import get_settings
from app.integration_security import IntegrationEncryptionError, decrypt_integration_secret
from app.database import get_db
from app.import_pipeline import MAX_UPLOAD_BYTES, _normalize, create_import_preview
from app.models import (
    KnowledgeItem, KnowledgeItemType, KnowledgeRelation, KnowledgeRelationType,
    KnowledgeSource, Tag, UnderstandingStatus, User, UserIntegration,
)
from app.schemas import ImportCommitRequest
from app.security import get_current_user, require_csrf


router = APIRouter(prefix="/acquisition", tags=["Document Acquisition"])
UPLOAD_ROOT = Path(get_settings().private_upload_dir).resolve()
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
MAX_TOTAL_UPLOAD_BYTES = 50 * 1024 * 1024


@router.get("/import-capabilities")
def import_capabilities(user: User = Depends(get_current_user)):
    settings = get_settings()
    integrations = {
        integration.provider: integration
        for integration in user.integrations
    }
    providers = {
        "gemini": bool(settings.gemini_api_key or (
            integrations.get("gemini") and integrations["gemini"].encrypted_secret
        )),
        "openai": bool(integrations.get("openai") and integrations["openai"].encrypted_secret),
        "anthropic": bool(integrations.get("anthropic") and integrations["anthropic"].encrypted_secret),
    }
    return {
        "ai_features_enabled": bool(user.settings and user.settings.ai_features_enabled),
        "gemini_available": providers["gemini"],
        "providers": providers,
    }


@router.post("/import-preview")
async def import_preview(
    request: Request,
    files: list[UploadFile] = File(...),
    extraction_mode: str = Form(default="local"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    if not files:
        raise HTTPException(status_code=422, detail="Choose at least one file to import")
    if len(files) > 100:
        raise HTTPException(status_code=413, detail="An import may contain at most 100 uploaded files")
    settings = get_settings()
    provider_api_key = None
    if extraction_mode in {"gemini", "openai", "anthropic"}:
        if not user.settings or not user.settings.ai_features_enabled:
            raise HTTPException(status_code=403, detail="Enable optional AI features in your profile before using an AI provider")
        integration = db.query(UserIntegration).filter(
            UserIntegration.user_id == user.id,
            UserIntegration.provider == extraction_mode,
        ).first()
        if integration and integration.encrypted_secret:
            try:
                provider_api_key = decrypt_integration_secret(integration.encrypted_secret)
            except IntegrationEncryptionError as error:
                raise HTTPException(status_code=503, detail=str(error)) from error
        elif extraction_mode == "gemini":
            provider_api_key = settings.gemini_api_key or None
        if not provider_api_key:
            raise HTTPException(status_code=503, detail=f"{extraction_mode.title()} is not configured for this account")
    elif extraction_mode != "local":
        raise HTTPException(status_code=422, detail="Choose local, Gemini, OpenAI, or Anthropic extraction")

    uploads: list[tuple[str, bytes]] = []
    total_upload_bytes = 0
    for uploaded_file in files:
        content = await uploaded_file.read(MAX_UPLOAD_BYTES + 1)
        total_upload_bytes += len(content)
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"{uploaded_file.filename or 'File'} exceeds the 25 MB per-file limit")
        if total_upload_bytes > MAX_TOTAL_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="An import may contain at most 50 MB of uploaded files")
        uploads.append((uploaded_file.filename or "imported-document", content))

    existing_titles = {_normalize(title) for (title,) in db.query(KnowledgeItem.title).filter(KnowledgeItem.user_id == user.id).all()}
    return await create_import_preview(
        uploads,
        extraction_mode,
        existing_titles,
        gemini_api_key=settings.gemini_api_key if extraction_mode == "gemini" else None,
        gemini_model=settings.gemini_model,
        provider_api_key=provider_api_key,
        provider_models={
            "openai": settings.openai_model,
            "anthropic": settings.anthropic_model,
        },
    )


@router.post("/import-commit")
def commit_import(
    payload: ImportCommitRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    if not payload.documents and not payload.concepts:
        raise HTTPException(status_code=422, detail="Select at least one document or concept to import")

    entries = [*payload.documents, *payload.concepts]
    draft_ids = [entry.draft_id for entry in entries]
    if len(draft_ids) != len(set(draft_ids)):
        raise HTTPException(status_code=422, detail="Import draft identifiers must be unique")
    if any(len(tag.strip()) > 50 for entry in entries for tag in entry.tags):
        raise HTTPException(status_code=422, detail="Tag names must be 50 characters or fewer")
    selected_ids = set(draft_ids)
    relation_keys: set[tuple[str, str, str]] = set()
    for relation in payload.relations:
        if relation.source_draft_id not in selected_ids or relation.target_draft_id not in selected_ids:
            raise HTTPException(status_code=422, detail="Every selected connection must point to an imported document or concept")
        if relation.source_draft_id == relation.target_draft_id:
            raise HTTPException(status_code=422, detail="An item cannot relate to itself")
        key = (relation.source_draft_id, relation.target_draft_id, relation.relation_type)
        if key in relation_keys:
            raise HTTPException(status_code=422, detail="Duplicate connections were included in the import")
        relation_keys.add(key)

    item_by_draft_id: dict[str, KnowledgeItem] = {}
    for document in payload.documents:
        item = KnowledgeItem(
            user_id=user.id,
            title=document.title,
            content=document.content,
            item_type=KnowledgeItemType(document.item_type),
            understanding_status=UnderstandingStatus.captured,
        )
        db.add(item)
        db.flush()
        item_by_draft_id[document.draft_id] = item
        filename = PurePosixPath(document.source_name.replace("\\", "/")).name[:255]
        db.add(KnowledgeSource(
            knowledge_item_id=item.id,
            source_type="file",
            source_title=document.source_name[:255],
            original_filename=filename,
            mime_type=None,
            file_size_bytes=document.source_size_bytes,
        ))
        _attach_import_tags(db, user.id, item, document.tags)

    for concept in payload.concepts:
        item = KnowledgeItem(
            user_id=user.id,
            title=concept.title,
            content=concept.description,
            item_type=KnowledgeItemType.concept,
            understanding_status=UnderstandingStatus.captured,
        )
        db.add(item)
        db.flush()
        item_by_draft_id[concept.draft_id] = item
        db.add(KnowledgeSource(
            knowledge_item_id=item.id,
            source_type="other",
            source_title="Imported concept",
        ))
        _attach_import_tags(db, user.id, item, concept.tags)

    for relation in payload.relations:
        db.add(KnowledgeRelation(
            user_id=user.id,
            source_item_id=item_by_draft_id[relation.source_draft_id].id,
            target_item_id=item_by_draft_id[relation.target_draft_id].id,
            relation_type=KnowledgeRelationType(relation.relation_type),
            note=relation.note,
        ))
    db.commit()
    return {
        "documents_imported": len(payload.documents),
        "concepts_imported": len(payload.concepts),
        "relations_created": len(payload.relations),
    }


def _attach_import_tags(db: Session, user_id: str, item: KnowledgeItem, names: list[str]) -> None:
    for name in sorted({value.strip() for value in names if value.strip()}):
        tag = db.query(Tag).filter(Tag.user_id == user_id, Tag.name == name).first()
        if tag is None:
            tag = Tag(user_id=user_id, name=name)
            db.add(tag)
            db.flush()
        item.tags.append(tag)


@router.post("/url")
async def import_url(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    raw_url = payload.get("url")
    if not isinstance(raw_url, str):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="URL is required")
    url = validate_import_url(raw_url)

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            response = await client.get(url, headers={"User-Agent": "MINDOS/1.0"})
    except httpx.HTTPError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to fetch URL")
    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Source URL returned an error")
    content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
    if content_type not in {"text/plain", "text/markdown", "text/html"}:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only text, Markdown, or HTML URLs are supported")

    body = response.content[:2_000_000]
    text = body.decode("utf-8", errors="replace")
    title = unquote(Path(urlparse(url).path).name) or urlparse(url).netloc or "Imported document"

    item = KnowledgeItem(
        user_id=user.id,
        title=title[:255],
        content=text,
        item_type=KnowledgeItemType.resource,
        understanding_status=UnderstandingStatus.captured,
    )
    db.add(item)
    db.flush()
    db.add(KnowledgeSource(
        knowledge_item_id=item.id,
        source_type="url",
        source_title=title[:255],
        source_url=url,
        mime_type=content_type,
        file_size_bytes=len(body),
    ))
    db.commit()
    db.refresh(item)
    return {"id": item.id, "title": item.title, "understanding_status": "captured"}


@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    allowed_types = {"text/plain", "text/markdown", "application/pdf"}
    filename = Path(file.filename or "uploaded-file").name
    mime_type = file.content_type or "application/octet-stream"
    if mime_type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only text, Markdown, and PDF uploads are supported")

    body = await file.read(2_000_001)
    if len(body) > 2_000_000:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Maximum upload size is 2 MB")
    storage_key = f"{user.id}/{token_hex(16)}-{filename}"
    target = UPLOAD_ROOT / storage_key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(body)

    text = body.decode("utf-8", errors="replace") if mime_type != "application/pdf" else None
    item = KnowledgeItem(
        user_id=user.id,
        title=filename[:255],
        content=text,
        item_type=KnowledgeItemType.resource,
        understanding_status=UnderstandingStatus.captured,
    )
    db.add(item)
    db.flush()
    db.add(KnowledgeSource(
        knowledge_item_id=item.id,
        source_type="file",
        source_title=filename[:255],
        original_filename=filename[:255],
        mime_type=mime_type,
        file_size_bytes=len(body),
        storage_key=storage_key,
    ))
    db.commit()
    db.refresh(item)
    return {"id": item.id, "title": item.title, "understanding_status": "captured"}
