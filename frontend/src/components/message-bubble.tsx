import { cn } from "@/lib/utils"
import type { ChatMessage, Stack } from "@/types"
import type { Locale } from "@/i18n"
import { t } from "@/i18n"

function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`
}

function stackLabel(stack: Stack) {
  return stack === "openai" ? "OpenAI" : "Local"
}

interface MessageBubbleProps {
  message: ChatMessage
  locale: Locale
}

export function MessageBubble({ message, locale }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const { metrics, stack } = message

  return (
    <div
      className={cn(
        "flex gap-3 animate-message-enter",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* avatar */}
      <div
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isUser
            ? "bg-primary/20 text-primary ring-1 ring-primary/30"
            : "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
        )}
      >
        {isUser ? t(locale, "voiceAvatar") : t(locale, "aiAvatar")}
      </div>

      <div className={cn("flex max-w-[80%] flex-col gap-2", isUser ? "items-end" : "items-start")}>
        {/* bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-primary/10 border border-primary/20 text-foreground"
              : "bg-secondary border border-border text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>

          {/* audio player */}
          {message.audioBase64 && (
            <audio
              controls
              src={`data:audio/wav;base64,${message.audioBase64}`}
              className="mt-2 w-full min-w-[240px] h-9 rounded-lg"
            />
          )}
          {!message.audioBase64 && message.recordedBlobUrl && (
            <audio
              controls
              src={message.recordedBlobUrl}
              className="mt-2 w-full min-w-[240px] h-9 rounded-lg"
            />
          )}
        </div>

        {/* metrics */}
        {metrics && (metrics.transcriptionMs || metrics.llmMs || metrics.ttsMs) && (
          <div className="flex flex-wrap gap-1.5">
            {stack && (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
                {stackLabel(stack)}
              </span>
            )}
            {metrics.transcriptionMs ? (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
                STT {formatMs(metrics.transcriptionMs)}
              </span>
            ) : null}
            {metrics.llmMs ? (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
                LLM {formatMs(metrics.llmMs)}
              </span>
            ) : null}
            {metrics.ttsMs ? (
              <span className="rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
                TTS {formatMs(metrics.ttsMs)}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator({ text, locale }: { text: string; locale: Locale }) {
  return (
    <div className="flex gap-3 animate-message-enter">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 text-xs font-bold">
        {t(locale, "aiAvatar")}
      </div>
      <div className="rounded-2xl bg-secondary border border-border px-4 py-3 text-sm text-foreground">
        {text ? (
          <p className="whitespace-pre-wrap break-words">{text}</p>
        ) : (
          <span className="inline-flex gap-1 items-center">
            {[0, 150, 300].map(delay => (
              <span
                key={delay}
                className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground"
                style={{ animation: `dot-pulse 1.3s ${delay}ms infinite both` }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
