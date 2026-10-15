"""
Server unico per chi non ha Node.js: il backend (backend/main.py) + l'interfaccia già compilata
(frontend/dist) sulla stessa porta. Lo usa avvia.py in automatico; si può lanciare anche a mano:

    python -m uvicorn avvia_app:app --port 8000
"""
from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path

from starlette.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "frontend" / "dist"
sys.path.insert(0, str(ROOT / "backend"))

app = importlib.import_module(os.environ.get("AVVIA_BACKEND", "main")).app

# montata per ultima: le rotte /api/* del backend hanno la precedenza
app.mount("/", StaticFiles(directory=str(DIST), html=True), name="frontend")
