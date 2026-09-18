from datetime import date
from decimal import Decimal
from pydantic import BaseModel

class BudgetCreate(BaseModel):
    category_id: int
    amount: Decimal
    period: str
    start_date: date
    end_date: date

class BudgetUpdate(BudgetCreate):
    pass
