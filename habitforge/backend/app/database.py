from __future__ import annotations

import os
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

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


engine = create_async_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


_HABIT_BACKFILL_COLUMNS: list[tuple[str, str]] = [
    ("reminder_enabled", "BOOLEAN NOT NULL DEFAULT 0"),
    ("reminder_deadline", "VARCHAR(5)"),
    ("reminder_timezone", "VARCHAR(64) NOT NULL DEFAULT 'UTC'"),
    ("reminder_max_per_day", "INTEGER NOT NULL DEFAULT 2"),
    ("streak_risk_threshold", "INTEGER NOT NULL DEFAULT 3"),
]


def _backfill_habit_columns_sync(sync_conn) -> None:
    """Add new reminder columns to existing `habits` table if missing.

    Idempotent. Works on SQLite + Postgres (try/except on ALTER).
    """
    from sqlalchemy import text

    is_sqlite = sync_conn.dialect.name == "sqlite"
    for col_name, ddl in _HABIT_BACKFILL_COLUMNS:
        try:
            # Postgres supports IF NOT EXISTS on ADD COLUMN; SQLite needs probe.
            if is_sqlite:
                rows = sync_conn.execute(text("PRAGMA table_info(habits)")).fetchall()
                cols = {r[1] for r in rows}
                if col_name in cols:
                    continue
                # SQLite cannot ALTER with NOT NULL + no default in older versions;
                # our defaults above are literal so this works.
                pg_ddl = ddl
                sync_conn.execute(text(f"ALTER TABLE habits ADD COLUMN {col_name} {pg_ddl}"))
            else:
                sync_conn.execute(text(f"ALTER TABLE habits ADD COLUMN IF NOT EXISTS {col_name} {ddl}"))
        except Exception:
            # Best-effort; column likely already exists.
            pass


async def init_db() -> None:
    from app import models  # noqa: F401  register models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_backfill_habit_columns_sync)
