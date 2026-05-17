from __future__ import annotations

import importlib
import os
import tempfile
from collections.abc import AsyncIterator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

TEST_USER_ID = "user_test"
OTHER_USER_ID = "user_other"


def _reload_app_modules() -> None:
    from app import database, main, models
    from app.routers import ai, completions, habits, notes, push, todos
    from app.services import reminder_scheduler, streak

    for module in (
        database,
        models,
        streak,
        habits,
        completions,
        todos,
        notes,
        ai,
        push,
        reminder_scheduler,
        main,
    ):
        importlib.reload(module)


@pytest_asyncio.fixture
async def isolated_db() -> AsyncIterator[str]:
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    previous = os.environ.get("HABITFORGE_DB_URL")
    os.environ["HABITFORGE_DB_URL"] = f"sqlite+aiosqlite:///{path}"
    os.environ["HABITFORGE_REMINDERS_ENABLED"] = "false"
    _reload_app_modules()

    yield path

    if previous is None:
        os.environ.pop("HABITFORGE_DB_URL", None)
    else:
        os.environ["HABITFORGE_DB_URL"] = previous
    try:
        os.remove(path)
    except OSError:
        pass


@pytest_asyncio.fixture
async def client(isolated_db: str) -> AsyncIterator[AsyncClient]:
    from app import main
    from app.deps import get_current_user_id

    main.app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    async with main.app.router.lifespan_context(main.app):
        transport = ASGITransport(app=main.app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
    main.app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def unauthenticated_client(isolated_db: str) -> AsyncIterator[AsyncClient]:
    from app import main

    async with main.app.router.lifespan_context(main.app):
        transport = ASGITransport(app=main.app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c
