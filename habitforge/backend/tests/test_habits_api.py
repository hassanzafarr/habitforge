from __future__ import annotations

import os
import tempfile
from datetime import date

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest_asyncio.fixture
async def client():
    # fresh db per test
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.environ["HABITFORGE_DB_URL"] = f"sqlite+aiosqlite:///{path}"

    # re-import after env var set
    import importlib

    from app import database, models, main
    from app.routers import completions as r_completions
    from app.routers import habits as r_habits
    from app.services import streak as r_streak

    importlib.reload(database)
    importlib.reload(models)
    importlib.reload(r_streak)
    importlib.reload(r_habits)
    importlib.reload(r_completions)
    importlib.reload(main)

    async with main.app.router.lifespan_context(main.app):
        transport = ASGITransport(app=main.app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c

    try:
        os.remove(path)
    except OSError:
        pass


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
async def test_dashboard_summary(client: AsyncClient):
    await client.post("/api/habits", json={"name": "A"})
    await client.post("/api/habits", json={"name": "B"})
    r = await client.get("/api/dashboard/summary")
    assert r.status_code == 200
    d = r.json()
    assert d["totalHabits"] == 2
    assert d["dueToday"] == 2
    assert len(d["last30DaysTrend"]) == 30
