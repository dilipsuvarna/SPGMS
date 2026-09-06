"""Compatibility wrapper for the AI FastAPI service.

The project stores the ASGI application in the sibling `ai-module` directory,
which is not importable as a standard Python package because its folder name
contains a hyphen. This file lets the VS Code terminal run the app with the
common `uvicorn app:app` command even when the current working directory is
`admin-dashboard`.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def _load_service_app():
    candidates = [
        Path(__file__).resolve().parent.parent / "ai-module" / "app.py",
        Path(__file__).resolve().parent.parent / "ai-module" / "main.py",
    ]

    for candidate in candidates:
        if not candidate.exists():
            continue

        module_name = f"spgms_ai_service_{candidate.stem}"
        spec = importlib.util.spec_from_file_location(module_name, candidate)
        if spec is None or spec.loader is None:
            continue

        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)

        if hasattr(module, "app"):
            return module.app

    raise ImportError("Could not load the SPGMS AI FastAPI app from the ai-module directory.")


app = _load_service_app()

__all__ = ["app"]
