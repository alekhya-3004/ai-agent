"""
config.py - Application configuration using Pydantic Settings.
All settings load from environment variables or .env file.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central application configuration. All fields map to env vars."""

    # App metadata
    APP_NAME: str = "AI Agent"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database (SQLite default, set to postgresql+asyncpg://... for Postgres)
    DATABASE_URL: str = "sqlite+aiosqlite:///./agent.db"

    # Google Gemini API
    GOOGLE_API_KEY: str = ""
    MODEL_NAME: str = "gemini-1.5-flash"   # fast + supports function calling
    MAX_TOKENS: int = 4096

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore unknown env vars


@lru_cache()
def get_settings() -> Settings:
    """Returns cached settings instance (reads .env only once)."""
    return Settings()


# Create upload directory on import
settings = get_settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
