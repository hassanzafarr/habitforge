"""Reminder scheduler — APScheduler tick that fires deadline pushes.

One AsyncIOScheduler runs inside the FastAPI process. Every minute it scans
habits whose deadline has passed in their local timezone and sends a push if:

- habit is due today
- not already completed today
- not under active snooze
- under per-day reminder cap
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import SessionLocal
from app.models import (
    Completion,
    CompletionStatus,
    FrequencyType,
    Habit,
    ReminderKind,
    ReminderLog,
)
from app.services.push_sender import send_to_user, vapid_ready
from app.services.streak import compute_streak

log = logging.getLogger("habitforge.reminders")


def _is_due_today(habit: Habit, local_today: date) -> bool:
    if habit.frequency_type == FrequencyType.daily:
        return True
    if habit.frequency_type == FrequencyType.custom_days:
        return local_today.weekday() in (habit.active_days or [])
    # weekly habits: always candidate; cap protects spam
    return True


def _parse_deadline(deadline: str | None) -> tuple[int, int] | None:
    if not deadline or ":" not in deadline:
        return None
    try:
        h, m = deadline.split(":", 1)
        return int(h), int(m)
    except ValueError:
        return None


def _tz(habit: Habit) -> ZoneInfo:
    try:
        return ZoneInfo(habit.reminder_timezone or "UTC")
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _build_payload(habit: Habit, kind: ReminderKind, current_streak: int) -> dict:
    if kind == ReminderKind.streak_risk:
        title = f"⚠️ {habit.name} — streak at risk!"
        body = (
            f"Don't break your {current_streak}-day streak. "
            f"Check in before midnight."
        )
    else:
        title = f"⏰ {habit.name} reminder"
        body = "Deadline passed — still time to check in today."
    return {
        "title": title,
        "body": body,
        "url": "/habits",
        "habitId": habit.id,
        "streakRisk": kind == ReminderKind.streak_risk,
        "tag": f"habit-{habit.id}",
    }


async def _process_habit(session: AsyncSession, habit: Habit, now_utc: datetime) -> None:
    if not habit.reminder_enabled or not habit.reminder_deadline:
        return
    if habit.archived_at is not None:
        return

    tz = _tz(habit)
    local_now = now_utc.astimezone(tz)
    local_today = local_now.date()

    if not _is_due_today(habit, local_today):
        return

    deadline = _parse_deadline(habit.reminder_deadline)
    if deadline is None:
        return
    deadline_local = local_now.replace(
        hour=deadline[0], minute=deadline[1], second=0, microsecond=0
    )
    if local_now < deadline_local:
        return

    # Already completed today?
    res = await session.execute(
        select(Completion).where(
            Completion.habit_id == habit.id,
            Completion.date == local_today,
            Completion.status == CompletionStatus.done,
        )
    )
    if res.scalars().first() is not None:
        return

    # Reminder log lookups (today, snooze)
    day_start_utc = (
        local_now.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    )
    log_res = await session.execute(
        select(ReminderLog)
        .where(
            ReminderLog.habit_id == habit.id,
            ReminderLog.fired_at >= day_start_utc,
        )
        .order_by(ReminderLog.fired_at.desc())
    )
    todays_logs = log_res.scalars().all()

    # Active snooze?
    for entry in todays_logs:
        if entry.kind == ReminderKind.snoozed and entry.snoozed_until:
            if entry.snoozed_until > now_utc.replace(tzinfo=None):
                return

    # Cap: count non-snooze entries today
    fired_today = sum(1 for e in todays_logs if e.kind != ReminderKind.snoozed)
    if fired_today >= (habit.reminder_max_per_day or 2):
        return

    # Streak-risk classification
    info = compute_streak(list(habit.completions), habit, local_today)
    kind = (
        ReminderKind.streak_risk
        if info.current_streak >= (habit.streak_risk_threshold or 3)
        else ReminderKind.deadline
    )

    payload = _build_payload(habit, kind, info.current_streak)
    result = await send_to_user(session, habit.user_id, payload)
    if result.sent > 0:
        session.add(
            ReminderLog(
                habit_id=habit.id,
                user_id=habit.user_id,
                kind=kind,
                fired_at=now_utc.replace(tzinfo=None),
            )
        )
        await session.commit()
        log.info(
            "Reminder fired habit=%s kind=%s sent=%d", habit.id, kind.value, result.sent
        )


async def scan_due_reminders() -> None:
    if not vapid_ready():
        return
    now_utc = datetime.utcnow().replace(tzinfo=ZoneInfo("UTC"))
    async with SessionLocal() as session:
        res = await session.execute(
            select(Habit).where(
                Habit.reminder_enabled.is_(True),
                Habit.archived_at.is_(None),
            )
        )
        habits = res.scalars().unique().all()
        for habit in habits:
            try:
                await _process_habit(session, habit, now_utc)
            except Exception:
                log.exception("Reminder processing failed for habit %s", habit.id)


def start_reminder_scheduler() -> AsyncIOScheduler | None:
    if os.getenv("HABITFORGE_REMINDERS_ENABLED", "true").lower() not in (
        "1",
        "true",
        "yes",
        "on",
    ):
        log.info("Reminder scheduler disabled by env")
        return None
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        scan_due_reminders,
        "interval",
        seconds=int(os.getenv("HABITFORGE_REMINDER_TICK_SECONDS", "60")),
        id="scan_due_reminders",
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    log.info("Reminder scheduler started")
    return scheduler
