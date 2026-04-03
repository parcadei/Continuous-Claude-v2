# /help - Workspace Discovery

Interactive discovery system for learning what tools, workflows, agents, and hooks are available in this workspace.

## Quick Start

```
/help                    # Interactive guided discovery
/help workflows          # Workflow orchestration skills
/help agents             # Specialist agents catalog
/help tools              # CLI tools (tldr, prove, recall)
/help hooks              # Active hooks and what they do
/help advanced           # MCP, frontmatter, customization
/help <name>             # Deep dive on specific skill/agent
```

## How It Works

### Interactive Mode (no arguments)

When you run `/help` without arguments, Claude asks what you're trying to accomplish:

- **Explore/understand a codebase** - Routes to scout agent, tldr CLI, /explore workflow
- **Fix a bug** - Routes to /fix workflow, sleuth agent, debug-agent
- **Build a feature** - Routes to /build workflow, architect agent, kraken agent
- **Prove something mathematically** - Routes to /prove skill with Lean 4
- **Research external docs** - Routes to oracle agent, nia-docs, perplexity
- **Configure workspace** - Shows hooks, rules, settings, frontmatter

### Topic Mode (with argument)

Pass a topic to get focused documentation:

| Argument    | Shows                                                            |
| ----------- | ---------------------------------------------------------------- |
| `workflows` | All workflow skills (/fix, /build, /tdd, etc.) with agent chains |
| `agents`    | Full agent catalog organized by purpose                          |
| `tools`     | CLI tools: tldr, /prove, memory system, /premortem               |
| `hooks`     | Active hooks by lifecycle event                                  |
| `advanced`  | Skill/agent frontmatter, MCP servers, rules, customization       |
| `<name>`    | Deep dive on any specific skill or agent                         |

## Examples

### Find the right workflow

```
User: /help
Claude: What are you trying to do?
        [ ] Explore/understand a codebase
        [ ] Fix a bug
        [ ] Build a feature
        [x] Other: "optimize performance"

Claude: For performance optimization, consider:
        - profiler agent: Performance analysis, race conditions
        - tldr arch: Detect architectural bottlenecks
        - /refactor workflow: Safe code transformations
```

### Learn about a specific agent

```
User: /help kraken

Claude: ## kraken - TDD Implementation Agent

        Purpose: Implementation and refactoring using test-driven development
        Model: sonnet
        Tools: Read, Edit, Write, Bash, Grep, Glob

        ### When to Use
        - Implementing features after planning phase
        - Refactoring with test coverage
        - Bug fixes that need regression tests

        ### Workflow
        1. Write failing test
        2. Implement minimal code to pass
        3. Refactor while tests pass
        4. Repeat
```

### Discover available hooks

```
User: /help hooks

Claude: ## Active Hooks

        ### Session Lifecycle
        - session-register: Register session in coordination DB
        - session-start-recall: Auto-inject relevant learnings
        ...

        ### Tool Interception
        - tldr-read-enforcer: Suggest tldr for large files
        - smart-search-router: Route to ast-grep for structural search
        ...
```

## Why This Exists

This workspace has 136+ skills, 31 agents, and 25+ hooks. Without discoverability:

1. **Users miss features** - Don't know /prove exists for math proofs
2. **Suboptimal choices** - Use grep when ast-grep would be better
3. **Onboarding friction** - New users don't know where to start

The `/help` skill solves this by:

- **Guiding by goal** rather than listing all options
- **Progressive disclosure** - overview first, details on demand
- **Dynamic content** - reads frontmatter so it stays current

## Related

- [Workflow Skills](../workflows/README.md) - Multi-agent orchestration
- [Agents](../agents/README.md) - Specialist agent catalog
- [Hooks](../hooks/README.md) - Lifecycle extensions
- [TLDR CLI](../tools/tldr.md) - Code analysis tool
