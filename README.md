# voice-agent-pipecat

> https://github.com/alvaro-brito/voice-agent-pipecat

End-to-end voice agent built with **Pipecat** and **Agno**, supporting two runtime stacks — fully local or OpenAI — switchable without restarting the backend.

## How it works

```
Microphone → Pipecat WebSocket transport → STT → Agno (LLM + memory) → TTS → Speaker
```

1. The frontend captures audio via the browser microphone.
2. **Pipecat** handles the WebSocket transport between browser and backend.
3. The backend routes the audio through the active stack's STT model.
4. **Agno** runs the LLM with per-user, per-session memory persistence.
5. The response text is synthesized by the active stack's TTS model.
6. The frontend plays the audio and displays STT, LLM, and TTS latency metrics.

## Two stacks, one codebase

Both stacks are always orchestrated by **Agno** for memory and LLM management. What differs is the underlying model provider:

| | Local | OpenAI |
|---|---|---|
| **STT** | faster-whisper (`large-v3-turbo`) | `gpt-4o-mini-transcribe` |
| **LLM** | Ollama (`http://localhost:11434`) | `gpt-4.1-mini` |
| **TTS** | Supertonic 3 | `gpt-4o-mini-tts` |
| **Memory** | Agno + SQLite | Agno + SQLite |
| **Privacy** | 100% local | Cloud |

`STACK_MODE` in `backend/.env` controls which stacks the backend exposes:

- `local` — only the local stack
- `openai` — only the OpenAI stack
- `hybrid` — both stacks, selectable from the UI at runtime

## Project structure

```text
voice-agent-pipecat/
├── backend/                  # Python — FastAPI + Pipecat + Agno
│   ├── app/
│   │   ├── controller/       # WebSocket endpoint + REST API
│   │   ├── helpers/          # Config loader, audio utilities
│   │   └── service/          # Voice pipeline, Agno chat, runtime services
│   ├── data/                 # SQLite memory database (git-ignored)
│   ├── .env                  # Runtime config (git-ignored)
│   ├── main.py
│   └── README.md
├── frontend/                 # TypeScript — React + Vite + Pipecat client
│   ├── src/
│   │   ├── components/       # UI components (shadcn/ui)
│   │   ├── hooks/            # WebSocket, Push-to-Talk, Voice Agent
│   │   └── i18n.ts           # PT / EN translations
│   ├── index.html
│   └── package.json
├── run.sh                    # Start backend + frontend
├── stop.sh                   # Stop backend + frontend
└── README.md
```

## Requirements

- Python 3.12+ and [`uv`](https://github.com/astral-sh/uv)
- Node.js 18+ and `npm`
- Ollama running locally (for the `local` stack)
- Supertonic 3 model files under `../tts-test/models/supertonic-3` (for the `local` stack)
- `OPENAI_API_KEY` configured (for the `openai` stack)

## Install

```bash
# Backend
cd backend && uv sync

# Frontend
cd frontend && npm install
```

## Configure

Copy and edit `backend/.env`:

```env
STACK_MODE=hybrid
DEFAULT_STACK=local

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3-coder:30b-a3b-q4_K_M

OPENAI_API_KEY=
OPENAI_LLM_MODEL=gpt-4.1-mini
OPENAI_STT_MODEL=gpt-4o-mini-transcribe
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
# OPENAI_BASE_URL=
```

## Run

```bash
./run.sh
```

- Backend: `http://localhost:8009`
- Frontend: `http://localhost:3006`
- Logs: `.runtime/backend.log` and `.runtime/frontend.log`

```bash
./stop.sh   # stop all services
```

## Interface

- **Push-to-Talk** — hold `Space` to record, release to send
- **Voice Agent** — continuous listening with browser-side VAD (auto-detects speech)
- **Stack selector** — switch between Local and OpenAI mid-conversation
- **Language** — PT / EN toggle

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Runtime config, stack availability |
| `GET` | `/api/users/{user_id}/memories` | User memory records |
| `WS` | `/ws` | Realtime audio pipeline |
