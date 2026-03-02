import { useState, useEffect, useCallback } from 'react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchLearnings, fetchMemoryDetails } from '@/lib/api'
import type { Learning, MemoryDetails } from '@/types'
import { cn, formatTimeAgo } from '@/lib/utils'

interface MemoryDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LEARNING_TYPES = [
  'WORKING_SOLUTION',
  'ERROR_FIX',
  'CODEBASE_PATTERN',
  'ARCHITECTURAL_DECISION',
  'FAILED_APPROACH',
  'USER_PREFERENCE',
  'OPEN_THREAD',
] as const

const TYPE_COLORS: Record<string, string> = {
  WORKING_SOLUTION: 'bg-green-500/15 text-green-500 border-green-500/30',
  ERROR_FIX: 'bg-red-500/15 text-red-500 border-red-500/30',
  CODEBASE_PATTERN: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  ARCHITECTURAL_DECISION: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
  FAILED_APPROACH: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  USER_PREFERENCE: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
  OPEN_THREAD: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-500/15 text-green-500 border-green-500/30',
  medium: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  low: 'bg-red-500/15 text-red-500 border-red-500/30',
}


function StatsSummary({ details }: { details: MemoryDetails }) {
  const entries = Object.entries(details.by_type).filter(([, count]) => count > 0)

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Breakdown
        </span>
        <span className="text-xs text-muted-foreground">
          {details.total_count} total
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([type, count]) => (
          <Badge
            key={type}
            variant="outline"
            className={cn('text-xs font-medium', TYPE_COLORS[type] || 'bg-muted text-muted-foreground')}
          >
            {type.replace(/_/g, ' ')}: {count}
          </Badge>
        ))}
      </div>
      {Object.keys(details.by_scope).length > 0 && (
        <div className="flex gap-2 pt-0.5">
          {Object.entries(details.by_scope).map(([scope, count]) => (
            <span key={scope} className="text-xs text-muted-foreground">
              {scope}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function LearningCard({
  learning,
  expanded,
  onToggle,
}: {
  learning: Learning
  expanded: boolean
  onToggle: () => void
}) {
  const typeColor = TYPE_COLORS[learning.type] || 'bg-muted text-muted-foreground'
  const confidenceColor =
    CONFIDENCE_COLORS[learning.confidence?.toLowerCase()] ||
    'bg-muted text-muted-foreground border-muted'

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge variant="outline" className={cn('text-xs font-medium', typeColor)}>
          {learning.type}
        </Badge>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatTimeAgo(learning.created_at)}
        </span>
      </div>

      <p className={cn('text-sm text-foreground mb-2', !expanded && 'line-clamp-2')}>
        {learning.content}
      </p>

      {expanded && (
        <>
          {learning.context && (
            <p className="text-xs text-muted-foreground mb-2">
              Context: {learning.context}
            </p>
          )}

          {learning.confidence && (
            <Badge
              variant="outline"
              className={cn('text-xs font-medium mb-2', confidenceColor)}
            >
              {learning.confidence} confidence
            </Badge>
          )}
        </>
      )}

      {!expanded && learning.context && (
        <p className="text-xs text-muted-foreground mb-2">
          Context: {learning.context}
        </p>
      )}

      {learning.tags && learning.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {learning.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs bg-muted/50 text-muted-foreground border-muted"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {expanded ? (
            <>
              Show less
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </>
          ) : (
            <>
              Show more
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </span>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border">
          <div className="flex items-start justify-between mb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg
        className="h-12 w-12 text-muted-foreground/50 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      <p className="text-muted-foreground">
        {hasFilters
          ? 'No learnings found matching your filters'
          : 'No learnings found'}
      </p>
      {hasFilters && (
        <p className="text-sm text-muted-foreground/70 mt-1">
          Try adjusting your search or filter
        </p>
      )}
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg
        className="h-12 w-12 text-destructive/50 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p className="text-destructive mb-2">Error loading learnings</p>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  )
}

export function MemoryDetail({ open, onOpenChange }: MemoryDetailProps) {
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchDebounce, setSearchDebounce] = useState('')
  const [details, setDetails] = useState<MemoryDetails | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch stats summary when panel opens
  useEffect(() => {
    if (open) {
      fetchMemoryDetails()
        .then(setDetails)
        .catch(() => {
          // Non-critical — don't surface stats errors to users
        })
    }
  }, [open])

  const loadLearnings = useCallback(
    async (resetPage = false) => {
      setLoading(true)
      setError(null)

      try {
        const currentPage = resetPage ? 1 : page
        const response = await fetchLearnings({
          page: currentPage,
          page_size: pageSize,
          search: searchDebounce || undefined,
          type_filter: typeFilter || undefined,
        })

        if (resetPage || currentPage === 1) {
          setLearnings(response.learnings)
        } else {
          setLearnings((prev) => [...prev, ...response.learnings])
        }
        setTotal(response.total)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load learnings')
      } finally {
        setLoading(false)
      }
    },
    [page, pageSize, searchDebounce, typeFilter]
  )

  // Load data when sheet opens or filters change
  useEffect(() => {
    if (open) {
      loadLearnings(true)
    }
  }, [open, searchDebounce, typeFilter, loadLearnings])

  // Load more when page changes (but not on initial load)
  useEffect(() => {
    if (open && page > 1) {
      loadLearnings(false)
    }
  }, [page, open, loadLearnings])

  const handleLoadMore = () => {
    setPage((p) => p + 1)
  }

  const handleTypeFilterChange = (type: string | null) => {
    setTypeFilter(type)
    setPage(1)
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const hasFilters = Boolean(searchDebounce || typeFilter)
  const hasMore = learnings.length < total

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Memory Learnings</SheetTitle>
          <SheetDescription>
            Browse and search through stored learnings from past sessions
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 py-4 flex-shrink-0">
          {/* Stats Summary */}
          {details && <StatsSummary details={details} />}

          {/* Search Input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search learnings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'flex h-9 w-full rounded-md border border-input bg-background px-9 py-1 text-sm',
                'shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium',
                'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  aria-label="Filter by type"
                >
                  <svg
                    className="h-4 w-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  {typeFilter || 'All Types'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleTypeFilterChange(null)}>
                  All Types
                </DropdownMenuItem>
                {LEARNING_TYPES.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => handleTypeFilterChange(type)}
                  >
                    <span
                      className={cn(
                        'inline-block w-2 h-2 rounded-full mr-2',
                        TYPE_COLORS[type]?.split(' ')[0] || 'bg-muted'
                      )}
                    />
                    {type}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {typeFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleTypeFilterChange(null)}
              >
                Clear
              </Button>
            )}

            <span className="text-xs text-muted-foreground ml-auto">
              {total} total
            </span>
          </div>
        </div>

        {/* Learnings List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading && learnings.length === 0 ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState error={error} onRetry={() => loadLearnings(true)} />
          ) : learnings.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <div className="space-y-3 pb-4">
              {learnings.map((learning) => (
                <LearningCard
                  key={learning.id}
                  learning={learning}
                  expanded={expandedIds.has(learning.id)}
                  onToggle={() => toggleExpanded(learning.id)}
                />
              ))}

              {hasMore && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      `Load More (${learnings.length} of ${total})`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
