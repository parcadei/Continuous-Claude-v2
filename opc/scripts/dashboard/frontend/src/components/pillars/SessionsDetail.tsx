import { useEffect, useState, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchSessions, fetchSessionActivity, fetchActiveFileClaims } from '@/lib/api'
import type { SessionInfo, SessionStatus, SessionsResponse, SessionActivity, FileClaimsResponse, FileClaim } from '@/types'
import { cn, formatTimeAgo } from '@/lib/utils'

type SessionsTab = 'sessions' | 'file-claims'

interface SessionsDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_CONFIG: Record<SessionStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-500/15 text-green-600 border-green-500/30',
  },
  idle: {
    label: 'Idle',
    className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  },
  stale: {
    label: 'Stale',
    className: 'bg-muted text-muted-foreground border-muted-foreground/30',
  },
}

function ActivitySection({ sessionId }: { sessionId: string }) {
  const [activity, setActivity] = useState<SessionActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchSessionActivity(sessionId)
      .then(data => {
        if (!cancelled) setActivity(data)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [sessionId])

  if (loading) {
    return (
      <div className="space-y-1.5 pt-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    )
  }

  if (error || !activity) {
    return (
      <p className="text-xs text-muted-foreground italic pt-1">No activity data available</p>
    )
  }

  const hasHooks = activity.hooks.length > 0
  const hasSkills = activity.skills.length > 0

  if (!hasHooks && !hasSkills) {
    return (
      <p className="text-xs text-muted-foreground italic pt-1">No hook or skill activity recorded</p>
    )
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex gap-3">
        {hasHooks && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {activity.total_hooks} hook fires
            </span>
          </div>
        )}
        {hasSkills && (
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {activity.total_skills} skill activations
            </span>
          </div>
        )}
      </div>
      {hasHooks && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hooks</p>
          <div className="space-y-0.5 max-h-28 overflow-y-auto">
            {activity.hooks
              .sort((a, b) => b.count - a.count)
              .map((hook, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground truncate mr-2">{hook.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0 tabular-nums">
                    {hook.count}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}
      {hasSkills && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Skills</p>
          <div className="space-y-0.5 max-h-28 overflow-y-auto">
            {activity.skills
              .sort((a, b) => b.count - a.count)
              .map((skill, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground truncate mr-2">{skill.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0 tabular-nums">
                    {skill.count}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SessionCard({ session, expanded, onToggle }: {
  session: SessionInfo
  expanded: boolean
  onToggle: () => void
}) {
  const config = STATUS_CONFIG[session.status]
  const projectName = session.project
    ? session.project.split(/[/\\]/).pop() || session.project
    : 'Unknown'

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className={cn(
          'h-2.5 w-2.5 rounded-full flex-shrink-0',
          session.status === 'active' && 'bg-green-500 animate-pulse',
          session.status === 'idle' && 'bg-yellow-500',
          session.status === 'stale' && 'bg-muted-foreground/50',
        )} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{projectName}</p>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.className)}>
              {config.label}
            </Badge>
          </div>
          {session.working_on && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{session.working_on}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-[10px] text-muted-foreground">
            {session.last_heartbeat ? formatTimeAgo(session.last_heartbeat) : 'No heartbeat'}
          </p>
        </div>
        <svg
          className={cn('h-4 w-4 text-muted-foreground transition-transform flex-shrink-0', expanded && 'rotate-180')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Session ID</span>
            <span className="font-mono text-foreground truncate ml-2 max-w-[200px]">{session.id}</span>
          </div>
          {session.project && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Project</span>
              <span className="font-mono text-foreground truncate ml-2 max-w-[200px]">{session.project}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Agent Runs</span>
            <span className="font-mono text-foreground">
              {session.agent_summary.total}
              {session.agent_summary.failed > 0 && (
                <span className="text-red-500 ml-1">({session.agent_summary.failed} failed)</span>
              )}
            </span>
          </div>
          {session.file_claims.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">File Claims</p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {session.file_claims.map((claim, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <svg className="h-3 w-3 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="font-mono text-muted-foreground truncate">
                      {claim.file_path.split(/[/\\]/).slice(-2).join('/')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <ActivitySection sessionId={session.id} />
        </div>
      )}
    </div>
  )
}

function SummaryBar({ counts }: { counts: Record<SessionStatus, number> }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-xs font-medium">{counts.active || 0} Active</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-yellow-500" />
        <span className="text-xs font-medium">{counts.idle || 0} Idle</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
        <span className="text-xs font-medium">{counts.stale || 0} Stale</span>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-4">
      <Skeleton className="h-12 w-full rounded-lg" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  )
}

function FileClaimsPanel() {
  const [data, setData] = useState<FileClaimsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadClaims = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchActiveFileClaims()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file claims')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClaims()
  }, [loadClaims])

  if (loading && !data) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg className="h-10 w-10 text-destructive mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-sm font-medium">Failed to load file claims</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" onClick={loadClaims} className="mt-3">
          Retry
        </Button>
      </div>
    )
  }

  if (!data || data.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <svg className="h-8 w-8 text-muted-foreground/50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <p className="text-sm text-muted-foreground">No active file locks</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Files are claimed when sessions edit them</p>
      </div>
    )
  }

  const projectGroups = data.claims.reduce<Record<string, FileClaim[]>>((acc, claim) => {
    const project = claim.project || 'Unknown'
    if (!acc[project]) acc[project] = []
    acc[project].push(claim)
    return acc
  }, {})

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="text-xs font-medium">{data.total} Active Lock{data.total !== 1 ? 's' : ''}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          across {Object.keys(projectGroups).length} project{Object.keys(projectGroups).length !== 1 ? 's' : ''}
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={loadClaims} disabled={loading} className="h-7 text-xs">
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
      {Object.entries(projectGroups).map(([project, claims]) => {
        const projectName = project.split(/[/\\]/).pop() || project
        return (
          <div key={project} className="rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <svg className="h-4 w-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span className="text-sm font-medium truncate">{projectName}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                {claims.length}
              </Badge>
            </div>
            <div className="divide-y divide-border">
              {claims.map((claim, i) => {
                const shortPath = claim.file_path.split(/[/\\]/).slice(-3).join('/')
                return (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                    <svg className="h-3 w-3 text-orange-500/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-foreground truncate">{shortPath}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Session: {claim.session_id.slice(0, 12)}...
                        {claim.claimed_at && ` | ${formatTimeAgo(claim.claimed_at)}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SessionsDetail({ open, onOpenChange }: SessionsDetailProps) {
  const [activeTab, setActiveTab] = useState<SessionsTab>('sessions')
  const [data, setData] = useState<SessionsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showStale, setShowStale] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchSessions(true)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadSessions()
  }, [open, loadSessions])

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredSessions = data?.sessions.filter(
    s => showStale || s.status !== 'stale'
  ) || []

  const staleCount = data?.counts.stale || 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Active Sessions
          </SheetTitle>
          <SheetDescription>
            Claude sessions and file locks across terminals
          </SheetDescription>
        </SheetHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1 flex-shrink-0">
          <button
            onClick={() => setActiveTab('sessions')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'sessions'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Sessions
          </button>
          <button
            onClick={() => setActiveTab('file-claims')}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'file-claims'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            File Claims
          </button>
        </div>

        {activeTab === 'file-claims' ? (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <FileClaimsPanel />
          </ScrollArea>
        ) : (
          <>
            <div className="flex items-center justify-between flex-shrink-0 py-2">
              <Button
                variant={showStale ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowStale(!showStale)}
                className="h-7 text-xs"
              >
                {showStale ? `Hide ${staleCount} Stale` : `Show ${staleCount} Stale`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSessions}
                disabled={loading}
                className="h-7 text-xs"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
            <ScrollArea className="flex-1 -mx-6 px-6">
              {loading && !data ? (
                <LoadingSkeleton />
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg className="h-10 w-10 text-destructive mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <p className="text-sm font-medium">Failed to load sessions</p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                  <Button variant="outline" size="sm" onClick={loadSessions} className="mt-3">
                    Retry
                  </Button>
                </div>
              ) : data ? (
                <div className="space-y-3 pb-6">
                  <SummaryBar counts={data.counts} />
                  {filteredSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <svg className="h-8 w-8 text-muted-foreground/50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm text-muted-foreground">No active sessions</p>
                      {staleCount > 0 && !showStale && (
                        <Button variant="link" size="sm" onClick={() => setShowStale(true)} className="mt-1 text-xs">
                          Show {staleCount} stale sessions
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredSessions.map(session => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        expanded={expandedCards.has(session.id)}
                        onToggle={() => toggleCard(session.id)}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
