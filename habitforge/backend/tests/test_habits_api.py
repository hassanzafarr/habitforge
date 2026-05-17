from __future__ import annotations

from datetime import date

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    r = await client.get("/api/health")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_create_list_habit(client: AsyncClient):
    r = await client.post("/api/habits", json={"name": "Read", "icon": "📚"})
    assert r.status_code == 201, r.text
    habit = r.json()
    assert habit["name"] == "Read"
    assert habit["icon"] == "📚"
    assert "currentStreak" in habit

    r = await client.get("/api/habits")
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_upsert_completion_idempotent(client: AsyncClient):
    r = await client.post("/api/habits", json={"name": "Walk"})
    hid = r.json()["id"]
    today = date.today().isoformat()

    r1 = await client.post(
        f"/api/habits/{hid}/completions", json={"date": today, "status": "done"}
    )
    r2 = await client.post(
        f"/api/habits/{hid}/completions",
        json={"date": today, "status": "done", "note": "felt good"},
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]
    assert r2.json()["note"] == "felt good"


@pytest.mark.asyncio
async def test_archive_and_restore(client: AsyncClient):
    r = await client.post("/api/habits", json={"name": "Meditate"})
    hid = r.json()["id"]
    r = await client.delete(f"/api/habits/{hid}")
    assert r.status_code == 204
    r = await client.get("/api/habits")
    assert len(r.json()) == 0
    r = await client.get("/api/habits?include_archived=true")
    assert len(r.json()) == 1
    r = await client.post(f"/api/habits/{hid}/restore")
    assert r.status_code == 200
    assert r.json()["archivedAt"] is None


@pytest.mark.asyncio
async def test_reminder_fields_roundtrip(client: AsyncClient):
    r = await client.post(
        "/api/habits",
        json={
            "name": "Gym",
            "reminderEnabled": True,
            "reminderDeadline": "20:00",
            "reminderTimezone": "Asia/Karachi",
            "reminderMaxPerDay": 3,
            "streakRiskThreshold": 5,
        },
    )
    assert r.status_code == 201, r.text
    h = r.json()
    assert h["reminderEnabled"] is True
    assert h["reminderDeadline"] == "20:00"
    assert h["reminderTimezone"] == "Asia/Karachi"
    assert h["reminderMaxPerDay"] == 3
    assert h["streakRiskThreshold"] == 5

    # update
    r = await client.patch(
        f"/api/habits/{h['id']}",
        json={"reminderDeadline": "21:30", "reminderEnabled": False},
    )
    assert r.status_code == 200
    assert r.json()["reminderDeadline"] == "21:30"
    assert r.json()["reminderEnabled"] is False


@pytest.mark.asyncio
async def test_reminder_deadline_validation(client: AsyncClient):
    r = await client.post(
        "/api/habits",
        json={"name": "Bad", "reminderDeadline": "25:99"},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_dashboard_summary(client: AsyncClient):
    await client.post("/api/habits", json={"name": "A"})
    await client.post("/api/habits", json={"name": "B"})
    r = await client.get("/api/dashboard/summary")
    assert r.status_code == 200
    d = r.json()
    assert d["totalHabits"] == 2
    assert d["dueToday"] == 2
    assert len(d["last30DaysTrend"]) == 30
