from __future__ import annotations

import sys
import types

import pytest


def test_vapid_helpers(monkeypatch: pytest.MonkeyPatch):
    from app.services import push_sender

    monkeypatch.delenv("HABITFORGE_VAPID_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("HABITFORGE_VAPID_PRIVATE_KEY", raising=False)
    assert push_sender.vapid_ready() is False
    assert push_sender.normalize_vapid_subject("admin@example.com") == "mailto:admin@example.com"
    assert push_sender.normalize_vapid_subject(" https://example.com ") == "https://example.com"
    assert push_sender.normalize_vapid_subject("bad subject") == "bad subject"

    monkeypatch.setenv("HABITFORGE_VAPID_PUBLIC_KEY", "public")
    monkeypatch.setenv("HABITFORGE_VAPID_PRIVATE_KEY", "private")
    monkeypatch.setenv("HABITFORGE_VAPID_SUBJECT", "admin@example.com")
    assert push_sender.vapid_config() == ("public", "private", "admin@example.com")
    assert push_sender.vapid_ready() is True


@pytest.mark.asyncio
async def test_send_to_user_missing_pywebpush(isolated_db: str):
    from app import database
    from app.services.push_sender import send_to_user

    await database.init_db()
    async with database.SessionLocal() as session:
        result = await send_to_user(session, "u1", {"title": "Hi"})

    assert result.sent == 0
    assert result.removed == 0
    assert result.total == 0


@pytest.mark.asyncio
async def test_send_to_user_success_and_expired_cleanup(
    isolated_db: str, monkeypatch: pytest.MonkeyPatch
):
    from app import database, models
    from app.services import push_sender

    await database.init_db()
    monkeypatch.setenv("HABITFORGE_VAPID_PUBLIC_KEY", "public")
    monkeypatch.setenv("HABITFORGE_VAPID_PRIVATE_KEY", "private")

    class FakeWebPushException(Exception):
        def __init__(self, status_code: int):
            self.response = types.SimpleNamespace(status_code=status_code)

    calls: list[str] = []

    def fake_webpush(subscription_info, **kwargs):
        endpoint = subscription_info["endpoint"]
        calls.append(endpoint)
        if endpoint.endswith("expired"):
            raise FakeWebPushException(410)
        if endpoint.endswith("warning"):
            raise FakeWebPushException(500)
        if endpoint.endswith("unexpected"):
            raise RuntimeError("network")

    monkeypatch.setitem(
        sys.modules,
        "pywebpush",
        types.SimpleNamespace(WebPushException=FakeWebPushException, webpush=fake_webpush),
    )

    async with database.SessionLocal() as session:
        for endpoint in (
            "https://push/sent",
            "https://push/expired",
            "https://push/warning",
            "https://push/unexpected",
        ):
            session.add(
                models.PushSubscription(
                    user_id="u1",
                    endpoint=endpoint,
                    p256dh="p",
                    auth="a",
                )
            )
        await session.commit()

        result = await push_sender.send_to_user(session, "u1", {"title": "Hi"})

        assert result.total == 4
        assert result.sent == 1
        assert result.removed == 1
        assert calls == [
            "https://push/sent",
            "https://push/expired",
            "https://push/warning",
            "https://push/unexpected",
        ]
