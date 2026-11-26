from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import KnowledgeItem, KnowledgeItemType, KnowledgeSource, Tag, UnderstandingStatus, User
from app.schemas import KnowledgeItemCreate, KnowledgeItemResponse, KnowledgeItemUpdate
from app.security import get_current_user, require_csrf


router = APIRouter(prefix="/knowledge", tags=["Knowledge Vault"])


def serialize_item(item: KnowledgeItem) -> KnowledgeItemResponse:
    return KnowledgeItemResponse(
        id=item.id,
        title=item.title,
        content=item.content,
        item_type=item.item_type.value,
        understanding_status=item.understanding_status.value,
        is_favorite=item.is_favorite,
        is_archived=item.is_archived,
        captured_at=item.captured_at.isoformat(),
        tags=sorted(tag.name for tag in item.tags),
        sources=[
            {
                "id": source.id,
                "source_type": source.source_type,
                "source_title": source.source_title,
                "source_url": source.source_url,
                "original_filename": source.original_filename,
                "mime_type": source.mime_type,
                "file_size_bytes": source.file_size_bytes,
                "storage_key": source.storage_key,
            }
            for source in item.sources
        ],
    )


@router.get("/items", response_model=list[KnowledgeItemResponse])
def list_items(
    search: str | None = Query(default=None, max_length=200),
    include_archived: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(KnowledgeItem).filter(KnowledgeItem.user_id == user.id)
    if not include_archived:
        query = query.filter(KnowledgeItem.is_archived == False)
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(KnowledgeItem.title.ilike(pattern), KnowledgeItem.content.ilike(pattern)))
    items = query.order_by(KnowledgeItem.updated_at.desc()).all()
    return [serialize_item(item) for item in items]


@router.post("/items", response_model=KnowledgeItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: KnowledgeItemCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    item = KnowledgeItem(
        user_id=user.id,
        title=payload.title,
        content=payload.content,
        item_type=KnowledgeItemType(payload.item_type),
        understanding_status=UnderstandingStatus(payload.understanding_status),
        is_favorite=payload.is_favorite,
    )
    db.add(item)
    db.flush()

    for source_payload in payload.sources:
        db.add(KnowledgeSource(
            knowledge_item_id=item.id,
            source_type=source_payload.source_type,
            source_title=source_payload.source_title,
            source_url=source_payload.source_url,
            original_filename=source_payload.original_filename,
            mime_type=source_payload.mime_type,
            file_size_bytes=source_payload.file_size_bytes,
            storage_key=source_payload.storage_key,
        ))

    for name in sorted({name.strip() for name in payload.tags if name.strip()}):
        if len(name) > 50:
            raise HTTPException(status_code=422, detail="Tag names must be 50 characters or fewer")
        tag = db.query(Tag).filter(Tag.user_id == user.id, Tag.name == name).first()
        if tag is None:
            tag = Tag(user_id=user.id, name=name)
            db.add(tag)
            db.flush()
        item.tags.append(tag)

    db.commit()
    db.refresh(item)
    return serialize_item(item)


@router.get("/items/{item_id}", response_model=KnowledgeItemResponse)
def get_item(item_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(KnowledgeItem).filter(KnowledgeItem.id == item_id, KnowledgeItem.user_id == user.id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    return serialize_item(item)


@router.patch("/items/{item_id}", response_model=KnowledgeItemResponse)
def update_item(
    item_id: str,
    payload: KnowledgeItemUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    item = db.query(KnowledgeItem).filter(KnowledgeItem.id == item_id, KnowledgeItem.user_id == user.id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Knowledge item not found")

    if payload.title is not None:
        item.title = payload.title
    if payload.content is not None:
        item.content = payload.content
    if payload.item_type is not None:
        item.item_type = KnowledgeItemType(payload.item_type)
    if payload.understanding_status is not None:
        item.understanding_status = UnderstandingStatus(payload.understanding_status)
    if payload.is_favorite is not None:
        item.is_favorite = payload.is_favorite
    if payload.is_archived is not None:
        item.is_archived = payload.is_archived
    if payload.tags is not None:
        item.tags.clear()
        for name in sorted({name.strip() for name in payload.tags if name.strip()}):
            if len(name) > 50:
                raise HTTPException(status_code=422, detail="Tag names must be 50 characters or fewer")
            tag = db.query(Tag).filter(Tag.user_id == user.id, Tag.name == name).first()
            if tag is None:
                tag = Tag(user_id=user.id, name=name)
                db.add(tag)
                db.flush()
            item.tags.append(tag)

    db.commit()
    db.refresh(item)
    return serialize_item(item)


@router.delete("/items/{item_id}")
def delete_item(
    item_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    item = db.query(KnowledgeItem).filter(KnowledgeItem.id == item_id, KnowledgeItem.user_id == user.id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
