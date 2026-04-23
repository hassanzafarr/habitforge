from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.deps import CurrentUser
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


async def _habit_or_404(
    session: AsyncSession, habit_id: int, user_id: str
) -> Habit:
    res = await session.execute(
        select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id)
    )
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
    habit_id: int,
    payload: CompletionIn,
    session: Session,
    user_id: CurrentUser,
) -> CompletionRead:
    await _habit_or_404(session, habit_id, user_id)
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
async def delete_completion(
    habit_id: int, d: date, session: Session, user_id: CurrentUser
) -> None:
    await _habit_or_404(session, habit_id, user_id)
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
    user_id: CurrentUser,
    from_: date = Query(alias="from"),
    to: date = Query(...),
) -> list[CompletionRead]:
    await _habit_or_404(session, habit_id, user_id)
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
    return True


@router.get("/completions/heatmap", response_model=list[HeatmapCell])
async def heatmap(
    session: Session,
    user_id: CurrentUser,
    from_: date = Query(alias="from"),
    to: date = Query(...),
) -> list[HeatmapCell]:
    res = await session.execute(
        select(Habit).where(Habit.user_id == user_id, Habit.archived_at.is_(None))
    )
    habits = res.scalars().unique().all()
    habit_ids = [h.id for h in habits]

    done_counts: dict[date, int] = defaultdict(int)
    if habit_ids:
        res = await session.execute(
            select(Completion).where(
                and_(
                    Completion.habit_id.in_(habit_ids),
                    Completion.date >= from_,
                    Completion.date <= to,
                )
            )
        )
        for c in res.scalars().all():
            if c.status == CompletionStatus.done:
                done_counts[c.date] += 1

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
async def dashboard_summary(
    session: Session, user_id: CurrentUser
) -> DashboardSummary:
    today = date.today()
    res = await session.execute(
        select(Habit).where(Habit.user_id == user_id, Habit.archived_at.is_(None))
    )
    habits = res.scalars().unique().all()

    due_today = sum(1 for h in habits if _is_due(h, today))
    completed_today = 0
    overall_current = 0
    overall_longest = 0
    weekly_done = 0
    weekly_due = 0

    week_start = today - timedelta(days=today.weekday())
    window_start = today - timedelta(days=29)

    for h in habits:
        hcomps = list(h.completions)
        info = compute_streak(hcomps, h, today)
        overall_current += info.current_streak
        overall_longest = max(overall_longest, info.longest_streak)

        for c in hcomps:
            if c.date == today and c.status == CompletionStatus.done:
                completed_today += 1
                break

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
