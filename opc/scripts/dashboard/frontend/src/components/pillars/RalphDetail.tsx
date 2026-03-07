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
import { Skeleton } from '@/components/ui/skeleton'
import { fetchRalphTasks, fetchRalphState } from '@/lib/api'
import type { RalphTask, RalphStateResponse, RalphTaskStatus } from '@/types'
import { cn } from '@/lib/utils'

interface RalphDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_CONFIG: Record<RalphTaskStatus, { label: string; color: string; dotColor: string; borderColor: string }> = {
  pending:     { label: 'PENDING',     color: 'text-muted-foreground', dotColor: 'bg-muted-foreground', borderColor: 'border-l-muted-foreground' },
  in_progress: { label: 'ACTIVE',      color: 'text-blue-400',        dotColor: 'bg-blue-400',         borderColor: 'border-l-blue-400' },
  reviewing:   { label: 'REVIEW',      color: 'text-purple-400',      dotColor: 'bg-purple-400',       borderColor: 'border-l-purple-400' },
  complete:    { label: 'DONE',        color: 'text-green-400',       dotColor: 'bg-green-400',        borderColor: 'border-l-green-400' },
  failed:      { label: 'FAILED',      color: 'text-red-400',         dotColor: 'bg-red-400',          borderColor: 'border-l-red-400' },
  blocked:     { label: 'BLOCKED',     color: 'text-orange-400',      dotColor: 'bg-orange-400',       borderColor: 'border-l-orange-400' },
  skipped:     { label: 'SKIPPED',     color: 'text-muted-foreground', dotColor: 'bg-muted-foreground', borderColor: 'border-l-muted-foreground' },
}

const KANBAN_ORDER: RalphTaskStatus[] = ['pending', 'in_progress', 'reviewing', 'failed', 'blocked', 'complete', 'skipped']

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds === 0) return '--'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function TaskCard({ task }: { task: RalphTask }) {
  const config = STATUS_CONFIG[task.status]

  return (
    <div className={cn('rounded-md border border-border bg-card/50 p-3 border-l-[3px]', config.borderColor)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{task.name}</p>
        {task.retries > 0 && (
          <Badge variant="outline" className="shrink-0 text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
            R{task.retries}
          </Badge>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {task.agent && (
          <span className="font-mono text-[11px] bg-muted/50 px-1.5 py-0.5 rounded">{task.agent}</span>
        )}
        <span>{formatDuration(task.duration_s)}</span>
      </div>

      {task.files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.files.slice(0, 3).map((f) => (
            <span key={f} className="text-[10px] bg-muted/30 text-muted-foreground px-1.5 py-0.5 rounded truncate max-w-[160px]">
              {f.split('/').pop()}
            </span>
          ))}
          {task.files.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{task.files.length - 3}</span>
          )}
        </div>
      )}

      {task.status === 'reviewing' && (
        <p className="mt-2 text-[11px] text-purple-400 italic">Awaiting critic review</p>
      )}

      {task.last_error && (task.status === 'failed' || task.status === 'blocked') && (
        <p className="mt-2 text-[11px] text-red-400 line-clamp-2">{task.last_error}</p>
      )}

      {task.depends_on.length > 0 && task.status === 'pending' && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Blocked by {task.depends_on.join(', ')}
        </p>
      )}
    </div>
  )
}

function CompletedRow({ task }: { task: RalphTask }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <svg className="h-3.5 w-3.5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm text-muted-foreground truncate flex-1">{task.name}</span>
      <span className="text-xs text-muted-foreground font-mono shrink-0">{formatDuration(task.duration_s)}</span>
    </div>
  )
}

export function RalphDetail({ open, onOpenChange }: RalphDetailProps) {
  const [tasks, setTasks] = useState<RalphTask[]>([])
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, number>>({})
  const [state, setState] = useState<RalphStateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [tasksRes, stateRes] = await Promise.all([
        fetchRalphTasks(),
        fetchRalphState(),
      ])
      setTasks(tasksRes.tasks)
      setTasksByStatus(tasksRes.tasks_by_status)
      setState(stateRes)
    } catch {
      setError('Failed to load Ralph state')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => loadData(), 30000)
    return () => clearInterval(interval)
  }, [open, loadData])

  const groupedTasks = KANBAN_ORDER.reduce<Record<string, RalphTask[]>>((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status)
    return acc
  }, {} as Record<string, RalphTask[]>)

  const completedTasks = groupedTasks['complete'] || []
  const activeTasks = (['in_progress', 'reviewing', 'pending', 'failed', 'blocked', 'skipped'] as RalphTaskStatus[])
    .flatMap((s) => groupedTasks[s] || [])

  const progressPct = state?.progress?.pct ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Ralph Tasks</SheetTitle>
          <SheetDescription>Autonomous development session status</SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-200px)]">
          {isLoading ? (
            <div className="space-y-4 pr-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="space-y-3 mt-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : !state?.active && tasks.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="mx-auto h-10 w-10 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-3 text-sm text-muted-foreground">No active Ralph session</p>
              <p className="mt-1 text-xs text-muted-foreground">Run <code className="font-mono bg-muted/50 px-1 rounded">/ralph</code> to start</p>
            </div>
          ) : (
            <div className="space-y-5 pr-4">
              {/* Header: story + iteration + progress */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {state?.story_id && (
                    <Badge variant="outline" className="font-mono text-xs">{state.story_id}</Badge>
                  )}
                  {state?.stage && (
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                      {state.stage}
                    </Badge>
                  )}
                  {state && state.max_iterations > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Iteration {state.iteration} / {state.max_iterations}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {state?.progress?.completed ?? 0}/{state?.progress?.total ?? 0}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status pills */}
              <div className="flex flex-wrap gap-2">
                {KANBAN_ORDER.filter((s) => (tasksByStatus[s] ?? 0) > 0).map((status) => {
                  const config = STATUS_CONFIG[status]
                  return (
                    <div key={status} className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', config.dotColor)} />
                      <span className={cn('text-[11px] font-medium uppercase tracking-wider', config.color)}>
                        {config.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{tasksByStatus[status]}</span>
                    </div>
                  )
                })}
              </div>

              {/* Active / pending / failed / reviewing tasks */}
              {activeTasks.length > 0 && (
                <div className="space-y-2">
                  {activeTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}

              {/* Completed section */}
              {completedTasks.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Completed ({completedTasks.length})
                  </p>
                  <div className="divide-y divide-border/50">
                    {completedTasks.map((task) => (
                      <CompletedRow key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Retry queue */}
              {state?.retry_queue && state.retry_queue.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-red-400 mb-2">
                    Retry Queue ({state.retry_queue.length})
                  </p>
                  <div className="space-y-2">
                    {state.retry_queue.map((item, i) => (
                      <div key={i} className="rounded-md border border-dashed border-red-500/30 bg-red-500/5 p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono">{item.task_id}</span>
                          <span className="text-[10px] text-muted-foreground">Attempt {item.attempt}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-red-400 line-clamp-2">{item.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty retry queue */}
              {state?.retry_queue && state.retry_queue.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Retry queue clear</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
