"""Canonical AI service entry point.

The existing backend starts the service with ``uvicorn app:app``. Re-exporting
the same FastAPI application also supports ``uvicorn main:app``.
"""

from app import app

__all__ = ["app"]
