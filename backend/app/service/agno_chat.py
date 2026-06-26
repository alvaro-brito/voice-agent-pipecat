from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Iterator

from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from agno.models.ollama import Ollama
from agno.models.openai import OpenAIChat

from app.helpers.config import OLLAMA_BASE_URL, OLLAMA_MODEL, OPENAI_BASE_URL, OPENAI_LLM_MODEL


def _sanitize_response(text: str) -> str:
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    return text.strip()


class AgnoChatService:
    def __init__(self, db_path: Path, stack: str = "local") -> None:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = SqliteDb(db_file=str(db_path))
        self.stack = stack
        self.agent = Agent(
            model=self._build_model(),
            db=self.db,
            add_history_to_context=True,
            num_history_runs=6,
            update_memory_on_run=True,
            instructions=[
                "You are a helpful and concise voice assistant.",
                "Reply in the same language as the user.",
                "Prefer natural answers that sound good when spoken aloud.",
                "Do not use markdown, lists, or code blocks unless the user explicitly asks for them.",
                "If the request is technical, stay precise while keeping a conversational tone.",
            ],
            markdown=False,
        )

    def _build_model(self) -> Ollama | OpenAIChat:
        if self.stack == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise RuntimeError("OPENAI_API_KEY is not configured for the OpenAI stack.")

            client_params: dict[str, object] = {
                "id": OPENAI_LLM_MODEL,
                "api_key": api_key,
                "timeout": 120,
            }
            if OPENAI_BASE_URL:
                client_params["base_url"] = OPENAI_BASE_URL
            return OpenAIChat(**client_params)

        return Ollama(
            id=OLLAMA_MODEL,
            host=OLLAMA_BASE_URL,
            timeout=120,
        )

    def stream_reply(self, prompt: str, user_id: str, session_id: str) -> Iterator[str]:
        for event in self.agent.run(
            prompt,
            user_id=user_id,
            session_id=session_id,
            stream=True,
        ):
            token = getattr(event, "content", "") or ""
            if token:
                yield token

    def finalize_reply(self, text: str) -> str:
        return _sanitize_response(text)

    def get_user_memories(self, user_id: str) -> list[dict[str, object]]:
        memories = self.agent.get_user_memories(user_id=user_id)
        return [
            {
                "memory": item.memory,
                "topics": item.topics,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
            for item in memories
        ]
