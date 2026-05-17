from __future__ import annotations

import logging
from datetime import date as date_cls, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.deps import CurrentUser
from app.models import Habit, PushSubscription, ReminderKind, ReminderLog
from app.schemas import (
    PushActionIn,
    PushPublicKey,
    PushStatus,
    PushSubscriptionIn,
    PushTestNotification,
    SnoozeIn,
)
from app.services.push_sender import (
    normalize_vapid_subject,
    send_to_user,
    vapid_config,
    vapid_ready,
)

router = APIRouter(prefix="/push", tags=["push"])
log = logging.getLogger("habitforge.push")
Session = Annotated[AsyncSession, Depends(get_session)]


_vapid_config = vapid_config
_normalize_vapid_subject = normalize_vapid_subject
_vapid_ready = vapid_ready


@router.get("/public-key", response_model=PushPublicKey)
async def public_key() -> PushPublicKey:
    public_key, _private_key, _subject = _vapid_config()
    return PushPublicKey(public_key=public_key)


@router.get("/status", response_model=PushStatus)
async def status_push(session: Session, user_id: CurrentUser) -> PushStatus:
    res = await session.execute(
        select(PushSubscription.id).where(PushSubscription.user_id == user_id)
    )
    count = len(res.scalars().all())
    return PushStatus(enabled=_vapid_ready(), count=count)


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe_push(
    payload: PushSubscriptionIn,
    session: Session,
    user_id: CurrentUser,
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
        existing.user_id = user_id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.expiration_time = expiration_dt
        existing.user_agent = user_agent
    else:
        session.add(
            PushSubscription(
                user_id=user_id,
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
    user_id: CurrentUser,
    endpoint: str = Query(...),
) -> None:
    res = await session.execute(
        select(PushSubscription).where(
            PushSubscription.endpoint == endpoint,
            PushSubscription.user_id == user_id,
        )
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
    user_id: CurrentUser,
) -> dict:
    public_key, private_key, subject = _vapid_config()
    if not public_key or not private_key:
        raise HTTPException(
            status_code=400,
            detail="VAPID keys are not configured. Set HABITFORGE_VAPID_PUBLIC_KEY and HABITFORGE_VAPID_PRIVATE_KEY.",
        )
    subject_norm = _normalize_vapid_subject(subject)
    if not (subject_norm.startswith("mailto:") or subject_norm.startswith("https://")):
        raise HTTPException(
            status_code=400,
            detail="Invalid HABITFORGE_VAPID_SUBJECT. Use mailto:you@example.com or https://your-domain.com.",
        )

    result = await send_to_user(
        session,
        user_id,
        {"title": payload.title, "body": payload.body, "url": payload.url},
    )
    return {"sent": result.sent, "removed": result.removed, "total": result.total}


async def _verify_habit_ownership(
    session: AsyncSession, habit_id: int, user_id: str
) -> Habit:
    res = await session.execute(
        select(Habit).where(Habit.id == habit_id, Habit.user_id == user_id)
    )
    h = res.scalars().unique().one_or_none()
    if h is None:
        raise HTTPException(status_code=404, detail="Habit not found")
    return h


@router.post("/action", status_code=status.HTTP_200_OK)
async def push_action(
    payload: PushActionIn,
    session: Session,
    user_id: CurrentUser,
) -> dict:
    """Handle notification button clicks from the service worker."""
    habit = await _verify_habit_ownership(session, payload.habit_id, user_id)
    target_date = payload.date or date_cls.today()

    if payload.action == "snooze":
        snoozed_until = datetime.utcnow() + timedelta(minutes=payload.snooze_minutes)
        session.add(
            ReminderLog(
                habit_id=habit.id,
                user_id=user_id,
                kind=ReminderKind.snoozed,
                snoozed_until=snoozed_until,
            )
        )
        await session.commit()
        return {"status": "snoozed", "until": snoozed_until.isoformat()}

    if payload.action in ("done", "skip"):
        from app.models import Completion, CompletionStatus

        res = await session.execute(
            select(Completion).where(
                Completion.habit_id == habit.id, Completion.date == target_date
            )
        )
        existing = res.scalars().one_or_none()
        new_status = (
            CompletionStatus.done if payload.action == "done" else CompletionStatus.skipped
        )
        if existing:
            existing.status = new_status
        else:
            session.add(
                Completion(habit_id=habit.id, date=target_date, status=new_status)
            )
        await session.commit()
        return {"status": new_status.value}

    raise HTTPException(status_code=400, detail="Unknown action")


@router.post("/habits/{habit_id}/snooze", status_code=status.HTTP_200_OK)
async def snooze_habit(
    habit_id: int,
    payload: SnoozeIn,
    session: Session,
    user_id: CurrentUser,
) -> dict:
    habit = await _verify_habit_ownership(session, habit_id, user_id)
    snoozed_until = datetime.utcnow() + timedelta(minutes=payload.minutes)
    session.add(
        ReminderLog(
            habit_id=habit.id,
            user_id=user_id,
            kind=ReminderKind.snoozed,
            snoozed_until=snoozed_until,
        )
    )
    await session.commit()
    return {"status": "snoozed", "until": snoozed_until.isoformat()}
