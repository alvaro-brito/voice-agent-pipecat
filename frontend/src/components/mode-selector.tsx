import { Mic, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { t, type Locale } from "@/i18n"
import type { Mode } from "@/types"

interface ModeSelectorProps {
  locale: Locale
  mode: Mode
  onChange: (m: Mode) => void
}

const MODES: { key: Mode; icon: React.ReactNode; labelKey: "modePush" | "modeAgent" }[] = [
  { key: "push", icon: <Mic className="h-4 w-4" />, labelKey: "modePush" },
  { key: "agent", icon: <Bot className="h-4 w-4" />, labelKey: "modeAgent" },
]

export function ModeSelector({ locale, mode, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground px-0.5">
        {t(locale, "modeTitle")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map(({ key, icon, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-all",
              mode === key
                ? "border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/10"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-secondary/70"
            )}
          >
            {icon}
            {t(locale, labelKey)}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground px-0.5">{t(locale, "modeDescription")}</p>
    </div>
  )
}
