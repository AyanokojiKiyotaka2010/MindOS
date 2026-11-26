from pathlib import Path
from secrets import token_hex
from urllib.parse import unquote, urlparse

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.acquisition import validate_import_url
from app.core.config import get_settings
from app.database import get_db
from app.models import KnowledgeItem, KnowledgeItemType, KnowledgeSource, UnderstandingStatus, User
from app.security import get_current_user, require_csrf


router = APIRouter(prefix="/acquisition", tags=["Document Acquisition"])
settings = get_settings()
UPLOAD_ROOT = Path(settings.private_upload_dir).resolve()
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


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
