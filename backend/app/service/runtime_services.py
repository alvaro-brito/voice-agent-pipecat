"""Lazy-loaded runtime services for speech and agent processing."""

from __future__ import annotations

import os

from faster_whisper import WhisperModel
from openai import OpenAI
from supertonic import TTS

from app.helpers.config import (
    DATA_DIR,
    MODEL_DIR,
    OPENAI_BASE_URL,
    TTS_VOICE,
    WHISPER_MODEL,
    ensure_stack_available,
)
from app.service.agno_chat import AgnoChatService

whisper: WhisperModel | None = None
tts: TTS | None = None
voice_style = None
agno_local_service: AgnoChatService | None = None
agno_openai_service: AgnoChatService | None = None
openai_client: OpenAI | None = None


def get_whisper_model() -> WhisperModel:
    global whisper
    ensure_stack_available("local")
    if whisper is None:
        print("[startup] Loading Whisper model...", flush=True)
        whisper = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
        print("[startup] Whisper loaded.", flush=True)
    return whisper


def get_local_tts() -> TTS:
    global tts
    ensure_stack_available("local")
    if tts is None:
        print("[startup] Loading Supertonic 3 TTS...", flush=True)
        tts = TTS(model_dir=str(MODEL_DIR))
        print("[startup] TTS loaded.", flush=True)
    return tts


def get_local_voice_style():
    global voice_style
    if voice_style is None:
        voice_style = get_local_tts().get_voice_style(voice_name=TTS_VOICE)
    return voice_style


def get_openai_client() -> OpenAI:
    global openai_client
    ensure_stack_available("openai")
    if openai_client is None:
        client_params: dict[str, object] = {
            "api_key": os.environ["OPENAI_API_KEY"],
        }
        if OPENAI_BASE_URL:
            client_params["base_url"] = OPENAI_BASE_URL
        openai_client = OpenAI(**client_params)
    return openai_client


def get_agno_service(stack: str) -> AgnoChatService:
    global agno_local_service, agno_openai_service
    if stack == "openai":
        ensure_stack_available("openai")
        if agno_openai_service is None:
            agno_openai_service = AgnoChatService(DATA_DIR / "agno.db", stack="openai")
        return agno_openai_service

    ensure_stack_available("local")
    if agno_local_service is None:
        print("[startup] Loading Agno agent...", flush=True)
        agno_local_service = AgnoChatService(DATA_DIR / "agno.db", stack="local")
        print("[startup] Agno loaded.", flush=True)
    return agno_local_service


def preload_local_services() -> None:
    """Eagerly load all local-stack models. Call only when local stack is available."""
    get_whisper_model()
    get_local_voice_style()  # also loads TTS
    get_agno_service("local")
