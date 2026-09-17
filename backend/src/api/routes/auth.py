from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.auth_deps import get_current_user
from src.api.deps import get_db
from src.core.security import generate_token, hash_password, random_token, verify_password
from src.models.user import User
from src.schemas.auth import ChangePasswordRequest, LoginRequest, PasswordResetRequest, ProfileUpdateRequest, RegisterRequest, ResetRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


def public_user(user: User):
    return {"id": user.id, "username": user.username, "email": user.email, "email_verified": user.email_verified, "created_at": user.created_at, "updated_at": user.updated_at}


@router.post("/register", status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    username = data.username or str(data.email).split("@", 1)[0]
    existing = await db.scalar(select(User).where(or_(User.email == str(data.email).lower(), User.username == username)))
    if existing:
        raise HTTPException(status_code=409, detail="Email or username already exists")
    user = User(username=username, email=str(data.email).lower(), password=hash_password(data.password), email_verified=False)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"user": public_user(user), "token": generate_token(user.id, user.username, user.email)}


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    identifier = data.emailOrUsername or data.email
    if not identifier:
        raise HTTPException(status_code=400, detail="Email or username is required")
    user = await db.scalar(select(User).where(or_(User.email == identifier.lower(), User.username == identifier)))
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"user": public_user(user), "token": generate_token(user.id, user.username, user.email)}


@router.get("/profile")
async def profile(user: User = Depends(get_current_user)):
    return public_user(user)


@router.put("/profile")
async def update_profile(data: ProfileUpdateRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if data.email and str(data.email).lower() != user.email:
        if await db.scalar(select(User).where(User.email == str(data.email).lower(), User.id != user.id)):
            raise HTTPException(status_code=409, detail="Email already exists")
        user.email = str(data.email).lower()
    if data.username and data.username != user.username:
        if await db.scalar(select(User).where(User.username == data.username, User.id != user.id)):
            raise HTTPException(status_code=409, detail="Username already exists")
        user.username = data.username
    await db.commit()
    await db.refresh(user)
    return public_user(user)


@router.put("/change-password")
async def change_password(data: ChangePasswordRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(data.currentPassword, user.password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    user.password = hash_password(data.newPassword)
    await db.commit()
    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


@router.post("/request-password-reset")
async def request_password_reset(data: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == str(data.email).lower()))
    if user:
        user.reset_token = random_token()
        user.reset_token_expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
        await db.commit()
    return {"message": "If an account exists for that email, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.reset_token == data.token))
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user.password = hash_password(data.newPassword)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()
    return {"message": "Password reset successfully"}
