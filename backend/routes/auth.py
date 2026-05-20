"""
auth.py - Authentication API routes.
POST /api/auth/register - Create new account
POST /api/auth/login    - Login and get JWT token
GET  /api/auth/me       - Get current user profile
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.schemas import UserRegister, UserLogin, TokenResponse, UserResponse
from services.auth_service import create_user, authenticate_user, create_access_token, get_current_user
from models.database import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Register a new user account.
    Returns a JWT token so the user is immediately logged in.
    """
    user = await create_user(
        email=body.email,
        username=body.username,
        password=body.password,
        db=db,
    )
    await db.commit()

    token = create_access_token(user.id, user.username)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Login with email and password.
    Returns a JWT Bearer token to use in subsequent requests.
    """
    user = await authenticate_user(body.email, body.password, db)
    token = create_access_token(user.id, user.username)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return current_user
