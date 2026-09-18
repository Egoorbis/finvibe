from datetime import date
from decimal import Decimal
from pydantic import BaseModel

class TransactionCreate(BaseModel):
    date: date
    amount: Decimal
    type: str
    description: str | None = None
    account_id: int
    category_id: int
    tags: str | None = None
    attachment_path: str | None = None

class TransactionUpdate(TransactionCreate):
    pass
