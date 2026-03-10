# Quickstart: 5-Minute Setup

Get Claude Code with persistent memory running in 5 minutes.

## Prerequisites

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) package manager
- Docker (for PostgreSQL)
- Claude Code CLI (Anthropic's official CLI)

## 1. Clone and Install (2 min)

```bash
git clone https://github.com/parcadei/Continuous-Claude-v3.git
cd Continuous-Claude-v3/opc
uv sync
```

## 2. Run Setup Wizard (1 min)

```bash
uv run python scripts/setup/wizard.py
```

The wizard walks you through 12 configuration steps including:
- Database setup (PostgreSQL via Docker)
- Optional API keys (Braintrust, Perplexity, Nia)
- Claude Code integration (31 agents, 137+ skills, 25 hooks)

## 3. Verify Installation (1 min)

```bash
# Check Docker is running
docker ps | grep postgres

# Test learning storage
cd opc && uv run python scripts/core/store_learning.py \
  --session-id "quickstart" \
  --type WORKING_SOLUTION \
  --content "Setup complete" \
  --context "Initial installation" \
  --confidence high

# Test recall
cd opc && uv run python scripts/core/recall_learnings.py --query "setup"
```

## 4. Start Using (1 min)

Claude Code now has:

- **Persistent Memory**: Learnings stored in PostgreSQL with vector search
- **Handoff System**: Transfer context between sessions
- **Skills Library**: 137+ built-in capabilities
- **Sub-agents**: 31 specialized agents for complex tasks

### Natural Language Commands

Just say these phrases to Claude:

| Say This | What Happens |
|----------|--------------|
| "create a handoff" | Saves session state for later |
| "resume from handoff" | Loads previous session context |
| "what worked for X before?" | Recalls past learnings |
| "/workflow" | Goal-based routing |

## Directory Structure

```
~/.claude/
├── agents/           # 31 specialized agents
├── skills/           # 137+ skills
├── hooks/            # 25 lifecycle hooks
├── rules/            # System policies
└── settings.json     # Hook configuration

your-project/
├── thoughts/
│   ├── ledgers/      # Continuity ledgers
│   └── shared/
│       └── handoffs/ # Session handoffs
└── .claude/
    └── cache/        # Local cache
```

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
- Say "what can you do?" to explore capabilities
- Try `/workflow` to see goal-based routing

## Troubleshooting

### "Database connection failed"
```bash
# Check Docker is running
docker ps

# Start the stack
cd docker && docker compose up -d
```

### "No module found"
```bash
cd opc && uv sync
```

### "Hooks not working"
```bash
# Check hooks are built
ls ~/.claude/hooks/dist/*.mjs

# Rebuild if needed
cd ~/.claude/hooks && ./build.sh
```
