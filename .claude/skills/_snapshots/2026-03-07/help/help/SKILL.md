---
name: help
description: Interactive workspace discovery - learn what tools, workflows, agents, and hooks are available
triggers: ["help", "what can you do", "show capabilities", "how do I"]
allowed-tools: [AskUserQuestion, Bash, Read, Glob, Grep]
priority: high
---

# /help - Workspace Discovery

Guide users through the capabilities of this workspace setup.

## Usage

```
/help                    # Interactive guided discovery
/help workflows          # Workflow orchestration skills
/help agents             # Specialist agents catalog
/help tools              # CLI tools (tldr, prove, recall)
/help hooks              # Active hooks and what they do
/help advanced           # MCP, frontmatter, customization
/help <name>             # Deep dive on specific skill/agent
```

## Behavior Based on Arguments

### No Arguments: Interactive Discovery

Use AskUserQuestion to guide the user:

```
question: "What are you trying to do?"
header: "Goal"
options:
  - label: "Explore/understand a codebase"
    description: "Find patterns, architecture, conventions"
  - label: "Fix a bug"
    description: "Investigate, diagnose, implement fix"
  - label: "Build a feature"
    description: "Plan, implement, test new functionality"
  - label: "Prove something mathematically"
    description: "Formal verification with Lean 4"
```

Based on response, show relevant tools:

| Goal | Show |
|------|------|
| Explore codebase | scout agent, tldr CLI, /explore workflow |
| Fix a bug | /fix workflow, sleuth agent, debug-agent |
| Build feature | /build workflow, architect agent, kraken agent |
| Prove math | /prove skill, lean4 skill, Godel-Prover |
| Research docs | oracle agent, nia-docs, perplexity |
| Configure workspace | hooks, rules, settings, frontmatter |

### /help workflows

Display workflow meta-skills:

```markdown
## Workflow Skills

Orchestrate multi-agent pipelines for complex tasks.

| Workflow | Purpose | Agents Used |
|----------|---------|-------------|
| /fix | Bug investigation → diagnosis → implementation | sleuth → kraken → arbiter |
| /build | Feature planning → implementation → testing | architect → kraken → arbiter |
| /debug | Deep investigation of issues | debug-agent, sleuth |
| /tdd | Test-driven development cycle | arbiter → kraken → arbiter |
| /refactor | Code transformation with safety | phoenix → kraken → judge |
| /review | Code review and feedback | critic, judge |
| /security | Vulnerability analysis | aegis |
| /explore | Codebase discovery | scout |
| /test | Test execution and validation | arbiter, atlas |
| /release | Version bumps, changelog | herald |
| /migrate | Framework/infrastructure changes | pioneer, phoenix |

**Usage**: Just describe your goal. Claude routes to the right workflow.
```

### /help agents

Display agent catalog:

```markdown
## Specialist Agents

Spawn via Task tool with subagent_type.

### Exploration & Research
| Agent | Purpose | Model |
|-------|---------|-------|
| scout | Codebase exploration, pattern finding | sonnet |
| oracle | External research (web, docs, APIs) | sonnet |
| pathfinder | External repository analysis | sonnet |

### Planning & Architecture
| Agent | Purpose | Model |
|-------|---------|-------|
| architect | Feature planning, design docs | sonnet |
| plan-agent | Create implementation plans | sonnet |
| phoenix | Refactoring & migration planning | sonnet |

### Implementation
| Agent | Purpose | Model |
|-------|---------|-------|
| kraken | TDD implementation, refactoring | sonnet |
| spark | Quick fixes, lightweight changes | haiku |

### Review & Validation
| Agent | Purpose | Model |
|-------|---------|-------|
| arbiter | Test execution, validation | sonnet |
| critic | Code review | sonnet |
| judge | Refactoring review | sonnet |

### Investigation
| Agent | Purpose | Model |
|-------|---------|-------|
| sleuth | Bug investigation, root cause | sonnet |
| debug-agent | Issue investigation with logs | sonnet |
| profiler | Performance, race conditions | sonnet |

### Documentation & Handoff
| Agent | Purpose | Model |
|-------|---------|-------|
| scribe | Documentation, session summaries | sonnet |
| chronicler | Session analysis, learning extraction | sonnet |
```

### /help tools

Display CLI tools and capabilities:

```markdown
## Built-in Tools

### TLDR Code Analysis
Token-efficient code exploration (95% savings vs reading raw files).

```bash
tldr tree src/              # File tree
tldr structure src/ --lang python  # Code structure (codemaps)
tldr search "pattern" src/  # Search files
tldr cfg file.py func       # Control flow graph
tldr dfg file.py func       # Data flow graph
tldr impact func src/       # Reverse call graph (who calls this?)
tldr dead src/              # Find dead code
tldr arch src/              # Detect architectural layers
```

### /prove - Formal Verification
Machine-verified proofs without learning Lean syntax.

```
/prove every group homomorphism preserves identity
/prove continuous functions on compact sets are uniformly continuous
```

Requires: LM Studio running Godel-Prover model locally.

### Memory System
Store and recall learnings across sessions.

```bash
# Recall past learnings
(cd opc && uv run python scripts/core/recall_learnings.py --query "hook patterns")

