"""
Streak calculation — brain of the app.

Pure functions: (completions, habit, as_of) -> StreakInfo.
No DB access here. Defensive against duplicates and unordered input.

Rules recap:
  1. Today not-yet-done does NOT break a streak. Anchor on yesterday.
  2. `skipped` status is a planned absence — treat day as "not due".
  3. weekly habits: streak counted in weeks hitting target_per_week.
  4. custom_days: only listed weekdays count; other days are never due.
  5. Deduplicate defensively.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterable

from app.models import CompletionStatus, FrequencyType, Habit, Completion


@dataclass(frozen=True)
class StreakInfo:
    current_streak: int
    longest_streak: int
    completion_rate_30d: float
    total_completions: int


# ---------- helpers ----------

def _dedupe_by_date(completions: Iterable[Completion]) -> dict[date, CompletionStatus]:
    """
    Collapse completions by date. If same date has multiple rows (shouldn't
    happen due to unique constraint, but defensive), prefer 'done' over 'skipped'.
    """
    out: dict[date, CompletionStatus] = {}
    for c in completions:
        existing = out.get(c.date)
        if existing is None:
            out[c.date] = c.status
        elif existing == CompletionStatus.skipped and c.status == CompletionStatus.done:
            out[c.date] = c.status
    return out


def _is_due(habit: Habit, day: date) -> bool:
    """Is this habit 'due' on the given day given its frequency config?"""
    if habit.frequency_type == FrequencyType.daily:
        return True
    if habit.frequency_type == FrequencyType.custom_days:
        return day.weekday() in (habit.active_days or [])
    # weekly habits are evaluated week-by-week, not day-by-day
    return True


# ---------- daily / custom_days ----------

def _daily_streak(
    by_date: dict[date, CompletionStatus],
    habit: Habit,
    as_of: date,
) -> int:
    """
    Walk backward from as_of. Count consecutive days where either:
      - habit wasn't due (custom_days skip), or
      - day has 'done' completion, or
      - day has 'skipped' status (planned absence).
    Break when we hit a due day with no completion.

    Special case: today not yet done does NOT break. If as_of has no
    completion and habit is due today, start counting from yesterday.
    """
    start = as_of
    if _is_due(habit, as_of) and as_of not in by_date:
        start = as_of - timedelta(days=1)

    streak = 0
    day = start
    habit_created = habit.created_at.date() if habit.created_at else date.min
    while day >= habit_created:
        if not _is_due(habit, day):
            day -= timedelta(days=1)
            continue
        status = by_date.get(day)
        if status is None:
            break
        # done OR skipped both keep streak alive
        if status == CompletionStatus.done:
            streak += 1
        # skipped: don't increment, don't break
        day -= timedelta(days=1)
    return streak


def _daily_longest(
    by_date: dict[date, CompletionStatus],
    habit: Habit,
    as_of: date,
) -> int:
    """Longest run of consecutive due-days satisfied (done or skipped)."""
    if not by_date:
        return 0
    habit_created = habit.created_at.date() if habit.created_at else min(by_date)
    start = min(min(by_date), habit_created)
    longest = 0
    run = 0
    day = start
    while day <= as_of:
        if not _is_due(habit, day):
            day += timedelta(days=1)
            continue
        status = by_date.get(day)
        if status == CompletionStatus.done:
            run += 1
            longest = max(longest, run)
        elif status == CompletionStatus.skipped:
            pass  # neither extends nor breaks
        else:
            # today unfinished does not break longest either — only past
            if day == as_of:
                pass
            else:
                run = 0
        day += timedelta(days=1)
    return longest


# ---------- weekly ----------

def _week_key(d: date) -> date:
    """ISO-ish week key: Monday of that week."""
    return d - timedelta(days=d.weekday())


def _weekly_streak(
    by_date: dict[date, CompletionStatus],
    habit: Habit,
    as_of: date,
) -> tuple[int, int]:
    """
    For weekly habits: each week succeeds if 'done' count >= target_per_week.
    Returns (current_streak_weeks, longest_streak_weeks).

    Current week is a grace window: if it hasn't yet hit target, we do NOT
    break the streak — we just don't count it yet. Streak anchors on last
    completed week.
    """
    target = max(1, habit.target_per_week or 1)
    # bucket done counts per week
    week_done: dict[date, int] = {}
    for d, status in by_date.items():
        if status != CompletionStatus.done:
            continue
        week_done[_week_key(d)] = week_done.get(_week_key(d), 0) + 1

    current_week = _week_key(as_of)
    habit_week_start = _week_key(habit.created_at.date()) if habit.created_at else None

    # longest
    longest = 0
    run = 0
    if week_done or habit_week_start:
        start = min([habit_week_start or current_week] + list(week_done.keys()))
        wk = start
        while wk <= current_week:
            hit = week_done.get(wk, 0) >= target
            if wk == current_week and not hit:
                pass  # grace for in-progress week
            elif hit:
                run += 1
                longest = max(longest, run)
            else:
                run = 0
            wk += timedelta(days=7)

    # current: walk back from current_week; grace current if incomplete
    streak = 0
    wk = current_week
    if week_done.get(wk, 0) < target:
        wk -= timedelta(days=7)
    while True:
        if habit_week_start and wk < habit_week_start:
            break
        if week_done.get(wk, 0) >= target:
            streak += 1
            wk -= timedelta(days=7)
        else:
            break
    return streak, longest


# ---------- rate / totals ----------

def _completion_rate_30d(
    by_date: dict[date, CompletionStatus],
    habit: Habit,
    as_of: date,
) -> float:
    """
    Rate = done / due across last 30 days (inclusive of as_of).
    Skipped days are excluded from denominator. Non-due days excluded.
    """
    window_start = as_of - timedelta(days=29)
    due = 0
    done = 0
    day = window_start
    while day <= as_of:
        if habit.frequency_type == FrequencyType.weekly:
            # approximate: each week contributes target_per_week "due" slots
            # distributed evenly; simpler: count Mon as due-slot of week.
            if day.weekday() == 0:
                due += habit.target_per_week or 1
                wk = _week_key(day)
                week_done = sum(
                    1
                    for d, s in by_date.items()
                    if _week_key(d) == wk and s == CompletionStatus.done
                )
                done += min(week_done, habit.target_per_week or 1)
        elif _is_due(habit, day):
            status = by_date.get(day)
            if status == CompletionStatus.skipped:
                pass
            else:
                due += 1
                if status == CompletionStatus.done:
                    done += 1
        day += timedelta(days=1)
    if due == 0:
        return 0.0
    return round(done / due, 4)


# ---------- public API ----------

def compute_streak(
    completions: list[Completion],
    habit: Habit,
    as_of: date,
) -> StreakInfo:
    by_date = _dedupe_by_date(completions)
    total_done = sum(1 for s in by_date.values() if s == CompletionStatus.done)

    if habit.frequency_type == FrequencyType.weekly:
        current, longest = _weekly_streak(by_date, habit, as_of)
    else:
        current = _daily_streak(by_date, habit, as_of)
        longest = _daily_longest(by_date, habit, as_of)
        longest = max(longest, current)

    rate = _completion_rate_30d(by_date, habit, as_of)
    return StreakInfo(
        current_streak=current,
        longest_streak=longest,
        completion_rate_30d=rate,
        total_completions=total_done,
    )
