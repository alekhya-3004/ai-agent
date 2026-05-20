"""
logger.py - Centralized logging setup using Loguru.
Import `logger` from here instead of using Python's built-in logging.
"""
import sys
from loguru import logger


def setup_logger(debug: bool = False) -> None:
    """Configure Loguru with appropriate log level and format."""
    # Remove default handler
    logger.remove()

    level = "DEBUG" if debug else "INFO"

    # Console output with color
    logger.add(
        sys.stdout,
        level=level,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
            "<level>{message}</level>"
        ),
        colorize=True,
    )

    # File output (rotates at 10 MB, keeps 7 days of logs)
    logger.add(
        "logs/agent.log",
        level="INFO",
        rotation="10 MB",
        retention="7 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    )

    logger.info("Logger initialized at level: {}", level)


# Re-export logger so other modules do: from utils.logger import logger
__all__ = ["logger", "setup_logger"]
