"""
base_tool.py - Abstract base class for all agent tools.
Every tool must inherit from BaseTool and implement the `execute` method.
"""
from abc import ABC, abstractmethod
from typing import Any


class BaseTool(ABC):
    """
    Base class for all tools. Each tool must define:
    - name: unique identifier used by the model to call the tool
    - description: explains to the model WHEN to use this tool
    - input_schema: JSON Schema defining the tool's input parameters
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique tool name. Used by Claude to call the tool."""
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """
        Describes when and why the model should use this tool.
        Write this from the model's perspective — it reads this to decide.
        """
        ...

    @property
    @abstractmethod
    def input_schema(self) -> dict:
        """
        JSON Schema for the tool's input parameters.
        Must follow: {"type": "object", "properties": {...}, "required": [...]}
        """
        ...

    @abstractmethod
    async def execute(self, **kwargs: Any) -> str:
        """
        Runs the tool logic and returns a string result.
        The result is fed back to the model as an "observation."
        """
        ...

    def to_anthropic_spec(self) -> dict:
        """
        Converts this tool to the format Anthropic's API expects.
        Called automatically by the agent — you don't need to call this directly.
        """
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }
