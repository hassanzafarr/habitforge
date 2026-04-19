# HabitForge — one-command dev startup

.PHONY: dev seed test

dev:
	@echo "Starting HabitForge..."
	@start cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"
	@cd frontend && npm run dev

seed:
	cd backend && python seed.py

test:
	cd backend && python -m pytest tests/ -v

install:
	cd backend && pip install -e .
	cd frontend && npm install
