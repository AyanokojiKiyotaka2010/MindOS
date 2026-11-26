from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Decision, DecisionOutcome, DecisionOutcomeStatus, Reflection, User
from app.schemas import (
    DecisionCreate,
    DecisionOutcomeCreate,
    DecisionResponse,
    ReflectionCreate,
    ReflectionResponse,
)
from app.security import get_current_user, require_csrf


router = APIRouter(prefix="/mindtrace", tags=["Mindtrace"])


@router.get("/reflections", response_model=list[ReflectionResponse])
def list_reflections(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reflections = db.query(Reflection).filter(Reflection.user_id == user.id).order_by(Reflection.reflection_date.desc()).all()
    return [ReflectionResponse(id=item.id, title=item.title, body=item.body, reflection_date=item.reflection_date.isoformat()) for item in reflections]


@router.post("/reflections", response_model=ReflectionResponse, status_code=201)
def create_reflection(
    payload: ReflectionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    item = Reflection(user_id=user.id, title=payload.title, body=payload.body)
    db.add(item)
    db.commit()
    db.refresh(item)
    return ReflectionResponse(id=item.id, title=item.title, body=item.body, reflection_date=item.reflection_date.isoformat())


@router.get("/decisions", response_model=list[DecisionResponse])
def list_decisions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    decisions = db.query(Decision).filter(Decision.user_id == user.id).order_by(Decision.updated_at.desc()).all()
    return [
        DecisionResponse(
            id=item.id,
            title=item.title,
            context=item.context,
            options_considered=item.options_considered or [],
            chosen_option=item.chosen_option,
            rationale=item.rationale,
            decided_at=item.decided_at.isoformat() if item.decided_at else None,
        )
        for item in decisions
    ]


@router.post("/decisions", response_model=DecisionResponse, status_code=201)
def create_decision(
    payload: DecisionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    item = Decision(
        user_id=user.id,
        title=payload.title,
        context=payload.context,
        options_considered=payload.options_considered,
        chosen_option=payload.chosen_option,
        rationale=payload.rationale,
        decided_at=datetime.utcnow() if payload.chosen_option else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return DecisionResponse(
        id=item.id,
        title=item.title,
        context=item.context,
        options_considered=item.options_considered or [],
        chosen_option=item.chosen_option,
        rationale=item.rationale,
        decided_at=item.decided_at.isoformat() if item.decided_at else None,
    )


@router.post("/decisions/{decision_id}/outcomes")
def add_outcome(
    decision_id: str,
    payload: DecisionOutcomeCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    decision = db.query(Decision).filter(Decision.id == decision_id, Decision.user_id == user.id).first()
    if decision is None:
        raise HTTPException(status_code=404, detail="Decision not found")
    outcome = DecisionOutcome(
        decision_id=decision.id,
        outcome_notes=payload.outcome_notes,
        outcome_status=DecisionOutcomeStatus(payload.outcome_status),
    )
    db.add(outcome)
    db.commit()
    return {"status": "recorded", "outcome_status": outcome.outcome_status.value}
