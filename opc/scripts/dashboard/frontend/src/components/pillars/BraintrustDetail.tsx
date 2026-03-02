import { useEffect, useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchBraintrustWeekly,
  fetchBraintrustAgents,
  fetchBraintrustSkills,
  fetchBraintrustSessions,
} from '@/lib/api'
import type {
  BraintrustDailyActivity,
  BraintrustAgentStat,
  BraintrustSkillStat,
  BraintrustSession,
} from '@/types'
import { formatTimeAgo } from '@/lib/utils'

interface BraintrustDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

function StatColumn({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-mono font-bold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

export function BraintrustDetail({ open, onOpenChange }: BraintrustDetailProps) {
  const [daily, setDaily] = useState<BraintrustDailyActivity[]>([])
  const [agents, setAgents] = useState<BraintrustAgentStat[]>([])
  const [skills, setSkills] = useState<BraintrustSkillStat[]>([])
  const [sessions, setSessions] = useState<BraintrustSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [weeklyRes, agentRes, skillRes, sessionRes] = await Promise.all([
        fetchBraintrustWeekly(),
        fetchBraintrustAgents(),
        fetchBraintrustSkills(),
        fetchBraintrustSessions(10),
      ])
      setDaily(weeklyRes.daily)
      setAgents(agentRes.agents)
      setSkills(skillRes.skills)
      setSessions(sessionRes.sessions)
    } catch {
      setError('Failed to load Braintrust data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  const totalSessions = daily.reduce((sum, d) => sum + d.sessions, 0)
  const totalToolCalls = daily.reduce((sum, d) => sum + d.tool_calls, 0)
  const maxDailySessions = Math.max(...daily.map((d) => d.sessions), 1)
  const maxAgentRuns = Math.max(...agents.map((a) => a.runs), 1)
  const maxSkillActivations = Math.max(...skills.map((s) => s.activations), 1)

  // Short day names from date strings
  function shortDay(dateStr: string): string {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { weekday: 'short' })
    } catch {
      return dateStr.slice(0, 3)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Braintrust Analytics</SheetTitle>
          <SheetDescription>Session activity and agent usage (7 days)</SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-200px)]">
          {isLoading ? (
            <div className="space-y-4 pr-4">
              <div className="flex justify-around">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center space-y-2">
                    <Skeleton className="h-6 w-12 mx-auto" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
              <div className="space-y-3 mt-6">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="space-y-6 pr-4">
              {/* Summary stats */}
              <div className="flex items-center justify-around py-2">
                <StatColumn value={totalSessions} label="Sessions" />
                <div className="h-8 w-px bg-border" />
                <StatColumn value={totalToolCalls.toLocaleString()} label="Tool Calls" />
                <div className="h-8 w-px bg-border" />
                <StatColumn value={agents.length} label="Agents" />
              </div>

              {/* Weekly activity */}
              {daily.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    Weekly Activity
                  </p>
                  <div className="space-y-1.5">
                    {daily.map((d) => (
                      <HorizontalBar
                        key={d.day}
                        label={shortDay(d.day)}
                        value={d.sessions}
                        maxValue={maxDailySessions}
                        color="bg-blue-500"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Agent usage */}
              {agents.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    Agent Usage
                  </p>
                  <div className="space-y-1.5">
                    {agents.slice(0, 8).map((a) => (
                      <HorizontalBar
                        key={a.agent}
                        label={a.agent}
                        value={a.runs}
                        maxValue={maxAgentRuns}
                        color="bg-cyan-500"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Skill usage */}
              {skills.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    Skill Usage
                  </p>
                  <div className="space-y-1.5">
                    {skills.slice(0, 8).map((s) => (
                      <HorizontalBar
                        key={s.skill}
                        label={s.skill}
                        value={s.activations}
                        maxValue={maxSkillActivations}
                        color="bg-purple-500"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent sessions */}
              {sessions.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                    Recent Sessions
                  </p>
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div key={s.session_id} className="rounded-md border border-border bg-card/50 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                            {s.session_id.slice(0, 12)}...
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">{s.started ? formatTimeAgo(s.started) : '--'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{s.span_count} spans</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {daily.length === 0 && agents.length === 0 && sessions.length === 0 && (
                <div className="py-12 text-center">
                  <svg className="mx-auto h-10 w-10 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3v18h18M7 16l4-8 4 4 4-8" />
                  </svg>
                  <p className="mt-3 text-sm text-muted-foreground">No Braintrust data available</p>
                  <p className="mt-1 text-xs text-muted-foreground">Check that BRAINTRUST_API_KEY is configured</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
