import type { ReactNode } from 'react'
import { useState, useMemo } from 'react'
import { ChevronDown, Clock, Activity as ActivityIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatTimeAgo } from '@/lib/utils'
import { useActivityStore, type Activity, type ActivityType } from '@/stores/activityStore'

interface ActivityFeedProps {
  maxItems?: number
  className?: string
}

const PILLAR_ICONS: Record<string, ReactNode> = {
  memory: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  knowledge: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  pageindex: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  ),
  roadmap: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  ),
  handoffs: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  ),
  ralph: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14.121 14.121A3 3 0 109.88 9.88m4.242 4.242L9.88 9.88m4.242 4.242l2.829 2.829M9.88 9.88L7.05 7.05m0 0a7 7 0 1010 10"
      />
    </svg>
  ),
  braintrust: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
}

const TYPE_CONFIG: Record<ActivityType, { label: string; className: string }> = {
  status_change: {
    label: 'Status',
    className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  count_change: {
    label: 'Count',
    className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  },
  recovery: {
    label: 'Recovery',
    className: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  },
}

const TIME_RANGES = [
  { value: 'all', label: 'All time' },
  { value: 'hour', label: 'Last hour' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
] as const

const PILLARS = [
  { value: '', label: 'All pillars' },
  { value: 'memory', label: 'Memory' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'pageindex', label: 'PageIndex' },
  { value: 'roadmap', label: 'Roadmap' },
  { value: 'handoffs', label: 'Handoffs' },
  { value: 'ralph', label: 'Ralph' },
  { value: 'braintrust', label: 'Braintrust' },
] as const


function ActivityItem({ activity }: { activity: Activity }) {
  const pillarIcon = PILLAR_ICONS[activity.pillar] || <ActivityIcon className="h-4 w-4" />
  const typeConfig = TYPE_CONFIG[activity.type]

  return (
    <div className="flex items-start gap-3 p-3 border-b border-border last:border-b-0 animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">{pillarIcon}</div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">{activity.pillar}</span>
          <Badge
            variant="outline"
            className={cn('text-[11px] px-1.5 py-0 h-4', typeConfig.className)}
          >
            {typeConfig.label}
          </Badge>
        </div>
        <p className="text-sm text-foreground truncate">{activity.description}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatTimeAgo(activity.timestamp.toISOString())}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <ActivityIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-sm font-medium text-foreground">No recent activity</p>
      <p className="text-xs text-muted-foreground mt-1">
        Activities will appear here as pillars are updated
      </p>
    </div>
  )
}

export function ActivityFeed({ maxItems = 50, className }: ActivityFeedProps) {
  const [selectedPillar, setSelectedPillar] = useState<string>('')
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all')

  const activities = useActivityStore((state) => state.activities)
  const getFilteredActivities = useActivityStore((state) => state.getFilteredActivities)

  const filteredActivities = useMemo(() => {
    return getFilteredActivities({
      pillar: selectedPillar || undefined,
      timeRange: selectedTimeRange as 'hour' | '24h' | '7d' | 'all',
      maxItems,
    })
  }, [getFilteredActivities, activities, selectedPillar, selectedTimeRange, maxItems])

  const selectedPillarLabel = PILLARS.find((p) => p.value === selectedPillar)?.label || 'All pillars'
  const selectedTimeLabel =
    TIME_RANGES.find((t) => t.value === selectedTimeRange)?.label || 'All time'

  return (
    <div data-testid="activity-feed" className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Activity Feed</h3>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                {selectedPillarLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PILLARS.map((pillar) => (
                <DropdownMenuItem
                  key={pillar.value}
                  onClick={() => setSelectedPillar(pillar.value)}
                >
                  {pillar.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                {selectedTimeLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TIME_RANGES.map((range) => (
                <DropdownMenuItem key={range.value} onClick={() => setSelectedTimeRange(range.value)}>
                  {range.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea data-testid="activity-scroll-area" className="flex-1">
        {filteredActivities.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {filteredActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
