from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["System"])


@router.get("/health", summary="Check API health")
def health_check() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "application": settings.app_name,
        "version": settings.app_version,
    }
