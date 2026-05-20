"""
chat.py - Chat API routes.
POST /api/chat/message              - Send message (streaming SSE response)
GET  /api/chat/conversations        - List all conversations
GET  /api/chat/conversations/{id}   - Get messages in a conversation
DELETE /api/chat/conversations/{id} - Delete a conversation
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db, User
from models.schemas import ChatRequest
from services.auth_service import get_current_user
from services.chat_service import (
    process_chat_stream,
    get_user_conversations,
    get_conversation_messages,
    delete_conversation,
)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/message")
async def send_message(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and receive a streaming SSE response.

    The response is a stream of Server-Sent Events.
    Each event is a JSON object: data: {...}

    Event types:
    - conversation_id: {"type": "conversation_id", "conversation_id": "..."}
    - token:          {"type": "token", "content": "..."}
    - thought:        {"type": "thought", "content": "..."}
    - tool_start:     {"type": "tool_start", "tool_name": "...", "tool_input": {...}}
    - tool_end:       {"type": "tool_end", "tool_name": "...", "tool_output": "..."}
    - done:           {"type": "done", "content": "...", "react_steps": [...]}
    - error:          {"type": "error", "error": "..."}
    """
    return StreamingResponse(
        process_chat_stream(
            user_id=current_user.id,
            username=current_user.username,
            user_message=body.message,
            conversation_id=body.conversation_id,
            file_ids=body.file_ids,
            db=db,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Prevents nginx from buffering SSE
        },
    )


@router.get("/conversations")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all conversations for the current user, newest first."""
    conversations = await get_user_conversations(current_user.id, db)
    return {"conversations": conversations}


@router.get("/conversations/{conversation_id}")
async def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all messages in a specific conversation."""
    messages = await get_conversation_messages(conversation_id, current_user.id, db)
    if messages is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"messages": messages}


@router.delete("/conversations/{conversation_id}")
async def remove_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently deletes a conversation and all its messages."""
    deleted = await delete_conversation(conversation_id, current_user.id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}
