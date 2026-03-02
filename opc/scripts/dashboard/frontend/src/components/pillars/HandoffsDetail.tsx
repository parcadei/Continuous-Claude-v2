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
import { fetchHandoffs, fetchHandoff } from '@/lib/api'
import type { HandoffSummary, HandoffDetail } from '@/types'
import { cn, formatTimeAgo } from '@/lib/utils'

interface HandoffsDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type OutcomeFilter = 'all' | 'succeeded' | 'partial_plus' | 'partial_minus' | 'failed' | 'unknown'

const OUTCOME_CONFIG: Record<string, { label: string; className: string }> = {
  succeeded: {
    label: 'succeeded',
    className: 'bg-green-500/15 text-green-600 border-green-500/30',
  },
  partial_plus: {
    label: 'partial+',
    className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  },
  partial_minus: {
    label: 'partial-',
    className: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  },
  failed: {
    label: 'failed',
    className: 'bg-red-500/15 text-red-600 border-red-500/30',
  },
  unknown: {
    label: 'unknown',
    className: 'bg-muted text-muted-foreground border-muted-foreground/30',
  },
}

/** Normalize status from API (may be uppercase, null, or variant forms) to a config key. */
function normalizeStatus(raw: string | null | undefined): string {
  if (!raw) return 'unknown'
  const lower = raw.toLowerCase()
  if (lower in OUTCOME_CONFIG) return lower
  // Legacy aliases
  if (lower === 'success') return 'succeeded'
  if (lower === 'partial') return 'partial_plus'
  if (lower === 'blocked') return 'failed'
  return 'unknown'
}


export function HandoffsDetail({ open, onOpenChange }: HandoffsDetailProps) {
  const [handoffs, setHandoffs] = useState<HandoffSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<OutcomeFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedContent, setExpandedContent] = useState<HandoffDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const loadHandoffs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchHandoffs({ page_size: 50 })
      setHandoffs(response.handoffs)
    } catch {
      setError('Failed to load handoffs')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadHandoffs()
    }
  }, [open, loadHandoffs])

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
      setExpandedContent(null)
      return
    }

    setExpandedId(id)
    setIsLoadingDetail(true)
    try {
      const detail = await fetchHandoff(id)
      setExpandedContent(detail)
    } catch {
      setExpandedContent(null)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const filteredHandoffs = handoffs.filter((h) => {
    if (filter === 'all') return true
    return normalizeStatus(h.status) === filter
  })

  const filterButtons: { value: OutcomeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'succeeded', label: 'Succeeded' },
    { value: 'partial_plus', label: 'Partial+' },
    { value: 'partial_minus', label: 'Partial-' },
    { value: 'failed', label: 'Failed' },
    { value: 'unknown', label: 'Unknown' },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Handoffs</SheetTitle>
          <SheetDescription>Session transfer documents timeline</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={filter === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(btn.value)}
              aria-label={btn.label}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="mt-4 h-[calc(100vh-200px)]">
          {isLoading ? (
            <div className="space-y-4 pr-4">
              <p className="text-sm text-muted-foreground">Loading handoffs...</p>
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : filteredHandoffs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No handoffs found
            </div>
          ) : (
            <div className="relative pr-4">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {filteredHandoffs.map((handoff) => {
                  const effectiveStatus = normalizeStatus(handoff.status)
                  const outcomeConfig = OUTCOME_CONFIG[effectiveStatus] ?? OUTCOME_CONFIG.unknown
                  const isExpanded = expandedId === handoff.id

                  return (
                    <div key={handoff.id} className="relative pl-8">
                      <div
                        className={cn(
                          'absolute left-1.5 top-2 h-3 w-3 rounded-full border-2 bg-background',
                          effectiveStatus === 'succeeded' && 'border-green-500',
                          (effectiveStatus === 'partial_plus' || effectiveStatus === 'partial_minus') && 'border-yellow-500',
                          effectiveStatus === 'failed' && 'border-red-500',
                          effectiveStatus === 'unknown' && 'border-muted-foreground'
                        )}
                      />

                      <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-tight truncate">
                              {handoff.title || handoff.id}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {handoff.created_at ? formatTimeAgo(handoff.created_at) : 'Unknown'}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5"
                            >
                              {handoff.source === 'db' ? 'DB' : 'File'}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn('text-[10px]', outcomeConfig.className)}
                            >
                              {outcomeConfig.label}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleExpand(handoff.id)}
                            aria-label="expand"
                          >
                            {isExpanded ? (
                              <>
                                <svg
                                  className="mr-1 h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                                Collapse
                              </>
                            ) : (
                              <>
                                <svg
                                  className="mr-1 h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                                Expand
                              </>
                            )}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 border-t pt-3">
                            {isLoadingDetail ? (
                              <div className="space-y-2">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                              </div>
                            ) : expandedContent ? (
                              <div className="text-sm">
                                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
                                  {expandedContent.content}
                                </pre>
                                {expandedContent.metadata && Object.keys(expandedContent.metadata).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {Object.entries(expandedContent.metadata).map(([key, value]) => (
                                      <Badge
                                        key={key}
                                        variant="secondary"
                                        className="text-[10px]"
                                      >
                                        {key}: {String(value)}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Failed to load content
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
