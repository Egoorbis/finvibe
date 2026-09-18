from decimal import Decimal
from pydantic import BaseModel, Field

class AccountCreate(BaseModel):
    name: str
    type: str
    balance: Decimal = Decimal("0")
    currency: str = "USD"

class AccountUpdate(BaseModel):
    name: str
    type: str
    balance: Decimal
    currency: str
