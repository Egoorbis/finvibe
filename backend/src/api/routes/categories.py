from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.api.auth_deps import get_current_user
from src.api.deps import get_db
from src.models.category import Category
from src.models.user import User
from src.schemas.category import CategoryCreate, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])

@router.get("")
async def get_all(type: str | None = None, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Category).where(or_(Category.user_id == user.id, Category.user_id.is_(None)))
    if type: stmt = stmt.where(Category.type == type)
    stmt = stmt.order_by(Category.type, Category.name) if not type else stmt.order_by(Category.name)
    rows = list(await db.scalars(stmt))
    seen=set(); result=[]
    for category in rows:
        key=f"{category.type.lower()}:{category.name.strip().lower()}"
        if key not in seen: seen.add(key); result.append(category)
    return result

@router.get("/{category_id}")
async def get_by_id(category_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    category = await db.scalar(select(Category).where(Category.id == category_id, or_(Category.user_id == user.id, Category.user_id.is_(None))))
    if not category: raise HTTPException(404, "Category not found")
    return category

@router.post("", status_code=201)
async def create(data: CategoryCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    category=Category(user_id=user.id, **data.model_dump()); db.add(category); await db.commit(); await db.refresh(category); return category

@router.put("/{category_id}")
async def update(category_id: int, data: CategoryUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    category=await db.scalar(select(Category).where(Category.id==category_id, Category.user_id==user.id))
    if not category: raise HTTPException(404,"Category not found")
    for key,value in data.model_dump().items(): setattr(category,key,value)
    await db.commit(); await db.refresh(category); return category

@router.delete("/{category_id}", status_code=204)
async def delete(category_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    category=await db.scalar(select(Category).where(Category.id==category_id, Category.user_id==user.id, Category.is_default==0))
    if not category: raise HTTPException(404,"Category not found")
    await db.delete(category); await db.commit()
