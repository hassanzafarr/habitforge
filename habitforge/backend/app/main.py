from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sqlalchemy import delete

from app.database import SessionLocal, init_db
from app.deps import TEST_MODE
from app.models import Completion, Habit, Note, PushSubscription, ReminderLog, Todo
from app.routers import ai, completions, habits, notes, push, todos
from app.services.reminder_scheduler import start_reminder_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("habitforge")


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


if sentry_dsn := os.getenv("HABITFORGE_SENTRY_DSN"):
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.getenv("HABITFORGE_SENTRY_ENVIRONMENT", "development"),
        release=os.getenv("HABITFORGE_SENTRY_RELEASE"),
        traces_sample_rate=_env_float("HABITFORGE_SENTRY_TRACES_SAMPLE_RATE", 0.1),
        send_default_pii=False,
        integrations=[
            StarletteIntegration(failed_request_status_codes=[range(500, 599)]),
            FastApiIntegration(failed_request_status_codes=[range(500, 599)]),
        ],
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    log.info("DB initialized")
    scheduler = start_reminder_scheduler()
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        if scheduler is not None:
            scheduler.shutdown(wait=False)


app = FastAPI(title="HabitForge", version="0.1.0", lifespan=lifespan)

_DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5179",
    "http://127.0.0.1:5179",
]


def _cors_origins() -> list[str]:
    raw = os.getenv("HABITFORGE_CORS_ORIGINS", "").strip()
    if not raw:
        return _DEFAULT_CORS_ORIGINS
    return [o.strip() for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.middleware("http")
async def log_requests(request, call_next):
    resp = await call_next(request)
    log.info("%s %s -> %s", request.method, request.url.path, resp.status_code)
    return resp


app.include_router(ai.router, prefix="/api")
app.include_router(habits.router, prefix="/api")
app.include_router(completions.router, prefix="/api")
app.include_router(todos.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(push.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


_ENV = os.getenv("HABITFORGE_SENTRY_ENVIRONMENT", "development").lower()
if TEST_MODE and _ENV not in {"production", "prod"}:

    @app.post("/api/test/reset")
    async def reset_test_data() -> dict:
        async with SessionLocal() as session:
            for model in (ReminderLog, PushSubscription, Completion, Note, Todo, Habit):
                await session.execute(delete(model))
            await session.commit()
        return {"status": "reset"}
elif TEST_MODE:
    log.error("HABITFORGE_TEST_MODE=1 ignored: environment is %s", _ENV)
