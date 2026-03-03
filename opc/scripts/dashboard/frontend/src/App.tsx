import { useEffect, useCallback, useRef, useState } from 'react'
import { Toaster } from 'sonner'
import { Header } from '@/components/layout/Header'
import { PillarGrid } from '@/components/pillars/PillarGrid'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { fetchHealth } from '@/lib/api'
import { showPillarStatusToast } from '@/lib/toast'
import { useHealthStore } from '@/stores/healthStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useActivityStore, type HealthChange, type Activity } from '@/stores/activityStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { HealthResponse, PillarHealth } from '@/types'
import { useBrowserNotifications } from '@/hooks'
import { UserGuide } from '@/components/UserGuide'
import { ActivityFeed } from '@/components/activity/ActivityFeed'
import { MemoryDetail } from '@/components/pillars/MemoryDetail'
import { KnowledgeDetail } from '@/components/pillars/KnowledgeDetail'
import { PageIndexDetail } from '@/components/pillars/PageIndexDetail'
import { RoadmapDetail } from '@/components/pillars/RoadmapDetail'
import { HandoffsDetail } from '@/components/pillars/HandoffsDetail'
import { RalphDetail } from '@/components/pillars/RalphDetail'
import { BraintrustDetail } from '@/components/pillars/BraintrustDetail'
import { SystemHealthDetail } from '@/components/pillars/SystemHealthDetail'
import { SessionsDetail } from '@/components/pillars/SessionsDetail'
import './index.css'

