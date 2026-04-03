# OPC-Dev Documentation

Extended Claude Code workspace with workflow orchestration, specialist agents, and development automation.

## Quick Start

```
/help                  # Interactive discovery - start here
```

## Documentation Structure

```
docs/
├── README.md          # This file
├── ARCHITECTURE.md    # System architecture and data flow
├── workflows/         # Workflow orchestration
│   └── README.md      # /fix, /build, /tdd, /prove workflows
├── agents/            # Specialist agents
│   └── README.md      # 31 agents by category
├── hooks/             # Hook system
│   └── README.md      # Lifecycle hooks and custom hooks
├── tools/             # CLI tools
│   └── README.md      # tldr, memory, MCP integrations
└── skills/            # Skill documentation
    └── help.md        # /help discovery skill
```

## Quick Links

- [Workflows](workflows/README.md) - Multi-agent pipelines (/fix, /build, /tdd)
- [Agents](agents/README.md) - 31 specialist agents
- [Hooks](hooks/README.md) - Automatic behaviors and custom hooks
- [Tools](tools/README.md) - TLDR CLI, /prove, memory system, MCP
- [Architecture](ARCHITECTURE.md) - System design and data flow

## What's Included

### Workflows

Multi-agent pipelines for complex tasks:

- `/fix` - Bug investigation → diagnosis → implementation
- `/build` - Feature planning → implementation → testing
- `/tdd` - Test-driven development cycle
- `/prove` - Formal math proofs with Lean 4

### Agents (31 specialists)

- **Exploration**: scout, oracle, pathfinder
- **Planning**: architect, plan-agent, phoenix
- **Implementation**: kraken (TDD), spark (quick fixes)
- **Review**: arbiter, critic, judge
- **Investigation**: sleuth, debug-agent, profiler

### Tools

- `tldr` - Token-efficient code analysis (95% savings)
- Memory system - Store/recall learnings across sessions
- Premortem - Risk analysis before implementation

### Hooks (25+ active)

Lifecycle extensions for validation, coordination, and automation.

## Getting Started

1. Run `/help` to discover capabilities interactively
2. Describe your goal - Claude routes to the right workflow
3. Or invoke specific workflows: `/fix`, `/build`, `/prove`

## Requirements

- Claude Code CLI
- Node.js (for hooks)
- Python 3.10+ with uv (for scripts)
- Optional: LM Studio with Godel-Prover (for /prove)
