# Continuous Claude - Teammate Setup Guide

Get up and running with Continuous Claude in 5 minutes.

## Prerequisites

Install these before starting:

- **Docker Desktop** - Required for PostgreSQL database
- **Node.js 18+** - For CLI and tools
- **Python 3.11+** with `uv` - For memory extraction daemon
- **Claude Code CLI** - The AI assistant runtime

Verify installations:
```bash
docker --version
node --version
python --version
uv --version
```

> **Note**: The setup wizard (`uv run python -m scripts.setup.wizard` from the `opc/` directory) handles Docker setup, database migrations, hook installation, and environment variable configuration automatically. You do not need to run any `npm install` or separate configuration steps.

---

## Quick Start (5 Steps)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd continuous-claude
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env if needed (default values work for most users)
```

**Key variables:**
- `POSTGRES_PORT=5432` - Change if port conflicts
- `DATABASE_URL` - Auto-generated, no changes needed
- `CLAUDE_OPC_DIR` - Points to `opc/` directory

### 3. Start Docker Services

```bash
docker compose up -d
```

Verify database is running:
```bash
docker ps | grep continuous-claude-postgres
```

### 4. Run Setup Wizard

```bash
cd opc
uv run python -m scripts.setup.wizard
```

The wizard handles everything automatically:
- Docker connectivity check
- Database table creation and migrations
- Python dependency installation
- Hook installation to `~/.claude/hooks/`
- Environment variable configuration

### 5. Verify Installation

```bash
# Check Docker is running
docker ps | grep continuous-claude-postgres

