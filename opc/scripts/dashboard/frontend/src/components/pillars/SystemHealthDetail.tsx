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
import { fetchSystemHealthReport } from '@/lib/api'
import type { SystemHealthReport, SubsystemCheck, SubsystemStatus } from '@/types'
import { cn } from '@/lib/utils'

interface SystemHealthDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_CONFIG: Record<SubsystemStatus, { label: string; className: string; icon: string }> = {
  HEALTHY: {
    label: 'Healthy',
    className: 'bg-green-500/15 text-green-600 border-green-500/30',
    icon: 'M5 13l4 4L19 7',
  },
  DEGRADED: {
    label: 'Degraded',
    className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  FAILING: {
    label: 'Failing',
    className: 'bg-red-500/15 text-red-600 border-red-500/30',
    icon: 'M6 18L18 6M6 6l12 12',
  },
}

const SUBSYSTEM_LABELS: Record<string, { name: string; description: string }> = {
  memory: { name: 'Memory', description: 'PostgreSQL + pgvector learnings' },
  hooks: { name: 'Hooks', description: 'Compiled hook intercepts' },
  agents: { name: 'Agents', description: 'Agent run tracking' },
  knowledge_tree: { name: 'Knowledge Tree', description: 'Project navigation index' },
  handoffs: { name: 'Handoffs', description: 'Session continuity records' },
  roadmap_sync: { name: 'ROADMAP Sync', description: 'Goal tracking freshness' },
}

function formatEvidenceValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    if (key.includes('pct') || key.includes('rate')) return `${value}%`
    if (key.includes('hours')) return `${value}h`
    if (key.includes('kb')) return `${value} KB`
    return value.toLocaleString()
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const entries = Object.entries(obj)
    if (entries.length === 0) return 'None'
    return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
  }
  return String(value)
}

function formatEvidenceLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace('Pct', '%')
    .replace('24H', '(24h)')
}

function SubsystemCard({ name, check, expanded, onToggle }: {
  name: string
  check: SubsystemCheck
  expanded: boolean
  onToggle: () => void
}) {
  const config = STATUS_CONFIG[check.status]
  const meta = SUBSYSTEM_LABELS[name] || { name, description: '' }

  const evidenceEntries = Object.entries(check.evidence).filter(
    ([k]) => k !== 'error'
  )

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', config.className)}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{meta.name}</p>
          <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
        </div>
        <Badge variant="outline" className={cn('text-xs', config.className)}>
          {config.label}
        </Badge>
        <svg
          className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {/* Evidence metrics */}
          {evidenceEntries.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Evidence</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {evidenceEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs py-0.5">
                    <span className="text-muted-foreground">{formatEvidenceLabel(key)}</span>
                    <span className="font-mono text-foreground">{formatEvidenceValue(key, value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {check.evidence.error && (
            <div className="rounded-md bg-destructive/10 p-2">
              <p className="text-xs text-destructive font-mono">{String(check.evidence.error)}</p>
            </div>
          )}

          {/* Recommendations */}
          {check.recommendations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recommendations</p>
              <ul className="space-y-1">
                {check.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="text-yellow-500 flex-shrink-0 mt-0.5">*</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OverallBanner({ status }: { status: SubsystemStatus }) {
  const config = STATUS_CONFIG[status]
  const messages: Record<SubsystemStatus, string> = {
    HEALTHY: 'All subsystems functioning normally.',
    DEGRADED: 'Some subsystems need attention.',
    FAILING: 'Critical subsystems are failing.',
  }

  return (
    <div className={cn('flex items-center gap-3 rounded-lg border p-3', config.className)}>
      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
      </svg>
      <div className="flex-1">
        <p className="font-medium text-sm">Overall: {config.label}</p>
        <p className="text-xs opacity-80">{messages[status]}</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-4">
      <Skeleton className="h-16 w-full rounded-lg" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function SystemHealthDetail({ open, onOpenChange }: SystemHealthDetailProps) {
  const [report, setReport] = useState<SystemHealthReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSystemHealthReport()
      setReport(data)
      // Auto-expand non-healthy subsystems
      const nonHealthy = new Set<string>()
      Object.entries(data.subsystems).forEach(([name, check]) => {
        if (check.status !== 'HEALTHY') nonHealthy.add(name)
      })
      setExpandedCards(nonHealthy)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health report')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadReport()
  }, [open, loadReport])

  const toggleCard = (name: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const subsystemOrder = ['memory', 'hooks', 'agents', 'knowledge_tree', 'handoffs', 'roadmap_sync']

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            System Health Report
          </SheetTitle>
          <SheetDescription>
            Comprehensive diagnostic across all 6 subsystems
          </SheetDescription>
        </SheetHeader>

        {/* Refresh button */}
        <div className="flex items-center justify-between flex-shrink-0 py-2">
          <p className="text-xs text-muted-foreground">
            {report ? `Checked ${new Date(report.checked_at).toLocaleTimeString()}` : 'Not yet loaded'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadReport}
            disabled={loading}
            className="h-7 text-xs"
          >
            {loading ? 'Running...' : 'Re-run Diagnostic'}
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading && !report ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="h-10 w-10 text-destructive mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm font-medium">Failed to load report</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={loadReport} className="mt-3">
                Retry
              </Button>
            </div>
          ) : report ? (
            <div className="space-y-3 pb-6">
              <OverallBanner status={report.overall} />

              {subsystemOrder.map(name => {
                const check = report.subsystems[name]
                if (!check) return null
                return (
                  <SubsystemCard
                    key={name}
                    name={name}
                    check={check}
                    expanded={expandedCards.has(name)}
                    onToggle={() => toggleCard(name)}
                  />
                )
              })}
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
