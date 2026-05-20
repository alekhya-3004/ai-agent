"""
file_tool.py - Tool for reading and analyzing uploaded files.
The agent uses this to access content from files the user has uploaded.
"""
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .base_tool import BaseTool
from utils.logger import logger


class FileReadTool(BaseTool):
    """
    Reads content from previously uploaded files.
    The agent uses this when the user attaches a file and asks about it.
    """

    def __init__(self, db: AsyncSession = None):
        # db session is injected at runtime by the agent
        self._db = db

    @property
    def name(self) -> str:
        return "read_file"

    @property
    def description(self) -> str:
        return (
            "Read the content of an uploaded file. Use this when the user has attached "
            "a file and you need to read its content to answer their question. "
            "Provide the file_id from the conversation context."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "file_id": {
                    "type": "string",
                    "description": "The ID of the file to read (provided in context when a file is attached)"
                }
            },
            "required": ["file_id"]
        }

    async def execute(self, file_id: str, **kwargs: Any) -> str:
        """Retrieves the extracted text content of the uploaded file."""
        if not self._db:
            return "Error: File reading is not available in this context."

        try:
            from models.database import UploadedFile

            result = await self._db.execute(
                select(UploadedFile).where(UploadedFile.id == file_id)
            )
            uploaded_file = result.scalar_one_or_none()

            if not uploaded_file:
                return f"Error: File with ID '{file_id}' not found."

            if not uploaded_file.extracted_text:
                return f"File '{uploaded_file.filename}' exists but has no readable text content."

            # Limit to first 8000 chars to avoid overwhelming the context
            content = uploaded_file.extracted_text[:8000]
            truncated = len(uploaded_file.extracted_text) > 8000

            result_text = f"File: {uploaded_file.filename}\n"
            result_text += f"Size: {uploaded_file.file_size} bytes\n\n"
            result_text += f"Content:\n{content}"

            if truncated:
                result_text += "\n\n[Content truncated — file is larger than 8000 characters]"

            logger.info("File read tool: returned content for file {}", file_id)
            return result_text

        except Exception as e:
            logger.error("File read error for {}: {}", file_id, e)
            return f"Error reading file: {str(e)}"