# Store new learning (via /remember skill)
/remember "Hook X works by..."
```

### Premortem Risk Analysis
Identify failure modes before they occur.

```
/premortem [plan-file]     # Analyze implementation plan for risks
```
```

### /help hooks

Display active hooks:

```markdown
## Active Hooks

Hooks extend Claude's behavior at key lifecycle points.

### Session Lifecycle
| Hook | Event | Purpose |
|------|-------|---------|
| session-register | SessionStart | Register session in coordination DB |
| session-start-recall | SessionStart | Auto-inject relevant learnings |
| session-end-cleanup | SessionEnd | Cleanup temp files |
| session-outcome | SessionEnd | Prompt for session outcome |

### User Prompt Processing
| Hook | Event | Purpose |
|------|-------|---------|
| skill-activation-prompt | UserPromptSubmit | Suggest relevant skills |
| premortem-suggest | UserPromptSubmit | Suggest risk analysis for implementations |

### Tool Interception
| Hook | Event | Purpose |
|------|-------|---------|
| tldr-read-enforcer | PreToolUse:Read | Suggest tldr for large files |
| smart-search-router | PreToolUse:Grep | Route to ast-grep for structural search |
| file-claims | PreToolUse:Edit | Track which sessions edit which files |
| signature-helper | PreToolUse:Edit | Inject function signatures |
| import-validator | PostToolUse:Edit | Validate imports after edits |

### Validation
| Hook | Event | Purpose |
|------|-------|---------|
| typescript-preflight | PreToolUse:Bash | Type-check before running |
| compiler-in-the-loop | Stop | Run Lean compiler for /prove |

### Subagent Coordination
| Hook | Event | Purpose |
|------|-------|---------|
| subagent-start | SubagentStart | Initialize agent context |
| subagent-stop | SubagentStop | Extract learnings from agents |
```

### /help advanced

Display advanced customization:

```markdown
## Advanced: Customization & Extension

### Skill Frontmatter
Skills use YAML frontmatter for metadata and tool restrictions:

```yaml
---
name: my-skill
description: What it does
triggers: ["keyword1", "keyword2"]
allowed-tools: [Bash, Read, Edit]
priority: high
skills: [other-skill]  # Auto-load dependencies
---
```

### Agent Frontmatter
Agents declare their capabilities:

```yaml
---
name: my-agent
description: Specialist for X
model: sonnet|haiku|claude-opus-4-5-20251101
tools: [Read, Grep, Glob, Bash]
---
```

### MCP Servers
External tool integrations:

| Server | Purpose |
|--------|---------|
| ast-grep | Structural code search/refactoring |
| firecrawl | Web scraping |
| github-search | Search GitHub code/issues |
| morph | Fast file editing (10k tokens/sec) |
| nia | Documentation search |
| perplexity | AI-powered web research |

### Rules (.claude/rules/*.md)
Always-on instructions injected into context:

- `claim-verification.md` - Verify before asserting
- `dynamic-recall.md` - How to use memory system
- `tldr-cli.md` - TLDR usage reference

### Creating Custom Skills
```bash
mkdir -p .claude/skills/my-skill
# Create .claude/skills/my-skill/SKILL.md with frontmatter
```

### Creating Custom Agents
```bash
# Create .claude/agents/my-agent.md with frontmatter
```
```

### /help <specific-name>

For specific skill/agent lookup:

1. Search for matching skill: `.claude/skills/<name>/SKILL.md`
2. Search for matching agent: `.claude/agents/<name>.md`
3. Read the file and display:
   - Description
   - Usage examples
   - When to use
   - Related skills/agents

## Dynamic Discovery

To keep help current, dynamically read frontmatter:

```bash
# List all skills with descriptions
for f in .claude/skills/*/SKILL.md; do
  head -10 "$f" | grep -E "^(name|description):"
done

# List all agents
for f in .claude/agents/*.md; do
  head -10 "$f" | grep -E "^(name|description):"
done
```

## Example Interaction

**User**: `/help`

**Claude**:
```
What are you trying to do?

[ ] Explore/understand a codebase
    Find patterns, architecture, conventions

[ ] Fix a bug
    Investigate, diagnose, implement fix

[ ] Build a feature
    Plan, implement, test new functionality

[ ] Prove something mathematically
    Formal verification with Lean 4

[Other: describe your goal]
```

**User selects**: "Fix a bug"

**Claude**:
```
## Bug Fixing Tools

### Quick Path
Just describe the bug. I'll use the /fix workflow automatically.

### Manual Control
- **sleuth** agent: Deep investigation, root cause analysis
- **debug-agent**: Log analysis, state inspection
- **kraken** agent: TDD implementation of fix

### Commands
- `/fix` - Full workflow (investigate → diagnose → implement → test)
- `/debug` - Investigation only

### Tips
- Provide error messages, logs, reproduction steps
- The premortem hook will suggest risk analysis before implementation
```
