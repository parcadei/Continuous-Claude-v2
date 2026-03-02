import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface UserGuideProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PILLAR_DOCS = [
  {
    name: 'Memory',
    key: 'memory',
    description: 'Semantic learnings stored in PostgreSQL with pgvector embeddings. Each learning has a type, confidence level, and tags for retrieval.',
    detail: 'Search learnings, filter by type (WORKING_SOLUTION, ERROR_FIX, CODEBASE_PATTERN, etc.), and paginate through results.',
    status: 'Count = total stored learnings',
  },
  {
    name: 'Knowledge Tree',
    key: 'knowledge',
    description: 'Project structure from .claude/knowledge-tree.json. Maps components, entry points, and navigation paths.',
    detail: 'Interactive JSON tree viewer with expand/collapse. Shows file paths, component types, and relationships.',
    status: 'Count = tree nodes',
  },
  {
    name: 'PageIndex',
    key: 'pageindex',
    description: 'Indexed documents for documentation search via MCP. Tracks document status, page counts, and indexing state.',
    detail: 'Stats bar showing totals, status filter (indexed/pending/error), and a scrollable document list.',
    status: 'Count = indexed documents',
  },
  {
    name: 'Roadmap',
    key: 'roadmap',
    description: 'Goals and milestones parsed from ROADMAP.md. Tracks current focus, completed items, and planned work.',
    detail: 'Progress bar, goals grouped by section (Current Focus, Planned, Completed).',
    status: 'Count = total goals',
  },
  {
    name: 'Handoffs',
    key: 'handoffs',
    description: 'Session transfer documents in YAML format. Each handoff captures goal, progress, blockers, and decisions.',
    detail: 'Timeline view with expandable cards showing full handoff content and outcome status.',
    status: 'Count = handoff documents',
  },
  {
    name: 'Ralph',
    key: 'ralph',
    description: 'Autonomous dev session tasks managed by the Ralph workflow. Tracks delegated agent work, retries, and completions.',
    detail: 'Kanban-style view with progress bar and retry queue. Shows task status across agents.',
    status: 'Count = active tasks',
  },
  {
    name: 'Braintrust',
    key: 'braintrust',
    description: 'Session analytics via BTQL API. Tracks Claude Code sessions, agent usage, skill invocations, and token costs.',
    detail: 'Weekly activity bars, agent/skill usage breakdown, and session list with drill-down.',
    status: 'Count = recent sessions',
  },
]

const FEATURES = [
  {
    name: 'Notifications',
    description: 'The bell icon in the header shows real-time status change alerts. When a pillar goes offline or changes state, a notification is added with type-coded icons (info, warning, error, success).',
  },
  {
    name: 'Activity Feed',
    description: 'A real-time log of pillar changes below the status grid. Filter by pillar or time range. Entries are generated automatically when health updates detect status or count changes.',
  },
  {
    name: 'Quick Actions',
    description: 'Four shortcut buttons for common tasks: view raw Health API JSON, browse Memory learnings, check Roadmap goals, and view Handoff documents.',
  },
  {
    name: 'Theme Toggle',
    description: 'Switch between light, dark, and system theme modes using the sun/moon icon in the header. Theme preference is persisted in localStorage.',
  },
  {
    name: 'Settings Menu',
    description: 'The gear icon provides access to Refresh Data (manually reload all pillar health) and View API Docs (opens the FastAPI Swagger UI).',
  },
  {
    name: 'WebSocket Live Updates',
    description: 'The "Live" indicator shows real-time connection status. When connected, health updates stream via WebSocket. Falls back to 10-second polling when disconnected.',
  },
]

export function UserGuide({ open, onOpenChange }: UserGuideProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            User Guide
          </SheetTitle>
          <SheetDescription>
            Learn about the Session Dashboard and its features
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pillars">Pillars</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-6 px-4 pb-8 pt-2">
                <div className="rounded-lg border border-border/50 bg-card/50 p-4">
                  <h3 className="text-sm font-semibold mb-3">What is the Session Dashboard?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The Session Dashboard monitors the 7 pillars of Continuous Claude &mdash; the infrastructure
                    that gives Claude persistent memory, project awareness, and autonomous capabilities across sessions.
                  </p>
                </div>

                <div className="rounded-lg border border-border/50 bg-card/50 p-4">
                  <h3 className="text-sm font-semibold mb-3">Live Updates</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Health data streams over WebSocket for real-time monitoring. The "Live" indicator in the header
                    shows connection status. If the WebSocket disconnects, the dashboard falls back to polling every 10 seconds.
                  </p>
                </div>

                <div className="rounded-lg border border-border/50 bg-card/50 p-4">
                  <h3 className="text-sm font-semibold mb-3">Reading Status Cards</h3>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 text-xs">online</Badge>
                      <span className="text-sm text-muted-foreground">Service is running and healthy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 text-xs">degraded</Badge>
                      <span className="text-sm text-muted-foreground">Service is running but experiencing issues</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-xs">offline</Badge>
                      <span className="text-sm text-muted-foreground">Service is unreachable or stopped</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The count on each card shows the primary metric for that pillar (e.g., total learnings for Memory, indexed documents for PageIndex).
                  </p>
                </div>

                <div className="rounded-lg border border-border/50 bg-card/50 p-4">
                  <h3 className="text-sm font-semibold mb-3">Architecture</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Backend: FastAPI server with per-pillar health routers and WebSocket broadcast.
                    Frontend: React + Vite with shadcn/ui components and Zustand state management.
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pillars">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 px-4 pb-8 pt-2">
                {PILLAR_DOCS.map((pillar) => (
                  <div key={pillar.key} className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold">{pillar.name}</h4>
                      <Badge variant="outline" className="text-[10px]">{pillar.key}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                    <div className="rounded bg-muted/50 p-2">
                      <p className="text-xs font-medium mb-1">Detail Panel</p>
                      <p className="text-xs text-muted-foreground">{pillar.detail}</p>
                    </div>
                    <p className="text-xs text-muted-foreground italic">{pillar.status}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="features">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 px-4 pb-8 pt-2">
                {FEATURES.map((feature) => (
                  <div key={feature.name} className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-2">
                    <h4 className="text-sm font-semibold mb-1">{feature.name}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
