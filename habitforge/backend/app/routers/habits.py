from __future__ import annotations

from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Habit
from app.schemas import HabitCreate, HabitRead, HabitUpdate, ReorderItem
from app.services.streak import compute_streak

router = APIRouter(prefix="/habits", tags=["habits"])

Session = Annotated[AsyncSession, Depends(get_session)]


def _to_read(h: Habit, as_of: date | None = None) -> HabitRead:
    as_of = as_of or date.today()
    info = compute_streak(list(h.completions), h, as_of)
    data = {
        "id": h.id,
        "name": h.name,
        "description": h.description,
        "icon": h.icon,
        "color": h.color,
        "frequency_type": h.frequency_type,
        "target_per_week": h.target_per_week,
        "active_days": h.active_days or [],
        "created_at": h.created_at,
        "archived_at": h.archived_at,
        "sort_order": h.sort_order,
        "current_streak": info.current_streak,
        "longest_streak": info.longest_streak,
        "completion_rate_30d": info.completion_rate_30d,
        "total_completions": info.total_completions,
    }
    return HabitRead.model_validate(data)


@router.get("", response_model=list[HabitRead])
async def list_habits(
    session: Session,
    include_archived: bool = Query(default=False),
) -> list[HabitRead]:
    stmt = select(Habit).order_by(Habit.sort_order, Habit.id)
    if not include_archived:
        stmt = stmt.where(Habit.archived_at.is_(None))
    res = await session.execute(stmt)
    habits = res.scalars().unique().all()
    return [_to_read(h) for h in habits]


@router.post("", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
async def create_habit(payload: HabitCreate, session: Session) -> HabitRead:
    # pick next sort_order
    res = await session.execute(select(Habit))
    existing = res.scalars().unique().all()
    next_order = (max((h.sort_order for h in existing), default=-1)) + 1

    h = Habit(
        name=payload.name,
        description=payload.description,
        icon=payload.icon,
        color=payload.color,
        frequency_type=payload.frequency_type,
        target_per_week=payload.target_per_week,
        active_days=payload.active_days,
        sort_order=next_order,
    )
    session.add(h)
    await session.commit()
    await session.refresh(h, attribute_names=["completions"])
    return _to_read(h)


async def _get_or_404(session: AsyncSession, habit_id: int) -> Habit:
    res = await session.execute(select(Habit).where(Habit.id == habit_id))
    h = res.scalars().unique().one_or_none()
    if h is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    return h


@router.get("/{habit_id}", response_model=HabitRead)
async def get_habit(habit_id: int, session: Session) -> HabitRead:
    h = await _get_or_404(session, habit_id)
    return _to_read(h)


@router.patch("/{habit_id}", response_model=HabitRead)
async def update_habit(
    habit_id: int, payload: HabitUpdate, session: Session
) -> HabitRead:
    h = await _get_or_404(session, habit_id)
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    for k, v in data.items():
        setattr(h, k, v)
    await session.commit()
    await session.refresh(h, attribute_names=["completions"])
    return _to_read(h)


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_habit(habit_id: int, session: Session) -> None:
    h = await _get_or_404(session, habit_id)
    h.archived_at = datetime.utcnow()
    await session.commit()


@router.post("/{habit_id}/restore", response_model=HabitRead)
async def restore_habit(habit_id: int, session: Session) -> HabitRead:
    h = await _get_or_404(session, habit_id)
    h.archived_at = None
    await session.commit()
    await session.refresh(h, attribute_names=["completions"])
    return _to_read(h)


@router.post("/reorder", response_model=list[HabitRead])
async def reorder_habits(
    items: list[ReorderItem], session: Session
) -> list[HabitRead]:
    ids = [i.id for i in items]
    res = await session.execute(select(Habit).where(Habit.id.in_(ids)))
    by_id = {h.id: h for h in res.scalars().unique().all()}
    for item in items:
        if item.id in by_id:
            by_id[item.id].sort_order = item.sort_order
    await session.commit()
    # return fresh list
    res = await session.execute(
        select(Habit)
        .where(Habit.archived_at.is_(None))
        .order_by(Habit.sort_order, Habit.id)
    )
    return [_to_read(h) for h in res.scalars().unique().all()]
