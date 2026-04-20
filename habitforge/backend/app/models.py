from __future__ import annotations

import enum
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.utcnow()


class FrequencyType(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    custom_days = "custom_days"


class CompletionStatus(str, enum.Enum):
    done = "done"
    skipped = "skipped"


class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(280), default=None)
    icon: Mapped[str] = mapped_column(String(16), default="🎯")
    color: Mapped[str] = mapped_column(String(9), default="#6366f1")
    frequency_type: Mapped[FrequencyType] = mapped_column(
        Enum(FrequencyType), default=FrequencyType.daily, nullable=False
    )
    target_per_week: Mapped[int] = mapped_column(Integer, default=7)
    # list[int] of weekday ints (Mon=0 .. Sun=6)
    active_days: Mapped[list[int]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=None)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    completions: Mapped[list["Completion"]] = relationship(
        back_populates="habit",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Completion(Base):
    __tablename__ = "completions"
    __table_args__ = (UniqueConstraint("habit_id", "date", name="uq_habit_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    habit_id: Mapped[int] = mapped_column(
        ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[CompletionStatus] = mapped_column(
        Enum(CompletionStatus), default=CompletionStatus.done, nullable=False
    )
    note: Mapped[Optional[str]] = mapped_column(String(500), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)

    habit: Mapped[Habit] = relationship(back_populates="completions")


class TodoPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), default=None)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority: Mapped[TodoPriority] = mapped_column(
        Enum(TodoPriority), default=TodoPriority.medium, nullable=False
    )
    due_date: Mapped[Optional[date]] = mapped_column(Date, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=None)


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tags: Mapped[Optional[list]] = mapped_column(JSON, default=None)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    color: Mapped[Optional[str]] = mapped_column(String(20), default=None)
    habit_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("habits.id", ondelete="SET NULL"), default=None, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, onupdate=_utcnow, nullable=False
    )


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    endpoint: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    p256dh: Mapped[str] = mapped_column(String(200), nullable=False)
    auth: Mapped[str] = mapped_column(String(200), nullable=False)
    expiration_time: Mapped[Optional[datetime]] = mapped_column(DateTime, default=None)
    user_agent: Mapped[Optional[str]] = mapped_column(String(280), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)
