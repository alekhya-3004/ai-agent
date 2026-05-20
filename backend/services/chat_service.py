"""
chat_service.py - Business logic for chat operations.
Bridges the API routes and the ReAct agent.
"""
import json
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from agent.react_agent import stream_react_response
from agent.memory import (
    load_conversation_history,
    save_message,
    get_or_create_conversation,
)
from models.database import Conversation, Message
from utils.logger import logger


async def process_chat_stream(
    user_id: str,
    username: str,
    user_message: str,
    conversation_id: str | None,
    file_ids: list[str] | None,
    db: AsyncSession,
) -> AsyncGenerator[str, None]:
    """
    Orchestrates a full chat turn:
    1. Gets or creates conversation
    2. Loads history
    3. Saves user message
    4. Runs ReAct agent
    5. Saves assistant response
    6. Yields SSE-formatted strings throughout

    Yields strings in SSE format: "data: {...}\n\n"
    """
    # ── Get or create conversation ─────────────────────────────────────────
    conv_id = await get_or_create_conversation(user_id, conversation_id, db)

    # ── Save user message to DB ────────────────────────────────────────────
    await save_message(
        conversation_id=conv_id,
        role="user",
        content=user_message,
        db=db,
        file_ids=file_ids,
    )

    # Yield the conversation ID first so the frontend can track it
    yield _sse({"type": "conversation_id", "conversation_id": conv_id})

    # ── Load conversation history (for context) ───────────────────────────
    history = await load_conversation_history(conv_id, db, max_messages=20)
    # Remove the last message (the one we just saved) to avoid duplication
    # since stream_react_response will add it
    if history and history[-1]["role"] == "user":
        history = history[:-1]

    # ── Run the ReAct agent, streaming events ─────────────────────────────
    full_response = ""
    react_steps = []

    async for event in stream_react_response(
        user_message=user_message,
        conversation_history=history,
        username=username,
        db=db,
        file_ids=file_ids,
    ):
        event_type = event.get("type")

        if event_type == "token":
            full_response += event.get("content", "")

        elif event_type == "done":
            full_response = event.get("content", full_response)
            react_steps = event.get("react_steps", [])

        # Forward all events to the frontend
        yield _sse(event)

    # ── Save assistant response to DB ─────────────────────────────────────
    if full_response:
        assistant_msg = await save_message(
            conversation_id=conv_id,
            role="assistant",
            content=full_response,
            db=db,
            react_steps=react_steps,
        )
        # Yield the message ID so frontend can reference it
        yield _sse({"type": "message_saved", "message_id": assistant_msg.id})

    # ── Commit the transaction ─────────────────────────────────────────────
    await db.commit()
    logger.info("Chat turn complete for user '{}' in conversation '{}'", username, conv_id)


async def get_user_conversations(user_id: str, db: AsyncSession) -> list[dict]:
    """Returns all conversations for a user, ordered by most recent first."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        }
        for c in conversations
    ]


async def get_conversation_messages(
    conversation_id: str,
    user_id: str,
    db: AsyncSession,
) -> list[dict]:
    """Returns all messages in a conversation, verifying ownership."""
    # Verify this conversation belongs to the user
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    if not conv_result.scalar_one_or_none():
        return []

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "react_steps": m.react_steps,
            "file_ids": m.file_ids,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


async def delete_conversation(conversation_id: str, user_id: str, db: AsyncSession) -> bool:
    """Deletes a conversation and all its messages. Returns True if deleted."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        return False

    await db.delete(conversation)
    await db.commit()
    logger.info("Deleted conversation {} for user {}", conversation_id, user_id)
    return True


def _sse(data: dict) -> str:
    """Formats a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"
