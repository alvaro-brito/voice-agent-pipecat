import { Radio, Loader2, Volume2, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { t, type Locale } from "@/i18n"

interface AgentSectionProps {
  locale: Locale
  isEnabled: boolean
  isProcessing: boolean
  isPlaying: boolean
  isRecording: boolean
  disabled?: boolean
  onToggle: () => void
}

export function AgentSection({
  locale,
  isEnabled,
  isProcessing,
  isPlaying,
  isRecording,
  disabled,
  onToggle,
}: AgentSectionProps) {
  const agentStateLabel = !isEnabled
    ? t(locale, "agentDisconnected")
    : isPlaying
      ? t(locale, "chatStatusSynthesizing")
      : isProcessing
        ? t(locale, "chatStatusThinking")
        : isRecording
          ? t(locale, "chatStatusCapturingVoice")
          : t(locale, "chatStatusAgentListening")

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-0.5">
        {t(locale, "agentTitle")}
      </p>
      <p className="text-xs text-muted-foreground px-0.5">{t(locale, "agentDescription")}</p>

      <Button
        variant={isEnabled ? "destructive" : "default"}
        className="w-full gap-2"
        disabled={disabled}
        onClick={onToggle}
      >
        {isEnabled ? (
          <>
            <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
            {t(locale, "stopAgent")}
          </>
        ) : (
          <>
            <Radio className="h-4 w-4" />
            {t(locale, "startAgent")}
          </>
        )}
      </Button>

      {isEnabled && (
        <div className={cn(
          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all",
          isRecording
            ? "border-red-500/30 bg-red-500/8 text-red-400"
            : isPlaying
              ? "border-primary/30 bg-primary/8 text-primary"
              : isProcessing
                ? "border-amber-500/30 bg-amber-500/8 text-amber-400"
                : "border-emerald-500/30 bg-emerald-500/8 text-emerald-400"
        )}>
          {isRecording ? (
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse-ring" />
          ) : isPlaying ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
          <span className="text-xs font-medium">{agentStateLabel}</span>
        </div>
      )}
    </div>
  )
}
