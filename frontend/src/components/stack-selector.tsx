import { CheckCircle2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { t, type Locale } from "@/i18n"
import type { Stack, StackConfig } from "@/types"

interface StackSelectorProps {
  locale: Locale
  stackConfigs: Partial<Record<Stack, StackConfig>>
  currentStack: Stack
  onSelect: (s: Stack) => void
}

function localizedReason(config: StackConfig, locale: Locale): string {
  if (config.reason_code === "disabled_by_stack_mode") return t(locale, "stackReasonDisabled")
  if (config.reason_code === "missing_local_model") return t(locale, "stackReasonMissingLocalModel")
  if (config.reason_code === "missing_openai_api_key") return t(locale, "stackReasonMissingOpenAIKey")
  return config.reason ?? t(locale, "stackUnavailable")
}

function formatMeta(config: StackConfig, locale: Locale): string[] {
  const tags: string[] = []
  if (config.llm_model) tags.push(`LLM ${config.llm_model}`)
  if (config.stt_model) tags.push(`STT ${config.stt_model}`)
  if (config.tts_model) tags.push(`TTS ${config.tts_model}`)
  if (config.base_url && config.key === "local") tags.push(t(locale, "stackOllamaRemote"))
  return tags.slice(0, 3)
}

export function StackSelector({ locale, stackConfigs, currentStack, onSelect }: StackSelectorProps) {
  const order: Stack[] = ["local", "openai"]
  const configs = order
    .map(s => stackConfigs[s])
    .filter((c): c is StackConfig => Boolean(c && (c.requested || c.available)))

  if (!configs.length) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        {t(locale, "noStacksExposed")}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-0.5">
        {t(locale, "stacksTitle")}
      </p>
      <div className="space-y-2">
        {configs.map(config => {
          const isActive = currentStack === config.key
          const meta = formatMeta(config, locale)

          return (
            <button
              key={config.key}
              type="button"
              disabled={!config.available}
              onClick={() => config.available && onSelect(config.key)}
              className={cn(
                "group relative w-full overflow-hidden rounded-xl border text-left transition-all",
                isActive
                  ? "border-primary/50 bg-primary/8 shadow-md shadow-primary/10"
                  : config.available
                    ? "border-border bg-secondary/30 hover:border-border/80 hover:bg-secondary/50"
                    : "border-border bg-secondary/20 opacity-50 cursor-not-allowed"
              )}
            >
              {/* active accent bar */}
              {isActive && (
                <div className="absolute left-0 inset-y-0 w-0.5 bg-gradient-to-b from-primary to-emerald-400" />
              )}

              <div className="p-3 pl-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">
                    {config.key === "openai" ? "OpenAI" : "100% Local"}
                  </span>
                  {config.available ? (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-[0.65rem] font-medium text-emerald-400 uppercase tracking-wider">
                        {t(locale, "stackReady")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider">
                        {t(locale, "stackUnavailableStatus")}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-2">
                  {config.available
                    ? config.key === "openai"
                      ? t(locale, "stackDescOpenAI")
                      : t(locale, "stackDescLocal")
                    : localizedReason(config, locale)}
                </p>

                {meta.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {meta.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[0.6rem] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
