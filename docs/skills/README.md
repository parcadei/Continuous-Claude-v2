# Skills Breakdown

**Total Skills: 111+**

This document organizes all Claude Code skills into a clear hierarchy: Meta-Skills (workflows), Key Skills (high-value tools), and Domain Skills (specialized capabilities).

---

## 1. Meta-Skills (Workflow Orchestrators)

These are the "entry point" skills that orchestrate other skills and agents. They chain multiple steps together into complete workflows.

### Primary Workflows

| Meta-Skill  | Chain                                                          | Use When                                  |
| ----------- | -------------------------------------------------------------- | ----------------------------------------- |
| `/workflow` | Router → appropriate workflow                                  | Don't know where to start                 |
| `/build`    | discovery → plan → validate → implement → commit               | Building features (greenfield/brownfield) |
| `/fix`      | sleuth → premortem → kraken → arbiter → commit                 | Fixing bugs or issues                     |
| `/tdd`      | plan → arbiter (tests) → kraken (implement) → arbiter (verify) | Test-first development                    |
| `/refactor` | phoenix (analyze) → plan → kraken → reviewer → arbiter         | Safe code transformation                  |
| `/review`   | parallel specialized reviews → synthesis                       | Code review before merge                  |
| `/test`     | unit ∥ integration → E2E                                       | Run test suites                           |
| `/security` | vulnerability scan → verification                              | Security audits                           |
| `/release`  | audit → E2E → review → changelog                               | Ship releases                             |
| `/migrate`  | research → analyze → plan → implement                          | Framework/language migrations             |
| `/explore`  | scout (quick/deep/architecture)                                | Understand codebase structure             |

### Build Modes (Sub-workflows)

The `/build` meta-skill has specialized modes:

| Build Mode   | Chain                                                                                     | Use Case                              |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| `greenfield` | discovery-interview → plan-agent → validate-agent → implement_plan → commit → describe_pr | New feature from scratch              |
| `brownfield` | onboard → research-codebase → plan-agent → validate-agent → implement_plan                | Feature in existing codebase          |
| `tdd`        | plan-agent → test-driven-development → implement_plan                                     | Test-first implementation             |
| `refactor`   | tldr-code (impact) → plan-agent → test-driven-development → implement_plan                | Safe refactoring with impact analysis |

### Fix Scopes (Sub-workflows)

The `/fix` meta-skill has specialized scopes:

| Fix Scope     | Chain                                                                    | Description              |
| ------------- | ------------------------------------------------------------------------ | ------------------------ |
| `bug`         | debug → implement_task → test-driven-development → commit                | General bug fix workflow |
| `hook`        | debug-hooks → hook-developer → implement_task → test hook                | Hook-specific debugging  |
| `deps`        | dependency-preflight → oracle → plan-agent → implement_plan → qlty-check | Dependency issues        |
| `pr-comments` | github-search → research-codebase → plan-agent → implement_plan → commit | Address PR feedback      |

---

## 2. Key Skills (High-Value Tools)

Skills that provide exceptional value across multiple workflows.

### Planning & Risk Management

| Skill                   | Purpose                                    | When to Use                                       |
| ----------------------- | ------------------------------------------ | ------------------------------------------------- |
| **discovery-interview** | Transform vague ideas into detailed specs  | Requirements unclear, starting new project        |
| **plan-agent**          | Create phased implementation plans         | Before building anything significant              |
| **premortem**           | TIGERS & ELEPHANTS risk analysis           | Before implementing plans (catches 80% of issues) |
| **validate-agent**      | Validate tech choices and plan feasibility | After planning, before implementing               |

**Why premortem is critical:**

- Use `/premortem deep <plan>` before implementing any significant feature
- Identifies HIGH severity risks that would block implementation
- User can accept, mitigate, or research solutions before wasting time
- Built into `/build` and `/fix` workflows automatically

### Context & Memory Management

| Skill                 | Purpose                                  | When to Use                                 |
| --------------------- | ---------------------------------------- | ------------------------------------------- |
| **create_handoff**    | Capture session state for transfer       | Before ending sessions, at phase boundaries |
| **resume_handoff**    | Resume from handoff with context         | Starting new session, continuing work       |
| **continuity_ledger** | Track state within long session          | Before `/clear`, at major milestones        |
| **recall**            | Query semantic memory from past sessions | Starting work, solving similar problems     |
| **remember**          | Store learnings for future sessions      | After solving problems, making decisions    |

### Git Operations

