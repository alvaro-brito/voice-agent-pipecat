"""FastAPI application and transport endpoints."""

from __future__ import annotations

import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.helpers.config import (
    STACK_LABELS,
    STACK_MODE,
    available_stacks,
    default_stack,
    ensure_stack_available,
    local_config,
    normalize_stack,
    normalize_stack_mode,
    openai_config,
    requested_stacks,
    stack_catalog,
)
from app.service.runtime_services import ensure_local_models_downloaded, get_agno_service, preload_local_services
from app.service.voice_pipeline import process_turn, send_event


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    if "local" in requested_stacks():
        loop = asyncio.get_running_loop()
        print("[startup] Local stack requested — checking models...", flush=True)
        await loop.run_in_executor(None, ensure_local_models_downloaded)
        print("[startup] Preloading local models...", flush=True)
        await loop.run_in_executor(None, preload_local_services)
        print("[startup] All local models ready.", flush=True)
    yield


app = FastAPI(title="Voice Chat Realtime", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws")
async def websocket_pipeline(
    websocket: WebSocket,
    session_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
) -> None:
    await websocket.accept()

    resolved_session_id = session_id or str(uuid.uuid4())
    resolved_user_id = user_id or f"guest-{uuid.uuid4()}"
    turn_chunks: list[bytes] = []
    mime_type: str | None = None
    resolved_default_stack = default_stack()
    turn_stack = resolved_default_stack
    turn_accepted = True

    await send_event(
        websocket,
        "session_ready",
        session_id=resolved_session_id,
        user_id=resolved_user_id,
        mode="agno-memory",
        stack_mode=normalize_stack_mode(STACK_MODE),
        current_stack=resolved_default_stack,
        stack_label=STACK_LABELS[resolved_default_stack],
        available_stacks=available_stacks(),
        stacks=stack_catalog(),
    )

    try:
        while True:
            message = await websocket.receive()

            if message.get("bytes") is not None:
                if turn_accepted:
                    turn_chunks.append(message["bytes"])
                continue

            text = message.get("text")
            if not text:
                continue

            try:
                payload = json.loads(text)
            except json.JSONDecodeError:
                await send_event(websocket, "error", message="Invalid message received from the client.")
                continue

            message_type = payload.get("type")

            if message_type == "turn.start":
                turn_chunks = []
                mime_type = payload.get("mimeType")
                turn_stack = normalize_stack(payload.get("stack"))
                try:
                    ensure_stack_available(turn_stack)
                except Exception as exc:
                    turn_accepted = False
                    await send_event(websocket, "error", message=str(exc))
                    continue
                turn_accepted = True
                await send_event(
                    websocket,
                    "stack_selected",
                    stack=turn_stack,
                    stack_label=STACK_LABELS[turn_stack],
                )
                await send_event(websocket, "status", step="listening")
            elif message_type == "turn.end":
                if not turn_accepted:
                    turn_chunks = []
                    turn_accepted = True
                    continue
                audio_bytes = b"".join(turn_chunks)
                turn_chunks = []
                try:
                    await process_turn(
                        websocket,
                        audio_bytes=audio_bytes,
                        mime_type=mime_type,
                        session_id=resolved_session_id,
                        user_id=resolved_user_id,
                        stack=turn_stack,
                    )
                except Exception as exc:
                    await send_event(websocket, "error", message=f"Processing failed: {exc}")
            elif message_type == "session.memories":
                memory_stack = normalize_stack(payload.get("stack")) if payload.get("stack") else resolved_default_stack
                await send_event(
                    websocket,
                    "session_memories",
                    memories=get_agno_service(memory_stack).get_user_memories(resolved_user_id),
                )
            elif message_type == "ping":
                await send_event(websocket, "pong")
    except WebSocketDisconnect:
        return


@app.get("/api/users/{user_id}/memories")
async def user_memories(user_id: str, stack: str | None = Query(default=None)) -> dict[str, object]:
    resolved_stack = normalize_stack(stack) if stack else default_stack()
    return {
        "user_id": user_id,
        "stack": resolved_stack,
        "memories": get_agno_service(resolved_stack).get_user_memories(user_id),
    }


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "status": "ok",
        "stack_mode": normalize_stack_mode(STACK_MODE),
        "default_stack": default_stack(),
        "available_stacks": available_stacks(),
        "stacks": stack_catalog(),
        "local": local_config(),
        "openai": openai_config(),
    }
