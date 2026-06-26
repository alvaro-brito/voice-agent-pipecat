import { Mic2, Wifi, WifiOff, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { t, type Locale } from "@/i18n"
import type { StackMode } from "@/types"

interface AppHeaderProps {
  locale: Locale
  onLocaleChange: (l: Locale) => void
  connectionState: string
  stackMode: StackMode
}

export function AppHeader({ locale, onLocaleChange, connectionState, stackMode }: AppHeaderProps) {
  const isConnected = connectionState === "Connected"
  const isConnecting = connectionState === "Connecting" || connectionState === "Initializing"

  const stackModeLabel = stackMode === "local"
    ? t(locale, "stackModeLocal")
    : stackMode === "openai"
      ? t(locale, "stackModeOpenAI")
      : t(locale, "stackModeHybrid")

  return (
    <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-xl backdrop-blur-xl">
      {/* shimmer top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {/* left: title */}
        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <Mic2 className="h-4 w-4 text-primary" />
            </div>
            <Badge variant="default" className="text-[0.7rem] tracking-widest uppercase">
              Voice Studio
            </Badge>
            {/* language toggle */}
            <div className="ml-auto flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1">
              {(["pt", "en"] as Locale[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onLocaleChange(l)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all",
                    locale === l
                      ? "bg-primary/20 text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            {t(locale, "heroTitle")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground leading-relaxed">
            {t(locale, "heroSubtitle")}
          </p>
        </div>

        {/* right: status pills */}
        <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end lg:gap-2">
          {/* connection */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2">
            {isConnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
            ) : isConnected ? (
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] animate-pulse" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={cn(
              "text-xs font-medium",
              isConnected ? "text-emerald-400" : isConnecting ? "text-amber-400" : "text-destructive"
            )}>
              {connectionState}
            </span>
          </div>

          {/* stack mode */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2">
            <Wifi className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              {t(locale, "stackModeLabel")}:
            </span>
            <span className="text-xs font-semibold text-foreground">{stackModeLabel}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
