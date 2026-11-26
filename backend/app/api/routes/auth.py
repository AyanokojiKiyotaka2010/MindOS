from datetime import datetime
from secrets import token_urlsafe
from time import monotonic
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.config import get_settings
from app.models import AccountStatus, ProfileVisibility, User, UserProfile, UserSettings
from app.schemas import LoginRequest, RegisterRequest
from app.security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["Authentication"])
attempts: dict[str, list[float]] = defaultdict(list)


def check_login_rate_limit(request: Request) -> None:
    key = request.client.host if request.client else "unknown"
    now = monotonic()
    recent = [attempt for attempt in attempts[key] if now - attempt < 900]
    attempts[key] = recent
    if len(recent) >= 10:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts")
    recent.append(now)


def set_auth_cookies(response: Response, user_id: str) -> None:
    secure = get_settings().environment.lower() == "production"
    response.set_cookie(
        "mindos_session",
        create_access_token(user_id),
        httponly=True,
        secure=secure,
        samesite="strict",
        max_age=60 * 60,
        path="/",
    )
    response.set_cookie(
        "mindos_csrf",
        token_urlsafe(32),
        httponly=False,
        secure=secure,
        samesite="strict",
        max_age=60 * 60,
        path="/",
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    check_login_rate_limit(request)
    email = str(payload.email).strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for this email")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        account_status=AccountStatus.active,
    )
    db.add(user)
    db.flush()
    db.add(UserProfile(
        user_id=user.id,
        display_name=payload.display_name or email.split("@", 1)[0],
    ))
    db.add(UserSettings(
        user_id=user.id,
        profile_visibility=ProfileVisibility.private,
    ))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists")
    db.refresh(user)

    set_auth_cookies(response, user.id)
    return {"status": "registered"}


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    check_login_rate_limit(request)
    email = str(payload.email).strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if user is None or not user.password_hash or not verify_password(user.password_hash, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if user.account_status == AccountStatus.suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    if user.account_status == AccountStatus.deleted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user.last_login_at = datetime.utcnow()
    db.commit()
    set_auth_cookies(response, user.id)
    return {"status": "authenticated"}


@router.post("/logout")
def logout(request: Request, response: Response):
    from app.security import require_csrf
    require_csrf(request)
    response.delete_cookie("mindos_session", path="/")
    response.delete_cookie("mindos_csrf", path="/")
    return {"status": "logged_out"}
