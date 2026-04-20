# HabitForge 🔥

A production-ready personal habit tracker built with FastAPI + React.

## Quick Start

```bash
# Run both backend and frontend together
make dev
```

Or start them separately:

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
# Seed the database with sample habits (first time)
python seed.py
# Start the API server
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

Then visit **http://localhost:5173** — the API is proxied automatically.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 (async), SQLite |
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS v3 |
| State | TanStack Query (React Query) v5 |
| Charts | Recharts, custom SVG heatmap |
| Animation | Framer Motion |
| Routing | React Router v6 |

## Project Structure

```
habitforge/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS
│   │   ├── database.py      # Async SQLite engine
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic v2 schemas (camelCase)
│   │   ├── services/
│   │   │   └── streak.py    # Pure streak logic (heavily commented)
│   │   └── routers/
│   │       ├── habits.py    # CRUD + archive/restore/reorder
│   │       └── completions.py # Check-off, heatmap, dashboard
│   ├── tests/               # Pytest suite for streak edge cases
│   ├── seed.py              # Creates 4 habits with 60d history
│   └── pyproject.toml
└── frontend/
    └── src/
        ├── features/
        │   ├── habits/       # TodayHabitList, HabitForm, HabitRow
        │   ├── dashboard/    # StatCards, TrendChart
        │   ├── heatmap/      # Custom SVG heatmap
        │   └── calendar/     # MonthlyCalendar
        ├── pages/            # DashboardPage, HabitsPage, HabitDetailPage
        ├── components/ui/    # Button, Card, Input, Modal, Skeleton, Badge
        └── lib/              # api.ts, types.ts, utils.ts, useKeyboardShortcuts.ts
```

## API

OpenAPI docs available at **http://localhost:8000/docs**

Key endpoints:
- `GET /api/habits` — list active habits
- `GET /api/habits/{id}` — single habit with streak info
- `POST /api/habits/{id}/completions` — idempotent check-off
- `DELETE /api/habits/{id}/completions/{date}` — un-check
- `GET /api/completions/heatmap?from=&to=` — global heatmap data
- `GET /api/dashboard/summary` — dashboard stats

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New habit |
| `/` | Search habits |
| `1–9` | Toggle habit N for today |

## Design Decisions

- **Single-user, no auth**: This is a personal tool. Simplicity wins over multi-tenant concerns.
- **SQLite**: Sufficient for personal use with potentially thousands of completions. SQLAlchemy async makes it easy to swap to Postgres if needed.
- **Custom SVG heatmap**: Full control over appearance, no library dependency, accessible with `role="grid"` + aria-labels.
- **Optimistic updates**: Today's check-offs update immediately via local state + async mutation, with rollback on error.
- **Skipped ≠ failed**: A `skipped` completion is a planned absence (travel, rest day) and never breaks a streak.
- **Today grace rule**: If today's habit is not yet completed, the streak counts the chain ending *yesterday*. Only a missed *yesterday* breaks a streak.
- **Soft delete**: Habits are archived (not deleted) so historical data is preserved.
- **camelCase API**: The frontend speaks camelCase; Pydantic's `alias_generator` handles the snake_case↔camelCase conversion transparently.

## PWA Push Notifications

Push notifications are supported for installed PWAs (HTTPS required in production).

Set backend env vars before starting API:

- `HABITFORGE_VAPID_PUBLIC_KEY`
- `HABITFORGE_VAPID_PRIVATE_KEY`
- `HABITFORGE_VAPID_SUBJECT` (example: `mailto:you@example.com`)

After configuring keys:

1. Open app on device/browser and install as PWA.
2. Go to Dashboard > **Push Notifications** card.
3. Tap **Enable**, allow permission, then **Send Test**.
