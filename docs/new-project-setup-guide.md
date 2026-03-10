# New Project Setup Guide

How to initialize a new project directory with the full Continuous Claude infrastructure.

**Prerequisite:** Continuous Claude is already installed system-wide (`~/.claude/` populated via `wizard.py` or manual sync). If not, see [QUICKSTART.md](QUICKSTART.md) first.

---

## Quick Start (2 minutes)

```bash
# 1. Create your project
mkdir ~/my-project && cd ~/my-project
git init

# 2. Open a Claude Code session
claude

# 3. Inside the session, run:
/init-project
```

Done. You now have a knowledge tree, ROADMAP, and full hook/agent/skill access.

---

## What You Get

After `/init-project`, your project has:

```
my-project/
├── .claude/
│   └── knowledge-tree.json    # Auto-generated project navigation map
├── ROADMAP.md                 # Goal tracking (auto-updated by hooks)
└── your code...
```

The rest of the infrastructure lives globally in `~/.claude/` and activates automatically:

| Component | Location | Count | Activates On |
|-----------|----------|-------|--------------|
| Hooks | `~/.claude/hooks/dist/` | 93 source (25 registered) | Every Claude Code event |
| Skills | `~/.claude/skills/` | 137+ | `/command` invocations |
| Agents | `~/.claude/agents/` | 31 | `Task` tool delegation |
| Rules | `~/.claude/rules/` | 28 | Auto-loaded into context |
| Memory | PostgreSQL (Docker) | Persistent | `recall_learnings.py` / hooks |

---

## Step-by-Step Setup

### Step 1: Create Project Directory

```bash
mkdir ~/my-project
cd ~/my-project
git init
```

Or clone an existing repo:

```bash
git clone https://github.com/org/repo.git
cd repo
```

### Step 2: Verify System Infrastructure

Before starting a session, confirm the global infrastructure is healthy:

```bash
# Docker running?
docker ps | grep continuous-claude-postgres

# If not running:
cd ~/continuous-claude/docker && docker compose up -d

# Hooks built?
ls ~/.claude/hooks/dist/*.mjs | wc -l
# Should show 80+ files

# If hooks are missing or stale:
cd ~/.claude/hooks && npm run build
```

### Step 3: Start Claude Code Session

```bash
cd ~/my-project
claude
```

On session start, these hooks fire automatically:

1. **session-start-docker** - Ensures PostgreSQL is running
2. **session-register** - Registers your session in the coordination DB
3. **session-start-init-check** - Checks if knowledge tree exists (generates if not)
4. **memory-awareness** - Loads relevant past learnings

### Step 4: Initialize Project Infrastructure

**Option A: Greenfield (new project)**

```
/init-project
```

Creates:
- `.claude/knowledge-tree.json` - Project structure map for navigation
- `ROADMAP.md` - Goal and progress tracker

Optional flags:
- `/init-project --daemon` - Also starts file watcher for live tree updates
- `/init-project --yes` - Skip confirmation prompts

**Option B: Brownfield (existing codebase)**

```
/onboard
```

Does everything `/init-project` does, plus:
- Deep codebase analysis (tech stack, architecture, patterns)
- Creates a handoff document at `thoughts/shared/handoffs/<project>/`
- Asks about your goals and priorities

Use `/onboard` when joining an existing project you need to understand.

### Step 5: Add Project-Level CLAUDE.md (Optional)

Create a `CLAUDE.md` in your project root for project-specific instructions:

```markdown
# Project: My App

## Stack
React, TypeScript, Vite, Express, PostgreSQL

## Conventions
- Components in `src/components/` use PascalCase
- API routes in `src/api/` use kebab-case
- Tests colocated with source files as `*.test.ts`

## Build & Test
- `npm run dev` - Start dev server
- `npm test` - Run vitest
- `npm run build` - Production build

## Key Decisions
- Using Zustand for state (not Redux)
- Tailwind CSS for styling
- Drizzle ORM for database queries
```

This file is auto-loaded into every Claude Code session in this project.

### Step 6: Verify Everything Works

Inside your Claude Code session:

```
# Check knowledge tree was created
/knowledge-tree query "project structure"

# Check ROADMAP exists
# (just ask Claude to show it)
Show me the ROADMAP

# Test memory recall
# (Claude will auto-check via hooks, or manually):
/recall "project setup"
```

---

## Project-Level Configuration

### `.claude/` Directory

You can add project-specific rules, skills, and settings:

```
my-project/.claude/
├── knowledge-tree.json         # Auto-generated (don't edit manually)
├── CLAUDE.md                   # Project instructions (optional, alternative to root)
├── rules/                      # Project-specific rules
│   └── my-rule.md             # Auto-loaded into context
├── settings.json               # Project-level hook/MCP overrides
└── skills/                     # Project-specific skills
    └── my-skill/
        └── SKILL.md
```

Project-level `.claude/` settings merge with global `~/.claude/` settings. Project takes precedence.

### Adding Project-Specific Rules

Create `.claude/rules/my-rule.md`:

```markdown
# My Project Rule

- Always use `pnpm` instead of `npm`
- Database migrations go in `drizzle/migrations/`
- Never modify files in `src/generated/`
```

Rules are auto-loaded into every session context. No registration needed.

### Adding Project-Specific Skills

Create `.claude/skills/deploy/SKILL.md`:

