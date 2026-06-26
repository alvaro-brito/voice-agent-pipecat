"""Speech processing pipeline used by the WebSocket controller."""

from __future__ import annotations

import asyncio
import base64
import os
import tempfile
import time
from typing import AsyncGenerator

from fastapi import WebSocket

from app.helpers.audio import detect_suffix, normalize_tts_lang
from app.helpers.config import OPENAI_STT_MODEL, OPENAI_TTS_MODEL, OPENAI_TTS_VOICE, STACK_LABELS, StackName
from app.service.runtime_services import (
    get_agno_service,
    get_local_tts,
    get_local_voice_style,
    get_openai_client,
    get_whisper_model,
)


async def transcribe_audio(audio_bytes: bytes, mime_type: str | None, stack: StackName) -> tuple[str, str]:
    loop = asyncio.get_running_loop()

    def _transcribe() -> tuple[str, str]:
        suffix = detect_suffix(mime_type)
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            if stack == "openai":
                client = get_openai_client()
                with open(tmp_path, "rb") as audio_file:
                    response = client.audio.transcriptions.create(
                        file=audio_file,
                        model=OPENAI_STT_MODEL,
                        response_format="json",
                    )
                text = getattr(response, "text", "") or ""
                language = getattr(response, "language", "en") or "en"
                return text.strip(), language

            segments, info = get_whisper_model().transcribe(tmp_path, beam_size=3, vad_filter=False)
            text = " ".join(segment.text.strip() for segment in segments).strip()
            language = getattr(info, "language", "en") or "en"
            return text, language
        finally:
            os.unlink(tmp_path)

    return await loop.run_in_executor(None, _transcribe)


def tts_synthesize(text: str, language: str, stack: StackName) -> str:
    if stack == "openai":
        client = get_openai_client()
        response = client.audio.speech.create(
            model=OPENAI_TTS_MODEL,
            voice=OPENAI_TTS_VOICE,
            input=text,
            response_format="wav",
        )
        return base64.b64encode(response.read()).decode("utf-8")

    local_tts = get_local_tts()
    wav, _duration = local_tts.synthesize(
        text,
        voice_style=get_local_voice_style(),
        lang=normalize_tts_lang(language),
    )
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        local_tts.save_audio(wav, tmp_path)
        with open(tmp_path, "rb") as audio_file:
            return base64.b64encode(audio_file.read()).decode("utf-8")
    finally:
        os.unlink(tmp_path)


async def agno_stream_reply(
    prompt: str,
    user_id: str,
    session_id: str,
    stack: StackName,
) -> AsyncGenerator[str, None]:
    queue: asyncio.Queue[tuple[str, str | Exception | None]] = asyncio.Queue()
    loop = asyncio.get_running_loop()
    agno_service = get_agno_service(stack)

    def _worker() -> None:
        try:
            for token in agno_service.stream_reply(prompt, user_id=user_id, session_id=session_id):
                loop.call_soon_threadsafe(queue.put_nowait, ("token", token))
        except Exception as exc:
            loop.call_soon_threadsafe(queue.put_nowait, ("error", exc))
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, ("done", None))

    task = loop.run_in_executor(None, _worker)

    while True:
        kind, payload = await queue.get()
        if kind == "token":
            assert isinstance(payload, str)
            yield payload
        elif kind == "error":
            assert isinstance(payload, Exception)
            raise payload
        else:
            break

    await task


async def send_event(websocket: WebSocket, event_type: str, **payload: object) -> None:
    await websocket.send_json({"type": event_type, **payload})


async def process_turn(
    websocket: WebSocket,
    *,
    audio_bytes: bytes,
    mime_type: str | None,
    session_id: str,
    user_id: str,
    stack: StackName,
) -> None:
    await send_event(websocket, "status", step="transcribing")
    stt_started_at = time.perf_counter()
    transcription, detected_lang = await transcribe_audio(audio_bytes, mime_type, stack)
    stt_ms = round((time.perf_counter() - stt_started_at) * 1000, 1)

    if not transcription:
        await send_event(websocket, "error", message="Could not transcribe the audio.")
        await send_event(
            websocket,
            "done",
            metrics={"transcription_ms": stt_ms, "llm_ms": 0, "tts_ms": 0},
            stack=stack,
            stack_label=STACK_LABELS[stack],
        )
        return

    await send_event(
        websocket,
        "transcription",
        text=transcription,
        duration_ms=stt_ms,
        language=detected_lang,
        stack=stack,
    )

    await send_event(websocket, "status", step="thinking")
    llm_started_at = time.perf_counter()
    llm_tokens: list[str] = []

    async for token in agno_stream_reply(transcription, user_id=user_id, session_id=session_id, stack=stack):
        llm_tokens.append(token)
        await send_event(websocket, "llm_token", token=token)

    llm_full = get_agno_service(stack).finalize_reply("".join(llm_tokens))
    llm_ms = round((time.perf_counter() - llm_started_at) * 1000, 1)
    await send_event(websocket, "llm_end", full_text=llm_full, duration_ms=llm_ms, stack=stack)

    if not llm_full:
        await send_event(websocket, "error", message="The agent returned an empty response.")
        await send_event(
            websocket,
            "done",
            metrics={"transcription_ms": stt_ms, "llm_ms": llm_ms, "tts_ms": 0},
            stack=stack,
            stack_label=STACK_LABELS[stack],
        )
        return

    await send_event(websocket, "status", step="synthesizing")
    tts_started_at = time.perf_counter()
    loop = asyncio.get_running_loop()
    audio_b64 = await loop.run_in_executor(None, lambda: tts_synthesize(llm_full, detected_lang, stack))
    tts_ms = round((time.perf_counter() - tts_started_at) * 1000, 1)

    memories = get_agno_service(stack).get_user_memories(user_id)
    await send_event(
        websocket,
        "audio",
        base64=audio_b64,
        duration_ms=tts_ms,
        language=normalize_tts_lang(detected_lang),
        stack=stack,
    )
    await send_event(
        websocket,
        "done",
        metrics={"transcription_ms": stt_ms, "llm_ms": llm_ms, "tts_ms": tts_ms},
        session_id=session_id,
        user_id=user_id,
        memory_count=len(memories),
        stack=stack,
        stack_label=STACK_LABELS[stack],
    )
