# CLAUDE.md

Instant context for LLMs working in this repo.

## 1) Repo Shape

- Workspace root contains one main app: `habitforge/`
- Stack:
  - Backend: FastAPI + SQLAlchemy (async) + SQLite/Postgres URL support
  - Frontend: React 18 + TypeScript + Vite + Tailwind + React Query

## 2) Runtime Entry Points

- Backend app bootstrap: `habitforge/backend/app/main.py`
  - Initializes DB tables in lifespan (`init_db`)
  - Registers routers under `/api`
  - Health endpoint: `GET /api/health`
- Backend DB config: `habitforge/backend/app/database.py`
  - Env var: `HABITFORGE_DB_URL`
  - Defaults to local SQLite: `sqlite+aiosqlite:///./habitforge.db`
  - Auto-rewrites `postgresql://` -> `postgresql+asyncpg://`
- Frontend bootstrap: `habitforge/frontend/src/main.tsx`
  - React Query client provider
  - Browser router
  - Theme init via `localStorage` key `hf-theme`
- Frontend routes: `habitforge/frontend/src/App.tsx`
  - `/` dashboard
  - `/habits`
  - `/habits/:id`
  - `/todos`

## 3) High-Level Architecture

- Backend layering:
  - `models.py`: ORM entities (`Habit`, `Completion`, `Todo`)
  - `schemas.py`: Pydantic API contracts with camelCase aliasing
  - `routers/*.py`: HTTP handlers and query orchestration
  - `services/streak.py`: pure business logic for streak/rate math
- Frontend layering:
  - `lib/api.ts`: fetch wrapper + endpoint methods + React Query keys (`qk`)
  - `lib/types.ts`: TypeScript API/domain types (camelCase)
  - `pages/*`: route-level composition
  - `features/*`: domain UI blocks (habits, heatmap, dashboard, todos, calendar)
  - `components/ui/*`: reusable primitives (Button/Card/Input/Modal/etc.)

## 4) Core Domain Model

- `Habit`
  - Frequency: `daily | weekly | custom_days`
  - Weekly target: `target_per_week`
  - Custom schedule: `active_days` (weekday ints)
  - Soft-delete via `archived_at` (archive/restore model)
- `Completion`
  - Unique per `(habit_id, date)`
  - Status: `done | skipped`
  - `skipped` is intentional non-break day logic
- `Todo`
  - Priority enum: `low | medium | high`
  - Completion tracked via `completed` + `completed_at`

## 5) Streak & Metrics Rules (Important)

Implemented in `backend/app/services/streak.py` and used by API responses.

- Today grace: if today is due and not completed yet, current streak anchors on yesterday.
- `skipped` does not break streak, but also does not increment done streak count.
- Weekly habits streak in week units, and current week has grace until week end.
- 30-day completion rate excludes skipped days from denominator.
- Logic is pure and defensive against duplicate completion rows.

## 6) API Surface (Primary)

- Habits:
  - `GET /api/habits`
  - `POST /api/habits`
  - `GET /api/habits/{id}`
  - `PATCH /api/habits/{id}`
  - `DELETE /api/habits/{id}` (archive)
  - `POST /api/habits/{id}/restore`
  - `POST /api/habits/reorder`
- Completions:
  - `POST /api/habits/{id}/completions` (upsert/idempotent per date)
  - `DELETE /api/habits/{id}/completions/{date}`
  - `GET /api/habits/{id}/completions?from=...&to=...`
  - `GET /api/completions/heatmap?from=...&to=...`
  - `GET /api/dashboard/summary`
- Todos:
  - `GET /api/todos`
  - `POST /api/todos`
  - `PATCH /api/todos/{id}`
  - `DELETE /api/todos/{id}`

## 7) Frontend Data Flow Conventions

- Use `api` methods from `frontend/src/lib/api.ts` for all server access.
- Use React Query keys from `qk` only; invalidate related keys in mutation success handlers.
- Keep optimistic updates local/targeted:
  - Habits today toggles: `features/habits/TodayHabitList.tsx`
  - Todos toggle: `features/todos/TodoList.tsx`
- API contract is camelCase on wire (backend schema aliasing handles snake_case conversion).

## 8) UI/UX Conventions

- Tailwind utility-first styling; design tokens in `tailwind.config.js` + `index.css`.
- Theme strategy:
  - Dark mode via `html.dark` class
  - Persisted with `hf-theme` localStorage key
- Interaction patterns:
  - Toast notifications via `sonner`
  - Motion/transition polish via `framer-motion`
  - Keyboard shortcuts in `lib/useKeyboardShortcuts.ts`
    - `N`: new habit
    - `/`: search event
    - `1-9`: toggle today habit by index

## 9) Tests & Reliability

- Backend tests in `habitforge/backend/tests/`
  - `test_streaks.py`: streak logic edge cases
  - `test_habits_api.py`: API behavior with temp DB
- Streak service is the most behavior-sensitive area; update tests when rules change.

## 10) Local Dev Commands

From `habitforge/`:

- Start both apps: `make dev`
- Backend only:
  - `cd backend`
  - `pip install -e .`
  - `python seed.py`
  - `uvicorn app.main:app --reload --port 8000`
- Frontend only:
  - `cd frontend`
  - `npm install`
  - `npm run dev`
- Backend tests: `cd backend && python -m pytest tests/ -v`

## 11) Where To Edit Common Changes

- Add/modify API endpoint:
  - router: `backend/app/routers/*.py`
  - schema: `backend/app/schemas.py`
  - if needed model: `backend/app/models.py`
  - client method + key: `frontend/src/lib/api.ts`
  - frontend type: `frontend/src/lib/types.ts`
- Change streak behavior:
  - `backend/app/services/streak.py`
  - update/add tests in `backend/tests/test_streaks.py`
- New page/feature:
  - page: `frontend/src/pages/`
  - reusable feature block: `frontend/src/features/<domain>/`
  - register route in `frontend/src/App.tsx`

## 12) Practical Notes For LLM Agents

- Prefer TypeScript source files (`.ts/.tsx`) as primary edit targets.
- There are parallel `.js` files in `frontend/src/`; validate whether they are still in use before editing both.
- Preserve API camelCase shape for frontend compatibility.
- Avoid changing streak semantics without explicitly updating tests and documenting behavior deltas.
