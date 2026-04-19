from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models import CompletionStatus, FrequencyType


def _camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_camel, populate_by_name=True, from_attributes=True
    )


class HabitBase(CamelModel):
    name: str = Field(min_length=1, max_length=60)
    description: Optional[str] = Field(default=None, max_length=280)
    icon: str = "🎯"
    color: str = "#6366f1"
    frequency_type: FrequencyType = FrequencyType.daily
    target_per_week: int = Field(default=7, ge=1, le=7)
    active_days: list[int] = Field(default_factory=list)


class HabitCreate(HabitBase):
    pass


class HabitUpdate(CamelModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    description: Optional[str] = Field(default=None, max_length=280)
    icon: Optional[str] = None
    color: Optional[str] = None
    frequency_type: Optional[FrequencyType] = None
    target_per_week: Optional[int] = Field(default=None, ge=1, le=7)
    active_days: Optional[list[int]] = None
    sort_order: Optional[int] = None


class HabitRead(HabitBase):
    id: int
    created_at: datetime
    archived_at: Optional[datetime] = None
    sort_order: int
    current_streak: int = 0
    longest_streak: int = 0
    completion_rate_30d: float = 0.0
    total_completions: int = 0


class ReorderItem(CamelModel):
    id: int
    sort_order: int


class CompletionIn(CamelModel):
    date: date
    status: CompletionStatus = CompletionStatus.done
    note: Optional[str] = Field(default=None, max_length=500)


class CompletionRead(CamelModel):
    id: int
    habit_id: int
    date: date
    status: CompletionStatus
    note: Optional[str] = None
    created_at: datetime


class HeatmapCell(CamelModel):
    date: date
    count: int
    total: int


class TrendPoint(CamelModel):
    date: date
    rate: float


class DashboardSummary(CamelModel):
    total_habits: int
    completed_today: int
    due_today: int
    overall_current_streak: int
    overall_longest_streak: int
    weekly_completion_rate: float
    last_30_days_trend: list[TrendPoint]
