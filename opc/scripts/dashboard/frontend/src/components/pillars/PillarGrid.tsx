import { PillarCard } from './PillarCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { HealthResponse } from '@/types'

interface PillarGridProps {
  health: HealthResponse | null
  isLoading: boolean
  onViewDetails?: (pillar: string) => void
}

const PILLAR_ORDER = ['memory', 'knowledge', 'pageindex', 'roadmap', 'handoffs', 'ralph', 'braintrust']

function PillarSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-1 h-3 w-12" />
      </div>
    </div>
  )
}

export function PillarGrid({ health, isLoading, onViewDetails }: PillarGridProps) {
  if (isLoading || !health) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <PillarSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
      {PILLAR_ORDER.map((pillarName) => {
        const pillar = health.pillars[pillarName]
        if (!pillar) return null

        return (
          <PillarCard
            key={pillarName}
            health={pillar}
            onViewDetails={onViewDetails ? () => onViewDetails(pillarName) : undefined}
          />
        )
      })}
    </div>
  )
}
