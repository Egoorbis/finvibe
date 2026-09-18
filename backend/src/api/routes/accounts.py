from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.auth_deps import get_current_user
from src.api.deps import get_db
from src.models.account import Account
from src.models.user import User
from src.schemas.account import AccountCreate, AccountUpdate

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

@router.get("")
async def get_all(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.scalars(select(Account).where(Account.user_id == user.id).order_by(Account.created_at.desc()))
    return list(result)

@router.get("/{account_id}")
async def get_by_id(account_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = await db.scalar(select(Account).where(Account.id == account_id, Account.user_id == user.id))
    if not account: raise HTTPException(404, "Account not found")
    return account

@router.post("", status_code=201)
async def create(data: AccountCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = Account(user_id=user.id, **data.model_dump())
    db.add(account); await db.commit(); await db.refresh(account); return account

@router.put("/{account_id}")
async def update(account_id: int, data: AccountUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = await db.scalar(select(Account).where(Account.id == account_id, Account.user_id == user.id))
    if not account: raise HTTPException(404, "Account not found")
    for key, value in data.model_dump().items(): setattr(account, key, value)
    await db.commit(); await db.refresh(account); return account

@router.delete("/{account_id}", status_code=204)
async def delete(account_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = await db.scalar(select(Account).where(Account.id == account_id, Account.user_id == user.id))
    if not account: raise HTTPException(404, "Account not found")
    await db.delete(account); await db.commit()
