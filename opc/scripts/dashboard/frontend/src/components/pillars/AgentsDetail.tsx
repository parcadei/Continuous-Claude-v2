import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchAgentsDetails } from '@/lib/api'
import type { AgentsDetailsResponse, AgentSpawnEvent } from '@/types'

interface AgentsDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// -- Helpers --

function StatColumn({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-mono font-bold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

function HorizontalBar({ label, value, maxValue, color }: {
  label: string; value: number; maxValue: number; color: string
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="min-w-[7rem] w-28 text-right text-xs text-muted-foreground shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 h-4 bg-muted/30 rounded-sm overflow-hidden">
        <div className={`h-full rounded-sm transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-mono text-muted-foreground shrink-0">{value}</span>
    </div>
  )
}

const AGENT_COLORS: Record<string, string> = {
  kraken: 'bg-violet-500',
  scout: 'bg-blue-500',
  maestro: 'bg-orange-500',
  spark: 'bg-yellow-500',
  oracle: 'bg-teal-500',
  architect: 'bg-indigo-500',
  phoenix: 'bg-rose-500',
}

function getAgentColor(name: string): string {
  return AGENT_COLORS[name] || 'bg-muted-foreground'
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}

function SpawnRow({ event }: { event: AgentSpawnEvent }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 border-b border-border/50 last:border-0">
      <div className={`h-2 w-2 rounded-full shrink-0 ${event.success ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className="text-sm font-medium w-24 shrink-0">{event.name}</span>
      <span className="text-xs text-muted-foreground truncate flex-1" title={event.session_id}>
        {event.session_id.slice(0, 8)}
      </span>
      <span className="text-xs text-muted-foreground shrink-0">
        {formatTimestamp(event.timestamp)}
      </span>
    </div>
  )
}

export function AgentsDetail({ open, onOpenChange }: AgentsDetailProps) {
  const [data, setData] = useState<AgentsDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setLoading(true)
    setError(null)
    fetchAgentsDetails()
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load agent data'))
      .finally(() => setLoading(false))
  }, [open])

  const successRate = data
    ? data.telemetry.total_spawns > 0
      ? ((data.telemetry.success_count / data.telemetry.total_spawns) * 100).toFixed(1)
      : '0'
    : null

  const sortedAgents = data
    ? Object.entries(data.telemetry.by_agent)
        .sort(([, a], [, b]) => b - a)
    : []

  const maxAgentCount = sortedAgents.length > 0 ? sortedAgents[0][1] : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col" side="right">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-lg font-semibold">Agent Activity</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Agent spawn telemetry from skill-telemetry.jsonl
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
              <Skeleton className="h-48" />
              <Skeleton className="h-32" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load agent data: {error}
            </div>
          )}

          {!loading && !error && data && (
            <div className="space-y-6">
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-4 rounded-lg border border-border bg-card/50 p-4">
                <StatColumn value={data.telemetry.total_spawns} label="Spawns" />
                <StatColumn value={`${successRate}%`} label="Success" />
                <StatColumn value={data.telemetry.unique_sessions} label="Sessions" />
                <StatColumn value={data.agent_types.length} label="Types" />
              </div>

              {/* Agent distribution */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Spawn Distribution</h3>
                <div className="space-y-2">
                  {sortedAgents.map(([name, count]) => (
                    <HorizontalBar
                      key={name}
                      label={name}
                      value={count}
                      maxValue={maxAgentCount}
                      color={getAgentColor(name)}
                    />
                  ))}
                </div>
              </div>

              {/* Registered agent types */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Registered Agent Types</h3>
                <div className="flex flex-wrap gap-2">
                  {data.agent_types.map((type) => (
                    <Badge
                      key={type}
                      variant="outline"
                      className="text-xs"
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Recent spawns */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Recent Spawns
                  <span className="text-muted-foreground font-normal ml-2">
                    (last {data.telemetry.recent_spawns.length})
                  </span>
                </h3>
                <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
                  {data.telemetry.recent_spawns.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">No recent spawns</p>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {data.telemetry.recent_spawns.map((event, idx) => (
                        <SpawnRow key={`${event.timestamp}-${idx}`} event={event} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
