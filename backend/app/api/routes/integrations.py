import json
import re
from datetime import date, datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.chess_analytics import analyze_pgn, fetch_chesscom_games, fetch_lichess_games, fetch_pgn_url
from app.database import get_db
from app.integration_security import (
    IntegrationEncryptionError,
    decrypt_integration_secret,
    encrypt_integration_secret,
    integration_encryption_ready,
)
from app.models import (
    Decision,
    DecisionOutcome,
    KnowledgeItem,
    KnowledgeRelation,
    LearningGoal,
    Reflection,
    SocialFollow,
    SocialPost,
    User,
    UserIntegration,
)
from app.schemas import ChessAnalyticsRequest, ChessImportRequest, IntegrationUpdateRequest
from app.security import get_current_user, require_csrf


router = APIRouter(prefix="/users/me", tags=["Settings and Integrations"])
AI_PROVIDERS = {"gemini", "openai", "anthropic"}
CHESS_PROVIDERS = {"chesscom", "lichess"}
ALL_PROVIDERS = AI_PROVIDERS | CHESS_PROVIDERS


@router.get("/integrations")
def list_integrations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    records = {
        record.provider: record
        for record in db.query(UserIntegration).filter(UserIntegration.user_id == user.id).all()
    }
    server_gemini_available = bool(get_settings().gemini_api_key)
    providers = []
    for provider in sorted(AI_PROVIDERS):
        record = records.get(provider)
        has_user_key = bool(record and record.encrypted_secret)
        providers.append({
            "provider": provider,
            "configured": has_user_key or (provider == "gemini" and server_gemini_available),
            "user_key_saved": has_user_key,
            "server_key_available": provider == "gemini" and server_gemini_available,
        })
    chess = []
    for provider in sorted(CHESS_PROVIDERS):
        record = records.get(provider)
        chess.append({
            "provider": provider,
            "connected": bool(record and record.username),
            "username": record.username if record else None,
            "access_token_saved": bool(record and record.encrypted_secret) if provider == "lichess" else False,
        })
    return {
        "ai_key_storage_available": integration_encryption_ready(),
        "ai_features_enabled": bool(user.settings and user.settings.ai_features_enabled),
        "providers": providers,
        "chess_accounts": chess,
    }


