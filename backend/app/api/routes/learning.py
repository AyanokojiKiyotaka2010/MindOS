from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LearningGoal, LearningGoalStatus, User
from app.schemas import LearningGoalCreate, LearningGoalResponse, LearningGoalUpdate
from app.security import get_current_user, require_csrf


router = APIRouter(prefix="/learning", tags=["Learning"])


def serialize_goal(goal: LearningGoal) -> LearningGoalResponse:
    return LearningGoalResponse(
        id=goal.id,
        title=goal.title,
        description=goal.description,
        status=goal.status.value,
        target_date=goal.target_date.isoformat() if goal.target_date else None,
        completed_at=goal.completed_at.isoformat() if goal.completed_at else None,
    )


@router.get("/goals", response_model=list[LearningGoalResponse])
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goals = db.query(LearningGoal).filter(LearningGoal.user_id == user.id).order_by(LearningGoal.updated_at.desc()).all()
    return [serialize_goal(goal) for goal in goals]


@router.post("/goals", response_model=LearningGoalResponse, status_code=201)
def create_goal(
    payload: LearningGoalCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    target_date = date.fromisoformat(payload.target_date) if payload.target_date else None
    goal = LearningGoal(
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        status=LearningGoalStatus(payload.status),
        target_date=target_date,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return serialize_goal(goal)


@router.patch("/goals/{goal_id}", response_model=LearningGoalResponse)
def update_goal(
    goal_id: str,
    payload: LearningGoalUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    goal = db.query(LearningGoal).filter(LearningGoal.id == goal_id, LearningGoal.user_id == user.id).first()
    if goal is None:
        raise HTTPException(status_code=404, detail="Learning goal not found")
    if payload.title is not None:
        goal.title = payload.title
    if payload.description is not None:
        goal.description = payload.description
    if payload.status is not None:
        goal.status = LearningGoalStatus(payload.status)
        goal.completed_at = datetime.utcnow() if goal.status == LearningGoalStatus.completed else None
    if payload.target_date is not None:
        goal.target_date = date.fromisoformat(payload.target_date) if payload.target_date else None
    db.commit()
    db.refresh(goal)
    return serialize_goal(goal)


@router.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    goal = db.query(LearningGoal).filter(LearningGoal.id == goal_id, LearningGoal.user_id == user.id).first()
    if goal is None:
        raise HTTPException(status_code=404, detail="Learning goal not found")
    db.delete(goal)
    db.commit()
    return {"status": "deleted"}
