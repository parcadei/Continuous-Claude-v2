import { useEffect, useState, useMemo } from 'react'
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
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import {
  fetchSkillsDetails,
  fetchSkillGraph,
  fetchHookEvents,
} from '@/lib/api'
import type {
  SkillsDetails,
  SkillGraphData,
  HookEvent,
} from '@/types'
import { useActivityStore } from '@/stores/activityStore'

interface SkillsDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// -- Helpers --

function StatColumn({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-mono font-bold tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
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

// -- Dagre layout --

const NODE_WIDTH = 140
const NODE_HEIGHT = 44

const TYPE_COLORS: Record<string, string> = {
  workflow: '#f97316',   // orange
  domain: '#3b82f6',     // blue
  process: '#8b5cf6',    // violet
  validation: '#ef4444', // red
  meta: '#6b7280',       // gray
  guardrail: '#dc2626',  // red-600
  planning: '#0ea5e9',   // sky
  research: '#14b8a6',   // teal
}

function layoutGraph(nodes: SkillGraphData['nodes'], edges: SkillGraphData['edges']) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 80 })

  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach((e) => {
    g.setEdge(e.source, e.target)
  })

  dagre.layout(g)

  const flowNodes: Node[] = nodes.map((n) => {
    const pos = g.node(n.id)
    return {
      id: n.id,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { label: n.label, type: n.type, description: n.description },
      style: {
        background: TYPE_COLORS[n.type] || '#6b7280',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 11,
        fontWeight: 600,
        width: NODE_WIDTH,
        textAlign: 'center' as const,
      },
    }
  })

  const flowEdges: Edge[] = edges.map((e) => ({
    id: `e-${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    animated: e.type === 'co-activation',
    style: {
      stroke: e.type === 'co-activation' ? '#22c55e' : '#6b7280',
      strokeWidth: 1.5,
    },
  }))

  return { flowNodes, flowEdges }
}

// -- Main component --

export default function SkillsDetail({ open, onOpenChange }: SkillsDetailProps) {
  const [details, setDetails] = useState<SkillsDetails | null>(null)
  const [graph, setGraph] = useState<SkillGraphData | null>(null)
  const [hookEvents, setHookEvents] = useState<HookEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const activities = useActivityStore((s) => s.activities)
  const skillsActivities = useMemo(
    () => activities.filter((a) => a.pillar === 'skills').slice(0, 20),
    [activities]
  )

  useEffect(() => {
    if (!open) {
      setSelectedNode(null)
      return
    }

    const controller = new AbortController()

    async function loadData() {
      setLoading(true)
      setError(null)
      setDetails(null)
      setGraph(null)
      setHookEvents([])
      try {
        const [d, g, h] = await Promise.all([
          fetchSkillsDetails(),
          fetchSkillGraph(),
          fetchHookEvents(30),
        ])
        if (!controller.signal.aborted) {
          setDetails(d)
          setGraph(g)
          setHookEvents(h.events ?? [])
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Failed to load skills data'
          setError(message)
          console.error('Failed to load skills data:', err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      controller.abort()
    }
  }, [open])

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!graph || graph.nodes.length === 0) return { flowNodes: [], flowEdges: [] }
    return layoutGraph(graph.nodes, graph.edges)
  }, [graph])

  const selectedSkill = useMemo(() => {
    if (!selectedNode || !details) return null
    return details.skills.find((s) => s.name === selectedNode) || null
  }, [selectedNode, details])

  const leaderboardMax = details
    ? (Object.values(details.activations.by_hook)[0] || 1)
    : 1

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <svg aria-hidden="true" className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Skills &amp; Hooks
          </SheetTitle>
          <SheetDescription>
            Skill catalog, arscontexta graph, and hook activation health
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="px-6 py-5 space-y-6">
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <svg aria-hidden="true" className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            {/* Stats bar */}
            {loading ? (
              <div className="flex gap-6 justify-center">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-20" />
                ))}
              </div>
            ) : details ? (
              <div className="flex gap-6 justify-center rounded-lg bg-muted/30 py-4">
                <StatColumn value={details.stats.total_skills} label="Skills" />
                <StatColumn value={details.stats.total_agents} label="Agents" />
                <StatColumn value={details.graph_edges.length} label="Edges" />
                <StatColumn
                  value={details.hook.compiled ? 'Active' : 'Missing'}
                  label="Hook"
                />
              </div>
            ) : null}

            {/* Arscontexta graph */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Arscontexta Skill Graph</h3>
              {flowNodes.length > 0 ? (
                <div className="h-[320px] rounded-lg border border-border bg-background overflow-hidden" role="img" aria-label="Arscontexta skill dependency graph">
                  <ReactFlowProvider>
                    <ReactFlow
                      nodes={flowNodes}
                      edges={flowEdges}
                      fitView
                      minZoom={0.3}
                      maxZoom={2}
                      onNodeClick={(_, node) => setSelectedNode(node.id)}
                    >
                      <Background gap={16} size={1} />
                      <Controls showInteractive={false} />
                      <MiniMap
                        nodeColor={(n) => (n.style?.background as string) || '#6b7280'}
                        maskColor="rgba(0,0,0,0.1)"
                        style={{ height: 60, width: 100 }}
                      />
                    </ReactFlow>
                  </ReactFlowProvider>
                </div>
              ) : loading ? (
                <Skeleton className="h-[320px] w-full rounded-lg" />
              ) : (
                <div className="h-[200px] flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  No arscontexta skills found
                </div>
              )}

              {selectedSkill && (
                <div className="mt-3 rounded-lg bg-muted/30 p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{selectedSkill.name}</span>
                    <Badge variant="outline" className="text-[10px]">{selectedSkill.type}</Badge>
                    <Badge variant="outline" className="text-[10px]">{selectedSkill.enforcement}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedSkill.description}</p>
                  {selectedSkill.co_activate.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Co-activates: {selectedSkill.co_activate.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Hook health */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Hook Health</h3>
              {details ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Compiled</div>
                    <div className={`text-sm font-semibold ${details.hook.compiled ? 'text-green-500' : 'text-red-500'}`}>
                      {details.hook.compiled ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Source</div>
                    <div className={`text-sm font-semibold ${details.hook.source_exists ? 'text-green-500' : 'text-red-500'}`}>
                      {details.hook.source_exists ? 'Exists' : 'Missing'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">Total Fires</div>
                    <div className="text-sm font-semibold">{details.activations.total_fires.toLocaleString()}</div>
                  </div>
                </div>
              ) : loading ? (
                <Skeleton className="h-20 w-full" />
              ) : null}
            </div>

            {/* Activation leaderboard */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Activation Leaderboard</h3>
              {details && Object.keys(details.activations.by_hook).length > 0 ? (
                <div className="space-y-1.5">
                  {Object.entries(details.activations.by_hook).slice(0, 10).map(([name, count]) => (
                    <HorizontalBar
                      key={name}
                      label={name}
                      value={count}
                      maxValue={leaderboardMax}
                      color="bg-amber-500/80"
                    />
                  ))}
                </div>
              ) : loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activation data available</p>
              )}
            </div>

            {/* Skill type distribution */}
            {details && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Skill Types</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(details.stats.by_type)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: TYPE_COLORS[type] || '#6b7280', color: TYPE_COLORS[type] || '#6b7280' }}
                      >
                        {type} ({count})
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* Live hook events */}
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Recent Hook Events
                {hookEvents.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({hookEvents.length})</span>
                )}
              </h3>
              {hookEvents.length > 0 ? (
                <div className="space-y-1 max-h-[200px] overflow-y-auto" role="log" aria-live="polite" tabIndex={0}>
                  {hookEvents.map((ev) => (
                    <div key={`${ev.timestamp}-${ev.hook_name}`} className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground w-20 shrink-0">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{ev.event_type || 'event'}</Badge>
                      <span className="font-mono truncate">{ev.hook_name}</span>
                      {ev.skill_matched && (
                        <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-0">{ev.skill_matched}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : skillsActivities.length > 0 ? (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {skillsActivities.map((a) => (
                    <div key={`${a.timestamp.toISOString()}-${a.description}`} className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground w-20 shrink-0">
                        {a.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="truncate">{a.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No events yet. POST to /api/hook-events to stream events here.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
