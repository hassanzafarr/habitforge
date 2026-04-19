from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Completion, CompletionStatus, FrequencyType, Habit
from app.schemas import (
    CompletionIn,
    CompletionRead,
    DashboardSummary,
    HeatmapCell,
    TrendPoint,
)
from app.services.streak import compute_streak

router = APIRouter(tags=["completions"])

Session = Annotated[AsyncSession, Depends(get_session)]


async def _habit_or_404(session: AsyncSession, habit_id: int) -> Habit:
    res = await session.execute(select(Habit).where(Habit.id == habit_id))
    h = res.scalars().unique().one_or_none()
    if h is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    return h


@router.post(
    "/habits/{habit_id}/completions",
    response_model=CompletionRead,
    status_code=status.HTTP_200_OK,
)
async def upsert_completion(
    habit_id: int, payload: CompletionIn, session: Session
) -> CompletionRead:
    await _habit_or_404(session, habit_id)
    res = await session.execute(
        select(Completion).where(
            and_(Completion.habit_id == habit_id, Completion.date == payload.date)
        )
    )
    existing = res.scalars().one_or_none()
    if existing:
        existing.status = payload.status
        existing.note = payload.note
        await session.commit()
        await session.refresh(existing)
        return CompletionRead.model_validate(existing)
    c = Completion(
        habit_id=habit_id,
        date=payload.date,
        status=payload.status,
        note=payload.note,
    )
    session.add(c)
    await session.commit()
    await session.refresh(c)
    return CompletionRead.model_validate(c)


@router.delete(
    "/habits/{habit_id}/completions/{d}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_completion(habit_id: int, d: date, session: Session) -> None:
    res = await session.execute(
        select(Completion).where(
            and_(Completion.habit_id == habit_id, Completion.date == d)
        )
    )
    c = res.scalars().one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Completion not found")
    await session.delete(c)
    await session.commit()


@router.get(
    "/habits/{habit_id}/completions", response_model=list[CompletionRead]
)
async def list_completions(
    habit_id: int,
    session: Session,
    from_: date = Query(alias="from"),
    to: date = Query(...),
) -> list[CompletionRead]:
    res = await session.execute(
        select(Completion)
        .where(
            and_(
                Completion.habit_id == habit_id,
                Completion.date >= from_,
                Completion.date <= to,
            )
        )
        .order_by(Completion.date)
    )
    return [CompletionRead.model_validate(c) for c in res.scalars().all()]


def _is_due(habit: Habit, day: date) -> bool:
    if habit.frequency_type == FrequencyType.daily:
        return True
    if habit.frequency_type == FrequencyType.custom_days:
        return day.weekday() in (habit.active_days or [])
    # weekly -> treat every day as a potential slot up to target_per_week
    return True


@router.get("/completions/heatmap", response_model=list[HeatmapCell])
async def heatmap(
    session: Session,
    from_: date = Query(alias="from"),
    to: date = Query(...),
) -> list[HeatmapCell]:
    # Active habits
    res = await session.execute(select(Habit).where(Habit.archived_at.is_(None)))
    habits = res.scalars().unique().all()

    # Completions in range
    res = await session.execute(
        select(Completion).where(
            and_(Completion.date >= from_, Completion.date <= to)
        )
    )
    comps = res.scalars().all()
    done_counts: dict[date, int] = defaultdict(int)
    for c in comps:
        if c.status == CompletionStatus.done:
            done_counts[c.date] += 1

    # Due counts per day
    cells: list[HeatmapCell] = []
    day = from_
    while day <= to:
        total = sum(1 for h in habits if _is_due(h, day))
        cells.append(
            HeatmapCell(date=day, count=done_counts.get(day, 0), total=total)
        )
        day += timedelta(days=1)
    return cells


@router.get("/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(session: Session) -> DashboardSummary:
    today = date.today()
    res = await session.execute(select(Habit).where(Habit.archived_at.is_(None)))
    habits = res.scalars().unique().all()

    due_today = sum(1 for h in habits if _is_due(h, today))
    completed_today = 0
    overall_current = 0
    overall_longest = 0
    weekly_done = 0
    weekly_due = 0

    week_start = today - timedelta(days=today.weekday())

    # Pre-fetch all completions in last 30 days (and this week)
    window_start = today - timedelta(days=29)
    res = await session.execute(
        select(Completion).where(Completion.date >= window_start)
    )
    comps_all = res.scalars().all()
    by_habit: dict[int, list[Completion]] = defaultdict(list)
    for c in comps_all:
        by_habit[c.habit_id].append(c)

    for h in habits:
        hcomps = list(h.completions)
        info = compute_streak(hcomps, h, today)
        overall_current += info.current_streak
        overall_longest = max(overall_longest, info.longest_streak)

        # completed today
        for c in hcomps:
            if c.date == today and c.status == CompletionStatus.done:
                completed_today += 1
                break

        # weekly rate: count done vs due this week
        day = week_start
        while day <= today:
            if _is_due(h, day):
                weekly_due += 1
                for c in hcomps:
                    if c.date == day and c.status == CompletionStatus.done:
                        weekly_done += 1
                        break
            day += timedelta(days=1)

    weekly_rate = round(weekly_done / weekly_due, 4) if weekly_due else 0.0

    # 30-day trend: daily overall rate
    trend: list[TrendPoint] = []
    day = window_start
    while day <= today:
        due = sum(1 for h in habits if _is_due(h, day))
        done = 0
        if due:
            for h in habits:
                if not _is_due(h, day):
                    continue
                for c in h.completions:
                    if c.date == day and c.status == CompletionStatus.done:
                        done += 1
                        break
        rate = round(done / due, 4) if due else 0.0
        trend.append(TrendPoint(date=day, rate=rate))
        day += timedelta(days=1)

    return DashboardSummary(
        total_habits=len(habits),
        completed_today=completed_today,
        due_today=due_today,
        overall_current_streak=overall_current,
        overall_longest_streak=overall_longest,
        weekly_completion_rate=weekly_rate,
        last_30_days_trend=trend,
    )
