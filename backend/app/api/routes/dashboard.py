from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Decision,
    KnowledgeItem,
    KnowledgeRelation,
    LearningGoal,
    Reflection,
    User,
)
from app.security import get_current_user


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    knowledge_items = db.query(KnowledgeItem).filter(KnowledgeItem.user_id == user.id).count()
    active_knowledge = db.query(KnowledgeItem).filter(
        KnowledgeItem.user_id == user.id,
        KnowledgeItem.is_archived == False,
    ).count()
    understood = db.query(KnowledgeItem).filter(
        KnowledgeItem.user_id == user.id,
        KnowledgeItem.understanding_status == "understood",
    ).count()
    learning_goals = db.query(LearningGoal).filter(LearningGoal.user_id == user.id).count()
    active_goals = db.query(LearningGoal).filter(
        LearningGoal.user_id == user.id,
        LearningGoal.status.in_(["planned", "in_progress", "paused"]),
    ).count()
    reflections = db.query(Reflection).filter(Reflection.user_id == user.id).count()
    decisions = db.query(Decision).filter(Decision.user_id == user.id).count()
    relations = db.query(KnowledgeRelation).filter(KnowledgeRelation.user_id == user.id).count()

    return {
        "knowledge_items": knowledge_items,
        "active_knowledge": active_knowledge,
        "understood_knowledge": understood,
        "learning_goals": learning_goals,
        "active_learning_goals": active_goals,
        "reflections": reflections,
        "decisions": decisions,
        "relations": relations,
    }
