import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DashboardStrip } from "@/components/dashboard-strip"
import { ModeSelector } from "@/components/mode-selector"
import { StackSelector } from "@/components/stack-selector"
import { AgentSection } from "@/components/agent-section"
import { t, type Locale } from "@/i18n"
import type { Mode, Stack, StackConfig, StackMode } from "@/types"

interface ControlPanelProps {
  locale: Locale
  sessionId: string
  userId: string
  currentStack: Stack
  stackConfigs: Partial<Record<Stack, StackConfig>>
  memoryCount: number
  status: string
  stackMode: StackMode
  mode: Mode
  onModeChange: (m: Mode) => void
  onStackSelect: (s: Stack) => void
  isAgentEnabled: boolean
  isAgentProcessing: boolean
  isAgentPlaying: boolean
  isAgentRecording: boolean
  noStackAvailable: boolean
  onAgentToggle: () => void
}

export function ControlPanel({
  locale,
  sessionId,
  userId,
  currentStack,
  stackConfigs,
  memoryCount,
  status,
  mode,
  onModeChange,
  onStackSelect,
  isAgentEnabled,
  isAgentProcessing,
  isAgentPlaying,
  isAgentRecording,
  noStackAvailable,
  onAgentToggle,
}: ControlPanelProps) {
  return (
    <Card className="sticky top-6 flex flex-col gap-5 p-5 w-[340px] flex-shrink-0">
      {/* session stats */}
      <DashboardStrip
        locale={locale}
        sessionId={sessionId}
        userId={userId}
        currentStack={currentStack}
        memoryCount={memoryCount}
        status={status}
      />

      <Separator />

      {/* mode */}
      <ModeSelector locale={locale} mode={mode} onChange={onModeChange} />

      <Separator />

      {/* stacks */}
      <StackSelector
        locale={locale}
        stackConfigs={stackConfigs}
        currentStack={currentStack}
        onSelect={onStackSelect}
      />

      {/* agent (only in agent mode) */}
      {mode === "agent" && (
        <>
          <Separator />
          <AgentSection
            locale={locale}
            isEnabled={isAgentEnabled}
            isProcessing={isAgentProcessing}
            isPlaying={isAgentPlaying}
            isRecording={isAgentRecording}
            disabled={noStackAvailable}
            onToggle={onAgentToggle}
          />
        </>
      )}

      {/* tips */}
      <Separator />
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t(locale, "tipsTitle")}
        </p>
        <ul className="space-y-1.5">
          {(["tip1", "tip2", "tip3"] as const).map(key => (
            <li key={key} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-b from-primary to-emerald-400" />
              {t(locale, key)}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