@router.put("/integrations/{provider}")
def save_integration(
    provider: str,
    payload: IntegrationUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    if provider not in ALL_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration provider is not supported")

    secret: str | None = None
    username: str | None = None
    if provider in AI_PROVIDERS:
        secret = (payload.secret or "").strip()
        if not secret:
            raise HTTPException(status_code=422, detail="An API key is required")
    else:
        username = (payload.username or "").strip()
        if not re.fullmatch(r"[A-Za-z0-9_-]{2,64}", username):
            raise HTTPException(status_code=422, detail="Enter a valid Chess.com or Lichess username")
        if provider == "chesscom" and payload.secret:
            raise HTTPException(status_code=422, detail="Chess.com public game data does not require an API key")
        secret = (payload.secret or "").strip() or None

    if secret:
        try:
            encrypted_secret = encrypt_integration_secret(secret)
        except IntegrationEncryptionError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
    else:
        encrypted_secret = None

    record = db.query(UserIntegration).filter(
        UserIntegration.user_id == user.id,
        UserIntegration.provider == provider,
    ).first()
    if record is None:
        record = UserIntegration(user_id=user.id, provider=provider)
        db.add(record)
    if username is not None:
        record.username = username
    if encrypted_secret is not None:
        record.encrypted_secret = encrypted_secret
    db.commit()
    return {"provider": provider, "connected": True}


@router.delete("/integrations/{provider}")
def remove_integration(
    provider: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    if provider not in ALL_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Integration provider is not supported")
    db.query(UserIntegration).filter(
        UserIntegration.user_id == user.id,
        UserIntegration.provider == provider,
    ).delete(synchronize_session=False)
    db.commit()
    return {"provider": provider, "connected": False}


@router.post("/chess/analytics")
async def chess_account_analytics(
    payload: ChessAnalyticsRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    integration = db.query(UserIntegration).filter(
        UserIntegration.user_id == user.id,
        UserIntegration.provider == payload.provider,
    ).first()
    if not integration or not integration.username:
        raise HTTPException(status_code=404, detail=f"Connect a {payload.provider} username first")
    access_token = None
    if payload.provider == "lichess" and integration.encrypted_secret:
        try:
            access_token = decrypt_integration_secret(integration.encrypted_secret)
        except IntegrationEncryptionError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
    pgn = await (
        fetch_chesscom_games(integration.username)
        if payload.provider == "chesscom"
        else fetch_lichess_games(integration.username, access_token)
    )
    return analyze_pgn(pgn, integration.username)


@router.post("/chess/import")
async def import_chess_games(
    payload: ChessImportRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    if bool(payload.pgn) == bool(payload.url):
        raise HTTPException(status_code=422, detail="Provide either PGN text or a supported public chess URL")
    if not payload.username:
        raise HTTPException(status_code=422, detail="Enter your Chess.com or Lichess username to analyze your results")
    access_token = None
    if payload.url and urlparse(payload.url).hostname == "lichess.org" and urlparse(payload.url).path.startswith("/@/"):
        integration = db.query(UserIntegration).filter(
            UserIntegration.user_id == user.id,
            UserIntegration.provider == "lichess",
        ).first()
        if integration and integration.encrypted_secret:
            try:
                access_token = decrypt_integration_secret(integration.encrypted_secret)
            except IntegrationEncryptionError as error:
                raise HTTPException(status_code=503, detail=str(error)) from error
    pgn = payload.pgn if payload.pgn is not None else await fetch_pgn_url(payload.url or "", payload.username, access_token)
    return analyze_pgn(pgn, payload.username)


@router.get("/data-export")
def export_user_data(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = user.profile
    settings = user.settings
    items = db.query(KnowledgeItem).filter(KnowledgeItem.user_id == user.id).all()
    sources = []
    tags = {}
    item_tag_links = []
    for item in items:
        sources.extend(item.sources)
        for tag in item.tags:
            tags[tag.id] = tag
            item_tag_links.append({"knowledge_item_id": item.id, "tag_id": tag.id})
    relations = db.query(KnowledgeRelation).filter(KnowledgeRelation.user_id == user.id).all()
    goals = db.query(LearningGoal).filter(LearningGoal.user_id == user.id).all()
    reflections = db.query(Reflection).filter(Reflection.user_id == user.id).all()
    decisions = db.query(Decision).filter(Decision.user_id == user.id).all()
    decision_ids = [decision.id for decision in decisions]
    outcomes = (
        db.query(DecisionOutcome).filter(DecisionOutcome.decision_id.in_(decision_ids)).all()
        if decision_ids else []
    )
    posts = db.query(SocialPost).filter(SocialPost.user_id == user.id).all()
    follows = db.query(SocialFollow).filter(
        or_(SocialFollow.follower_id == user.id, SocialFollow.following_id == user.id)
    ).all()
    integrations = db.query(UserIntegration).filter(UserIntegration.user_id == user.id).all()

    export = {
        "format": "mindos-data-export-v1",
        "exported_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "account": {
            "id": user.id,
            "email": user.email,
            "account_status": user.account_status.value,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
        },
        "profile": _serialize(profile) if profile else None,
        "settings": _serialize(settings) if settings else None,
        "knowledge_items": [_serialize(item) for item in items],
        "knowledge_sources": [_serialize(source) for source in sources],
        "tags": [_serialize(tag) for tag in tags.values()],
        "knowledge_item_tags": item_tag_links,
        "knowledge_relations": [_serialize(relation) for relation in relations],
        "learning_goals": [_serialize(goal) for goal in goals],
        "reflections": [_serialize(reflection) for reflection in reflections],
        "decisions": [_serialize(decision) for decision in decisions],
        "decision_outcomes": [_serialize(outcome) for outcome in outcomes],
        "social_posts": [_serialize(post) for post in posts],
        "social_follows": [_serialize(follow) for follow in follows],
        "integrations": [
            {
                "provider": integration.provider,
                "username": integration.username,
                "credential_configured": bool(integration.encrypted_secret),
            }
            for integration in integrations
        ],
    }
    body = json.dumps(export, ensure_ascii=False, default=_json_value, indent=2)
    return Response(
        content=body,
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="mindos-data-export.json"',
            "Cache-Control": "no-store",
        },
    )


def _serialize(record) -> dict:
    return {column.name: getattr(record, column.name) for column in record.__table__.columns}


def _json_value(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")
