"""Centralized runtime configuration for the backend."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env", override=True)

DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR.parent.parent / "tts-test" / "models" / "supertonic-3"
WHISPER_MODEL = "large-v3-turbo"
TTS_VOICE = "M1"
DEFAULT_AUDIO_SUFFIX = ".webm"
STACK_MODE = (os.getenv("STACK_MODE", "hybrid") or "hybrid").strip().lower()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3-coder:30b-a3b-q4_K_M")
OPENAI_LLM_MODEL = os.getenv("OPENAI_LLM_MODEL", "gpt-4.1-mini")
OPENAI_STT_MODEL = os.getenv("OPENAI_STT_MODEL", "gpt-4o-mini-transcribe")
OPENAI_TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
OPENAI_TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "alloy")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
SUPPORTED_TTS_LANGS = {
    "ar",
    "ca",
    "cs",
    "da",
    "de",
    "el",
    "en",
    "es",
    "fi",
    "fr",
    "he",
    "hi",
    "hr",
    "hu",
    "id",
    "it",
    "ja",
    "ko",
    "ms",
    "nl",
    "no",
    "pl",
    "pt",
    "ro",
    "ru",
    "sk",
    "sv",
    "th",
    "tr",
    "uk",
    "vi",
    "zh",
}
STACK_LABELS = {
    "local": "100% Local",
    "openai": "OpenAI",
}

StackName = Literal["local", "openai"]
StackMode = Literal["hybrid", "local", "openai"]


def normalize_stack(stack: str | None) -> StackName:
    return "openai" if stack == "openai" else "local"


def normalize_stack_mode(mode: str | None) -> StackMode:
    if mode == "local":
        return "local"
    if mode == "openai":
        return "openai"
    return "hybrid"


def requested_stacks() -> list[StackName]:
    stack_mode = normalize_stack_mode(STACK_MODE)
    if stack_mode == "local":
        return ["local"]
    if stack_mode == "openai":
        return ["openai"]
    return ["local", "openai"]


def stack_catalog() -> dict[StackName, dict[str, object]]:
    local_requested = "local" in requested_stacks()
    openai_requested = "openai" in requested_stacks()
    local_available = local_requested and MODEL_DIR.exists()
    openai_available = openai_requested and bool(os.getenv("OPENAI_API_KEY"))

    return {
        "local": {
            "key": "local",
            "label": STACK_LABELS["local"],
            "description": "Whisper STT + Ollama + Supertonic 3",
            "requested": local_requested,
            "available": local_available,
            "reason_code": None
            if local_available
            else ("disabled_by_stack_mode" if not local_requested else "missing_local_model"),
            "reason": None
            if local_available
            else (
                "Disabled by STACK_MODE."
                if not local_requested
                else "Supertonic local model directory not found."
            ),
            "llm_model": OLLAMA_MODEL,
            "base_url": OLLAMA_BASE_URL,
        },
        "openai": {
            "key": "openai",
            "label": STACK_LABELS["openai"],
            "description": "OpenAI STT + LLM + TTS",
            "requested": openai_requested,
            "available": openai_available,
            "reason_code": None
            if openai_available
            else ("disabled_by_stack_mode" if not openai_requested else "missing_openai_api_key"),
            "reason": None
            if openai_available
            else (
                "Disabled by STACK_MODE."
                if not openai_requested
                else "OPENAI_API_KEY is not configured."
            ),
            "llm_model": OPENAI_LLM_MODEL,
            "stt_model": OPENAI_STT_MODEL,
            "tts_model": OPENAI_TTS_MODEL,
            "tts_voice": OPENAI_TTS_VOICE,
            "base_url": OPENAI_BASE_URL,
        },
    }


def available_stacks() -> list[StackName]:
    catalog = stack_catalog()
    return [stack for stack in ("local", "openai") if catalog[stack]["available"]]


def default_stack() -> StackName:
    available = available_stacks()
    configured_default = normalize_stack(os.getenv("DEFAULT_STACK"))
    if configured_default in available:
        return configured_default
    if available:
        return available[0]
    requested = requested_stacks()
    return requested[0] if requested else "local"


def openai_config() -> dict[str, object]:
    catalog = stack_catalog()["openai"]
    return {
        "configured": bool(os.getenv("OPENAI_API_KEY")),
        "requested": catalog["requested"],
        "available": catalog["available"],
        "reason_code": catalog["reason_code"],
        "reason": catalog["reason"],
        "llm_model": OPENAI_LLM_MODEL,
        "stt_model": OPENAI_STT_MODEL,
        "tts_model": OPENAI_TTS_MODEL,
        "tts_voice": OPENAI_TTS_VOICE,
        "base_url": OPENAI_BASE_URL,
    }


def local_config() -> dict[str, object]:
    catalog = stack_catalog()["local"]
    return {
        "requested": catalog["requested"],
        "available": catalog["available"],
        "reason_code": catalog["reason_code"],
        "reason": catalog["reason"],
        "llm_model": OLLAMA_MODEL,
        "base_url": OLLAMA_BASE_URL,
        "tts_model_dir": str(MODEL_DIR),
        "tts_voice": TTS_VOICE,
    }


def ensure_stack_available(stack: StackName) -> None:
    config = stack_catalog()[stack]
    if not config["available"]:
        reason = config.get("reason")
        raise RuntimeError(f"The {STACK_LABELS[stack]} stack is not available. {reason}")
