from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import AccountStatus, User
from app.database import get_db


password_hasher = PasswordHasher()
settings = get_settings()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
        "jti": token_urlsafe(24),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm=settings.auth_algorithm)


def decode_access_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.auth_secret, algorithms=[settings.auth_algorithm])
        user_id = payload.get("sub")
        if not isinstance(user_id, str):
            raise ValueError
        return user_id
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("mindos_session")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user_id = decode_access_token(token)
    user = db.get(User, user_id)
    if user is None or user.account_status == AccountStatus.deleted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if user.account_status == AccountStatus.suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    return user


def require_csrf(request: Request) -> None:
    cookie = request.cookies.get("mindos_csrf")
    header = request.headers.get("X-CSRF-Token")
    if not cookie or not header or not secrets_compare(cookie, header):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")


def secrets_compare(left: str, right: str) -> bool:
    from hmac import compare_digest
    return compare_digest(left, right)
