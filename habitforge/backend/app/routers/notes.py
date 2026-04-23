from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.deps import CurrentUser
from app.models import Habit, Note
from app.schemas import NoteCreate, NoteRead, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])

Session = Annotated[AsyncSession, Depends(get_session)]


async def _get_or_404(session: AsyncSession, note_id: int, user_id: str) -> Note:
    res = await session.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user_id)
    )
    note = res.scalars().one_or_none()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


async def _assert_habit_owned(
    session: AsyncSession, habit_id: Optional[int], user_id: str
) -> None:
    if habit_id is None:
        return
    res = await session.execute(
        select(Habit.id).where(Habit.id == habit_id, Habit.user_id == user_id)
    )
    if res.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Habit not found")


@router.get("", response_model=list[NoteRead])
async def list_notes(
    session: Session,
    user_id: CurrentUser,
    q: Optional[str] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    habit_id: Optional[int] = Query(default=None),
) -> list[NoteRead]:
    stmt = select(Note).where(Note.user_id == user_id)

    if q:
        term = f"%{q}%"
        stmt = stmt.where(or_(Note.title.ilike(term), Note.content.ilike(term)))

    if tag:
        stmt = stmt.where(Note.tags.contains([tag]))

    if habit_id is not None:
        stmt = stmt.where(Note.habit_id == habit_id)

    stmt = stmt.order_by(Note.pinned.desc(), Note.updated_at.desc())

    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreate, session: Session, user_id: CurrentUser
) -> NoteRead:
    await _assert_habit_owned(session, payload.habit_id, user_id)
    note = Note(
        user_id=user_id,
        title=payload.title,
        content=payload.content,
        tags=payload.tags,
        pinned=payload.pinned,
        color=payload.color,
        habit_id=payload.habit_id,
    )
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return NoteRead.model_validate(note)


@router.patch("/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: int,
    payload: NoteUpdate,
    session: Session,
    user_id: CurrentUser,
) -> NoteRead:
    note = await _get_or_404(session, note_id, user_id)
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    if "habit_id" in data:
        await _assert_habit_owned(session, data["habit_id"], user_id)
    for k, v in data.items():
        setattr(note, k, v)
    await session.commit()
    await session.refresh(note)
    return NoteRead.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int, session: Session, user_id: CurrentUser
) -> None:
    note = await _get_or_404(session, note_id, user_id)
    await session.delete(note)
    await session.commit()
