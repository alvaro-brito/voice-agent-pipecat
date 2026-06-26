import { useState, useRef, useCallback } from "react"
import type { Stack, StackMode, StackConfig, HealthResponse, ChatMessage, ResponseMetrics } from "@/types"

const API_URL = "http://localhost:8009"
const WS_URL = API_URL.replace("http://", "ws://").replace("https://", "wss://")

function getOrCreateStorageValue(key: string, storage: Storage, prefix = "session") {
  const existing = storage.getItem(key)
  if (existing) return existing
  const value = `${prefix}-${crypto.randomUUID()}`
  storage.setItem(key, value)
  return value
}

function normalizeStack(value: unknown): Stack {
  return value === "openai" ? "openai" : "local"
}

export function useVoiceSocket() {
  const socketRef = useRef<WebSocket | null>(null)
  const socketReadyRef = useRef<Promise<void> | null>(null)

  const sessionId = getOrCreateStorageValue("voice-chat-session-id", sessionStorage)
  const userId = getOrCreateStorageValue("voice-chat-user-id", localStorage, "guest")

  const [connectionState, setConnectionState] = useState("Initializing")
  const [currentStackMode, setCurrentStackMode] = useState<StackMode>("hybrid")
  const [availableStacks, setAvailableStacks] = useState<Stack[]>([])
  const [stackConfigs, setStackConfigs] = useState<Partial<Record<Stack, StackConfig>>>({})
  const [currentStack, setCurrentStackState] = useState<Stack>(
    normalizeStack(localStorage.getItem("voice-chat-stack"))
  )
  const [memoryCount, setMemoryCount] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingText, setTypingText] = useState("")
  const [chatStatus, setChatStatus] = useState("Initializing")
  const [status, setStatus] = useState("")

  const currentTurnRef = useRef<{
    llmTokens: string
    audioBase64?: string
    metrics: ResponseMetrics
    mode: "push" | "agent"
    stack: Stack
  } | null>(null)

  const botAudioRef = useRef<HTMLAudioElement | null>(null)

  const applyRuntimeConfig = useCallback(
    (payload: Partial<HealthResponse> & { current_stack?: Stack }) => {
      if (payload.stack_mode) setCurrentStackMode(payload.stack_mode)

      const newAvailable = Array.isArray(payload.available_stacks)
        ? payload.available_stacks.filter((s): s is Stack => s === "local" || s === "openai")
        : []
      if (newAvailable.length) setAvailableStacks(newAvailable)

      if (payload.stacks) setStackConfigs(payload.stacks)

      const preferred = normalizeStack(localStorage.getItem("voice-chat-stack"))
      const backendDefault = normalizeStack(payload.current_stack ?? payload.default_stack ?? preferred)
      const resolved = newAvailable.includes(preferred)
        ? preferred
        : newAvailable.includes(backendDefault)
          ? backendDefault
          : backendDefault
      setCurrentStackState(resolved)
      localStorage.setItem("voice-chat-stack", resolved)
    },
    []
  )

  const playAudio = useCallback((audioBase64: string, onEnd?: () => void) => {
    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`)
    botAudioRef.current = audio
    audio.onended = () => onEnd?.()
    audio.onpause = () => { if (audio.ended) onEnd?.() }
    audio.play().catch(() => onEnd?.())
  }, [])

  const handleServerEvent = useCallback(
    (data: Record<string, unknown>, mode: "push" | "agent", onAgentAudioEnd?: () => void) => {
      switch (data.type) {
        case "session_ready":
          applyRuntimeConfig(data as Partial<HealthResponse> & { current_stack?: Stack })
          socketRef.current?.send(JSON.stringify({ type: "session.memories", stack: currentStack }))
          setChatStatus("Session connected")
          break

        case "stack_selected":
          if (data.stack === "openai" || data.stack === "local") {
            setCurrentStackState(data.stack)
            localStorage.setItem("voice-chat-stack", data.stack)
          }
          break

        case "status":
          setChatStatus(
            data.step === "listening" ? "Listening"
              : data.step === "transcribing" ? "Transcribing"
              : data.step === "thinking" ? "Processing"
              : "Generating audio"
          )
          setStatus(
            data.step === "transcribing" ? "Transcribing audio..."
              : data.step === "thinking" ? "Reasoning with memory..."
              : data.step === "synthesizing" ? "Synthesizing response..."
              : ""
          )
          break

        case "transcription": {
          if (!currentTurnRef.current) break
          currentTurnRef.current.metrics.transcriptionMs = Number(data.duration_ms ?? 0)
          setMessages(prev => {
            const updated = [...prev]
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === "user") {
                updated[i] = { ...updated[i], text: String(data.text ?? "") }
                break
              }
            }
            return updated
          })
          break
        }

        case "llm_token":
          if (!currentTurnRef.current) break
          currentTurnRef.current.llmTokens += String(data.token ?? "")
          setTypingText(currentTurnRef.current.llmTokens)
          break

        case "llm_end":
          if (!currentTurnRef.current) break
          currentTurnRef.current.metrics.llmMs = Number(data.duration_ms ?? 0)
          currentTurnRef.current.llmTokens = String(data.full_text ?? currentTurnRef.current.llmTokens)
          break

        case "audio":
          if (!currentTurnRef.current) break
          currentTurnRef.current.audioBase64 = String(data.base64 ?? "")
          currentTurnRef.current.metrics.ttsMs = Number(data.duration_ms ?? 0)
          break

        case "done": {
          if (!currentTurnRef.current) break
          if (data.metrics && typeof data.metrics === "object") {
            const m = data.metrics as Record<string, number | undefined>
            currentTurnRef.current.metrics.transcriptionMs = m.transcription_ms ?? currentTurnRef.current.metrics.transcriptionMs
            currentTurnRef.current.metrics.llmMs = m.llm_ms ?? currentTurnRef.current.metrics.llmMs
            currentTurnRef.current.metrics.ttsMs = m.tts_ms ?? currentTurnRef.current.metrics.ttsMs
          }
          if (typeof data.memory_count === "number") setMemoryCount(data.memory_count)

          const turn = currentTurnRef.current
          const msgId = crypto.randomUUID()
          setMessages(prev => [
            ...prev,
            {
              id: msgId,
              role: "assistant",
              text: turn.llmTokens,
              audioBase64: turn.audioBase64,
              metrics: { ...turn.metrics },
              stack: (data.stack as Stack | undefined) ?? turn.stack,
            },
          ])
          setIsTyping(false)
          setTypingText("")
          currentTurnRef.current = null

          if (turn.audioBase64) {
            playAudio(turn.audioBase64, onAgentAudioEnd)
          } else {
            onAgentAudioEnd?.()
          }

          if (turn.mode === "push") {
            setChatStatus("Ready")
            setStatus("")
          }
          break
        }

        case "error":
          setIsTyping(false)
          setTypingText("")
          currentTurnRef.current = null
          setMessages(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              text: `Error: ${String(data.message ?? "Unknown error")}`,
            },
          ])
          setChatStatus("Error")
          onAgentAudioEnd?.()
          break

        case "session_memories":
          if (Array.isArray(data.memories)) setMemoryCount(data.memories.length)
          setChatStatus("Memories synced")
          break
      }
    },
    [applyRuntimeConfig, currentStack, playAudio]
  )

  const connectSocket = useCallback(
    (mode: "push" | "agent", onAgentAudioEnd?: () => void): Promise<void> => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        return Promise.resolve()
      }
      if (socketReadyRef.current) return socketReadyRef.current

      setConnectionState("Connecting")
      socketReadyRef.current = new Promise((resolve, reject) => {
        const ws = new WebSocket(
          `${WS_URL}/ws?session_id=${encodeURIComponent(sessionId)}&user_id=${encodeURIComponent(userId)}`
        )
        ws.binaryType = "arraybuffer"
        socketRef.current = ws

        ws.onopen = () => { setConnectionState("Connected"); resolve() }
        ws.onerror = () => {
          setConnectionState("Failed")
          reject(new Error("WebSocket connection failed"))
        }
        ws.onclose = () => {
          socketRef.current = null
          socketReadyRef.current = null
          setConnectionState("Disconnected")
        }
        ws.onmessage = (event) => {
          if (typeof event.data === "string") {
            handleServerEvent(JSON.parse(event.data) as Record<string, unknown>, mode, onAgentAudioEnd)
          }
        }
      })
      return socketReadyRef.current
    },
    [sessionId, userId, handleServerEvent]
  )

  const sendBlobTurn = useCallback(
    async (blob: Blob, mimeType: string, mode: "push" | "agent", onAgentAudioEnd?: () => void) => {
      if (!blob.size) return

      await connectSocket(mode, onAgentAudioEnd)

      const msgId = crypto.randomUUID()
      const blobUrl = URL.createObjectURL(blob)
      setMessages(prev => [
        ...prev,
        { id: msgId, role: "user", text: "Transcribing...", recordedBlobUrl: blobUrl },
      ])
      setIsTyping(true)
      setTypingText("")
      setChatStatus("Sending audio")

      currentTurnRef.current = { llmTokens: "", metrics: {}, mode, stack: currentStack }

      const ws = socketRef.current
      if (!ws) return

      ws.send(JSON.stringify({ type: "turn.start", mimeType, stack: currentStack }))
      const buffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const chunkSize = 32768
      for (let i = 0; i < bytes.length; i += chunkSize) {
        ws.send(bytes.slice(i, i + chunkSize))
      }
      ws.send(JSON.stringify({ type: "turn.end" }))
    },
    [connectSocket, currentStack]
  )

  const setStack = useCallback(
    (stack: Stack, configs: Partial<Record<Stack, StackConfig>>) => {
      const config = configs[stack]
      if (!config?.available) return false
      setCurrentStackState(stack)
      localStorage.setItem("voice-chat-stack", stack)
      socketRef.current?.send(JSON.stringify({ type: "session.memories", stack }))
      return true
    },
    []
  )

  const requestMemories = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: "session.memories", stack: currentStack }))
  }, [currentStack])

  const stopBotAudio = useCallback(() => {
    if (botAudioRef.current) {
      botAudioRef.current.pause()
      botAudioRef.current = null
    }
  }, [])

  return {
    sessionId,
    userId,
    connectionState,
    currentStackMode,
    availableStacks,
    stackConfigs,
    currentStack,
    setStack,
    memoryCount,
    messages,
    isTyping,
    typingText,
    chatStatus,
    status,
    connectSocket,
    sendBlobTurn,
    requestMemories,
    applyRuntimeConfig,
    stopBotAudio,
    socketRef,
  }
}
