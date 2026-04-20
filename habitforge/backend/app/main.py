from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import completions, habits, todos

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("habitforge")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    log.info("DB initialized")
    yield


app = FastAPI(title="HabitForge", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://habitforge.me",
        "https://www.habitforge.me",
        "https://habittforge.me",
        "https://www.habittforge.me",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.middleware("http")
async def log_requests(request, call_next):
    resp = await call_next(request)
    log.info("%s %s -> %s", request.method, request.url.path, resp.status_code)
    return resp


app.include_router(habits.router, prefix="/api")
app.include_router(completions.router, prefix="/api")
app.include_router(todos.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}
