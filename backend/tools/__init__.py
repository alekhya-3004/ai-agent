from .base_tool import BaseTool
from .calculator_tool import CalculatorTool
from .search_tool import SearchTool
from .file_tool import FileReadTool

# Registry of all available tools — add new tools here
TOOL_REGISTRY: list[type[BaseTool]] = [
    CalculatorTool,
    SearchTool,
    FileReadTool,
]

def get_all_tools() -> list[BaseTool]:
    """Returns instantiated instances of all registered tools."""
    return [ToolClass() for ToolClass in TOOL_REGISTRY]
