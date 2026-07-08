# HabitForge 🔥

HabitForge is a personal habit-tracking web application designed to help you build streaks, visualize progress, and forge better habits. It features a modern, responsive user interface with real-time streak calculations, haptic feedback, dark mode, and optimistic UI updates.

## 🚀 Live Deployments

* **Frontend App:** [https://habittforge.me](https://habittforge.me) (Hosted on Vercel)
* **Backend API:** [https://habitforge-api-36efbafea89b.herokuapp.com/api](https://habitforge-api-36efbafea89b.herokuapp.com/api) (Hosted on Heroku)

---

## ✨ Features

- **Streaks & Grace Periods:** Advanced streak logic. Missing today doesn't break a streak until the day ends (Grace Rule), and scheduled "skipped" days preserve your streak.
- **Visual Analytics:** Custom SVG interactive heatmap and trend charts to track completion rates over time.
- **Flexible Scheduling:** Set habits as daily, weekly, or specific weekdays (e.g., Mon, Wed, Fri).
- **Responsive Layout:** Sleek mobile-first design with smooth Framer Motion transitions and bottom navigation.
- **PWA Ready:** Installable as a Progressive Web App on mobile and desktop, supporting push notifications.
- **Keyboard Shortcuts:** Quick action triggers (`N` for new habit, `/` for search, `1-9` to toggle today's habits).

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v3
- **State Management:** TanStack Query (React Query) v5
- **Animations:** Framer Motion
- **Router:** React Router v6

### Backend
- **Framework:** Python 3.11 + FastAPI
- **Database:** SQLite/Postgres (SQLAlchemy async ORM)
- **Authentication:** Clerk Auth
- **AI Streaks:** Integrates with Groq API for habit suggestions

---

## 💻 Local Development

Run the entire application locally with a single command from the project root:

```bash
# Run both backend and frontend concurrently
./dev.ps1
```

Or run them individually:

### Backend Setup
```bash
cd habitforge/backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
python seed.py             # Seed sample habit data
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd habitforge/frontend
npm install
npm run dev
```
Open [http://localhost:5174](http://localhost:5174) in your browser.
