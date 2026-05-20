"""
conversation_memory.py - Conversation context window management.

Handles trimming conversation history to fit within token limits.
For production, consider implementing vector-based long-term memory
using embeddings to retrieve relevant past context (see future suggestions).
"""
from utils.logger import logger


def trim_history_to_token_budget(
    messages: list[dict],
    max_tokens: int = 4000,
    chars_per_token: float = 4.0,
) -> list[dict]:
    """
    Trims conversation history from the oldest end to stay within budget.
    Always keeps the most recent messages.

    This is a simple character-count approximation.
    For production, use the tiktoken library for accurate token counting.
    """
    if not messages:
        return messages

    # Estimate total tokens
    total_chars = sum(len(str(m.get("content", ""))) for m in messages)
    estimated_tokens = total_chars / chars_per_token

    if estimated_tokens <= max_tokens:
        return messages

    # Remove from the beginning until we're within budget
    trimmed = list(messages)
    while trimmed and (sum(len(str(m.get("content", ""))) for m in trimmed) / chars_per_token) > max_tokens:
        trimmed.pop(0)

    removed = len(messages) - len(trimmed)
    if removed > 0:
        logger.debug("Trimmed {} messages from history to fit token budget", removed)

    return trimmed


def format_history_for_context(messages: list[dict]) -> str:
    """
    Formats conversation history as a readable string.
    Useful for summarization or debugging.
    """
    lines = []
    for msg in messages:
        role = msg.get("role", "unknown").capitalize()
        content = msg.get("content", "")
        if isinstance(content, list):
            # Handle Anthropic's content block format
            content = " ".join(
                block.get("text", "") if isinstance(block, dict) else str(block)
                for block in content
            )
        lines.append(f"{role}: {content[:200]}{'...' if len(content) > 200 else ''}")
    return "\n".join(lines)
