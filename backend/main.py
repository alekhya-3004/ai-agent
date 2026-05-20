"""
main.py - FastAPI application entry point.
Run with: uvicorn main:app --reload --port 8000
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from models.database import create_tables
from routes import auth, chat, files
from utils.logger import logger, setup_logger

settings = get_settings()


# ──────────────────────────── Lifespan ───────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on startup and shutdown.
    Creates database tables on startup.
    """
    setup_logger(debug=settings.DEBUG)
    os.makedirs("logs", exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    logger.info("Starting {} ...", settings.APP_NAME)
    await create_tables()
    logger.info("Database tables ready.")

    yield  # App is running

    logger.info("Shutting down {}.", settings.APP_NAME)


# ──────────────────────────── App Setup ───────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description="Production AI Agent API with ReAct reasoning",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────── Global Error Handler ────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches unhandled exceptions and returns a clean JSON error response."""
    logger.error("Unhandled exception on {} {}: {}", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )


# ──────────────────────────── Routes ──────────────────────────────────────

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(files.router)


@app.get("/health")
async def health_check():
    """Simple health check endpoint for load balancers and monitoring."""
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": "/health",
    }
