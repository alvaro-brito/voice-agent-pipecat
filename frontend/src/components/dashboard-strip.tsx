import { Brain, Hash, User, Layers } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { t, type Locale } from "@/i18n"
import type { Stack } from "@/types"

interface DashboardStripProps {
  locale: Locale
  sessionId: string
  userId: string
  currentStack: Stack
  memoryCount: number
  status: string
}

function shortId(v: string) {
  return v.slice(0, 12)
}

export function DashboardStrip({
  locale,
  sessionId,
  userId,
  currentStack,
  memoryCount,
  status,
}: DashboardStripProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <StatCell icon={<Hash className="h-3.5 w-3.5" />} label={t(locale, "dashboardSession")}>
          <span className="font-mono text-xs text-foreground truncate">{shortId(sessionId)}</span>
        </StatCell>
        <StatCell icon={<User className="h-3.5 w-3.5" />} label={t(locale, "dashboardUser")}>
          <span className="font-mono text-xs text-foreground truncate">{shortId(userId)}</span>
        </StatCell>
        <StatCell icon={<Layers className="h-3.5 w-3.5" />} label={t(locale, "dashboardActiveStack")}>
          <Badge variant={currentStack === "openai" ? "default" : "success"} className="text-[0.65rem]">
            {currentStack === "openai" ? "OpenAI" : "Local"}
          </Badge>
        </StatCell>
        <StatCell icon={<Brain className="h-3.5 w-3.5" />} label={t(locale, "dashboardMemories")}>
          <span className="font-mono text-sm font-semibold text-foreground">{memoryCount}</span>
        </StatCell>
      </div>

      {status && (
        <Card className="px-3 py-2.5">
          <p className="text-xs text-muted-foreground">{t(locale, "dashboardStatus")}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground leading-snug">{status}</p>
        </Card>
      )}
    </div>
  )
}

function StatCell({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <Card className="px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[0.68rem] uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </Card>
  )
}
