export type PillarStatus = 'online' | 'offline' | 'degraded' | 'unknown'

export interface PillarHealth {
  name: string
  status: PillarStatus
  count: number
  last_activity: string | null
  error: string | null
  details?: Record<string, unknown>
}

export interface HealthResponse {
  pillars: Record<string, PillarHealth>
  timestamp?: string
}

export interface Learning {
  id: string
  session_id: string
  type: string
  content: string
  context: string | null
  tags: string[] | null
  confidence: string
  created_at: string
  metadata: Record<string, unknown>
}

export interface LearningsResponse {
  learnings: Learning[]
  total: number
  page: number
  page_size: number
}

export interface MemoryDetails {
  total_count: number
  by_type: Record<string, number>
  by_scope: Record<string, number>
  recent: Learning[]
}

export interface KnowledgeTree {
  project?: {
    name: string
    description: string
    type: string
  }
  structure?: {
    root: string
    directories: Record<string, string>
  }
  stack?: Record<string, unknown>
  goals?: unknown[]
  [key: string]: unknown
}

export interface RoadmapGoal {
  id: string
  text: string
  completed: boolean
  section: string
}

export interface RoadmapResponse {
  goals: RoadmapGoal[]
  completed: number
  total: number
  completion_rate: number
}

export interface HandoffSummary {
  id: string
  title: string
  source: 'db' | 'file'
  status: string | null
  created_at: string | null
}

export interface HandoffDetail extends HandoffSummary {
  content: string
  metadata?: Record<string, unknown>
}

export interface HandoffsResponse {
  handoffs: HandoffSummary[]
  total: number
  page: number
  page_size: number
}

export interface IndexedDocument {
  id: string
  file_path: string
  status: 'indexed' | 'pending' | 'failed'
  indexed_at: string | null
  language: string
  error?: string
}

export interface PageIndexResponse {
  documents: IndexedDocument[]
  total: number
  page: number
  page_size: number
}

export type WebSocketEventType = 'health_update' | 'activity' | 'notification'

export interface HealthUpdateEvent {
  type: 'health_update'
  pillars: Record<string, PillarHealth>
  changed: string[]
  timestamp: string
}

export interface ActivityEvent {
  type: 'activity'
  pillar: string
  action: string
  details: Record<string, unknown>
  timestamp: string
}

export interface NotificationEvent {
  type: 'notification'
  level: 'info' | 'warning' | 'error'
  message: string
  timestamp: string
}

export type WebSocketEvent = HealthUpdateEvent | ActivityEvent | NotificationEvent

export interface WebSocketMessage {
  action: 'subscribe' | 'unsubscribe'
  project: string
}

// Ralph types
export type RalphTaskStatus = 'pending' | 'in_progress' | 'reviewing' | 'complete' | 'failed' | 'blocked' | 'skipped'

export interface RalphTask {
  id: string
  name: string
  status: RalphTaskStatus
  agent: string | null
  duration_s: number | null
  retries: number
  depends_on: string[]
  files: string[]
  started_at: string | null
  completed_at: string | null
  last_error: string | null
}

export interface RalphTasksResponse {
  tasks: RalphTask[]
  tasks_by_status: Record<string, number>
}

export interface RalphStateResponse {
  active: boolean
  story_id: string
  stage: string
  iteration: number
  max_iterations: number
  progress: { completed: number; total: number; pct: number }
  retry_queue: Array<{ task_id: string; attempt: number; error: string }>
}

// Braintrust types
export interface BraintrustDailyActivity {
  day: string
  sessions: number
  tool_calls: number
}

export interface BraintrustAgentStat {
  agent: string
  runs: number
  sessions: number
}

export interface BraintrustSkillStat {
  skill: string
  activations: number
  sessions: number
}

export interface BraintrustSession {
  session_id: string
  started: string
  ended: string
  span_count: number
}

// Sessions types
export type SessionStatus = 'active' | 'idle' | 'stale'

export interface SessionFileClaim {
  file_path: string
  claimed_at: string | null
}

export interface SessionAgentSummary {
  total: number
  failed: number
}

export interface SessionInfo {
  id: string
  project: string | null
  working_on: string | null
  status: SessionStatus
  last_heartbeat: string | null
  started_at: string | null
  file_claims: SessionFileClaim[]
  agent_summary: SessionAgentSummary
}

export interface SessionsResponse {
  sessions: SessionInfo[]
  counts: Record<SessionStatus, number>
  total: number
  error?: string
}

// System Health types
export type SubsystemStatus = 'HEALTHY' | 'DEGRADED' | 'FAILING'

export interface SubsystemCheck {
  status: SubsystemStatus
  evidence: Record<string, unknown>
  recommendations: string[]
}

export interface SystemHealthReport {
  overall: SubsystemStatus
  checked_at: string
  subsystems: Record<string, SubsystemCheck>
}
