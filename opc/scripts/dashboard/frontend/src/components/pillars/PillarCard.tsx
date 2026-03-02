import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PillarHealth, PillarStatus } from '@/types'
import { cn, formatTimeAgo } from '@/lib/utils'

interface PillarCardProps {
  health: PillarHealth
  onViewDetails?: () => void
}

const STATUS_CONFIG: Record<PillarStatus, { label: string; variant: string; icon: string }> = {
  online: {
    label: 'Online',
    variant: 'bg-online/15 text-online border-online/30',
    icon: '●',
  },
  offline: {
    label: 'Offline',
    variant: 'bg-offline/15 text-offline border-offline/30',
    icon: '○',
  },
  degraded: {
    label: 'Degraded',
    variant: 'bg-degraded/15 text-degraded border-degraded/30',
    icon: '◐',
  },
  unknown: {
    label: 'Unknown',
    variant: 'bg-unknown/15 text-unknown border-unknown/30',
    icon: '?',
  },
}

const PILLAR_ICONS: Record<string, ReactNode> = {
  memory: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  knowledge: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  pageindex: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  ),
  roadmap: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  ),
  handoffs: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  ),
  ralph: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  ),
  braintrust: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 3v18h18M7 16l4-8 4 4 4-8"
      />
    </svg>
  ),
}


function formatPillarName(name: string): string {
  const names: Record<string, string> = {
    memory: 'Memory',
    knowledge: 'Knowledge Tree',
    pageindex: 'PageIndex',
    roadmap: 'Roadmap',
    handoffs: 'Handoffs',
    ralph: 'Ralph',
    braintrust: 'Braintrust',
  }
  return names[name] || name.charAt(0).toUpperCase() + name.slice(1)
}

export function PillarCard({ health, onViewDetails }: PillarCardProps) {
  const statusConfig = STATUS_CONFIG[health.status]
  const icon = PILLAR_ICONS[health.name]

  return (
    <Card
      role="region"
      aria-label={`${formatPillarName(health.name)} pillar - ${statusConfig.label}`}
      onClick={onViewDetails}
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        'border-l-[3px] hover-lift bento-shadow hover:shadow-md transition-shadow',
        `status-${health.status} status-border-left`,
        health.status === 'online' && 'hover:status-glow',
        health.status === 'degraded' && 'hover:status-glow-degraded',
        health.status === 'offline' && 'hover:status-glow-offline',
        onViewDetails && 'cursor-pointer'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                'bg-muted/50 text-muted-foreground'
              )}
            >
              {icon}
            </div>
            <div>
              <CardTitle className="text-base font-medium">
                {formatPillarName(health.name)}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {health.last_activity ? formatTimeAgo(health.last_activity) : 'Never'}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn('text-xs font-medium', statusConfig.variant)}
            aria-label={`Status: ${statusConfig.label}`}
          >
            <span className="mr-1">{statusConfig.icon}</span>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight">{health.count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {health.name === 'memory' && 'learnings'}
              {health.name === 'knowledge' && 'entries'}
              {health.name === 'pageindex' && 'indexed'}
              {health.name === 'roadmap' && '% complete'}
              {health.name === 'handoffs' && 'documents'}
              {health.name === 'ralph' && 'tasks'}
              {health.name === 'braintrust' && 'sessions'}
            </p>
          </div>
          {onViewDetails && (
            <Button variant="ghost" size="sm" onClick={onViewDetails} className="text-xs hover:text-primary transition-colors">
              Details
              <svg
                className="ml-1 h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          )}
        </div>

        {health.error && (
          <div className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {health.error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
