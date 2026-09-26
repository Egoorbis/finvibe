from datetime import datetime, timedelta, timezone
import re, secrets
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException
from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_access_token(user: dict) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"id": user["id"], "username": user["username"], "email": user["email"], "exp": expires}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def valid_email(email: str) -> bool:
    if not isinstance(email, str): return False
    value = email.strip()
    if not value or len(value) > 254 or value.count("@") != 1: return False
    local, domain = value.split("@")
    if not local or len(domain) > 253: return False
    parts = domain.split(".")
    return len(parts) >= 2 and all(p and len(p) <= 63 and not p.startswith("-") and not p.endswith("-") and re.fullmatch(r"[A-Za-z0-9-]+", p) for p in parts)
