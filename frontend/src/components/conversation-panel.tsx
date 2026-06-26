import { useEffect, useRef } from "react"
import { MessageSquare, Mic, Lightbulb } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MessageBubble, TypingIndicator } from "@/components/message-bubble"
import { t, type Locale } from "@/i18n"
import type { ChatMessage, Mode } from "@/types"

interface ConversationPanelProps {
  locale: Locale
  messages: ChatMessage[]
  isTyping: boolean
  typingText: string
  chatStatus: string
  mode: Mode
  isPushRecording: boolean
}

export function ConversationPanel({
  locale,
  messages,
  isTyping,
  typingText,
  chatStatus,
  mode,
  isPushRecording,
}: ConversationPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping, typingText])

  const isEmpty = messages.length === 0 && !isTyping

  return (
    <Card className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t(locale, "chatTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t(locale, "chatDescription")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className="text-xs text-muted-foreground">{chatStatus}</span>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[480px]">
        {isEmpty ? (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <span className="text-sm font-bold text-primary">AI</span>
            </div>
            <h3 className="text-base font-semibold text-foreground">{t(locale, "emptyTitle")}</h3>
            <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
              {t(locale, "emptyDescription")}
            </p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} locale={locale} />
            ))}
            {isTyping && <TypingIndicator text={typingText} locale={locale} />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <Separator />

      {/* footer */}
      <div className="px-5 py-3 flex items-center justify-between gap-3">
        {isPushRecording ? (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse-ring" />
            <span
              dangerouslySetInnerHTML={{ __html: t(locale, "recordingReleaseHtml") }}
            />
          </div>
        ) : (
          <span
            className="text-xs text-muted-foreground flex items-center gap-1.5"
            dangerouslySetInnerHTML={{
              __html: mode === "push"
                ? t(locale, "footerPushHtml")
                : t(locale, "footerAgent"),
            }}
          />
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5" />
          <span className="text-xs">{t(locale, "tip1")}</span>
        </div>
      </div>
    </Card>
  )
}