```yaml
---
name: deploy
description: Deploy to staging/production
user-invocable: true
triggers: ["/deploy"]
allowed-tools: [Bash, Read]
---
# Deploy

1. Run `npm run build`
2. Run `npm run test`
3. If tests pass, run `./scripts/deploy.sh`
4. Verify deployment at the staging URL
```

Now `/deploy` works in this project.

---

## Day-to-Day Usage

### Automatic Features (No Action Needed)

| Feature | What Happens | Trigger |
|---------|-------------|---------|
| Session registration | Tracked in coordination DB | Session start |
| Memory injection | Past learnings appear in context | Every prompt |
| Knowledge tree updates | Tree marked stale after edits | File writes |
| ROADMAP updates | Goals tracked automatically | Plans, commits, task completion |
| Cross-session coordination | File lock warnings | Editing files another session owns |

### Common Commands

| Command | Purpose |
|---------|---------|
| `/init-project` | Initialize project infrastructure |
| `/onboard` | Deep codebase analysis |
| `/knowledge-tree query "X"` | Navigate project structure |
| `/create_handoff` | Save session state for later |
| `/resume_handoff` | Load previous session context |
| `/recall "topic"` | Search past learnings |
| `/remember` | Store a new learning |
| `/commit` | Git commit workflow |
| `/explore` | Codebase exploration |
| `/build` | Feature implementation workflow |
| `/fix` | Bug investigation + fix workflow |
| `/maestro` | Multi-step orchestration |
| `/ralph` | Autonomous development mode |

### Agent Delegation

Claude auto-delegates to specialized agents via the Task tool:

| Task Type | Agent | When |
|-----------|-------|------|
| Codebase exploration | scout | Reading 3+ files, finding patterns |
| External research | oracle | Docs, web, API research |
| Design/planning | architect | Feature planning, design docs |
| Complex implementation | kraken | TDD, multi-file changes |
| Quick fixes | spark | Single-file, <50 line changes |
| Debugging | debug-agent, sleuth | Bug investigation, root cause |
| Tests | arbiter, atlas | Test execution, validation |
| Code review | critic, principal-reviewer | Review before merge |
| Performance | profiler | Performance profiling |
| Documentation | scribe | Handoffs, summaries |

### Session Continuity

When ending a session with unfinished work:

```
/create_handoff
```

This saves a structured document with: what's done, what remains, blockers, decisions.

Next session:

```
/resume_handoff
```

Loads the context so you can continue where you left off.

---

## Multi-Project Setup

Each project gets its own:
- `.claude/knowledge-tree.json`
- `ROADMAP.md`
- Session registration (tracked by project path)
- File claims (scoped to project)

Shared across all projects:
- `~/.claude/` global infrastructure (hooks, skills, agents, rules)
- PostgreSQL memory database (learnings tagged by project)
- Docker services

### Working on Multiple Projects Simultaneously

Open separate terminals:

```bash
# Terminal 1
cd ~/project-a && claude

# Terminal 2
cd ~/project-b && claude
```

The coordination database tracks both sessions. If both try to edit the same file (unlikely across projects, but possible with shared libs), the `file-claims` hook warns about conflicts.

---

## Troubleshooting

### Knowledge tree not generated

```bash
# Manual generation
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/knowledge_tree.py --project ~/my-project --verbose

# Validate
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/tree_schema.py --validate ~/my-project/.claude/knowledge-tree.json
```

### Hooks not firing

```bash
# Check hooks are built
ls ~/.claude/hooks/dist/*.mjs | wc -l

# Rebuild if needed
cd ~/.claude/hooks && npm run build

# Check settings.json references correct paths
cat ~/.claude/settings.json | head -50
```

### Memory recall returns nothing

```bash
# Check database is running
docker ps | grep continuous-claude-postgres

# Check learning count
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c "SELECT COUNT(*) FROM archival_memory;"

# If empty, the system works but has no learnings yet - they accumulate over time
```

### ROADMAP not auto-updating

The ROADMAP hooks trigger on specific events:
- `post-plan-roadmap` - After exiting plan mode
- `git-commit-roadmap` - After git commits
- `roadmap-completion` - After marking tasks complete

If none of these events have occurred, the ROADMAP stays as initialized. Start planning or committing to see updates.

### Docker not starting

```bash
# Check Docker Desktop is running (Windows)
docker info

# Start PostgreSQL
cd ~/continuous-claude/docker && docker compose up -d

# Check logs if failing
docker compose logs continuous-claude-postgres
```

---

## Architecture Reference

```
                    Your Project
                    ============
                        |
            +-----------+-----------+
            |                       |
      .claude/                  ROADMAP.md
      knowledge-tree.json       (auto-updated)
      (project map)
            |
            v
    ~/.claude/ (Global Infrastructure)
    ====================================
    |           |          |           |
  hooks/     skills/    agents/    rules/
  (93)      (137+)     (31)       (28)
    |           |          |           |
    +-----+-----+----+----+-----------+
          |          |
    PostgreSQL    Docker
    (memory +     (container
     sessions)    management)
```

**Data flow:**
1. You type a prompt
2. Hooks inject context (memory, session info, rules)
3. Claude processes with access to skills and agents
4. Hooks capture outputs (learnings, ROADMAP updates, tree invalidation)
5. State persists to PostgreSQL and project files

---

## What's Next

After setup, explore these workflows:

- **`/explore quick`** - Quick codebase overview
- **`/build`** - Start implementing a feature
- **`/maestro`** - Orchestrate a complex multi-step task
- **`/help`** - See all available commands and capabilities
