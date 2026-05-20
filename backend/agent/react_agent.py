"""
react_agent.py - Core ReAct agent using Google Gemini API (google-genai SDK).

ReAct loop:
1. Send message to Gemini with tool definitions
2. If response has function_call → execute tool → add result → repeat
3. When response has only text → stream it as the final answer
4. Yield SSE event dicts throughout for real-time frontend updates
"""
import asyncio
from typing import AsyncGenerator

from google import genai
from google.genai import types

from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from tools import get_all_tools
from tools.file_tool import FileReadTool
from prompts.system_prompts import get_system_prompt
from utils.logger import logger

settings = get_settings()

# v1beta is required for systemInstruction + tools support
_client = genai.Client(api_key=settings.GOOGLE_API_KEY)

MAX_ITERATIONS = 10


# ──────────────────────────── Schema helpers ───────────────────────────────

def _to_genai_schema(schema: dict) -> types.Schema:
    """
    Converts a JSON Schema dict into a google-genai Schema object.
    Only passes fields that are present — Schema rejects None for items/properties.
    """
    type_map = {
        "string":  types.Type.STRING,
        "integer": types.Type.INTEGER,
        "number":  types.Type.NUMBER,
        "boolean": types.Type.BOOLEAN,
        "array":   types.Type.ARRAY,
        "object":  types.Type.OBJECT,
    }

    kwargs: dict = {
        "type": type_map.get(schema.get("type", "string"), types.Type.STRING),
    }

    if schema.get("description"):
        kwargs["description"] = schema["description"]

    if schema.get("required"):
        kwargs["required"] = schema["required"]

    if schema.get("enum"):
        kwargs["enum"] = schema["enum"]

    if schema.get("nullable") is not None:
        kwargs["nullable"] = schema["nullable"]

    # Only add properties when the schema actually has them
    if "properties" in schema:
        kwargs["properties"] = {
            k: _to_genai_schema(v)
            for k, v in schema["properties"].items()
        }

    # Only add items when the schema actually has them
    if "items" in schema:
        kwargs["items"] = _to_genai_schema(schema["items"])

    return types.Schema(**kwargs)


def _build_tool_config(tools: list) -> types.Tool | None:
    """Converts BaseTool instances into a Gemini Tool with FunctionDeclarations."""
    if not tools:
        return None
    return types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name=t.name,
                description=t.description,
                parameters=_to_genai_schema(t.input_schema),
            )
            for t in tools
        ]
    )


def _convert_history(history: list[dict]) -> list[types.Content]:
    """
    Converts DB message history to Gemini Content objects.
    DB:     {"role": "user"|"assistant", "content": "text"}
    Gemini: Content(role="user"|"model", parts=[Part(text="text")])
    """
    result = []
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        content = msg.get("content", "")
        if isinstance(content, str) and content.strip():
            result.append(types.Content(role=role, parts=[types.Part(text=content)]))
    return result


# ──────────────────────────── Main ReAct Loop ─────────────────────────────

async def stream_react_response(
    user_message: str,
    conversation_history: list[dict],
    username: str,
    db: AsyncSession,
    file_ids: list[str] | None = None,
) -> AsyncGenerator[dict, None]:
    """
    Runs the Gemini ReAct loop and yields SSE-compatible event dicts.

    Event types:
    - "token":      text chunk of the final response
    - "thought":    model reasoning text before a tool call
    - "tool_start": tool about to execute
    - "tool_end":   tool returned result
    - "done":       streaming complete
    - "error":      something went wrong
    """
    # ── Setup tools ───────────────────────────────────────────────────────
    tools = get_all_tools()
    for tool in tools:
        if isinstance(tool, FileReadTool):
            tool._db = db

    tool_config = _build_tool_config(tools)
    tool_map = {t.name: t for t in tools}

    # ── Gemini generation config ──────────────────────────────────────────
    gen_config = types.GenerateContentConfig(
        system_instruction=get_system_prompt(username),
        tools=[tool_config] if tool_config else [],
    )

    # ── Build initial conversation contents ───────────────────────────────
    contents: list[types.Content] = _convert_history(conversation_history)

    user_text = user_message
    if file_ids:
        user_text = (
            f"[Files attached with IDs: {', '.join(file_ids)}. "
            f"Use the read_file tool to access them.]\n\n{user_message}"
        )
    contents.append(types.Content(role="user", parts=[types.Part(text=user_text)]))

    react_steps: list[dict] = []
    full_response = ""

    # ── ReAct loop ────────────────────────────────────────────────────────
    for iteration in range(MAX_ITERATIONS):
        logger.debug("Gemini ReAct iteration {} for '{}'", iteration + 1, username)

        try:
            response = await _client.aio.models.generate_content(
                model=settings.MODEL_NAME,
                contents=contents,
                config=gen_config,
            )
        except Exception as e:
            logger.error("Gemini API error on iteration {}: {}", iteration + 1, e)
            yield {"type": "error", "error": f"AI service error: {str(e)}"}
            return

        # ── Parse response parts ──────────────────────────────────────────
        candidate = response.candidates[0]
        text_content = ""
        function_calls = []

        for part in candidate.content.parts:
            if part.text:
                text_content += part.text
            if part.function_call:
                function_calls.append(part.function_call)

        # Add model response to conversation history
        contents.append(candidate.content)

        # ── No tool calls → Final answer ──────────────────────────────────
        if not function_calls:
            # Stream word by word so the frontend sees tokens arriving
            words = text_content.split(" ")
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                full_response += chunk
                yield {"type": "token", "content": chunk}
                await asyncio.sleep(0)  # Yield to event loop so SSE flushes

            yield {"type": "done", "content": full_response, "react_steps": react_steps}
            logger.debug("ReAct complete after {} iterations", iteration + 1)
            return

        # ── Has tool calls → thought + execute ────────────────────────────
        if text_content.strip():
            step = {"type": "thought", "content": text_content.strip()}
            react_steps.append(step)
            yield step

        function_response_parts: list[types.Part] = []

        for fc in function_calls:
            tool_name = fc.name
            tool_input = dict(fc.args) if fc.args else {}

            start_step = {"type": "tool_start", "tool_name": tool_name, "tool_input": tool_input}
            react_steps.append(start_step)
            yield start_step

            logger.info("Executing tool '{}' with input: {}", tool_name, tool_input)

            if tool_name in tool_map:
                try:
                    tool_output = await tool_map[tool_name].execute(**tool_input)
                except Exception as e:
                    tool_output = f"Tool error: {str(e)}"
                    logger.error("Tool '{}' failed: {}", tool_name, e)
            else:
                tool_output = f"Unknown tool: '{tool_name}'"
                logger.warning("Unknown tool requested: {}", tool_name)

            end_step = {"type": "tool_end", "tool_name": tool_name, "tool_output": tool_output}
            react_steps.append(end_step)
            yield end_step

            function_response_parts.append(
                types.Part(
                    function_response=types.FunctionResponse(
                        name=tool_name,
                        response={"output": str(tool_output)},
                    )
                )
            )

        # Add tool results back into the conversation for the next iteration
        contents.append(types.Content(role="user", parts=function_response_parts))

    # ── Safety: max iterations hit ────────────────────────────────────────
    logger.warning("ReAct hit max iterations for '{}'", username)
    yield {
        "type": "done",
        "content": full_response or "I reached the maximum reasoning steps. Please try a simpler question.",
        "react_steps": react_steps,
    }
