# Session Dashboard

Live observability panel for Continuous Claude. Monitors the 7 pillars of the system in real time with WebSocket updates, detail panels, and keyboard navigation.

## Quick Start

### Development (Backend + Vite Dev Server)

```bash
# Terminal 1: Backend
cd opc/scripts && uv run python -m dashboard.main

# Terminal 2: Frontend (hot reload)
cd opc/scripts/dashboard/frontend && npm install && npm run dev
```

Backend serves on `http://localhost:3434`. Vite dev server proxies API calls automatically.

### Production Build

```bash
# Build frontend into static/
cd opc/scripts/dashboard/frontend && npm run build

# Start server (serves built frontend + API)
cd opc/scripts && uv run python -m dashboard.main
```

### Windows Service (NSSM)

```bash
# Install as a Windows service
cd opc/scripts && uv run python -m dashboard.main install

# Check status
cd opc/scripts && uv run python -m dashboard.main status

# Remove service
cd opc/scripts && uv run python -m dashboard.main uninstall
```

Requires [NSSM](https://nssm.cc/) on PATH.

## Architecture

```
Browser (React + shadcn/ui)
    |
    |-- HTTP polling (10s)
    |-- WebSocket (real-time)
    |
FastAPI (port 3434)
    |-- 10 routers (API endpoints)
    |-- 9 services (pillar health checks)
    |-- WebSocket manager (pub/sub by project)
    |-- Health monitor (background task)
    |
PostgreSQL (continuous_claude)
    |-- archival_memory (learnings)
    |-- sessions (active terminals)
    |-- file_claims (cross-session locks)
    +-- knowledge tree, handoffs, roadmap (file-based)
```

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Vite, shadcn/ui, Zustand, Sonner |
| Backend | FastAPI, Uvicorn, asyncpg, pydantic-settings |
| Data | PostgreSQL + pgvector, file system (JSON/YAML/Markdown) |
| Transport | HTTP REST + WebSocket |

## Pillars Monitored

| Pillar | Service Module | What It Checks |
|--------|---------------|----------------|
| Memory | `services/memory.py` | Learning count, types, recent activity in `archival_memory` |
| Knowledge | `services/knowledge.py` | Knowledge tree structure from `knowledge-tree.json` |
| PageIndex | `services/pageindex.py` | Indexed document count and type distribution |
| Roadmap | `services/roadmap.py` | Goal completion status parsed from `ROADMAP.md` |
| Handoffs | `services/handoffs.py` | Session handoff documents (DB + `HANDOFF-*.md` files) |
| Ralph | `services/ralph.py` | Autonomous build state, tasks, iterations from `.ralph/state.json` |
| Braintrust | `services/braintrust.py` | Session analytics, agent/skill usage from Braintrust API |

Each service extends `BasePillarService` (in `services/base.py`) and implements `check_health()` and `get_details()`.

## API Reference

All endpoints return JSON. No authentication required (localhost only).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health status of all 7 pillars |
| GET | `/api/health/{pillar}` | Detailed health + stats for one pillar |
| GET | `/api/pillars/memory/learnings` | List learnings (paginated, searchable, filterable by type) |
| GET | `/api/pillars/memory/learnings/{id}` | Single learning by UUID |
| GET | `/api/pillars/memory/details` | Aggregated memory stats (counts by type, scope, recents) |
| GET | `/api/pillars/knowledge/tree` | Full knowledge tree structure |
| GET | `/api/pillars/pageindex/documents` | List indexed documents (paginated, path search) |
| GET | `/api/pillars/pageindex/stats` | Document stats grouped by type |
| GET | `/api/pillars/roadmap/goals` | Roadmap goals with completion status |
| GET | `/api/pillars/handoffs` | List handoffs (paginated, status filter) |
| GET | `/api/pillars/handoffs/{id}` | Single handoff by UUID or `file:filename` |
| GET | `/api/pillars/ralph/tasks` | Ralph tasks grouped by status |
| GET | `/api/pillars/ralph/state` | Ralph session state (stage, iteration, progress) |
| GET | `/api/pillars/braintrust/weekly-summary` | Daily session/tool counts for last 7 days |
| GET | `/api/pillars/braintrust/agent-stats` | Agent usage stats (last 7 days) |
| GET | `/api/pillars/braintrust/skill-stats` | Skill usage stats (last 7 days) |
| GET | `/api/pillars/braintrust/sessions` | Recent sessions (limit 1-50, default 10) |
| GET | `/api/system-health/report` | Full diagnostic across all subsystems |
| GET | `/api/sessions` | All sessions with file claims and agent summaries |
| GET | `/api/sessions/{session_id}` | Detailed info for one session |
| WS | `/ws` | WebSocket endpoint for real-time updates |

## WebSocket Protocol

Connect to `ws://localhost:3434/ws` for real-time pillar updates.

### Subscribe / Unsubscribe

```json
// Subscribe to a project's updates
{"action": "subscribe", "project": "continuous-claude"}

// Unsubscribe
{"action": "unsubscribe", "project": "continuous-claude"}
```

### Server Events

| Event Type | Payload | When |
|------------|---------|------|
| `subscription` | `{action: "subscribed"\|"unsubscribed", project}` | After subscribe/unsubscribe |
| `health_update` | `{pillar, status, count}` | Pillar status changes |
| `activity` | `{pillar, action, timestamp, details}` | Pillar activity events |
| `notification` | `{level, message}` | System notifications |
| `error` | `{message}` | Invalid messages or unknown actions |

## Keyboard Shortcuts

Press a key anywhere (outside text inputs) to open the corresponding detail panel.

| Key | Panel |
|-----|-------|
| `m` | Memory |
| `k` | Knowledge |
| `p` | PageIndex |
| `r` | Roadmap |
| `h` | Handoffs |
| `a` | Ralph |
| `b` | Braintrust |
| `x` | System Health |
| `s` | Sessions |
| `Escape` | Close active panel |

## Frontend Components

| Component | Path | Purpose |
|-----------|------|---------|
| `App` | `frontend/src/App.tsx` | Root: routing, shortcuts, WebSocket, polling |
| `Header` | `components/layout/Header.tsx` | Top bar: connection status, refresh, guide link |
| `ThemeToggle` | `components/layout/ThemeToggle.tsx` | Dark/light mode switch |
| `PillarGrid` | `components/pillars/PillarGrid.tsx` | 7-card grid layout |
| `PillarCard` | `components/pillars/PillarCard.tsx` | Individual pillar status card |
| `MemoryDetail` | `components/pillars/MemoryDetail.tsx` | Learning browser with search and filters |
| `KnowledgeDetail` | `components/pillars/KnowledgeDetail.tsx` | Knowledge tree viewer |
| `PageIndexDetail` | `components/pillars/PageIndexDetail.tsx` | Indexed document list |
| `RoadmapDetail` | `components/pillars/RoadmapDetail.tsx` | Goal completion tracker |
| `HandoffsDetail` | `components/pillars/HandoffsDetail.tsx` | Handoff document viewer |
| `RalphDetail` | `components/pillars/RalphDetail.tsx` | Ralph task/state monitor |
| `BraintrustDetail` | `components/pillars/BraintrustDetail.tsx` | Session analytics charts |
| `SystemHealthDetail` | `components/pillars/SystemHealthDetail.tsx` | Full system diagnostic |
| `SessionsDetail` | `components/pillars/SessionsDetail.tsx` | Active terminal sessions |
| `ActivityFeed` | `components/activity/ActivityFeed.tsx` | Real-time activity timeline |
| `NotificationBell` | `components/notifications/NotificationBell.tsx` | Notification dropdown |
| `UserGuide` | `components/UserGuide.tsx` | Interactive onboarding guide |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | React error boundary |

State management uses Zustand stores: `healthStore`, `activityStore`, `notificationStore`.

## Development

### Directory Layout

```
dashboard/
├── main.py              # FastAPI app, CLI, lifespan
├── config.py            # Settings (env vars, logging)
├── models.py            # Pydantic models
├── routers/             # 10 API route modules
│   ├── health.py        # /api/health
│   ├── memory.py        # /api/pillars/memory/*
│   ├── knowledge.py     # /api/pillars/knowledge/*
│   ├── pageindex.py     # /api/pillars/pageindex/*
│   ├── roadmap.py       # /api/pillars/roadmap/*
│   ├── handoffs.py      # /api/pillars/handoffs/*
│   ├── ralph.py         # /api/pillars/ralph/*
│   ├── braintrust.py    # /api/pillars/braintrust/*
│   ├── system_health.py # /api/system-health/*
│   └── sessions.py      # /api/sessions/*
├── services/            # 9 pillar service implementations
│   ├── base.py          # BasePillarService ABC
│   ├── memory.py
│   ├── knowledge.py
│   ├── pageindex.py
│   ├── roadmap.py
│   ├── handoffs.py
│   ├── ralph.py
│   ├── braintrust.py
│   ├── system_health.py
│   └── sessions.py
├── websocket/
│   └── manager.py       # ConnectionManager (pub/sub)
├── tasks/
│   └── health_monitor.py # Background health polling
├── service/
│   ├── install.py       # NSSM service installer
│   └── uninstall.py     # NSSM service uninstaller
├── static/              # Vite build output (git-ignored)
├── logs/                # Rotating log files
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── App.tsx
        ├── index.css
        ├── types.ts
        ├── lib/          # api.ts, toast.ts
        ├── hooks/        # useWebSocket.ts, useBrowserNotifications.ts
        ├── stores/       # healthStore.ts, activityStore.ts, notificationStore.ts
        └── components/   # See Frontend Components table above
```

### Running Tests

```bash
# Frontend
cd opc/scripts/dashboard/frontend && npm test

# Backend (from opc/scripts)
cd opc/scripts && uv run pytest dashboard/
```

### Adding a New Pillar

1. **Create the service** in `services/your_pillar.py` extending `BasePillarService`
2. **Create the router** in `routers/your_pillar.py` with a FastAPI `APIRouter`
3. **Register the router** in `main.py` via `app.include_router()`
4. **Add health check** to `services/system_health.py` if needed
5. **Create the detail panel** in `frontend/src/components/pillars/YourPillarDetail.tsx`
6. **Wire up the panel** in `App.tsx`: import, add keyboard shortcut key, add `<YourPillarDetail>` component

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Server bind address |
| `PORT` | `3434` | Server port |
| `DATABASE_URL` | (see below) | PostgreSQL connection string |
| `OPC_POSTGRES_URL` | - | Override for DATABASE_URL (highest priority) |
| `AGENTICA_POSTGRES_URL` | - | Fallback PostgreSQL URL |
| `BRAINTRUST_API_KEY` | - | Braintrust API key for session analytics |

DATABASE_URL resolution order: `OPC_POSTGRES_URL` > `AGENTICA_POSTGRES_URL` > `DATABASE_URL` > dev default (`postgresql://claude:claude_dev@localhost:5434/continuous_claude`).
