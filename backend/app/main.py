from __future__ import annotations

from contextlib import asynccontextmanager

import httpx
from .config import settings

from fastapi import FastAPI, Request
from fastapi.responses import Response

LEGACY_BACKEND_URL = settings.LEGACY_BACKEND_URL


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=None)
    yield
    await app.state.http.aclose()


app = FastAPI(
    title="FinVibe API",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "message": "FinVibe API is running"}


@app.get("/")
async def root() -> dict[str, object]:
    return {
        "message": "Welcome to FinVibe API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "accounts": "/api/accounts",
            "categories": "/api/categories",
            "transactions": "/api/transactions",
            "budgets": "/api/budgets",
            "reports": "/api/reports",
        },
    }


@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def api_compatibility_proxy(request: Request, path: str) -> Response:
    """Forward the existing FinVibe API unchanged during the runtime migration.

    Keeping the existing Node implementation behind this boundary preserves API
    behavior while the FastAPI application becomes the public backend runtime.
    Individual domains can then be ported from `src/` into FastAPI modules
    without changing the frontend contract.
    """
    target = f"{LEGACY_BACKEND_URL.rstrip('/')}/api/{path}"
    body = await request.body()
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length"}
    }

    upstream = await request.app.state.http.request(
        request.method,
        target,
        params=request.query_params,
        content=body,
        headers=headers,
    )

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in {"content-length", "transfer-encoding", "connection"}
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=upstream.headers.get("content-type"),
    )
