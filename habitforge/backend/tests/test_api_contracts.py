from __future__ import annotations

from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient

from tests.conftest import OTHER_USER_ID


@pytest.mark.asyncio
async def test_protected_routes_require_auth(unauthenticated_client: AsyncClient):
    r = await unauthenticated_client.get("/api/habits")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_habits_are_isolated_by_user(client: AsyncClient):
    from app import main
    from app.deps import get_current_user_id

    r = await client.post("/api/habits", json={"name": "Private"})
    assert r.status_code == 201

    main.app.dependency_overrides[get_current_user_id] = lambda: OTHER_USER_ID
    r = await client.get("/api/habits")
    assert r.status_code == 200, r.text
    assert r.json() == []


@pytest.mark.asyncio
async def test_todos_crud_and_filters(client: AsyncClient):
    r = await client.post(
        "/api/todos",
        json={"title": "Pay bills", "priority": "high", "dueDate": "2026-05-16"},
    )
    assert r.status_code == 201, r.text
    todo = r.json()
    assert todo["completed"] is False
    assert todo["priority"] == "high"

    r = await client.patch(f"/api/todos/{todo['id']}", json={"completed": True})
    assert r.status_code == 200, r.text
    assert r.json()["completedAt"] is not None

    r = await client.get("/api/todos?include_completed=false")
    assert r.status_code == 200
    assert r.json() == []

    r = await client.delete(f"/api/todos/{todo['id']}")
    assert r.status_code == 204

    assert (await client.patch("/api/todos/999", json={"title": "Nope"})).status_code == 404
    assert (await client.delete("/api/todos/999")).status_code == 404


@pytest.mark.asyncio
async def test_notes_crud_search_and_habit_ownership(client: AsyncClient):
    habit = (await client.post("/api/habits", json={"name": "Read"})).json()
    r = await client.post(
        "/api/notes",
        json={
            "title": "Book notes",
            "content": "Chapter one reflections",
            "tags": ["reading"],
            "pinned": True,
            "habitId": habit["id"],
        },
    )
    assert r.status_code == 201, r.text
    note = r.json()
    assert note["habitId"] == habit["id"]

    r = await client.get("/api/notes?q=chapter")
    assert r.status_code == 200
    assert [n["title"] for n in r.json()] == ["Book notes"]

    r = await client.patch(f"/api/notes/{note['id']}", json={"title": "Updated"})
    assert r.status_code == 200
    assert r.json()["title"] == "Updated"

    r = await client.delete(f"/api/notes/{note['id']}")
    assert r.status_code == 204

    assert (await client.post("/api/notes", json={"title": "Bad", "habitId": 999})).status_code == 404
    assert (await client.patch("/api/notes/999", json={"title": "Nope"})).status_code == 404
    assert (await client.delete("/api/notes/999")).status_code == 404


@pytest.mark.asyncio
async def test_habit_completion_detail_heatmap_and_reorder(client: AsyncClient):
    h1 = (await client.post("/api/habits", json={"name": "First"})).json()
    h2 = (await client.post("/api/habits", json={"name": "Second"})).json()
    today = date.today().isoformat()

    r = await client.get(f"/api/habits/{h1['id']}")
    assert r.status_code == 200
    assert r.json()["name"] == "First"

    r = await client.patch(
        f"/api/habits/{h1['id']}",
        json={"name": "First updated", "frequencyType": "custom_days", "activeDays": [date.today().weekday()]},
    )
    assert r.status_code == 200
    assert r.json()["frequencyType"] == "custom_days"

    r = await client.post(
        f"/api/habits/{h1['id']}/completions",
        json={"date": today, "status": "done", "note": "solid"},
    )
    assert r.status_code == 200

    r = await client.get(f"/api/habits/{h1['id']}/completions?from={today}&to={today}")
    assert r.status_code == 200
    assert r.json()[0]["note"] == "solid"

    r = await client.get(f"/api/completions/heatmap?from={today}&to={today}")
    assert r.status_code == 200
    assert r.json()[0]["count"] == 1

    r = await client.post(
        "/api/habits/reorder",
        json=[{"id": h1["id"], "sortOrder": 2}, {"id": h2["id"], "sortOrder": 1}],
    )
    assert r.status_code == 200
    assert [h["name"] for h in r.json()] == ["Second", "First updated"]

    r = await client.delete(f"/api/habits/{h1['id']}/completions/{today}")
    assert r.status_code == 204
    assert (await client.delete(f"/api/habits/{h1['id']}/completions/{today}")).status_code == 404
    assert (await client.get("/api/habits/999")).status_code == 404


