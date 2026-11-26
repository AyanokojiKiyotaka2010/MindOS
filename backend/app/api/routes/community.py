from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import KnowledgeItem, SocialFollow, SocialPost, SocialVisibility, User
from app.security import get_current_user, require_csrf


router = APIRouter(prefix="/community", tags=["Community"])


@router.get("/feed")
def feed(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    posts = db.query(SocialPost).filter(
        (SocialPost.user_id == user.id) | (SocialPost.visibility == SocialVisibility.public)
    ).order_by(SocialPost.created_at.desc()).all()
    return [
        {
            "id": post.id,
            "author_id": post.user_id,
            "body": post.body,
            "visibility": post.visibility.value,
            "created_at": post.created_at.isoformat(),
        }
        for post in posts
    ]


@router.post("/posts")
def create_post(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    body = str(payload.get("body", "")).strip()
    if not 1 <= len(body) <= 2000:
        raise HTTPException(status_code=422, detail="Post body must be 1 to 2000 characters")
    try:
        visibility = SocialVisibility(str(payload.get("visibility", "private")))
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid visibility")

    post = SocialPost(user_id=user.id, body=body, visibility=visibility)
    db.add(post)
    db.commit()
    db.refresh(post)
    return {
        "id": post.id,
        "author_id": post.user_id,
        "body": post.body,
        "visibility": post.visibility.value,
        "created_at": post.created_at.isoformat(),
    }


@router.post("/follow/{following_id}")
def follow(
    following_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    if following_id == user.id:
        raise HTTPException(status_code=422, detail="Cannot follow yourself")
    following = db.get(User, following_id)
    if following is None:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.get(SocialFollow, (user.id, following_id))
    if existing is None:
        db.add(SocialFollow(follower_id=user.id, following_id=following_id))
        db.commit()
    return {"status": "following"}


@router.delete("/follow/{following_id}")
def unfollow(
    following_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    existing = db.get(SocialFollow, (user.id, following_id))
    if existing:
        db.delete(existing)
        db.commit()
    return {"status": "unfollowed"}