function App() {
  const { pillars, isLoading, error, lastUpdated, setHealth, setError, setLoading } = useHealthStore()
  const { addNotification } = useNotificationStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeDetail, setActiveDetail] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const { notifyOffline } = useBrowserNotifications()

  const previousPillarsRef = useRef<Record<string, PillarHealth>>({})

  const handleHealthUpdate = useCallback((data: HealthResponse | { type?: string; pillar: string; status: string; count: number }) => {
    const { addActivityFromHealthChange } = useActivityStore.getState()

    // Handle single-pillar WebSocket update
    if ('pillar' in data && typeof data.pillar === 'string') {
      const { pillars: currentPillars } = useHealthStore.getState()
      const name = data.pillar
      const health: PillarHealth = {
        name,
        status: data.status as PillarHealth['status'],
        count: data.count,
        last_activity: new Date().toISOString(),
        error: null,
      }
      const previous = previousPillarsRef.current[name]

      if (previous) {
        const change: HealthChange = {}
        if (previous.status !== health.status) {
          change.status = { from: previous.status, to: health.status }
        }
        if (previous.count !== health.count) {
          change.count = { from: previous.count, to: health.count }
        }
        if (Object.keys(change).length > 0) {
          addActivityFromHealthChange(name, change)
        }
      }

      if (previous && previous.status !== health.status) {
        showPillarStatusToast(name, health.status, previous.status)
        addNotification({
          type: health.status === 'offline' ? 'error' :
                health.status === 'degraded' ? 'warning' : 'success',
          title: `${name} Status Changed`,
          message: `${previous.status} -> ${health.status}`,
          pillar: name,
        })
        if (health.status === 'offline') {
          notifyOffline(name)
        }
      }

      const updatedPillars = { ...currentPillars, [name]: health }
      setHealth({ pillars: updatedPillars })
      previousPillarsRef.current[name] = health
      return
    }

    // Handle full health response (from HTTP polling)
    const fullData = data as HealthResponse
    Object.entries(fullData.pillars).forEach(([name, health]) => {
      const previous = previousPillarsRef.current[name]
      if (previous) {
        const change: HealthChange = {}
        if (previous.status !== health.status) {
          change.status = { from: previous.status, to: health.status }
        }
        if (previous.count !== health.count) {
          change.count = { from: previous.count, to: health.count }
        }
        if (Object.keys(change).length > 0) {
          addActivityFromHealthChange(name, change)
        }
      }

      if (previous && previous.status !== health.status) {
        showPillarStatusToast(name, health.status, previous.status)

        addNotification({
          type: health.status === 'offline' ? 'error' :
                health.status === 'degraded' ? 'warning' : 'success',
          title: `${name} Status Changed`,
          message: `${previous.status} -> ${health.status}`,
          pillar: name,
        })

        if (health.status === 'offline') {
          notifyOffline(name)
        }
      }
    })

    setHealth(fullData)
    previousPillarsRef.current = fullData.pillars
  }, [setHealth, addNotification, notifyOffline])

  const { isConnected } = useWebSocket({
    project: 'continuous-claude',
    onHealthUpdate: handleHealthUpdate,
    onActivity: (event) => useActivityStore.getState().addActivity({
      pillar: event.pillar,
      type: (event.action as Activity['type']) || 'status_change',
      description: event.action,
      timestamp: new Date(event.timestamp),
      metadata: event.details,
    }),
    onNotification: (event) => useNotificationStore.getState().addNotification({
      type: event.level === 'info' ? 'info' : event.level === 'warning' ? 'warning' : 'error',
      title: event.level.charAt(0).toUpperCase() + event.level.slice(1),
      message: event.message,
    }),
  })

  const loadHealth = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const data = await fetchHealth()
      const isFirstLoad = Object.keys(previousPillarsRef.current).length === 0
      setHealth(data)
      previousPillarsRef.current = data.pillars

      // Seed activity feed on first load so it's never empty
      if (isFirstLoad) {
        const { addActivity } = useActivityStore.getState()
        Object.entries(data.pillars).forEach(([name, health]) => {
          addActivity({
            pillar: name,
            type: 'status_change',
            description: `${name} is ${health.status} (${health.count} items)`,
            timestamp: new Date(),
          })
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
    } finally {
      setLoading(false)
      setTimeout(() => setIsRefreshing(false), 300)
    }
  }, [setHealth, setError, setLoading])

  useEffect(() => {
    loadHealth()

    const interval = setInterval(loadHealth, 10000)
    return () => clearInterval(interval)
  }, [loadHealth])

  // Keyboard shortcuts for pillar navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const keyMap: Record<string, string> = {
        m: 'memory', k: 'knowledge', p: 'pageindex',
        r: 'roadmap', h: 'handoffs', a: 'ralph', b: 'braintrust',
        x: 'system-health', s: 'sessions',
      }

      if (e.key === 'Escape') setActiveDetail(null)
      else if (keyMap[e.key]) setActiveDetail(keyMap[e.key])
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleViewDetails = (pillar: string) => {
    setActiveDetail(pillar)
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Header isConnected={isConnected} onRefreshData={loadHealth} onOpenGuide={() => setGuideOpen(true)} />

      <main className="container max-w-screen-2xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Status</h2>
            <p className="text-sm text-muted-foreground">
              Monitor the 7 pillars of Continuous Claude
            </p>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        <div className={isRefreshing && !isLoading ? 'opacity-70 transition-opacity duration-200' : 'transition-opacity duration-300'}>
          <PillarGrid health={Object.keys(pillars).length > 0 ? { pillars } : null} isLoading={isLoading} onViewDetails={handleViewDetails} />
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">Activity</h3>
          <div className="rounded-lg border border-border bg-card">
            <ActivityFeed maxItems={50} />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <button
              onClick={() => window.open('/api/health', '_blank')}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">Health API</p>
                <p className="text-xs text-muted-foreground">View raw JSON</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setActiveDetail('memory')}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">Browse Learnings</p>
                <p className="text-xs text-muted-foreground">Memory API</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setActiveDetail('roadmap')}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">Roadmap Goals</p>
                <p className="text-xs text-muted-foreground">Progress tracker</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setActiveDetail('handoffs')}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-5/10 text-chart-5">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">Handoff Documents</p>
                <p className="text-xs text-muted-foreground">Session transfers</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setActiveDetail('ralph')}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8V4m0 4a4 4 0 100 8 4 4 0 000-8zm-6 4H2m4 0a6 6 0 1012 0m-2 0h4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">Ralph Monitor</p>
                <p className="text-xs text-muted-foreground">AI agent oversight</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setActiveDetail('braintrust')}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 13h2v8H3zm6-4h2v12H9zm6-3h2v15h-2zm6-3h2v18h-2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">Braintrust Evals</p>
                <p className="text-xs text-muted-foreground">Session analytics</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setActiveDetail('system-health')}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">System Health</p>
                <p className="text-xs text-muted-foreground">Full diagnostic</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setActiveDetail('sessions')}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">Active Sessions</p>
                <p className="text-xs text-muted-foreground">Terminal sessions</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-4">
        <div className="container max-w-screen-2xl px-4">
          <p className="text-center text-xs text-muted-foreground">
            Session Dashboard v1.0 | Backend: FastAPI | Frontend: React + shadcn/ui
          </p>
        </div>
      </footer>

      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        closeButton
      />

      <MemoryDetail
        open={activeDetail === 'memory'}
        onOpenChange={(open) => !open && setActiveDetail(null)}
      />
      <KnowledgeDetail
        open={activeDetail === 'knowledge'}
        onOpenChange={(open) => !open && setActiveDetail(null)}
      />
      <PageIndexDetail
        open={activeDetail === 'pageindex'}
        onOpenChange={(open) => !open && setActiveDetail(null)}
      />
      <RoadmapDetail
        open={activeDetail === 'roadmap'}
        onOpenChange={(open) => !open && setActiveDetail(null)}
      />
      <HandoffsDetail
        open={activeDetail === 'handoffs'}
        onOpenChange={(open) => !open && setActiveDetail(null)}
      />
      <RalphDetail
        open={activeDetail === 'ralph'}
        onOpenChange={(open) => !open && setActiveDetail(null)}
      />
      <BraintrustDetail
        open={activeDetail === 'braintrust'}
        onOpenChange={(open) => !open && setActiveDetail(null)}
      />
      <SystemHealthDetail
        open={activeDetail === 'system-health'}
        onOpenChange={(open) => !open && setActiveDetail(null)}
      />
      <SessionsDetail
        open={activeDetail === 'sessions'}
        onOpenChange={(open) => !open && setActiveDetail(null)}
      />
      <UserGuide open={guideOpen} onOpenChange={setGuideOpen} />
      </div>
    </ErrorBoundary>
  )
}

export default App
