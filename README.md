# HabitForge 🔥

HabitForge is a premium, personal habit-tracking web application built to help users build streaks, visualize progress, and manage daily tasks. It features a modern, responsive user interface with advanced streak math, haptic feedback, dark mode, custom interactive SVG heatmaps, and Clerk authentication.

## 🚀 Live Demo & API

* **Web Application:** [https://habittforge.me](https://habittforge.me)
* **Backend API Documentation:** [https://habitforge-api-36efbafea89b.herokuapp.com/api/docs](https://habitforge-api-36efbafea89b.herokuapp.com/api/docs)

---

## ✨ Features & Architecture

### 📊 Advanced Streaks & Analytics
- **Grace Period Rule:** Missing today's due habit doesn't break a streak immediately. The current streak anchors on yesterday, allowing users to complete the habit before the day ends.
- **Skipped Day Logic:** Planned absences (e.g., rest days, travel) can be marked as "skipped" to preserve active streaks without artificially inflating completion counts.
- **Interactive SVG Heatmap:** A custom-built, responsive grid showing 60 days of historical activity, fully accessible with grid roles and ARIA labels.
- **Trend Charts:** Real-time data visualization of completion rates using Recharts.

### 📱 Premium Mobile-First Experience
- **Optimistic UI Updates:** Check-offs toggle immediately on the UI using TanStack Query, rolling back automatically only if the server returns an error.
- **Haptic & Visual Feedback:** Polished Framer Motion page transitions, micro-interactions, and integrated haptic gestures.
- **Progressive Web App (PWA):** Installable on iOS/Android/Desktop, supporting standalone launch mode and push notifications.
- **Keyboard Shortcuts:** Global hotkeys (`N` for new habit, `/` for search, `1-9` to toggle today's habits) for expert users.

---

## 🛠️ Technology Stack

### Frontend Client
* **Framework:** React 18 (TypeScript) + Vite
* **State & Sync:** TanStack Query (React Query) v5 (optimistic updates, caching, invalidation)
* **Styling:** Tailwind CSS v3 (custom theme configuration, dark mode support)
* **Components:** Custom premium primitives built with Radix and Framer Motion

### Backend Services
* **Framework:** FastAPI (Python 3.11)
* **DB & ORM:** PostgreSQL/SQLite + SQLAlchemy 2.0 (asyncio + asyncpg/aiosqlite)
* **Security:** Clerk JWT authentication & validation (authorized party validation)
* **Integration:** Custom integration with the Groq API for AI-assisted habit suggestions and streak analysis.
