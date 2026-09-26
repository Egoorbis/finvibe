from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api import router

app=FastAPI(title=settings.PROJECT_NAME,version=settings.VERSION)
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
app.include_router(router)

@app.exception_handler(HTTPException)\nasync def http_error(request: Request, exc: HTTPException):\n    return __import__("fastapi").responses.JSONResponse(status_code=exc.status_code, content={"error": exc.detail})\n\n@app.get("/health")
async def health(): return {"status":"ok"}

@app.get("/")
async def root(): return {"message":"FinVibe API","version":settings.VERSION}
