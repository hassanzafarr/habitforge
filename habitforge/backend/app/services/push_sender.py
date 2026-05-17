"""Web-push sender — shared by /push/test and the reminder scheduler."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PushSubscription

log = logging.getLogger("habitforge.push_sender")


def vapid_config() -> tuple[str | None, str | None, str]:
    return (
        os.getenv("HABITFORGE_VAPID_PUBLIC_KEY"),
        os.getenv("HABITFORGE_VAPID_PRIVATE_KEY"),
        os.getenv("HABITFORGE_VAPID_SUBJECT", "mailto:admin@example.com"),
    )


def normalize_vapid_subject(subject: str) -> str:
    s = (subject or "").strip()
    if not s:
        return ""
    if s.startswith("mailto:") or s.startswith("https://"):
        return s
    if "@" in s and " " not in s and ":" not in s:
        return f"mailto:{s}"
    return s


def vapid_ready() -> bool:
    public_key, private_key, _ = vapid_config()
    return bool(public_key and private_key)


@dataclass
class SendResult:
    sent: int = 0
    removed: int = 0
    total: int = 0


async def send_to_user(
    session: AsyncSession,
    user_id: str,
    payload: dict,
) -> SendResult:
    """Deliver a JSON payload to every active push subscription of a user.

    Prunes 404/410 subscriptions automatically.
    """
    try:
        from pywebpush import WebPushException, webpush
    except ModuleNotFoundError:
        log.error("pywebpush is not installed; cannot send push")
        return SendResult()

    public_key, private_key, subject = vapid_config()
    if not public_key or not private_key:
        log.warning("VAPID keys missing; skipping push send")
        return SendResult()
    subject = normalize_vapid_subject(subject)

    res = await session.execute(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    )
    subs: Iterable[PushSubscription] = res.scalars().all()
    result = SendResult(total=len(list(subs)))
    # re-execute to get fresh iterator
    res = await session.execute(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    )
    subs = res.scalars().all()
    if not subs:
        return result

    data = json.dumps(payload)
    expired: list[PushSubscription] = []
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=data,
                vapid_private_key=private_key,
                vapid_claims={"sub": subject},
            )
            result.sent += 1
        except WebPushException as exc:
            status_code = getattr(exc.response, "status_code", None)
            if status_code in (404, 410):
                expired.append(sub)
                result.removed += 1
            else:
                log.warning("Push send failed for %s: %s", sub.endpoint, exc)
        except Exception as exc:
            log.exception("Push send unexpected error: %s", exc)

    for sub in expired:
        await session.delete(sub)
    if expired:
        await session.commit()
    return result
