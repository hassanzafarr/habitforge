from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import PushSubscription
from app.schemas import (
    PushPublicKey,
    PushStatus,
    PushSubscriptionIn,
    PushTestNotification,
)

router = APIRouter(prefix="/push", tags=["push"])
log = logging.getLogger("habitforge.push")
Session = Annotated[AsyncSession, Depends(get_session)]


def _vapid_config() -> tuple[str | None, str | None, str]:
    return (
        os.getenv("HABITFORGE_VAPID_PUBLIC_KEY"),
        os.getenv("HABITFORGE_VAPID_PRIVATE_KEY"),
        os.getenv("HABITFORGE_VAPID_SUBJECT", "mailto:admin@example.com"),
    )


def _normalize_vapid_subject(subject: str) -> str:
    s = (subject or "").strip()
    if not s:
        return ""
    if s.startswith("mailto:") or s.startswith("https://"):
        return s
    # Common mistake: plain email provided without mailto:
    if "@" in s and " " not in s and ":" not in s:
        return f"mailto:{s}"
    return s


def _vapid_ready() -> bool:
    public_key, private_key, _subject = _vapid_config()
    return bool(public_key and private_key)


@router.get("/public-key", response_model=PushPublicKey)
async def public_key() -> PushPublicKey:
    public_key, _private_key, _subject = _vapid_config()
    return PushPublicKey(public_key=public_key)


@router.get("/status", response_model=PushStatus)
async def status_push(session: Session) -> PushStatus:
    res = await session.execute(select(PushSubscription.id))
    count = len(res.scalars().all())
    return PushStatus(enabled=_vapid_ready(), count=count)


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe_push(
    payload: PushSubscriptionIn,
    session: Session,
    user_agent: Annotated[str | None, Header()] = None,
) -> None:
    expiration_dt = None
    if payload.expiration_time is not None:
        # DB columns are TIMESTAMP WITHOUT TIME ZONE, so write UTC-naive values.
        expiration_dt = datetime.utcfromtimestamp(payload.expiration_time / 1000)

    res = await session.execute(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    )
    existing = res.scalars().one_or_none()

    if existing:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.expiration_time = expiration_dt
        existing.user_agent = user_agent
    else:
        session.add(
            PushSubscription(
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
                expiration_time=expiration_dt,
                user_agent=user_agent,
            )
        )
    await session.commit()


@router.delete("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_push(
    session: Session,
    endpoint: str = Query(...),
) -> None:
    res = await session.execute(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    )
    sub = res.scalars().one_or_none()
    if sub is None:
        return
    await session.delete(sub)
    await session.commit()


@router.post("/test")
async def send_test_notification(
    payload: PushTestNotification,
    session: Session,
) -> dict:
    try:
        from pywebpush import WebPushException, webpush
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail="pywebpush is not installed. Install backend dependencies to enable push sending.",
        ) from exc

    public_key, private_key, subject = _vapid_config()
    if not public_key or not private_key:
        raise HTTPException(
            status_code=400,
            detail="VAPID keys are not configured. Set HABITFORGE_VAPID_PUBLIC_KEY and HABITFORGE_VAPID_PRIVATE_KEY.",
        )
    subject = _normalize_vapid_subject(subject)
    if not (subject.startswith("mailto:") or subject.startswith("https://")):
        raise HTTPException(
            status_code=400,
            detail="Invalid HABITFORGE_VAPID_SUBJECT. Use mailto:you@example.com or https://your-domain.com.",
        )

    res = await session.execute(select(PushSubscription))
    subs = res.scalars().all()
    if not subs:
        return {"sent": 0, "removed": 0, "total": 0}

    sent = 0
    removed = 0
    expired: list[PushSubscription] = []
    data = json.dumps({"title": payload.title, "body": payload.body, "url": payload.url})

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
            sent += 1
        except WebPushException as exc:
            status_code = getattr(exc.response, "status_code", None)
            if status_code in (404, 410):
                expired.append(sub)
                removed += 1
            else:
                log.warning("Push send failed for endpoint %s: %s", sub.endpoint, exc)
        except Exception as exc:
            log.exception("Push send failed due to invalid VAPID config or unexpected error.")
            raise HTTPException(status_code=400, detail=f"Push send failed: {exc}") from exc

    for sub in expired:
        await session.delete(sub)
    if expired:
        await session.commit()

    return {"sent": sent, "removed": removed, "total": len(subs)}
