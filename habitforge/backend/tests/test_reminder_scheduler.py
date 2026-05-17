"""Tests for the reminder scheduler scan logic.

Mocks out `send_to_user` to avoid real web-push calls. Drives `_process_habit`
with fabricated `datetime.utcnow` values via passing the `now_utc` arg directly.
"""

from __future__ import annotations

import os
import tempfile
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, patch
from zoneinfo import ZoneInfo

import pytest
import pytest_asyncio
from sqlalchemy import select


@pytest_asyncio.fixture
async def session_factory():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.environ["HABITFORGE_DB_URL"] = f"sqlite+aiosqlite:///{path}"

    import importlib

    from app import database, models
    from app.services import reminder_scheduler as rs

    importlib.reload(database)
    importlib.reload(models)
    importlib.reload(rs)

    await database.init_db()
    yield database.SessionLocal, models, rs

    try:
        os.remove(path)
    except OSError:
        pass


def _utc(year, month, day, hour, minute=0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=ZoneInfo("UTC"))


@pytest.mark.asyncio
async def test_no_send_before_deadline(session_factory):
    SessionLocal, models, rs = session_factory
    async with SessionLocal() as s:
        h = models.Habit(
            user_id="u1",
            name="Gym",
            reminder_enabled=True,
            reminder_deadline="20:00",
            reminder_timezone="UTC",
        )
        s.add(h)
        await s.commit()
        await s.refresh(h, attribute_names=["completions"])

        sender = AsyncMock(return_value=rs.send_to_user.__wrapped__ if False else None)
        with patch.object(rs, "send_to_user", new=AsyncMock(return_value=type("R", (), {"sent": 0, "removed": 0, "total": 0})())):
            await rs._process_habit(s, h, _utc(2026, 5, 15, 19, 0))
            res = await s.execute(select(models.ReminderLog))
            assert res.scalars().all() == []


@pytest.mark.asyncio
async def test_send_after_deadline_writes_log(session_factory):
    SessionLocal, models, rs = session_factory
    async with SessionLocal() as s:
        h = models.Habit(
            user_id="u1",
            name="Gym",
            reminder_enabled=True,
            reminder_deadline="20:00",
            reminder_timezone="UTC",
        )
        s.add(h)
        await s.commit()
        await s.refresh(h, attribute_names=["completions"])

        fake_result = type("R", (), {"sent": 1, "removed": 0, "total": 1})()
        with patch.object(rs, "send_to_user", new=AsyncMock(return_value=fake_result)):
            await rs._process_habit(s, h, _utc(2026, 5, 15, 21, 0))

        res = await s.execute(select(models.ReminderLog))
        logs = res.scalars().all()
        assert len(logs) == 1
        assert logs[0].kind == models.ReminderKind.deadline


@pytest.mark.asyncio
async def test_streak_risk_kind_when_streak_meets_threshold(session_factory):
    SessionLocal, models, rs = session_factory
    async with SessionLocal() as s:
        h = models.Habit(
            user_id="u1",
            name="Gym",
            reminder_enabled=True,
            reminder_deadline="20:00",
            reminder_timezone="UTC",
            streak_risk_threshold=3,
            created_at=datetime(2026, 5, 1),
        )
        s.add(h)
        await s.commit()
        # add 5 done completions in days before today
        today = date(2026, 5, 15)
        for offset in range(1, 6):
            s.add(
                models.Completion(
                    habit_id=h.id,
                    date=today - timedelta(days=offset),
                    status=models.CompletionStatus.done,
                )
            )
        await s.commit()
        await s.refresh(h, attribute_names=["completions"])

        fake_result = type("R", (), {"sent": 1, "removed": 0, "total": 1})()
        with patch.object(rs, "send_to_user", new=AsyncMock(return_value=fake_result)):
            await rs._process_habit(s, h, _utc(2026, 5, 15, 21, 0))

        res = await s.execute(select(models.ReminderLog))
        logs = res.scalars().all()
        assert len(logs) == 1
        assert logs[0].kind == models.ReminderKind.streak_risk


@pytest.mark.asyncio
async def test_respects_daily_cap(session_factory):
    SessionLocal, models, rs = session_factory
    async with SessionLocal() as s:
        h = models.Habit(
            user_id="u1",
            name="Gym",
            reminder_enabled=True,
            reminder_deadline="20:00",
            reminder_timezone="UTC",
            reminder_max_per_day=1,
        )
        s.add(h)
        await s.commit()
        await s.refresh(h, attribute_names=["completions"])

        # Pre-existing reminder fired today
        s.add(
            models.ReminderLog(
                habit_id=h.id,
                user_id="u1",
                kind=models.ReminderKind.deadline,
                fired_at=datetime(2026, 5, 15, 20, 5),
            )
        )
        await s.commit()

        fake_result = type("R", (), {"sent": 1, "removed": 0, "total": 1})()
        with patch.object(rs, "send_to_user", new=AsyncMock(return_value=fake_result)) as mock_send:
            await rs._process_habit(s, h, _utc(2026, 5, 15, 21, 0))
            mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_respects_active_snooze(session_factory):
    SessionLocal, models, rs = session_factory
    async with SessionLocal() as s:
        h = models.Habit(
            user_id="u1",
            name="Gym",
            reminder_enabled=True,
            reminder_deadline="20:00",
            reminder_timezone="UTC",
        )
        s.add(h)
        await s.commit()
        await s.refresh(h, attribute_names=["completions"])

        s.add(
            models.ReminderLog(
                habit_id=h.id,
                user_id="u1",
                kind=models.ReminderKind.snoozed,
                fired_at=datetime(2026, 5, 15, 20, 5),
                snoozed_until=datetime(2026, 5, 15, 22, 0),
            )
        )
        await s.commit()

        fake_result = type("R", (), {"sent": 1, "removed": 0, "total": 1})()
        with patch.object(rs, "send_to_user", new=AsyncMock(return_value=fake_result)) as mock_send:
            await rs._process_habit(s, h, _utc(2026, 5, 15, 21, 0))
            mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_skip_when_completed_today(session_factory):
    SessionLocal, models, rs = session_factory
    async with SessionLocal() as s:
        h = models.Habit(
            user_id="u1",
            name="Gym",
            reminder_enabled=True,
            reminder_deadline="20:00",
            reminder_timezone="UTC",
        )
        s.add(h)
        await s.commit()
        s.add(
            models.Completion(
                habit_id=h.id,
                date=date(2026, 5, 15),
                status=models.CompletionStatus.done,
            )
        )
        await s.commit()
        await s.refresh(h, attribute_names=["completions"])

        fake_result = type("R", (), {"sent": 1, "removed": 0, "total": 1})()
        with patch.object(rs, "send_to_user", new=AsyncMock(return_value=fake_result)) as mock_send:
            await rs._process_habit(s, h, _utc(2026, 5, 15, 21, 0))
            mock_send.assert_not_called()