# Check hooks are built
ls ~/.claude/hooks/dist/*.mjs | wc -l

# Check CLAUDE.md exists
ls ~/.claude/CLAUDE.md
```

You should see:
- The postgres container listed
- A count of `.mjs` hook files (typically 30+)
- The path to your CLAUDE.md confirmed

---

## Windows-Specific Notes

### Path Handling

Windows uses backslashes (`\`) but the codebase expects forward slashes (`/`) in most places:

- **Environment variables**: Use forward slashes in `.env` paths
  ```bash
  CLAUDE_OPC_DIR=C:/Users/<username>/continuous-claude/opc
  ```
- **Docker paths**: Always use forward slashes
- **Node scripts**: Auto-converts paths (no action needed)

### Docker Desktop

- **Required**: WSL 2 backend (Settings → General → Use WSL 2)
- **Port conflicts**: If 5432 is taken, change `POSTGRES_PORT` in `.env`
- **Startup time**: First `docker compose up` may take 1-2 minutes

### Shell Considerations

**PowerShell** (recommended):
```powershell
cd opc
uv run python -m scripts.setup.wizard
```

**Git Bash**:
```bash
cd opc
uv run python -m scripts.setup.wizard
```

**CMD** (works but limited):
```cmd
cd opc
uv run python -m scripts.setup.wizard
```

---

## Key Features

### Session Tracking

Every Claude instance registers a session on startup:
- **Heartbeat**: Updates every 2 minutes
- **Visibility**: See other active sessions via status command
- **Cleanup**: Auto-expires after 10 minutes of inactivity

### Memory Extraction Daemon

Background process that extracts learnings from conversations:
- **Polling**: Checks for new messages every 30 seconds
- **Extraction**: Uses Claude to identify key insights
- **Storage**: Saves to PostgreSQL with embeddings for semantic search

Start daemon:
```bash
npm run daemon:start
```

Stop daemon:
```bash
npm run daemon:stop
```

Check logs:
```bash
npm run daemon:logs
```

### Session Resurrection (NEW!)

When resuming a session after timeout:
1. Old session marked as ended
2. New session created with same conversation ID
3. New work captured as separate session entry
4. Memory extraction continues seamlessly

**Example flow:**
```
Session A: 10:00-10:15 (timeout)
Resume:    10:30 → Creates Session B
           Same conversation, new tracking
           Memories extracted for both sessions
```

### Cross-Terminal Awareness

When multiple Claude instances run:
- Each sees the others in status output
- File conflict warnings if editing same files
- Shared memory pool via PostgreSQL

### Knowledge Tree

Per-project navigation map that helps Claude understand your codebase:

- **Auto-starts**: Tree daemon launches on session start via hook
- **Live updates**: Watches for file changes and updates tree
- **Project context**: Stores structure, goals, and navigation hints
- **ROADMAP.md**: Tracks current goals and planning decisions

**Files:**
- `{project}/.claude/knowledge-tree.json` - Project structure map
- `{project}/ROADMAP.md` - Current goals and planning history

**Query the tree:**
```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/query_tree.py --project . --describe
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/query_tree.py --project . --goals
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/query_tree.py --project . --structure
```

**Manual refresh** (after major refactors):
```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/knowledge_tree.py --project .
```

---

## Troubleshooting

### Port Conflicts

**Symptom**: `docker compose up` fails with "port already allocated"

**Fix**:
1. Edit `.env` and change `POSTGRES_PORT` (e.g., `5433`)
2. Update `DATABASE_URL` to match:
   ```
   DATABASE_URL=postgresql://claude:claude_dev@localhost:5433/continuous_claude
   ```
3. Restart Docker: `docker compose down && docker compose up -d`

### Database Connection Issues

**Symptom**: "Connection refused" or "could not connect to server"

**Fix**:
```bash
# Check Docker is running
docker ps

# Restart database
docker compose restart postgres

# Verify connection
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c "SELECT 1;"
```

### Daemon Not Starting

**Symptom**: `npm run daemon:start` fails or daemon stops immediately

**Fix**:
```bash
# Check logs for errors
npm run daemon:logs

# Common issues:
# 1. Missing Python dependencies
uv pip install -r opc/requirements.txt

# 2. Database not accessible
# Verify DATABASE_URL in .env matches Docker port

# 3. Environment not loaded
# Make sure .env exists and has correct values
```

### TypeScript Hooks Not Working

**Symptom**: Hooks in `.claude/hooks/` fail to execute

**Fix**:
```bash
# Build TypeScript hooks
cd .claude/hooks
npm install
npm run build

# Verify dist/ folder exists
ls dist/
```

### Memory Recall Returns No Results

**Symptom**: `recall_learnings.py` shows no memories

**Possible causes**:
1. Daemon hasn't run yet (no memories extracted)
2. Database empty (run daemon for a few minutes)
3. Query too specific (try broader terms)

**Verify**:
```bash
# Check if memories exist
docker exec continuous-claude-postgres psql -U claude -d continuous_claude \
  -c "SELECT COUNT(*) FROM archival_memory;"

# Should show > 0 if daemon has extracted learnings
```

---

## Sync Workflow

The repository includes a sync script for bidirectional syncing between your active `~/.claude` directory and the shared `continuous-claude/.claude` repository.

### How It Works

```
┌─────────────────┐     sync-claude.sh     ┌─────────────────┐
│   ~/.claude     │ ────────────────────▶  │ continuous-     │
│   (your setup)  │   converts paths       │ claude/.claude  │
│                 │   to $HOME             │ (repo)          │
└─────────────────┘                        └────────┬────────┘
                                                    │
                                                    ▼ git push
                                           ┌─────────────────┐
                                           │   GitHub Repo   │
                                           │   (team pulls)  │
                                           └─────────────────┘
```

### Syncing Your Improvements to the Repo

After making improvements to hooks/skills in `~/.claude`:

```bash
cd continuous-claude/scripts

# Preview what will sync (dry run)
source ./sync-claude.sh --to-repo --dry-run

# Actually sync files
source ./sync-claude.sh --to-repo

# Commit and push
cd ..
git add .claude/
git commit -m "Sync latest hooks and skills"
git push
```

### Pulling Team Updates to Your Setup

After teammates push updates:

```bash
cd continuous-claude
git pull

# Sync repo changes to your ~/.claude
cd scripts
source ./sync-claude.sh --from-repo

# Rebuild TypeScript hooks
cd ~/.claude/hooks
npm run build
```

### What Gets Synced

**Shareable (synced):**
- `hooks/*.sh`, `hooks/*.py`, `hooks/src/*.ts`, `hooks/dist/*.mjs`
- `rules/*.md`, `agents/*.md`
- `skills/*/`
- `scripts/*`
- `settings.json` (with path conversion)

**Personal (never synced):**
- `CLAUDE.md`, `RULES.md` (your personal configuration)
- `.env`, `.credentials.json` (secrets)
- `cache/`, `node_modules/` (build artifacts)
- `knowledge-tree.json` (project-specific)

### Path Conversion

The sync script automatically converts Windows-specific paths to portable `$HOME` paths:

- **Before (Windows)**: `C:/Users/<username>/.claude/hooks/dist/...`
- **After (portable)**: `$HOME/.claude/hooks/dist/...`

This allows the same `settings.json` to work on Windows, Mac, and Linux.

---

## Next Steps

Once setup is complete:

1. **Run Claude** - Your sessions will auto-register
2. **Start daemon** - Begins memory extraction
3. **Check status** - Verify tracking works
4. **Recall memories** - Test semantic search

```bash
# Example: Start working
cd your-project
claude

# In another terminal: Monitor system
cd continuous-claude
npm run status
npm run daemon:logs
```

For advanced features, see:
- `ARCHITECTURE.md` - System design details
- `opc/README.md` - OPC framework overview
- `.claude/skills/` - Available skills and workflows
