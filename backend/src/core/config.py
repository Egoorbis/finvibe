from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://finvibe:finvibe@localhost:5432/finvibe"
    jwt_secret: str
    jwt_expires_in: str = "7d"
    resend_api_key: str | None = None
    resend_from_email: str = "noreply@finvibe.com"
    frontend_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
