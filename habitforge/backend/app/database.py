from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

log = logging.getLogger("habitforge")

DATABASE_URL = os.getenv("HABITFORGE_DB_URL", "sqlite+aiosqlite:///./habitforge.db")

# Normalise the URL so SQLAlchemy always uses the async asyncpg driver.
# Railway can supply any of these schemes:
#   postgres://            – short Heroku/Railway form
#   postgresql://          – standard libpq form
#   postgresql+psycopg2:// – explicit sync driver (wrong for async)
# All three must become postgresql+asyncpg://.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)

# asyncpg uses `ssl=require` not `sslmode=require` (Neon.tech uses the latter)
DATABASE_URL = DATABASE_URL.replace("sslmode=require", "ssl=require")


_IS_POSTGRES = DATABASE_URL.startswith("postgresql")

_engine_kwargs: dict = dict(echo=False, future=True)
if _IS_POSTGRES:
    # Supabase/Neon scale-to-zero: drop dead connections before use and recycle
    # idle ones so the app survives provider cold starts / idle pauses.
    _engine_kwargs.update(
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=5,
        connect_args={"timeout": 10},
    )

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


_HABIT_BACKFILL_COLUMNS: list[tuple[str, str]] = [
    # FALSE (not 0): Postgres rejects an integer default on a BOOLEAN column.
    # SQLite >= 3.23 accepts FALSE too.
    ("reminder_enabled", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("reminder_deadline", "VARCHAR(5)"),
    ("reminder_timezone", "VARCHAR(64) NOT NULL DEFAULT 'UTC'"),
    ("reminder_max_per_day", "INTEGER NOT NULL DEFAULT 2"),
    ("streak_risk_threshold", "INTEGER NOT NULL DEFAULT 3"),
]


def _backfill_habit_columns_sync(sync_conn) -> None:
    """Add new reminder columns to an existing `habits` table if missing.

    `create_all` never alters existing tables, so databases created before the
    reminder feature need these columns added. Idempotent on SQLite + Postgres.
    """
    from sqlalchemy import inspect, text

    existing = {col["name"] for col in inspect(sync_conn).get_columns("habits")}
    is_postgres = sync_conn.dialect.name == "postgresql"
    for col_name, ddl in _HABIT_BACKFILL_COLUMNS:
        if col_name in existing:
            continue
        stmt = text(f"ALTER TABLE habits ADD COLUMN {col_name} {ddl}")
        try:
            if is_postgres:
                # A failed statement aborts the whole Postgres transaction, which
                # would silently roll back create_all too. Isolate each ALTER.
                with sync_conn.begin_nested():
                    sync_conn.execute(stmt)
            else:
                sync_conn.execute(stmt)
            log.info("Added missing column habits.%s", col_name)
        except Exception:
            log.exception("Failed to add column habits.%s", col_name)


async def init_db() -> None:
    from app import models  # noqa: F401  register models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_backfill_habit_columns_sync)
