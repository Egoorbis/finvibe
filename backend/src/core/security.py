from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import jwt
from passlib.context import CryptContext
from src.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def generate_token(user_id: int, username: str, email: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"id": user_id, "username": username, "email": email, "exp": expires}, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


def random_token() -> str:
    return secrets.token_hex(32)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
