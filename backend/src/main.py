from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes.auth import router as auth_router
from src.core.config import settings

app = FastAPI(title="FinVibe API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
