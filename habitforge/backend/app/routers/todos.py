from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Todo
from app.schemas import TodoCreate, TodoRead, TodoUpdate

router = APIRouter(prefix="/todos", tags=["todos"])

Session = Annotated[AsyncSession, Depends(get_session)]


async def _get_or_404(session: AsyncSession, todo_id: int) -> Todo:
    res = await session.execute(select(Todo).where(Todo.id == todo_id))
    todo = res.scalars().one_or_none()
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@router.get("", response_model=list[TodoRead])
async def list_todos(
    session: Session,
    include_completed: bool = Query(default=True),
) -> list[TodoRead]:
    stmt = select(Todo).order_by(Todo.completed, Todo.created_at.desc())
    if not include_completed:
        stmt = stmt.where(Todo.completed.is_(False))
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.post("", response_model=TodoRead, status_code=status.HTTP_201_CREATED)
async def create_todo(payload: TodoCreate, session: Session) -> TodoRead:
    todo = Todo(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
    )
    session.add(todo)
    await session.commit()
    await session.refresh(todo)
    return TodoRead.model_validate(todo)


@router.patch("/{todo_id}", response_model=TodoRead)
async def update_todo(
    todo_id: int, payload: TodoUpdate, session: Session
) -> TodoRead:
    todo = await _get_or_404(session, todo_id)
    data = payload.model_dump(exclude_unset=True, by_alias=False)

    # handle completed toggling — set/clear completed_at
    if "completed" in data:
        new_completed = data.pop("completed")
        todo.completed = new_completed
        todo.completed_at = datetime.now(timezone.utc).replace(tzinfo=None) if new_completed else None

    for k, v in data.items():
        setattr(todo, k, v)

    await session.commit()
    await session.refresh(todo)
    return TodoRead.model_validate(todo)


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(todo_id: int, session: Session) -> None:
    todo = await _get_or_404(session, todo_id)
    await session.delete(todo)
    await session.commit()