| Skill           | Purpose                                                | When to Use                         |
| --------------- | ------------------------------------------------------ | ----------------------------------- |
| **commit**      | Git commits with user approval (no Claude attribution) | After implementation phases         |
| **describe_pr** | Generate comprehensive PR descriptions                 | Creating/updating pull requests     |
| **git-commits** | Git best practices and patterns                        | Reference for commit message format |

### Research & External Knowledge

| Skill                 | Purpose                             | When to Use                                 |
| --------------------- | ----------------------------------- | ------------------------------------------- |
| **perplexity-search** | AI-powered web search               | Current events, best practices, API docs    |
| **nia-docs**          | Library documentation search        | Looking up library/framework docs           |
| **github-search**     | Search GitHub code/issues/PRs       | Finding examples, checking issues           |
| **firecrawl-scrape**  | Web scraping for structured content | Extract info from websites                  |
| **research-external** | Orchestrated external research      | Complex research requiring multiple sources |
| **loogle-search**     | Lean4 proof search                  | Lean4/math library searches                 |

### Code Analysis (Token-Efficient)

| Skill             | Purpose                                    | 95% Token Savings | When to Use                              |
| ----------------- | ------------------------------------------ | ----------------- | ---------------------------------------- |
| **tldr-code**     | Structure, call graph, CFG, DFG, slicing   | Yes               | Before reading files, understanding flow |
| **tldr-overview** | Quick codebase overview                    | Yes               | Fast orientation in new codebase         |
| **tldr-deep**     | Comprehensive analysis with context        | Yes               | Deep understanding needed                |
| **tldr-router**   | Auto-route to appropriate tldr command     | Yes               | Let system pick best analysis            |
| **ast-grep-find** | Structural code search (semantic patterns) | Yes               | Finding code by structure, not text      |
| **morph-search**  | Fast text search (20x faster than grep)    | Moderate          | Quick text searches across codebase      |
| **morph-apply**   | Fast file editing (10,500 tokens/sec)      | Yes               | Batch edits, refactoring                 |

**tldr-code Commands Reference:**

```bash
tldr tree [path]                    # File tree
tldr structure [path]               # Code structure (codemaps)
tldr search <pattern> [path]        # Search files
tldr cfg <file> <function>          # Control flow graph
tldr dfg <file> <function>          # Data flow graph
tldr slice <file> <func> <line>     # Program slice (what affects line N)
tldr calls [path]                   # Cross-file call graph
tldr impact <func> [path]           # Who calls this? (reverse call graph)
tldr dead [path]                    # Find unreachable/dead code
tldr arch [path]                    # Detect architectural layers
tldr imports <file>                 # Parse imports from a file
tldr importers <module> [path]      # Find who imports a module
tldr diagnostics <file|path>        # Type check + lint (pyright/ruff)
tldr change-impact [files...]       # Find tests affected by changes
```

### Quality & Testing

| Skill                       | Purpose                                  | When to Use                             |
| --------------------------- | ---------------------------------------- | --------------------------------------- |
| **qlty-check**              | Code quality via 70+ linters             | Before commits, during development      |
| **qlty-during-development** | Integrate qlty checks into workflow      | Active development                      |
| **braintrust-analyze**      | Session analysis and replay              | Understanding agent behavior, debugging |
| **braintrust-tracing**      | Trace agent execution with observability | Debugging agent workflows               |
| **test**                    | Orchestrate test suite execution         | Running tests (unit/integration/E2E)    |
| **completion-check**        | Verify work is actually complete         | Before marking tasks done               |

---

## 3. Domain Skills

Specialized capabilities organized by domain.

### Agent Infrastructure

| Skill                       | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| **sub-agents**              | Spawning and coordinating sub-agents        |
| **parallel-agents**         | Running agents in parallel                  |
| **agent-orchestration**     | Orchestrating complex agent workflows       |
| **agent-context-isolation** | Managing agent context boundaries           |
| **agentica-spawn**          | Agentica-specific agent spawning            |
| **agentica-server**         | Agentica server integration                 |
| **agentica-infrastructure** | Agentica system architecture                |
| **agentica-prompts**        | Agentica prompt engineering                 |
| **agentica-sdk**            | Using the Agentica SDK                      |
| **agentica-claude-proxy**   | Claude API proxy configuration              |
| **no-polling-agents**       | Event-driven agent patterns (avoid polling) |
| **background-agent-pings**  | Keep-alive patterns for long-running agents |

### Hook Development

| Skill                  | Purpose                               |
| ---------------------- | ------------------------------------- |
| **hook-developer**     | Developing Claude Code hooks          |
| **debug-hooks**        | Debugging hook issues                 |
| **hooks**              | Hook system architecture and patterns |
| **braintrust-tracing** | Tracing hook execution                |

