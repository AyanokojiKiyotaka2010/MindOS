from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ProfileVisibility, User
from app.schemas import ProfileResponse, ProfileUpdateRequest, SettingsResponse, SettingsUpdateRequest
from app.security import get_current_user, require_csrf


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=ProfileResponse)
def get_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = user.profile
    return ProfileResponse(
        id=user.id,
        email=user.email,
        display_name=profile.display_name if profile else None,
        username=profile.username if profile else None,
        bio=profile.bio if profile else None,
        account_status=user.account_status.value,
    )


@router.patch("/me/profile", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    profile = user.profile
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    if payload.display_name is not None:
        profile.display_name = payload.display_name
    if payload.username is not None:
        profile.username = payload.username
    if payload.bio is not None:
        profile.bio = payload.bio

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already in use")
    db.refresh(profile)
    db.refresh(user)
    return ProfileResponse(
        id=user.id,
        email=user.email,
        display_name=profile.display_name,
        username=profile.username,
        bio=profile.bio,
        account_status=user.account_status.value,
    )


@router.get("/me/settings", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    settings = user.settings
    if settings is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settings not found")
    return SettingsResponse(
        profile_visibility=settings.profile_visibility.value,
        allow_discovery=settings.allow_discovery,
        ai_features_enabled=settings.ai_features_enabled,
        timezone=settings.timezone,
        locale=settings.locale,
    )


@router.patch("/me/settings", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_csrf(request)
    settings = user.settings
    if settings is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Settings not found")

    if payload.profile_visibility is not None:
        settings.profile_visibility = ProfileVisibility(payload.profile_visibility)
    if payload.allow_discovery is not None:
        settings.allow_discovery = payload.allow_discovery
    if payload.ai_features_enabled is not None:
        settings.ai_features_enabled = payload.ai_features_enabled
    if payload.timezone is not None:
        settings.timezone = payload.timezone
    if payload.locale is not None:
        settings.locale = payload.locale

    db.commit()
    db.refresh(settings)
    return SettingsResponse(
        profile_visibility=settings.profile_visibility.value,
        allow_discovery=settings.allow_discovery,
        ai_features_enabled=settings.ai_features_enabled,
        timezone=settings.timezone,
        locale=settings.locale,
    )
