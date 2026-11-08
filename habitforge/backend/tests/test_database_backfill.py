"""init_db must upgrade a database created before the reminder columns existed.

Runs against SQLite always. Set HABITFORGE_TEST_PG_URL (a throwaway database —
the public schema is dropped) to also run against Postgres, where a failing
ALTER used to abort the whole startup transaction.
"""
from __future__ import annotations

import os

import pytest
from sqlalchemy import inspect, text

from app.database import _HABIT_BACKFILL_COLUMNS
from tests.conftest import _reload_app_modules

_PG_URL = os.getenv("HABITFORGE_TEST_PG_URL")

_LEGACY_HABITS_DDL = """
CREATE TABLE habits (
    id INTEGER PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(60) NOT NULL,
    description VARCHAR(280),
    icon VARCHAR(16),
    color VARCHAR(9),
    frequency_type VARCHAR(11) NOT NULL DEFAULT 'daily',
    target_per_week INTEGER,
    active_days JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    sort_order INTEGER NOT NULL DEFAULT 0,
    habit_type VARCHAR(20) NOT NULL DEFAULT 'positive'
)
"""


@pytest.fixture(
    params=[
        "sqlite",
        pytest.param(
            "postgres",
            marks=pytest.mark.skipif(not _PG_URL, reason="HABITFORGE_TEST_PG_URL not set"),
        ),
    ]
)
def legacy_db(request, isolated_db: str):
    if request.param == "postgres":
        # isolated_db restores the previous HABITFORGE_DB_URL on teardown.
        os.environ["HABITFORGE_DB_URL"] = _PG_URL
        _reload_app_modules()
    return request.param


async def test_init_db_backfills_legacy_habits_table(legacy_db: str):
    from app import database

    async with database.engine.begin() as conn:
        if legacy_db == "postgres":
            await conn.execute(text("DROP SCHEMA public CASCADE"))
            await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text(_LEGACY_HABITS_DDL))
        await conn.execute(text("INSERT INTO habits (id, user_id, name) VALUES (1, 'u1', 'legacy')"))

    await database.init_db()
    # Idempotent: a second startup must not fail or duplicate anything.
    await database.init_db()

    def _schema(sync_conn):
        insp = inspect(sync_conn)
        return set(insp.get_table_names()), {c["name"] for c in insp.get_columns("habits")}

    async with database.engine.connect() as conn:
        tables, columns = await conn.run_sync(_schema)
        row = (
            await conn.execute(
                text(
                    "SELECT reminder_enabled, reminder_deadline, reminder_timezone,"
                    " reminder_max_per_day, streak_risk_threshold FROM habits WHERE id = 1"
                )
            )
        ).one()
    await database.engine.dispose()

    assert {name for name, _ in _HABIT_BACKFILL_COLUMNS} <= columns
    # create_all runs in the same transaction; it must not be rolled back.
    assert {"completions", "todos", "notes", "reminder_logs", "push_subscriptions"} <= tables
    assert (bool(row[0]), row[1], row[2], row[3], row[4]) == (False, None, "UTC", 2, 3)