### Math & Formal Methods

**Math Stack (17 skills):**

| Skill               | Purpose                             |
| ------------------- | ----------------------------------- |
| **math-unified**    | Unified interface to all math tools |
| **math-router**     | Route to appropriate math tool      |
| **math-help**       | Math capabilities reference         |
| **pint-compute**    | Unit-aware calculations (physics)   |
| **shapely-compute** | Geometric computations              |
| **prove**           | Mathematical proofs                 |
| **formalize**       | Formalize math problems             |
| **loogle-search**   | Search Lean4 library                |

**Topic-Specific Math:**

- Discrete math, algebra, calculus, statistics
- Linear algebra, differential equations
- Category theory, topology
- (See `.claude/skills/math-*` for full list)

### Search & Navigation

| Skill                      | Purpose                                 |
| -------------------------- | --------------------------------------- |
| **search-router**          | Route to optimal search tool            |
| **search-hierarchy**       | Understanding search tool hierarchy     |
| **search-tools**           | Reference for available search tools    |
| **observe-before-editing** | Search/understand before modifying code |

### Environment & Setup

| Skill                    | Purpose                              |
| ------------------------ | ------------------------------------ |
| **environment-triage**   | Diagnose environment issues          |
| **dependency-preflight** | Check dependencies before work       |
| **onboard**              | First-time project setup and caching |
| **tour**                 | Guided tour of system capabilities   |
| **help**                 | Help system and documentation        |

### Skill Development

| Skill                 | Purpose                         |
| --------------------- | ------------------------------- |
| **skill-developer**   | Creating new skills             |
| **skill-development** | Skill development patterns      |
| **skill-upgrader**    | Upgrading skills to new formats |
| **complete-skill**    | Marking skills as complete      |
| **deep-skill**        | Creating comprehensive skills   |

### Architecture Patterns

| Skill                         | Purpose                                |
| ----------------------------- | -------------------------------------- |
| **opc-architecture**          | OPC system architecture overview       |
| **router-first-architecture** | Router-first design pattern            |
| **modular-code**              | Writing modular, composable code       |
| **graceful-degradation**      | Handling failures gracefully           |
| **idempotent-redundancy**     | Making operations safe to retry        |
| **explicit-identity**         | Clear identity/role management         |
| **index-at-creation**         | Index data structures at creation time |
| **async-repl-protocol**       | Async REPL patterns for agents         |
| **wiring**                    | System component wiring patterns       |

### Reference & Documentation

| Skill                   | Purpose                          |
| ----------------------- | -------------------------------- |
| **cli-reference**       | CLI command reference            |
| **reference-sdk**       | SDK reference documentation      |
| **system_overview**     | System architecture overview     |
| **settings-reference**  | Configuration reference          |
| **model-configuration** | LLM model configuration          |
| **llm-tuning-patterns** | Patterns for tuning LLM behavior |

### MCP (Model Context Protocol)

| Skill            | Purpose                           |
| ---------------- | --------------------------------- |
| **mcp-chaining** | Chaining MCP servers              |
| **mcp-scripts**  | MCP server scripts and automation |

### Specialized Workflows

| Skill                        | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| **implement_task**           | Single task implementation                  |
| **implement_plan**           | Full plan implementation                    |
| **create_plan**              | Planning workflows                          |
| **create_plan_micro**        | Micro-planning for small tasks              |
| **create_plan_micro_d**      | Micro-planning (decomposition variant)      |
| **multi-tool-pipeline**      | Multi-step tool pipelines                   |
| **parallel-agent-contracts** | Contracts for parallel agent coordination   |
| **compound-learnings**       | Synthesize learnings from multiple sessions |

### Repository & Codebase

| Skill                     | Purpose                     |
| ------------------------- | --------------------------- |
| **repo-research-analyst** | Analyze repository patterns |
| **research**              | Internal codebase research  |
| **repoprompt**            | Repository-aware prompting  |

### Utility & Debugging

| Skill                | Purpose                      |
| -------------------- | ---------------------------- |
| **debug**            | General debugging workflows  |
| **mot**              | Message of the day / tips    |
| **no-task-output**   | Suppress verbose task output |
| **recall-reasoning** | Recall with reasoning traces |

### GitHub & CI/CD

| Skill              | Purpose                  |
| ------------------ | ------------------------ |
| **github-actions** | GitHub Actions workflows |
| **deploy-api**     | API deployment workflows |

---

## 4. The Thought Process

How to choose the right skill:

