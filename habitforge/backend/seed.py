"""Seed DB with 4 sample habits + 60 days of realistic completions.

Usage:
  python seed.py <clerk_user_id>

You can find your Clerk user ID in the Clerk dashboard (starts with "user_").
"""
from __future__ import annotations

import asyncio
import random
import sys
from datetime import date, datetime, timedelta

from sqlalchemy import delete

from app.database import SessionLocal, init_db
from app.models import Completion, CompletionStatus, FrequencyType, Habit

random.seed(42)

SAMPLES = [
    dict(
        name="Drink Water",
        description="8 glasses per day",
        icon="💧",
        color="#06b6d4",
        frequency_type=FrequencyType.daily,
        target_per_week=7,
        active_days=[],
        sort_order=0,
        consistency=0.85,
    ),
    dict(
        name="Read 20 minutes",
        description="Non-fiction or novel",
        icon="📚",
        color="#6366f1",
        frequency_type=FrequencyType.daily,
        target_per_week=7,
        active_days=[],
        sort_order=1,
        consistency=0.7,
    ),
    dict(
        name="Workout",
        description="Gym or home session",
        icon="🏋️",
        color="#ef4444",
        frequency_type=FrequencyType.weekly,
        target_per_week=3,
        active_days=[],
        sort_order=2,
        consistency=0.75,
    ),
    dict(
        name="Journal",
        description="Evening reflection",
        icon="📝",
        color="#22c55e",
        frequency_type=FrequencyType.custom_days,
        target_per_week=5,
        active_days=[0, 1, 2, 3, 4],  # weekdays
        sort_order=3,
        consistency=0.8,
    ),
]


async def main(user_id: str) -> None:
    await init_db()
    async with SessionLocal() as session:
        await session.execute(delete(Completion))
        await session.execute(delete(Habit).where(Habit.user_id == user_id))
        await session.commit()

        today = date.today()

        for cfg in SAMPLES:
            consistency = cfg.pop("consistency")
            h = Habit(
                user_id=user_id,
                created_at=datetime.utcnow() - timedelta(days=60),
                **cfg,
            )
            session.add(h)
            await session.flush()

            for i in range(60, -1, -1):
                day = today - timedelta(days=i)
                # frequency-aware due check
                if h.frequency_type == FrequencyType.custom_days:
                    if day.weekday() not in h.active_days:
                        continue
                if random.random() < consistency:
                    status = (
                        CompletionStatus.skipped
                        if random.random() < 0.05
                        else CompletionStatus.done
                    )
                    note = None
                    if random.random() < 0.08:
                        note = random.choice(
                            ["felt great", "quick session", "low energy", "nailed it"]
                        )
                    session.add(
                        Completion(
                            habit_id=h.id, date=day, status=status, note=note
                        )
                    )
        await session.commit()
        print(f"Seeded 4 habits with ~60 days of completions for user {user_id}.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python seed.py <clerk_user_id>", file=sys.stderr)
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
