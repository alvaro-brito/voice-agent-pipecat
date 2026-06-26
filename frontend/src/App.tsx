import { useState, useCallback, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { ControlPanel } from "@/components/control-panel"
import { ConversationPanel } from "@/components/conversation-panel"
import { useVoiceSocket } from "@/hooks/use-voice-socket"
import { usePushToTalk } from "@/hooks/use-push-to-talk"
import { useVoiceAgent } from "@/hooks/use-voice-agent"
import { getInitialLocale, type Locale } from "@/i18n"
import type { Mode, Stack } from "@/types"

const API_URL = "http://localhost:8009"

export default function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale())
  const [mode, setMode] = useState<Mode>("push")

  const {
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
    sendBlobTurn,
    applyRuntimeConfig,
    stopBotAudio,
  } = useVoiceSocket()

  const noStackAvailable = availableStacks.length === 0

  // load runtime config on mount
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.json())
      .then(data => applyRuntimeConfig(data))
      .catch(() => {/* backend not yet available */})
  }, [applyRuntimeConfig])

  // push to talk
  const handlePushBlob = useCallback(
    (blob: Blob, mimeType: string) => {
      void sendBlobTurn(blob, mimeType, "push")
    },
    [sendBlobTurn]
  )

  const { isRecording: isPushRecording, startRecording, stopRecording } =
    usePushToTalk(handlePushBlob, mode === "push")

  // voice agent
  const handleAgentBlob = useCallback(
    (blob: Blob, mimeType: string) => {
      void sendBlobTurn(blob, mimeType, "agent", () => {
        agentControls.setAudioPlaying(false)
        agentControls.onTurnProcessed()
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sendBlobTurn]
  )

  const agentControls = useVoiceAgent(handleAgentBlob)

  const handleModeChange = useCallback(
    (m: Mode) => {
      if (m === "push" && agentControls.isEnabled) {
        void agentControls.stopAgent()
        stopBotAudio()
      }
      setMode(m)
    },
    [agentControls, stopBotAudio]
  )

  const handleStackSelect = useCallback(
    (s: Stack) => {
      setStack(s, stackConfigs)
    },
    [setStack, stackConfigs]
  )

  const handleLocaleChange = useCallback((l: Locale) => {
    setLocale(l)
    localStorage.setItem("voice-chat-locale", l)
  }, [])

  const handleAgentToggle = useCallback(() => {
    if (agentControls.isEnabled) {
      void agentControls.stopAgent()
      stopBotAudio()
    } else {
      void agentControls.startAgent()
    }
  }, [agentControls, stopBotAudio])

  return (
    <div className="relative min-h-screen">
      <div className="bg-grid" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-5 py-6 space-y-5">
        <AppHeader
          locale={locale}
          onLocaleChange={handleLocaleChange}
          connectionState={connectionState}
          stackMode={currentStackMode}
        />

        <div className="flex gap-5 items-start">
          <ControlPanel
            locale={locale}
            sessionId={sessionId}
            userId={userId}
            currentStack={currentStack}
            stackConfigs={stackConfigs}
            memoryCount={memoryCount}
            status={status}
            stackMode={currentStackMode}
            mode={mode}
            onModeChange={handleModeChange}
            onStackSelect={handleStackSelect}
            isAgentEnabled={agentControls.isEnabled}
            isAgentProcessing={agentControls.isProcessing}
            isAgentPlaying={agentControls.isPlaying}
            isAgentRecording={false}
            noStackAvailable={noStackAvailable}
            onAgentToggle={handleAgentToggle}
          />

          <ConversationPanel
            locale={locale}
            messages={messages}
            isTyping={isTyping}
            typingText={typingText}
            chatStatus={chatStatus}
            mode={mode}
            isPushRecording={isPushRecording}
          />
        </div>
      </div>
    </div>
  )
}
