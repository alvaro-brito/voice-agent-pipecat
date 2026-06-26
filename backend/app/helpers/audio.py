"""Audio-related helper functions."""

from __future__ import annotations

from app.helpers.config import DEFAULT_AUDIO_SUFFIX, SUPPORTED_TTS_LANGS


def detect_suffix(mime_type: str | None) -> str:
    mime = (mime_type or "").lower()
    if "ogg" in mime:
        return ".ogg"
    if "wav" in mime:
        return ".wav"
    if "mp4" in mime or "m4a" in mime:
        return ".m4a"
    return DEFAULT_AUDIO_SUFFIX


def normalize_tts_lang(language: str | None) -> str:
    base_lang = (language or "en").split("-")[0].lower()
    if base_lang in SUPPORTED_TTS_LANGS:
        return base_lang
    return "en"
