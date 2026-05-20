"""
calculator_tool.py - Safe math expression evaluator.
Uses Python's ast module to evaluate expressions without exec/eval security risks.
"""
import ast
import math
import operator
from typing import Any

from .base_tool import BaseTool
from utils.logger import logger


# Allowed operators and functions — anything not in here is rejected
SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.FloorDiv: operator.floordiv,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

SAFE_FUNCTIONS = {
    "abs": abs, "round": round, "min": min, "max": max,
    "sqrt": math.sqrt, "ceil": math.ceil, "floor": math.floor,
    "log": math.log, "log10": math.log10, "exp": math.exp,
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "pi": math.pi, "e": math.e,
}


def _safe_eval(node: ast.AST) -> float:
    """Recursively evaluates an AST node using only safe operations."""
    if isinstance(node, ast.Constant):
        return node.value
    elif isinstance(node, ast.Name) and node.id in SAFE_FUNCTIONS:
        return SAFE_FUNCTIONS[node.id]
    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Operator not allowed: {op_type.__name__}")
        left = _safe_eval(node.left)
        right = _safe_eval(node.right)
        return SAFE_OPERATORS[op_type](left, right)
    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Operator not allowed: {op_type.__name__}")
        return SAFE_OPERATORS[op_type](_safe_eval(node.operand))
    elif isinstance(node, ast.Call):
        # Allow calling safe functions like sqrt(4)
        func_name = node.func.id if isinstance(node.func, ast.Name) else None
        if func_name not in SAFE_FUNCTIONS:
            raise ValueError(f"Function not allowed: {func_name}")
        func = SAFE_FUNCTIONS[func_name]
        args = [_safe_eval(arg) for arg in node.args]
        return func(*args)
    else:
        raise ValueError(f"Unsupported expression type: {type(node).__name__}")


class CalculatorTool(BaseTool):
    """Safe math expression evaluator for the agent."""

    @property
    def name(self) -> str:
        return "calculator"

    @property
    def description(self) -> str:
        return (
            "Evaluates mathematical expressions. Use this for arithmetic, algebra, "
            "trigonometry, and other math calculations. Supports: +, -, *, /, **, %, "
            "sqrt(), sin(), cos(), tan(), log(), abs(), round(), min(), max(), pi, e."
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "The math expression to evaluate. Example: '2 ** 10 + sqrt(144)'"
                }
            },
            "required": ["expression"]
        }

    async def execute(self, expression: str, **kwargs: Any) -> str:
        """Evaluates the expression safely and returns the result as a string."""
        try:
            tree = ast.parse(expression, mode="eval")
            result = _safe_eval(tree.body)
            logger.info("Calculator: {} = {}", expression, result)
            return f"{expression} = {result}"
        except ZeroDivisionError:
            return "Error: Division by zero"
        except Exception as e:
            logger.warning("Calculator error for '{}': {}", expression, e)
            return f"Error evaluating expression: {str(e)}"
