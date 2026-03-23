"""
App factory. Import `create_app` in tests; use `asgi.py` as the uvicorn entry point.
"""
from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .repositories.interfaces import Repositories
from .routes.health import router as health_router
from .routes.stories import make_router as make_stories_router
from .routes.me import make_router as make_me_router


def create_app(repos: Repositories, cors_origins: list[str] | None = None) -> FastAPI:
    app = FastAPI(title="Mello API", version="0.0.1", docs_url=None, redoc_url=None)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins or ["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(make_stories_router(repos))
    app.include_router(make_me_router(repos))

    return app
