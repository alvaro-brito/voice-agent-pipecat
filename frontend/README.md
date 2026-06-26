# Frontend — voice-agent-pipecat

React + Vite frontend for the voice agent. Connects to the backend via WebSocket using the **@pipecat-ai/websocket-transport** client, streams audio in real time, and displays conversation with latency metrics.

## Tech stack

| Layer | Library | Version |
|---|---|---|
| UI framework | React | 19 |
| Build tool | Vite | 8 |
| Styling | Tailwind CSS | 3 |
| Components | shadcn/ui (Button, Card, Badge, Separator) | — |
| Icons | lucide-react | — |
| Transport | @pipecat-ai/websocket-transport | ^1.7.0 |
| Pipecat client | @pipecat-ai/client-js | ^1.12.0 |
| Style utilities | clsx + tailwind-merge + class-variance-authority | — |
| Language | TypeScript | 6 |

## Project structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── separator.tsx
│   │   ├── app-header.tsx        # Title, connection status, stack mode pill
│   │   ├── agent-section.tsx     # Voice Agent mode controls + VAD status
│   │   ├── control-panel.tsx     # Left panel: mode + stack + session info
│   │   ├── conversation-panel.tsx # Right panel: message history
│   │   ├── dashboard-strip.tsx   # Metrics bar (latency, memory count)
│   │   ├── message-bubble.tsx    # User / assistant message with audio player
│   │   ├── mode-selector.tsx     # Push-to-Talk vs Voice Agent toggle
│   │   └── stack-selector.tsx    # Local vs OpenAI stack cards
│   ├── hooks/
│   │   ├── use-voice-socket.ts   # WebSocket connection, protocol, state
│   │   ├── use-push-to-talk.ts   # Space key → MediaRecorder → blob
│   │   └── use-voice-agent.ts    # VAD loop (RMS threshold, silence detection)
│   ├── lib/
│   │   └── utils.ts              # cn() helper (clsx + tailwind-merge)
│   ├── App.tsx                   # Root component, layout, hook wiring
│   ├── i18n.ts                   # PT / EN translation strings
│   ├── index.css                 # Tailwind directives + CSS variables + animations
│   ├── main.tsx                  # React entry point
│   └── types.ts                  # Shared TypeScript types
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── vite.config.ts
```

## Install

```bash
npm install
```

## Run

```bash
npm run dev        # dev server — http://localhost:3006
npm run build      # production build → dist/
npm run preview    # preview production build locally
```

## Interaction modes

### Push-to-Talk
Hold `Space` to record. Release to send. A `MediaRecorder` captures webm/opus audio, which is sent as binary chunks over the WebSocket with `turn.start` / `turn.end` events.

### Voice Agent
Continuous listening with browser-side VAD. A `requestAnimationFrame` loop samples the microphone via `AnalyserNode`, computing RMS amplitude. Speech is detected above a threshold of `0.045`; end-of-speech is triggered after `1100ms` of silence. The captured segment is sent automatically.

## WebSocket protocol

The frontend implements the full Pipecat WebSocket protocol:

**Sent to server**

| Message | When |
|---|---|
| `{ type: "turn.start", mimeType, stack }` | Before sending audio |
| Binary chunks (webm/opus) | During recording |
| `{ type: "turn.end" }` | After recording stops |
| `{ type: "session.memories", stack }` | On session connect |
| `{ type: "ping" }` | Keepalive |

**Received from server**

| Event | Effect |
|---|---|
| `session_ready` | Populates session ID, user ID, available stacks |
| `status` | Updates chat status label |
| `transcription` | Adds user message bubble |
| `llm_token` | Streams assistant typing indicator |
| `llm_end` | Finalises assistant text |
| `audio` | Plays base64 WAV response |
| `done` | Updates latency metrics (STT / LLM / TTS ms) |
| `error` | Displays error state |
| `session_memories` | Updates memory count in dashboard |

## Environment

No `.env` needed by default. The backend URL is derived from the current page origin (`ws://localhost:8009/ws`). Override in `use-voice-socket.ts` if deploying to a different host.

## i18n

PT and EN strings are defined in `src/i18n.ts`. Toggle via the language button in the header. Stored in `localStorage` as `lang`.
