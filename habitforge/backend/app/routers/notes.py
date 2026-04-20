from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Note
from app.schemas import NoteCreate, NoteRead, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])

Session = Annotated[AsyncSession, Depends(get_session)]


async def _get_or_404(session: AsyncSession, note_id: int) -> Note:
    res = await session.execute(select(Note).where(Note.id == note_id))
    note = res.scalars().one_or_none()
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.get("", response_model=list[NoteRead])
async def list_notes(
    session: Session,
    q: Optional[str] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    habit_id: Optional[int] = Query(default=None),
) -> list[NoteRead]:
    stmt = select(Note)

    if q:
        term = f"%{q}%"
        stmt = stmt.where(or_(Note.title.ilike(term), Note.content.ilike(term)))

    if tag:
        # JSON array contains check — works for both SQLite and Postgres
        stmt = stmt.where(Note.tags.contains([tag]))

    if habit_id is not None:
        stmt = stmt.where(Note.habit_id == habit_id)

    # Pinned notes first, then most recently updated
    stmt = stmt.order_by(Note.pinned.desc(), Note.updated_at.desc())

    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(payload: NoteCreate, session: Session) -> NoteRead:
    note = Note(
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
async def update_note(note_id: int, payload: NoteUpdate, session: Session) -> NoteRead:
    note = await _get_or_404(session, note_id)
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    for k, v in data.items():
        setattr(note, k, v)
    await session.commit()
    await session.refresh(note)
    return NoteRead.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: int, session: Session) -> None:
    note = await _get_or_404(session, note_id)
    await session.delete(note)
    await session.commit()
