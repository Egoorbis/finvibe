from pydantic import BaseModel

class CategoryCreate(BaseModel):
    name: str
    type: str
    color: str | None = None
    icon: str | None = None
    is_default: int = 0

class CategoryUpdate(BaseModel):
    name: str
    type: str
    color: str | None = None
    icon: str | None = None