```
What do I want to do?

├─ Don't know where to start?
│  └─ /workflow (guided router with questions)
│
├─ Building something?
│  ├─ New from scratch → /build greenfield
│  ├─ In existing code → /build brownfield
│  ├─ Test-first → /build tdd or /tdd
│  └─ Cleaning up code → /refactor
│
├─ Something is broken?
│  ├─ Bug in code → /fix bug
│  ├─ Hook not working → /fix hook
│  ├─ Dependency issue → /fix deps
│  └─ PR feedback → /fix pr-comments
│
├─ Need to understand code?
│  ├─ Quick overview → /explore quick
│  ├─ Deep understanding → /explore deep
│  ├─ Architecture map → /explore architecture
│  └─ Specific analysis → tldr-code commands
│
├─ Planning something?
│  ├─ Vague idea → discovery-interview first
│  ├─ Clear requirements → plan-agent
│  └─ Before implementing → /premortem deep
│
├─ Need to research?
│  ├─ Web/current info → perplexity-search
│  ├─ Library docs → nia-docs
│  ├─ GitHub examples → github-search
│  ├─ Past work → /recall
│  └─ Complex research → research-external (oracle)
│
├─ Code review?
│  └─ /review (parallel specialized reviews)
│
├─ Shipping?
│  └─ /release (full release workflow)
│
├─ Testing?
│  └─ /test (orchestrated test execution)
│
└─ Security audit?
   └─ /security (vulnerability scan)
```

---

## 5. Workflow Chains Visualized

### /build greenfield

```
discovery-interview (clarify requirements)
    ↓
plan-agent (create phased plan)
    ↓
validate-agent (check tech choices)
    ↓
[CHECKPOINT: Review plan]
    ↓
implement_plan (execute phases)
    ↓
[CHECKPOINT: Verify each phase]
    ↓
commit (git commit with approval)
    ↓
describe_pr (generate PR description)
```

### /fix bug

```
sleuth (parallel investigation: logs, db, git, runtime)
    ↓
[CHECKPOINT: Review diagnosis]
    ↓
premortem (quick risk check on proposed fix)
    ↓
[CHECKPOINT: Accept risks or mitigate]
    ↓
kraken (implement fix with TDD)
    ↓
kraken (regression test)
    ↓
[CHECKPOINT: Verify fix works]
    ↓
commit
```

### /tdd

```
plan-agent (design test cases)
    ↓
arbiter (write FAILING tests)
    ↓
[VERIFY: Tests fail for right reason]
    ↓
kraken (implement MINIMAL code to pass)
    ↓
[VERIFY: Tests pass]
    ↓
arbiter (run full test suite)
```

### /review

```
critic (code quality)  ─┐
                        ├─→ review-agent (synthesis)
plan-reviewer (arch)   ─┤      ↓
                        │   [Present findings]
plan-reviewer (impact) ─┘      ↓
                            [Recommend actions]
```

---

## 6. Integration Patterns

### Common Chains

**Research → Plan → Build:**

```
perplexity-search (best practices)
    ↓
plan-agent (design based on research)
    ↓
/build brownfield (implement)
```

**Explore → Plan → Premortem → Build:**

```
/explore deep --output handoff
    ↓
plan-agent (using exploration context)
    ↓
/premortem deep (catch risks early)
    ↓
/build brownfield --from-handoff
```

**Debug → Fix → Test → Review:**

```
debug (investigate issue)
    ↓
/fix bug (implement fix)
    ↓
/test (run test suite)
    ↓
/review (peer review)
```

### Skill Composition

Many meta-skills internally compose other skills:

- **`/build`** uses: `discovery-interview`, `onboard`, `research-codebase`, `plan-agent`, `validate-agent`, `implement_plan`, `commit`, `describe_pr`
- **`/fix`** uses: `debug-hooks`, `dependency-preflight`, `github-search`, `plan-agent`, `implement_plan`, `qlty-check`, `premortem`, `commit`
- **`/tdd`** uses: `plan-agent`, `arbiter` (for tests), `kraken` (for implementation)
- **`/explore`** uses: `tldr-code`, `onboard`, `research-codebase`, `scout`

---

## 7. Tips for Effective Skill Usage

### Start with Meta-Skills

- Don't manually chain skills unless you need custom behavior
- Meta-skills handle checkpoints, error recovery, and handoffs automatically
- Use `/workflow` when unsure - it asks questions to route you correctly

### Use Premortem Before Implementation

- `/premortem deep <plan>` catches 80% of issues before coding starts
- Built into `/build` and `/fix` workflows
- Saves hours of debugging and rework

### Leverage tldr-code for Token Efficiency

- 95% token savings vs reading files directly
- Use `tldr structure` before `tldr search` before `Read`
- `tldr impact` shows who calls a function (essential for refactoring)

