from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.api.routes import auth as auth_routes
from app.api.routes import users as user_routes
from app.api.routes import knowledge as knowledge_routes
from app.api.routes import graph as graph_routes
from app.api.routes import acquisition as acquisition_routes
from app.api.routes import learning as learning_routes
from app.api.routes import mindtrace as mindtrace_routes
from app.api.routes import dashboard as dashboard_routes
from app.api.routes import community as community_routes
from app.api.routes import integrations as integration_routes

settings = get_settings()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.environment.lower() == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="The backend foundation for the MINDOS Personal Knowledge & Intelligence OS.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(user_routes.router, prefix="/api/v1")
app.include_router(knowledge_routes.router, prefix="/api/v1")
app.include_router(graph_routes.router, prefix="/api/v1")
app.include_router(acquisition_routes.router, prefix="/api/v1")
app.include_router(learning_routes.router, prefix="/api/v1")
app.include_router(mindtrace_routes.router, prefix="/api/v1")
app.include_router(dashboard_routes.router, prefix="/api/v1")
app.include_router(community_routes.router, prefix="/api/v1")
app.include_router(integration_routes.router, prefix="/api/v1")


@app.get("/", tags=["System"], summary="API welcome")
def root() -> dict[str, str]:
    return {
        "message": "Welcome to MINDOS API",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
