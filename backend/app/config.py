from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FinVibe API"
    VERSION: str = "1.0.0"
    ENV: str = "dev"
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    DATABASE_URL: str = "postgresql+asyncpg://finvibe_user:finvibe_password@postgres:5432/finvibe"
    RESEND_API_KEY: str | None = None
    RESEND_FROM_EMAIL: str = "noreply@example.com"
    FRONTEND_URL: str = "http://localhost"
    UPLOAD_DIR: str = "/app/uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
