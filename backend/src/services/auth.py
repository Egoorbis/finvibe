from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def authenticate_user(db: AsyncSession, identifier: str, password: str):
    result = await db.execute(select(User).where((User.email == identifier) | (User.username == identifier)))
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(password, user.password):
        return None
    return user

def create_access_token(user: User, secret: str, expires_in: str = "7d") -> str:
    seconds = 7 * 24 * 3600
    if expires_in.endswith("d"):
        seconds = int(expires_in[:-1]) * 24 * 3600
    elif expires_in.endswith("h"):
        seconds = int(expires_in[:-1]) * 3600
    payload = {"id": user.id, "username": user.username, "email": user.email, "exp": datetime.now(timezone.utc) + timedelta(seconds=seconds)}
    return jwt.encode(payload, secret, algorithm="HS256")

def generate_reset_token() -> str:
    return secrets.token_hex(32)
