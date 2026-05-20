"""
auth_service.py - Authentication business logic.
Handles password hashing, JWT token creation, and user verification.
"""
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from config import get_settings
from models.database import User, get_db
from utils.logger import logger

settings = get_settings()

# sha256_crypt has NO password length limit (unlike bcrypt's 72-byte cap)
# and requires no extra packages — it is built into passlib
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# OAuth2 scheme — extracts Bearer token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ──────────────────────────── Password Utils ──────────────────────────────

def hash_password(password: str) -> str:
    """Hashes a plain-text password."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Returns True if the plain password matches the stored hash."""
    return pwd_context.verify(plain, hashed)


# ──────────────────────────── JWT Utils ───────────────────────────────────

def create_access_token(user_id: str, username: str) -> str:
    """Creates a signed JWT token with expiration."""
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "username": username,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decodes and validates a JWT token. Raises HTTPException if invalid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return payload
    except JWTError as e:
        logger.warning("JWT decode failed: {}", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ──────────────────────────── User Operations ─────────────────────────────

async def create_user(email: str, username: str, password: str, db: AsyncSession) -> User:
    """Creates a new user in the database. Raises if email/username already taken."""
    # Check for existing email
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check for existing username
    result = await db.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
    )
    db.add(user)
    await db.flush()
    logger.info("Created new user: {} ({})", username, email)
    return user


async def authenticate_user(email: str, password: str, db: AsyncSession) -> User:
    """Finds user by email and verifies password. Raises if credentials are wrong."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated")

    return user


# ──────────────────────────── FastAPI Dependency ──────────────────────────

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency that extracts and validates the current user from JWT.
    Usage: current_user: User = Depends(get_current_user)
    """
    payload = decode_token(token)
    user_id = payload.get("sub")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
