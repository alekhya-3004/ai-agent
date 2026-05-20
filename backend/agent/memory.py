"""
memory.py - Conversation memory management.
Loads and formats conversation history from the database for the agent.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import Message, Conversation
from utils.logger import logger


async def load_conversation_history(
    conversation_id: str,
    db: AsyncSession,
    max_messages: int = 20,
) -> list[dict]:
    """
    Loads recent messages from the DB and formats them for Anthropic's API.

    Returns a list of {"role": "user"|"assistant", "content": "..."} dicts.
    Limited to `max_messages` most recent messages to manage token usage.
    """
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(max_messages)
    )
    messages = result.scalars().all()

    # Reverse to get chronological order (oldest first)
    messages = list(reversed(messages))

    formatted = []
    for msg in messages:
        formatted.append({
            "role": msg.role,
            "content": msg.content,
        })

    logger.debug("Loaded {} messages for conversation {}", len(formatted), conversation_id)
    return formatted


async def save_message(
    conversation_id: str,
    role: str,
    content: str,
    db: AsyncSession,
    react_steps: list[dict] | None = None,
    file_ids: list[str] | None = None,
) -> Message:
    """Saves a message to the database and updates the conversation timestamp."""
    from datetime import datetime

    # Save the message
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        react_steps=react_steps,
        file_ids=file_ids,
    )
    db.add(message)

    # Update conversation's updated_at timestamp
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = conv_result.scalar_one_or_none()
    if conversation:
        conversation.updated_at = datetime.utcnow()
        # Auto-generate a title from the first user message
        if role == "user" and conversation.title == "New Chat":
            conversation.title = content[:50] + ("..." if len(content) > 50 else "")

    await db.flush()  # Write to DB without committing (commit happens at end of request)
    logger.debug("Saved {} message to conversation {}", role, conversation_id)
    return message


async def get_or_create_conversation(
    user_id: str,
    conversation_id: str | None,
    db: AsyncSession,
) -> str:
    """
    Returns the conversation ID to use.
    If conversation_id is provided and exists, uses it.
    Otherwise creates a new conversation and returns its ID.
    """
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return conversation_id

    # Create new conversation
    conversation = Conversation(user_id=user_id, title="New Chat")
    db.add(conversation)
    await db.flush()
    logger.info("Created new conversation {} for user {}", conversation.id, user_id)
    return conversation.id
