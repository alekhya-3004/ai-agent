"""
schemas.py - Pydantic models for request/response validation.
These are separate from ORM models and used for API I/O.
"""
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, field_validator


# ──────────────────────────── Auth Schemas ────────────────────────────────

class UserRegister(BaseModel):
    """Request body for POST /auth/register"""
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    """Request body for POST /auth/login"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response from login endpoint"""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str


class UserResponse(BaseModel):
    """Public user profile returned by the API"""
    id: str
    email: str
    username: str
    created_at: datetime

    class Config:
        from_attributes = True  # Allows creating from ORM model


# ──────────────────────────── Chat Schemas ────────────────────────────────

class ConversationCreate(BaseModel):
    """Request body for starting a new conversation"""
    title: Optional[str] = "New Chat"


class ConversationResponse(BaseModel):
    """Single conversation metadata"""
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReActStep(BaseModel):
    """One step in the ReAct reasoning chain"""
    type: str          # "thought" | "tool_start" | "tool_end" | "answer"
    content: str
    tool_name: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_output: Optional[str] = None


class MessageResponse(BaseModel):
    """A single message in a conversation"""
    id: str
    role: str
    content: str
    react_steps: Optional[list[dict]] = None
    file_ids: Optional[list[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    """Request body for POST /chat/message"""
    conversation_id: Optional[str] = None   # None = create new conversation
    message: str
    file_ids: Optional[list[str]] = None    # Attach previously uploaded files


class FileUploadResponse(BaseModel):
    """Response after a file is uploaded"""
    file_id: str
    filename: str
    content_type: Optional[str]
    file_size: int


# ──────────────────────────── SSE Event Schemas ───────────────────────────

class StreamEvent(BaseModel):
    """Structure for Server-Sent Events sent during streaming"""
    type: str           # token | thought | tool_start | tool_end | done | error
    content: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[Any] = None
    tool_output: Optional[str] = None
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None
    error: Optional[str] = None
