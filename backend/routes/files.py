"""
files.py - File upload API routes.
POST /api/files/upload  - Upload a file (returns file_id)
GET  /api/files/{id}    - Get file metadata
"""
import os
import uuid
import mimetypes

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import get_settings
from models.database import get_db, User, UploadedFile
from models.schemas import FileUploadResponse
from services.auth_service import get_current_user
from utils.logger import logger

settings = get_settings()
router = APIRouter(prefix="/api/files", tags=["Files"])

# Allowed file types for upload
ALLOWED_TYPES = {
    "text/plain", "text/markdown", "text/csv",
    "application/json", "application/pdf",
    "text/x-python", "text/javascript",
    "application/x-yaml", "text/yaml",
}

ALLOWED_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".pdf", ".py", ".js", ".ts", ".yaml", ".yml"}


@router.post("/upload", response_model=FileUploadResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a file. The file's text content is extracted and stored
    so the AI agent can read it via the read_file tool.
    """
    # ── Validate file ─────────────────────────────────────────────────────
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()

    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE // (1024*1024)} MB"
        )

    # ── Save to disk ──────────────────────────────────────────────────────
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # ── Extract text content ───────────────────────────────────────────────
    extracted_text = _extract_text(content, ext, file.content_type)

    # ── Save metadata to DB ────────────────────────────────────────────────
    uploaded = UploadedFile(
        id=file_id,
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        content_type=file.content_type,
        file_size=len(content),
        extracted_text=extracted_text,
    )
    db.add(uploaded)
    await db.commit()

    logger.info("File uploaded: {} ({} bytes) by user {}", file.filename, len(content), current_user.username)

    return FileUploadResponse(
        file_id=file_id,
        filename=file.filename,
        content_type=file.content_type,
        file_size=len(content),
    )


@router.get("/{file_id}")
async def get_file_info(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns metadata about an uploaded file."""
    result = await db.execute(
        select(UploadedFile).where(
            UploadedFile.id == file_id,
            UploadedFile.user_id == current_user.id,
        )
    )
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")

    return {
        "file_id": f.id,
        "filename": f.filename,
        "content_type": f.content_type,
        "file_size": f.file_size,
        "created_at": f.created_at.isoformat(),
    }


def _extract_text(content: bytes, ext: str, content_type: str | None) -> str:
    """Extracts readable text from file bytes based on file type."""
    try:
        if ext == ".pdf":
            # Basic PDF text extraction — install pdfminer.six for better results
            try:
                import io
                from pdfminer.high_level import extract_text_to_fp
                from pdfminer.layout import LAParams
                output = io.StringIO()
                extract_text_to_fp(io.BytesIO(content), output, laparams=LAParams())
                return output.getvalue()
            except ImportError:
                return "[PDF content - install pdfminer.six for text extraction: pip install pdfminer.six]"
        else:
            # For text-based files, decode as UTF-8
            return content.decode("utf-8", errors="replace")
    except Exception as e:
        logger.warning("Text extraction failed for ext {}: {}", ext, e)
        return f"[Could not extract text: {str(e)}]"
