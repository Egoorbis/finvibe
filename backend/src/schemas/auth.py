from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    username: str | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, value):
        if value is not None and not re.fullmatch(r"[A-Za-z0-9_]{3,20}", value):
            raise ValueError("Username must be 3-20 characters and contain only letters, numbers, and underscores")
        return value


class LoginRequest(BaseModel):
    email: EmailStr | None = None
    emailOrUsername: str | None = None
    password: str


class PasswordRequest(BaseModel):
    password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=8)


class ProfileUpdateRequest(BaseModel):
    username: str | None = None
    email: EmailStr | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, value):
        if value is not None and not re.fullmatch(r"[A-Za-z0-9_]{3,20}", value):
            raise ValueError("Username must be 3-20 characters and contain only letters, numbers, and underscores")
        return value


class ResetRequest(BaseModel):
    token: str
    newPassword: str = Field(min_length=8)


class TokenRequest(BaseModel):
    token: str
