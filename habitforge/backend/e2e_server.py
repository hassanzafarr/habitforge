from __future__ import annotations

import os
from pathlib import Path

import uvicorn

db_path = Path(f"habitforge-e2e-{os.getpid()}.db")
for path in (db_path, db_path.with_suffix(".db-shm"), db_path.with_suffix(".db-wal")):
    try:
        path.unlink()
    except FileNotFoundError:
        pass

os.environ["HABITFORGE_TEST_MODE"] = "1"
os.environ["HABITFORGE_REMINDERS_ENABLED"] = "false"
os.environ["HABITFORGE_DB_URL"] = f"sqlite+aiosqlite:///{db_path.as_posix()}"

uvicorn.run("app.main:app", host="127.0.0.1", port=8011)
