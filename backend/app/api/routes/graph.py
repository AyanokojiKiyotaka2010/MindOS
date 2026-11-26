from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import KnowledgeItem, KnowledgeRelation, KnowledgeRelationType, User
from app.schemas import KnowledgeRelationCreate, KnowledgeRelationResponse
from app.security import get_current_user, require_csrf


router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])


@router.get("/relations", response_model=list[KnowledgeRelationResponse])
def list_relations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    relations = db.query(KnowledgeRelation).filter(KnowledgeRelation.user_id == user.id).all()
    return [
        KnowledgeRelationResponse(
            id=relation.id,
            source_item_id=relation.source_item_id,
            target_item_id=relation.target_item_id,
            relation_type=relation.relation_type.value,
            note=relation.note,
        )
        for relation in relations
    ]


@router.post("/relations", response_model=KnowledgeRelationResponse, status_code=201)
def create_relation(
    payload: KnowledgeRelationCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    if payload.source_item_id == payload.target_item_id:
        raise HTTPException(status_code=422, detail="An item cannot relate to itself")

    item_ids = {payload.source_item_id, payload.target_item_id}
    owned_count = db.query(KnowledgeItem).filter(
        KnowledgeItem.user_id == user.id,
        KnowledgeItem.id.in_(item_ids),
    ).count()
    if owned_count != 2:
        raise HTTPException(status_code=404, detail="One or both knowledge items were not found")

    existing = db.query(KnowledgeRelation).filter(
        KnowledgeRelation.user_id == user.id,
        KnowledgeRelation.source_item_id == payload.source_item_id,
        KnowledgeRelation.target_item_id == payload.target_item_id,
        KnowledgeRelation.relation_type == KnowledgeRelationType(payload.relation_type),
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="This relation already exists")

    relation = KnowledgeRelation(
        user_id=user.id,
        source_item_id=payload.source_item_id,
        target_item_id=payload.target_item_id,
        relation_type=KnowledgeRelationType(payload.relation_type),
        note=payload.note,
    )
    db.add(relation)
    db.commit()
    db.refresh(relation)
    return KnowledgeRelationResponse(
        id=relation.id,
        source_item_id=relation.source_item_id,
        target_item_id=relation.target_item_id,
        relation_type=relation.relation_type.value,
        note=relation.note,
    )


@router.delete("/relations/{relation_id}")
def delete_relation(
    relation_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    relation = db.query(KnowledgeRelation).filter(
        KnowledgeRelation.id == relation_id,
        KnowledgeRelation.user_id == user.id,
    ).first()
    if relation is None:
        raise HTTPException(status_code=404, detail="Relation not found")
    db.delete(relation)
    db.commit()
    return {"status": "deleted"}
