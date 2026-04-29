from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.deps import CurrentUser

log = logging.getLogger("habitforge")
router = APIRouter(prefix="/ai", tags=["ai"])

def _groq_api_key() -> str:
    key = os.getenv("GROQ_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    return key

GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are a productivity assistant. Given a user's description of tasks or goals, "
    "generate a structured todo list as a JSON array. "
    "Each item must have: "
    '"title" (short actionable task, max 120 chars), '
    '"description" (optional detail, max 500 chars, or null), '
    '"priority" (one of: low, medium, high). '
    "Return ONLY a valid JSON array with no explanation or markdown. "
    'Example: [{"title": "Buy groceries", "description": "Milk, eggs, bread", "priority": "medium"}]'
)


class GenerateTodosRequest(BaseModel):
    prompt: str


class GeneratedTodo(BaseModel):
    title: str
    description: str | None = None
    priority: str = "medium"


def _extract_json(text: str) -> list[dict[str, Any]]:
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON array found in AI response")
    return json.loads(match.group())


@router.post("/generate-todos", response_model=list[GeneratedTodo])
async def generate_todos(
    payload: GenerateTodosRequest,
    user_id: CurrentUser,
) -> list[GeneratedTodo]:
    api_key = _groq_api_key()

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": payload.prompt},
                ],
                "max_tokens": 1024,
                "temperature": 0.3,
            },
        )

    if resp.status_code != 200:
        log.error("Groq error %s: %s", resp.status_code, resp.text)
        raise HTTPException(status_code=502, detail=f"Groq API error: {resp.text}")

    data = resp.json()
    log.info("Groq response: %s", json.dumps(data)[:300])

    try:
        generated_text: str = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        log.error("Unexpected Groq response shape: %s", data)
        raise HTTPException(status_code=502, detail=f"Unexpected Groq response shape: {exc}")

    try:
        raw_todos = _extract_json(generated_text)
    except (ValueError, json.JSONDecodeError) as exc:
        log.error("Failed to parse AI response: %s", generated_text)
        raise HTTPException(status_code=502, detail=f"Failed to parse AI response: {exc}")

    result: list[GeneratedTodo] = []
    for item in raw_todos[:10]:
        priority = item.get("priority", "medium")
        if priority not in ("low", "medium", "high"):
            priority = "medium"
        result.append(
            GeneratedTodo(
                title=str(item.get("title", "Untitled"))[:120],
                description=str(item["description"])[:500] if item.get("description") else None,
                priority=priority,
            )
        )
    return result