@pytest.mark.asyncio
async def test_push_subscription_status_unsubscribe_and_actions(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    from app.routers import push

    monkeypatch.setattr(push, "_vapid_ready", lambda: True)

    r = await client.post(
        "/api/push/subscribe",
        json={
            "endpoint": "https://push.example/sub-1",
            "expirationTime": None,
            "keys": {"p256dh": "p256dh-value", "auth": "auth-value"},
        },
    )
    assert r.status_code == 204

    r = await client.get("/api/push/status")
    assert r.status_code == 200
    assert r.json() == {"enabled": True, "count": 1}

    habit = (await client.post("/api/habits", json={"name": "Hydrate"})).json()
    today = date.today().isoformat()
    r = await client.post(
        "/api/push/action",
        json={"habitId": habit["id"], "action": "done", "date": today},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "done"

    r = await client.post(f"/api/push/habits/{habit['id']}/snooze", json={"minutes": 15})
    assert r.status_code == 200
    assert r.json()["status"] == "snoozed"

    r = await client.delete("/api/push/unsubscribe?endpoint=https%3A%2F%2Fpush.example%2Fsub-1")
    assert r.status_code == 204
    assert (await client.get("/api/push/status")).json()["count"] == 0

    assert (await client.delete("/api/push/unsubscribe?endpoint=missing")).status_code == 204
    assert (
        await client.post("/api/push/action", json={"habitId": 999, "action": "skip"})
    ).status_code == 404


@pytest.mark.asyncio
async def test_push_config_and_error_branches(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    from app.routers import push

    monkeypatch.setattr(push, "_vapid_config", lambda: (None, None, "bad"))
    assert (await client.get("/api/push/public-key")).json() == {"publicKey": None}
    r = await client.post("/api/push/test", json={})
    assert r.status_code == 400
    assert "VAPID keys" in r.text

    monkeypatch.setattr(push, "_vapid_config", lambda: ("public", "private", "bad subject"))
    r = await client.post("/api/push/test", json={})
    assert r.status_code == 400
    assert "Invalid HABITFORGE_VAPID_SUBJECT" in r.text

    habit = (await client.post("/api/habits", json={"name": "Push actions"})).json()
    r = await client.post(
        "/api/push/action",
        json={"habitId": habit["id"], "action": "skip", "date": date.today().isoformat()},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "skipped"

    r = await client.post(
        "/api/push/action",
        json={"habitId": habit["id"], "action": "snooze", "snoozeMinutes": 5},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "snoozed"


@pytest.mark.asyncio
async def test_push_send_test_uses_mocked_sender(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    from app.routers import push

    monkeypatch.setattr(
        push,
        "_vapid_config",
        lambda: ("public-key", "private-key", "mailto:test@example.com"),
    )
    monkeypatch.setattr(push, "send_to_user", AsyncMock(return_value=SimpleNamespace(sent=1, removed=0, total=1)))

    r = await client.post("/api/push/test", json={"title": "T", "body": "B", "url": "/"})
    assert r.status_code == 200
    assert r.json() == {"sent": 1, "removed": 0, "total": 1}


@pytest.mark.asyncio
async def test_ai_generate_todos_parses_mocked_provider(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    from app.routers import ai

    class FakeResponse:
        status_code = 200
        text = "ok"

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": '[{"title":"Plan launch","description":"Draft checklist","priority":"urgent"}]'
                        }
                    }
                ]
            }

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setattr(ai.httpx, "AsyncClient", FakeAsyncClient)

    r = await client.post("/api/ai/generate-todos", json={"prompt": "launch"})
    assert r.status_code == 200, r.text
    assert r.json() == [
        {"title": "Plan launch", "description": "Draft checklist", "priority": "medium"}
    ]


@pytest.mark.asyncio
async def test_ai_generate_todos_error_branches(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    from app.routers import ai

    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert (
        await client.post("/api/ai/generate-todos", json={"prompt": "launch"})
    ).status_code == 500

    class BadStatusResponse:
        status_code = 429
        text = "rate limited"

        def json(self):
            return {}

    class BadShapeResponse:
        status_code = 200
        text = "ok"

        def json(self):
            return {"choices": []}

    class BadJsonResponse:
        status_code = 200
        text = "ok"

        def json(self):
            return {"choices": [{"message": {"content": "not json"}}]}

    class FakeAsyncClient:
        response = BadStatusResponse()

        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *args, **kwargs):
            return self.response

    monkeypatch.setenv("GROQ_API_KEY", "test-key")
    monkeypatch.setattr(ai.httpx, "AsyncClient", FakeAsyncClient)

    FakeAsyncClient.response = BadStatusResponse()
    assert (
        await client.post("/api/ai/generate-todos", json={"prompt": "launch"})
    ).status_code == 502

    FakeAsyncClient.response = BadShapeResponse()
    assert (
        await client.post("/api/ai/generate-todos", json={"prompt": "launch"})
    ).status_code == 502

    FakeAsyncClient.response = BadJsonResponse()
    assert (
        await client.post("/api/ai/generate-todos", json={"prompt": "launch"})
    ).status_code == 502
