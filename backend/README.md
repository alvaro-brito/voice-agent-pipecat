# Backend — voice-agent-pipecat

FastAPI backend powering the voice pipeline. Uses **Pipecat** for WebSocket transport and **Agno** for LLM orchestration and memory — across both the local and OpenAI stacks.

## Architecture

```
WebSocket (Pipecat transport)
    ↓
voice_pipeline.py          ← turn orchestration (STT → LLM → TTS)
    ├── STT                ← faster-whisper  OR  OpenAI Transcriptions
    ├── Agno (agno_chat)   ← LLM + per-user session memory (always)
    │       ├── Ollama     ← local stack
    │       └── OpenAI     ← openai stack
    └── TTS                ← Supertonic 3  OR  OpenAI Speech
```

Agno runs in both stacks. The only difference between them is the underlying model provider for STT, LLM, and TTS.

## Two stacks

| | Local | OpenAI |
|---|---|---|
| **STT** | faster-whisper `large-v3-turbo` | `gpt-4o-mini-transcribe` |
| **LLM** | Ollama via `OLLAMA_BASE_URL` | `gpt-4.1-mini` |
| **TTS** | Supertonic 3, voice M1 | `gpt-4o-mini-tts` |
| **Memory** | Agno + SQLite (`data/agno.db`) | Agno + SQLite (`data/agno.db`) |

## Project structure

```text
backend/
├── app/
│   ├── controller/
│   │   └── api.py            # FastAPI app, WebSocket /ws, lifespan loader
│   ├── helpers/
│   │   ├── audio.py          # MIME detection, TTS language normalization
│   │   └── config.py         # All env vars, stack catalog, availability checks
│   └── service/
│       ├── agno_chat.py      # AgnoChatService — Agno agent + SQLite memory
│       ├── runtime_services.py  # Lazy singletons: Whisper, TTS, Agno, OpenAI client
│       └── voice_pipeline.py    # STT → Agno stream → TTS → WebSocket events
├── data/                     # SQLite memory database (git-ignored)
├── .env                      # Runtime config (git-ignored — see below)
├── main.py                   # Uvicorn entrypoint, port 8009
└── pyproject.toml
```

## Environment variables

Create `backend/.env`:

```env
# Stack mode: local | openai | hybrid
STACK_MODE=hybrid
DEFAULT_STACK=local

# Local stack — Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3-coder:30b-a3b-q4_K_M

# OpenAI stack
OPENAI_API_KEY=
OPENAI_LLM_MODEL=gpt-4.1-mini
OPENAI_STT_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
# OPENAI_BASE_URL=
```

`STACK_MODE` controls which stacks the backend exposes to the frontend:

- `local` — only the local stack (requires Ollama + Supertonic model files)
- `openai` — only the OpenAI stack (requires `OPENAI_API_KEY`)
- `hybrid` — both stacks; frontend can switch between them at runtime

When `STACK_MODE` includes `local`, the backend **eagerly loads** Whisper and Supertonic at startup so the first request has no cold-start delay.

## Install

```bash
uv sync
```

## Run

```bash
uv run python main.py
```

Backend runs on `http://localhost:8009`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Runtime config, stack availability, model details |
| `GET` | `/api/users/{user_id}/memories` | Memory records for a user |
| `WS` | `/ws?session_id=…&user_id=…` | Realtime audio pipeline |

## WebSocket protocol

**Client → Server**

| Message | Description |
|---|---|
| Binary chunk | Raw audio bytes (webm/opus) |
| `{ type: "turn.start", mimeType, stack }` | Begin a new turn |
| `{ type: "turn.end" }` | End turn, trigger pipeline |
| `{ type: "session.memories", stack }` | Request memory list |
| `{ type: "ping" }` | Keepalive |

**Server → Client**

| Event | Description |
|---|---|
| `session_ready` | Session info + available stacks |
| `status` | Pipeline step: `listening` / `transcribing` / `thinking` / `synthesizing` |
| `transcription` | Transcribed text + duration |
| `llm_token` | Streaming LLM token |
| `llm_end` | Full response text + duration |
| `audio` | Base64 WAV + duration |
| `done` | STT/LLM/TTS metrics + memory count |
| `error` | Error message |
| `session_memories` | User memory array |

## Notes

- Supertonic 3 model files must be present at `../tts-test/models/supertonic-3` for the local stack to be available.
- The backend loads `.env` with `override=True`, so project settings always take precedence over inherited shell variables.
- `<think>…</think>` blocks in LLM responses are stripped before TTS synthesis.