### Memory System

- `/recall "<query>"` before starting work on familiar problems
- `/remember` after solving non-trivial problems
- Memory persists across sessions and helps avoid repeating mistakes

### Context Management

- Use `create_handoff` before ending sessions
- Use `resume_handoff` to pick up where you left off
- Use `continuity_ledger` during long sessions before `/clear`

### Git Workflow

- `commit` skill handles user approval and Claude attribution removal
- `describe_pr` generates comprehensive PR descriptions from git diff
- Both skills are checkpointed in meta-workflows

---

## 8. Anti-Patterns to Avoid

**❌ Don't manually read 10+ files**

- Use `tldr structure` or `tldr-code` first
- 95% token savings, better understanding

**❌ Don't skip premortem before implementation**

- Catches risks early when they're cheap to fix
- Built into `/build` and `/fix` - don't disable it

**❌ Don't implement without a plan**

- Even simple features benefit from planning
- Use `plan-agent` or at minimum `discovery-interview`

**❌ Don't use Explore agent for codebase exploration**

- Use `scout` (Sonnet) or `tldr-code` instead
- Explore uses Haiku and produces inaccurate results

**❌ Don't chain skills manually for common workflows**

- Use meta-skills (`/build`, `/fix`, `/tdd`, etc.)
- They handle checkpoints and error recovery

**❌ Don't forget to check memory**

- Run `/recall` before starting familiar work
- Saves time by leveraging past solutions

---

## 9. Skill Development

To create new skills, use:

- **skill-developer**: Interactive skill creation
- **skill-development**: Patterns for skill development
- **skill-upgrader**: Upgrade skills to new formats

New skills should follow:

1. Clear single responsibility
2. Documented inputs/outputs
3. Integration with existing meta-skills
4. Proper error handling and rollback

---

## 10. Quick Reference Card

### Immediate Action Needed

| Situation               | Skill                                      |
| ----------------------- | ------------------------------------------ |
| Unclear requirements    | `discovery-interview`                      |
| Need to understand code | `/explore quick` or `tldr-code`            |
| Bug to fix              | `/fix bug`                                 |
| Feature to build        | `/build brownfield` or `/build greenfield` |
| Test-first development  | `/tdd`                                     |
| Code to review          | `/review`                                  |
| Release to ship         | `/release`                                 |
| Research needed         | `perplexity-search` or `nia-docs`          |

### Planning Phase

| Situation                  | Skill             |
| -------------------------- | ----------------- |
| Create implementation plan | `plan-agent`      |
| Validate plan feasibility  | `validate-agent`  |
| Check for risks            | `/premortem deep` |
| Check past learnings       | `/recall`         |

### Analysis Phase

| Situation                 | Skill                                  |
| ------------------------- | -------------------------------------- |
| Understand code structure | `tldr structure`                       |
| Find function callers     | `tldr impact`                          |
| Trace data flow           | `tldr dfg`                             |
| Find dead code            | `tldr dead`                            |
| Architecture analysis     | `tldr arch` or `/explore architecture` |

### Execution Phase

| Situation           | Skill            |
| ------------------- | ---------------- |
| Implement a task    | `implement_task` |
| Implement full plan | `implement_plan` |
| Run tests           | `/test`          |
| Check code quality  | `qlty-check`     |
| Create commit       | `commit`         |

---

## Appendix: Skill Directory Structure

All skills are located in: `.claude/skills/<skill-name>/SKILL.md`

Categories by directory prefix:

- **Workflows**: `build/`, `fix/`, `tdd/`, `review/`, `refactor/`, `explore/`, `test/`, `security/`, `release/`, `migrate/`
- **Planning**: `discovery-interview/`, `plan-agent/`, `create_plan*/`, `premortem/`
- **Memory**: `create_handoff/`, `resume_handoff/`, `continuity_ledger/`, `recall/`, `remember/`
- **Analysis**: `tldr-*/`, `ast-grep-find/`, `morph-*/`
- **Research**: `perplexity-search/`, `nia-docs/`, `github-search/`, `firecrawl-scrape/`, `loogle-search/`
- **Quality**: `qlty-check/`, `braintrust-*/`, `validate-agent/`
- **Math**: `math-*/`, `pint-compute/`, `shapely-compute/`, `prove/`, `formalize/`
- **Infrastructure**: `agentica-*/`, `sub-agents/`, `parallel-agents/`, `hooks/`, `wiring/`

---

**Document Version**: 2026-01-09
**Total Skills Documented**: 111+
**Skills Path**: `.claude/skills/`
