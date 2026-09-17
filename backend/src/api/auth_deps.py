from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
from src.api.deps import get_db
from src.models.user import User
from src.core.security import decode_token

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = decode_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.scalar(select(User).where(User.id == int(user_id)))
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user
