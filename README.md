# Continuous Claude

> Give Claude a notebook, memory, specialized assistants, and autonomous development capability — so every conversation builds on the last

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude-Code-orange.svg)](https://claude.ai/code)

**Continuous Claude transforms Claude Code into a persistent, learning development environment.** Build features, fix bugs, analyze data, research topics, or create content — with an AI that remembers your project, delegates to specialist agents, and gets smarter every session. Stop re-explaining context. Stop managing prompts. Describe what you want and let the system orchestrate the work.

---

### Contents

- [**What Is This?**](#what-is-this) — The 30-second explanation
- [**Can I Build Software Without Coding?**](#-can-i-build-software-without-knowing-how-to-code) — Yes, and here's how
- [**What Makes This Fork Special?**](#-what-makes-this-fork-special) — Maestro, Ralph, 120+ skills, persistent memory, and more
- [**Who Is This For?**](#who-is-this-for) — Marketing, sales, ops, product, engineering
- [**Quick Start**](#quick-start) — Install in 5 minutes
- [**What You Get**](#what-you-get) — Skills, agents, hooks, rules, browser automation
- [**Common Use Cases**](#common-use-cases) — 8 real workflows from exploration to autonomous builds
- [**Common Questions**](#common-questions) — API keys, privacy, uninstall, comparisons
- [**For Developers**](#for-developers) — Architecture, memory system, hooks, Ralph internals

---

## What Is This?

Think of Claude Code as having a brilliant assistant who helps you with tasks. The problem? Every time you close the conversation, they forget everything you did together. When you start a new chat, you have to explain your project from scratch.

**Continuous Claude solves this** by giving Claude four superpowers:

1. **📓 A Persistent Notebook** — Saves key decisions, learnings, and context so nothing gets lost when you start a new conversation
2. **🎓 Long-term Memory** — Automatically remembers what worked (and what didn't) across all your sessions, retrievable when relevant
3. **👥 Specialist Assistants** — Delegates complex tasks to focused AI agents (like having a research assistant, debugger, and code reviewer on call)
4. **🤖 Autonomous Development** — Describe a feature, approve a plan, and come back to working code built entirely by AI agents

It's like the difference between emailing someone vs. working with a colleague who remembers your previous conversations and can delegate work to their team.

---

## 🚀 Can I Build Software Without Knowing How to Code?

**Yes. That's the whole point.**

Continuous Claude was built so that **non-technical people can create working software** by describing what they want in plain English. You don't write code — you describe outcomes, and the system figures out how to build it.

### How This Works

1. **You describe what you want:** "Build me a dashboard that shows sales by region"
2. **Maestro orchestrates the work:** Breaks your request into tasks and assigns them to specialist agents. Or Ralph handles it fully autonomously — describe your feature, approve the plan, walk away.
3. **Agents do the technical work:** Research agent finds best practices, architect agent designs the solution, builder agent writes the code, tester agent verifies it works
4. **You review and refine:** See the results, give feedback in plain English, iterate until it's right

**You're the director. The agents are your technical team.**

### What You Can Build (Examples)

| What You Describe | What Gets Built |
|-------------------|-----------------|
| "A form that collects customer feedback and emails me summaries" | Working web form with email integration |
| "A tool that analyzes our spreadsheet and finds anomalies" | Data analysis script with visualizations |
| "A simple app to track our team's project status" | Project management dashboard |
| "Automate our weekly report from these data sources" | Scheduled automation with formatted output |
| "Build me a complete contact form with validation" | PRD generated, tasks delegated to agents, tested, committed — autonomously |

The system handles the technical complexity. You focus on what you want it to do.

---

## ⭐ What Makes This Fork Special?

This fork includes significant improvements over the original Continuous Claude, developed through real-world use:

> **Why Continuous Claude?**
>
> - **Stop Repeating Yourself** — Context persists across sessions. Claude recalls past work automatically. Decisions and learnings accumulate like compound interest.
> - **Work Faster** — Delegate to specialized agents. Get structured workflows instead of back-and-forth prompting. Set-and-forget autonomous builds with Ralph.
> - **Stay Organized** — Automatic session summaries and handoffs. Track progress on multi-day projects. Resume exactly where you left off.

<details>
<summary><strong>Maestro: The Orchestrator</strong> — Coordinates specialist agents like a project manager</summary>

**The Problem:** Complex tasks require coordinating multiple specialists — researcher, planner, builder, tester, reviewer. Managing this manually is tedious and error-prone.

**Our Solution:** Maestro acts as a project manager for AI agents. When you describe a complex task:

1. **Discovery Interview** — Maestro asks clarifying questions to understand exactly what you need
2. **Task Breakdown** — Splits your request into logical phases (research → plan → build → test)
3. **Agent Assignment** — Assigns the right specialist to each phase (oracle for research, architect for planning, kraken for building)
4. **Progress Tracking** — Keeps you informed as each phase completes
5. **Quality Synthesis** — Combines outputs into coherent deliverables

**Plain English Example:**
```
You: "Build me a customer feedback system"

Maestro: "Let me understand what you need..."
  → Asks: Web or mobile? What fields? Where should responses go?

Maestro: "Here's my plan..."
  → Phase 1: Research best practices (oracle agent)
  → Phase 2: Design the solution (architect agent)
  → Phase 3: Build it (kraken agent)
  → Phase 4: Test it works (arbiter agent)

You: "Approved, go ahead"

Maestro: [Executes each phase, reports progress, delivers working system]
```

</details>

<details>
<summary><strong>Ralph: Autonomous Development Mode</strong> — Describe a feature, approve a plan, come back to working code</summary>

**The Problem:** Even with Maestro, you're still in the loop for every decision. Sometimes you just want to describe a feature, approve the plan, and come back to working code.

**Our Solution:** Ralph is Maestro's autonomous mode — pure delegation. Ralph never writes a single line of code. Instead, it:

1. **Gathers Context** — Checks memory for similar past work, loads project structure
2. **Generates a PRD** — Creates a product requirements document from your description
3. **Breaks Into Tasks** — Splits the PRD into atomic, delegatable subtasks
4. **Delegates to Agents** — Spawns kraken (builder), arbiter (tester), scout (researcher) — in parallel when possible
5. **Verifies Everything** — Runs tests, type checks, and linting after each agent completes

**Key Capabilities:**
- **Retry escalation** — If an agent fails, Ralph retries with more context, then escalates to a different agent
- **Crash recovery** — If a session dies mid-build, Ralph resumes from the last checkpoint
- **Parallel execution** — Independent tasks run simultaneously across multiple agents
- **Bounded iterations** — 10/30/50 iteration limits prevent runaway builds

**Plain English Example:**
```
You: "Build a contact form with email validation"

Ralph: "Let me understand what you need..."
  → Asks: Fields? Validation rules? Where should submissions go?

Ralph: "Here's my plan: 6 tasks across 3 phases"
  → Phase 1: Form component + validation logic (kraken, parallel)
  → Phase 2: API endpoint + email integration (kraken)
  → Phase 3: Tests + review (arbiter + critic)

You: "Go ahead"

[Walk away. Come back to: working form, passing tests, clean commit]
```

</details>

<details>
<summary><strong>120+ Skills</strong> — Pre-built workflows triggered by describing what you want</summary>

Skills are pre-built workflows you trigger by describing what you want:

| Skill | What It Does | How You Trigger It |
|-------|--------------|-------------------|
| `/build` | Creates complete features from descriptions | "Build a login page" |
| `/fix` | Investigates and repairs broken things | "This button doesn't work" |
| `/research` | Deep-dives into topics with sources | "Research competitor pricing" |
| `/review` | Gets multiple perspectives on work | "Review this document" |
| `/ralph` | Autonomous feature development | "Build this feature while I'm away" |
| `/premortem` | Identifies what could go wrong | "What risks does this plan have?" |

</details>

<details>
<summary><strong>Persistent Memory System</strong> — Context persists across sessions via learning memory and document intelligence</summary>

**The Problem:** Every Claude conversation starts fresh. You waste time re-explaining your project, preferences, and past decisions.

**Our Solution:** Two complementary systems work together:

**1. Learning Memory (PostgreSQL + Embeddings)**
- **What worked** — Successful approaches get remembered and reused
- **What failed** — Mistakes get flagged so you don't repeat them
- **Your preferences** — How you like things done
- **Project context** — What you're building and why

**2. Document Intelligence ([PageIndex](https://github.com/VectifyAI/PageIndex))**

We integrated PageIndex — a reasoning-based retrieval system that achieved 98.7% accuracy on financial document benchmarks:

- **No chunking** — Understands documents as structured wholes, not fragments
- **No vector similarity** — Uses LLM reasoning to navigate, like a human expert would
- **Works with complex documents** — PDFs, financial reports, legal contracts, technical specs
- **Traceable results** — Shows exactly which page and section answers came from

**How it's different:** Traditional RAG chops documents into pieces and matches by similarity. PageIndex builds a table-of-contents-like tree and reasons through it — the way you'd actually read a 200-page report.

**In Practice:** Start a new session, and Claude already knows your project, your preferences, what you tried last time, AND can intelligently navigate your reference documents.

</details>

<details>
<summary><strong>95% Token Efficiency (TLDR System)</strong> — Analyzes code structure instead of reading every line</summary>

**The Problem:** Claude normally reads entire files to understand code, burning through your token budget quickly.

**Our Solution:** The TLDR system analyzes code structure instead of reading every line — like scanning a book's table of contents instead of reading every page.

**The Benefit:** Same understanding, 95% fewer tokens. Longer conversations, more complex projects, lower costs.

</details>

<details>
<summary><strong>Browser Automation</strong> — Two systems for controlling web browsers via natural language</summary>

**The Problem:** Testing web apps, filling forms, and scraping data requires manual browser interaction or complex scripting.

**Our Solution:** Two complementary browser automation systems:

| System | Interface | Best For |
|--------|-----------|----------|
| **agent-browser** (`ab` CLI) | PowerShell/Bash commands | Headless testing, CI/CD, scripting, network mocking |
| **claude-in-chrome** (MCP) | Visual browser control | Live debugging, GIF recording, visual verification |

Both use ref-based element selection — Claude sees a page's interactive elements and interacts with them by reference, like a human pointing at buttons.

**Plain English Example:**
```
You: "Test the login flow on our staging site"

Claude: Opens browser → takes snapshot → fills email and password →
        clicks Sign In → verifies dashboard loads → reports results

No Selenium scripts. No Playwright config. Just describe what to test.
```

</details>

<details>
<summary><strong>Session Dashboard</strong> — Real-time monitoring of all 7 subsystems from a single browser tab</summary>

**The Problem:** With 7 subsystems running (memory, knowledge tree, PageIndex, roadmap, handoffs, Ralph, Braintrust), you have no visibility into what's healthy, degraded, or offline without manually querying each one.

**Our Solution:** A real-time dashboard that monitors all 7 pillars from a single browser tab.

| What You See | Details |
|--------------|---------|
| **Pillar cards** | Status (healthy/degraded/offline), item counts, last activity for each pillar |
| **Detail panels** | Deep-dive into any pillar: browse learnings, view roadmap goals, inspect Ralph tasks |
| **Activity feed** | Real-time timeline of status changes and events across all pillars |
| **Active sessions** | See all running Claude Code terminals with file claims and agent summaries |
| **System health** | Full diagnostic report across all subsystems in one click |

```bash
# Quick start (development)
cd opc/scripts && uv run python -m dashboard.main       # Backend on :3434
cd opc/scripts/dashboard/frontend && npm run dev          # Frontend with hot reload
```

Keyboard shortcuts (`m`emory, `k`nowledge, `r`oadmap, etc.) let you jump to any pillar instantly. WebSocket delivers updates in real time without polling.

See the [Dashboard README](opc/scripts/dashboard/README.md) for full API reference, architecture, and development guide.

</details>

<details>
<summary><strong>Frontend Design Pipeline</strong> — Visual design, component libraries, and production-grade UI</summary>

Build production-quality interfaces from concept to code:

- **Paper.design MCP** — 24 tools for visual UI design directly on canvas (create artboards, write HTML, screenshot, iterate)
- **ui-ux-pro-max skill** — 50 design styles, 200+ patterns for layout, typography, color, and interaction
- **frontend-design skill** — Production-grade frontend code generation with anti-AI-slop guardrails
- **3-tier component search** — shadcn/ui (primitives) → shadcnspace (premium blocks) → Kibo UI (composites like kanban, gantt, editor)
- **95 auto-routed skills** — `skill-activation-prompt` hook matches your intent to the right skill automatically

```
"Design a dashboard for tracking sales metrics"
→ Paper canvas mockup → component selection → production React/Next.js code
```

</details>

---

## Who Is This For?

| Role | What You Can Do | Key Features |
|------|----------------|--------------|
| **Marketing & Content** | Research competitors, analyze feedback trends, create campaign briefs | Oracle agent for research, persistent brand voice, cross-session campaign tracking |
| **Sales** | Prepare meeting briefs, track prospect context, build proposals | Memory recalls past conversations, competitive intelligence persists across sessions |
| **Operations & Finance** | Analyze spending patterns, generate reports, create process docs | Persistent templates, recall data sources, multi-session report building |
| **Product / Project** | Describe features in plain English, get working software back | Ralph autonomous PRD workflow, Maestro orchestration, task tracking |
| **Engineering** | Build features, fix bugs, refactor safely, understand codebases | `/build`, `/fix`, `/refactor`, structural code analysis, impact analysis |

---

## Quick Start

### Prerequisites

You need these installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop) — stores your session history and learnings (like a filing cabinet for Claude's memory)
- [Node.js 18+](https://nodejs.org/) — runs background helpers (you won't interact with it directly)
- [Python 3.11+](https://www.python.org/downloads/) with [uv](https://github.com/astral-sh/uv) — runs the setup wizard and memory system
- [Claude Code CLI](https://docs.anthropic.com/claude/docs/claude-code) — the main app you already use (if you're using Claude in terminal, you have this)

### Install

```bash
# Clone the repository
git clone https://github.com/parcadei/continuous-claude.git
cd continuous-claude/opc

# Run the setup wizard
uv run python -m scripts.setup.wizard
```

**Time:** 5 minutes if prerequisites installed, 15-20 minutes for fresh setup with Docker.

The wizard walks you through 12 steps:

1. ✅ Backs up your existing Claude configuration
2. ✅ Checks that prerequisites are installed
3. ✅ Sets up the database and API keys (optional)
4. ✅ Starts Docker containers for PostgreSQL
5. ✅ Installs 31 specialized agents
6. ✅ Installs 120+ skill workflows
7. ✅ Installs 120 lifecycle hooks
8. ✅ Installs code analysis tools (95% efficiency boost)
9. ✅ Installs math capabilities (optional)
10. ✅ Configures diagnostics and linting
11. ✅ Sets up search tools
12. ✅ Tests that everything works

### First Session

```bash
# Start Claude Code
claude

# Try a workflow
> /workflow

? What's your goal?
  ○ Research - Understand codebase/docs
  ○ Plan - Design implementation approach
  ○ Build - Implement features
  ○ Fix - Investigate and resolve issues
```

That's it. You're now using Continuous Claude.

---

## What You Get

### Skills (120+)

**What they are:** Pre-built workflows you trigger by describing what you want

**How you use them:**
- Natural language: "Fix this bug"
- Direct command: `/fix bug "description"`
- Workflow: `/workflow` asks what you want to do, routes you

**Do I need to code?** No. Skills work via natural language.

<details>
<summary>See full skill categories and examples</summary>

| What You Say | What Happens |
|--------------|--------------|
| "Fix the login bug" | `/fix` workflow → investigate → plan → implement → test → commit |
| "Build a user dashboard" | `/build` workflow → clarify → design → validate → implement |
| "What could go wrong with this plan?" | `/premortem` → TIGERS (clear threats) + ELEPHANTS (unspoken concerns) |
| "Research authentication patterns" | `oracle` agent → searches web, docs, examples |
| "Find all calls to this function" | `tldr impact` → structural analysis, not text search |
| "Build this while I'm away" | `/ralph` → autonomous PRD → tasks → agents → verify → commit |
| "Done for today" | `create_handoff` → saves state for next session |

**Key workflows:**

- **Research:** oracle (web search), scout (codebase exploration), nia-docs (library documentation)
- **Planning:** premortem (risk analysis), discovery-interview (clarify vague ideas)
- **Building:** /build (greenfield or brownfield), /tdd (test-first), /refactor (safe transformation)
- **Fixing:** /fix (bugs), /security (vulnerabilities), /review (code review)
- **Continuity:** create_handoff, resume_handoff, continuity_ledger

**Examples:**
- `create_handoff` — Save your session state before ending
- `premortem` — Risk analysis (TIGERS & ELEPHANTS)
- `tldr-code` — Analyze code structure (95% token savings)
- `perplexity-search` — AI-powered web search
- `qlty-check` — Run 70+ linters and auto-fix issues

</details>

### Agents (31)

**What they are:** Specialized AI assistants Claude delegates work to

**How you use them:**
- Automatic: Workflows spawn them (you don't manage)
- Manual: `/agent scout "find authentication code"`

**Why they help:** Preserve context (agent does research, returns summary), parallel work (spawn multiple agents at once), specialization (each agent has a focused role and detailed prompt).

**Do I need to code?** No. Agents work on your behalf.

<details>
<summary>See full agent roster (31 agents across 8 categories)</summary>

**Implementation (4)**
- **kraken** — Test-driven implementation with strict TDD workflow
- **spark** — Lightweight fixes and quick tweaks
- **architect** — Feature planning with API integration
- **phoenix** — Refactoring and framework migrations

**Testing (3)**
- **arbiter** — Unit and integration test validation
- **atlas** — End-to-end and acceptance testing
- **validate-agent** — Validate plans against best practices

**Code Review (8)**
- **critic**, **judge**, **liaison** — Different review perspectives
- **review-agent**, **plan-reviewer** — Structured reviews
- **react-perf-reviewer**, **ui-compliance-reviewer**, **surveyor** — Specialized reviews

**Debugging (3)**
- **debug-agent** — Issue investigation via logs/code
- **sleuth** — Root cause investigation
- **profiler** — Performance profiling and race conditions

**Research (5)**
- **scout** — Codebase exploration (90% accurate vs. 60% for generic search)
- **oracle** — External research (web, docs, GitHub)
- **pathfinder** — External repository analysis
- **session-analyst**, **braintrust-analyst** — Session analysis

**Orchestration (3)**
- **maestro** — Multi-step task orchestration
- **plan-agent** — Lightweight planning with research
- **onboard** — Codebase onboarding

**Documentation (3)**
- **scribe** — Documentation generation
- **herald** — Release management
- **memory-extractor** — Learning extraction

**Security + Specialized (2)**
- **aegis** — Security vulnerability analysis
- **agentica-agent** — Build Python agents using Agentica SDK

</details>

### Hooks (120)

**What they are:** Background helpers that run automatically at specific moments

**How you use them:** You don't — they're automatic. They activate on events like "session start" or "before file read."

**Do I need to code?** No. Hooks work invisibly.

<details>
<summary>See hook lifecycle phases and examples</summary>

**When you start a session:**
- Loads your continuity ledger (where you left off)
- Registers your session in the database
- Recalls relevant memories from past work

**Before Claude reads a file:**
- Checks if a summary already exists (95% token savings)
- Routes searches to structural tools instead of text grep
- Claims the file (prevents conflicts if multiple terminals open)

**After you edit a file:**
- Runs type checking and linting automatically
- Updates code indexes
- Tracks which files changed (for testing later)

**During autonomous builds (Ralph):**
- Enforces Ralph delegation rules — blocks direct code edits
- Monitors agent progress, retries, and iteration limits
- Injects progress context and retry reminders

**Before running out of tokens:**
- Automatically creates a handoff document
- Saves state so you can resume later
- Re-indexes modified code

**After your session ends:**
- Detects stale heartbeat (you closed Claude)
- Spawns background analysis to extract learnings
- Stores memories for future recall

**Key hooks:**
- **tldr-read-enforcer** — Returns code summaries instead of full files (token savings)
- **smart-search-router** — Routes text searches to structural analysis tools
- **post-edit-diagnostics** — Runs type checking after you edit code
- **memory-awareness** — Surfaces relevant learnings from past sessions

</details>

### Rules (24)

**What they are:** Guidelines that keep Claude consistent and safe

- **Evidence-based claims** — No "this is faster" without benchmarks
- **Read before write** — Always check existing code before changes
- **Minimal comments** — Code should be self-explanatory
- **Security-first** — Never commit secrets, always validate input
- **Git safety** — Confirm before destructive operations
- **Delegation** — Use agents for complex tasks to preserve main context

**Do I need to code?** No. Rules are policy, not code.

### Browser Automation

**What it is:** Two systems for controlling web browsers — `agent-browser` (headless CLI) and `claude-in-chrome` (visual MCP)

**How you use it:** "Test the login flow" or "Fill out this form" or "Take a screenshot of the dashboard"

**What it enables:** E2E testing, form filling, web scraping, visual verification — all via natural language

**Do I need to code?** No. Describe what you want to test or interact with.

---

<details>
<summary><h2>How It Works (Simple Explanation)</h2></summary>

### The Problem

Claude has a "context window" — think of it like short-term memory. When conversations get too long, Claude has to "forget" earlier parts to make room for new information. This means:

- You lose important decisions and context
- Each new session starts from zero
- Complex projects require constant re-explaining
- Reading entire files burns through your token budget

### The Solution

Continuous Claude adds four layers:

**1. Persistent State (Ledgers & Handoffs)**

Like a notebook that follows you between sessions:

```
Session 1: "Build user authentication"
→ Creates handoff: Goals, decisions, next steps

Session 2 (next day): "Resume work"
→ Loads handoff: Exactly where you left off
```

**2. Learning Memory (Automatic)**

A background system that watches for patterns:

```
Session ends → Database detects inactive session
            → Spawns background Claude to analyze
            → Extracts learnings: "What worked, what failed, why"
            → Stores with semantic embeddings

Next session → Relevant learnings surface automatically
```

**3. Specialized Agents (Delegation)**

Instead of one generalist, you get a team:

```
You: "Fix the authentication bug and add tests"

Claude: Spawns 3 agents in sequence:
  → sleuth (investigates bug)
  → kraken (implements fix)
  → arbiter (writes tests)

You: Get structured results without micromanaging
```

**4. Smart Code Analysis (95% Token Savings)**

Instead of reading entire files, Claude sees structure:

```
Traditional: Read 23,000 tokens (entire file)
Continuous Claude: Read 1,200 tokens (functions, calls, logic flows)

Result: Same understanding, 95% fewer tokens
```

</details>

---

## Common Use Cases

<details>
<summary><strong>"I Need to Understand This Codebase"</strong></summary>

```
> /explore deep --focus "authentication"

Spawns scout agent:
  1. Analyzes file structure
  2. Traces authentication flow
  3. Identifies entry points
  4. Maps dependencies
  5. Creates summary document

Result: Structured understanding in ~5 minutes
```

</details>

<details>
<summary><strong>"I Have a Vague Idea, Need Help Clarifying"</strong></summary>

```
> "I want to improve our user onboarding, not sure how"

Triggers /discovery-interview:
  → Asks clarifying questions
  → Identifies constraints
  → Proposes options with trade-offs
  → Creates implementation plan

Result: Spec document ready for /build
```

</details>

<details>
<summary><strong>"This Is Broken, Help Me Fix It"</strong></summary>

```
> /fix bug "users can't upload files over 10MB"

Workflow:
  1. sleuth investigates → finds timeout + size limit
  2. premortem analyzes → risk: breaking existing uploads
  3. kraken implements → chunked upload + progress bar
  4. arbiter tests → integration test for large files
  5. commit creates → descriptive commit message

Result: Fixed, tested, documented
```

</details>

<details>
<summary><strong>"Build This Feature for Me"</strong></summary>

```
> /build greenfield "user dashboard with activity feed"

Workflow:
  1. discovery clarifies → real-time or polling? filters?
  2. plan designs → API schema, UI components, database
  3. validate checks → performance, security, edge cases
  4. kraken implements → TDD: tests first, then code
  5. commit + PR → ready for review

Result: Complete feature with tests and documentation
```

</details>

<details>
<summary><strong>"What Could Go Wrong?"</strong></summary>

```
> /premortem thoughts/shared/plans/user-dashboard.md

Output:
  🐯 TIGERS (Clear Threats):
    [HIGH] Real-time updates could spike database load
    [MEDIUM] No pagination → memory issues with long feeds
    [LOW] Time zones not handled in activity timestamps

  🐘 ELEPHANTS (Unspoken Concerns):
    - Team hasn't worked with WebSockets before
    - No monitoring for real-time connection failures
    - Unclear how to test real-time features

Action: Blocks until you accept risks or mitigate
```

</details>

<details>
<summary><strong>"Research This Topic for Me"</strong></summary>

```
> "Research how other SaaS apps handle webhook retries"

Spawns oracle agent:
  → Searches web for patterns
  → Finds library documentation
  → Analyzes GitHub examples
  → Synthesizes recommendations

Result: Structured findings with sources
```

</details>

<details>
<summary><strong>"Build This Feature While I'm Away"</strong></summary>

```
> /ralph "Add a contact form with email validation and spam filtering"

Ralph:
  1. Interviews you (3 questions) → generates PRD
  2. Breaks PRD into 6 tasks → presents for approval
  3. You: "Go ahead" → walk away

Ralph (autonomously):
  → Spawns kraken: form component + validation (parallel)
  → Spawns kraken: API endpoint + email integration
  → Spawns arbiter: unit tests + integration tests
  → Spawns critic: code review
  → Verifies: all tests pass, types check, lint clean

You return: Working feature, passing tests, clean commit ready for review
```

</details>

<details>
<summary><strong>"Test This Web App End-to-End"</strong></summary>

```
> "Run E2E tests on our staging login flow"

Workflow:
  1. Preflight → verifies dev server running, DB connected, auth configured
  2. Browser pass → opens staging site, fills login form, verifies dashboard loads
  3. Assertions → checks element visibility, text content, URL redirects
  4. Report → screenshots of each step, pass/fail summary

Result: Visual verification without writing Selenium or Playwright scripts
```

</details>

---

## Common Questions

<details>
<summary><strong>Do I Need to Code?</strong></summary>

**Short answer:** No.

**Longer answer:**
- **Most features** work through natural language (research, planning, analysis)
- **Code analysis** works on codebases you provide — you don't write the analysis code
- **Workflows** trigger via commands like `/fix` or `/build`
- **Advanced features** (hooks, custom agents) require coding, but are optional

If you can describe what you want, Continuous Claude can do it.

</details>

<details>
<summary><strong>What If Something Breaks?</strong></summary>

**Common issues:**

| Problem | Solution |
|---------|----------|
| "Docker not running" | Start Docker Desktop |
| "Database connection failed" | Run `docker ps` to check containers, restart with wizard |
| "Skill not found" | Re-run wizard step 6 to reinstall skills |
| "Agent failed to spawn" | Check `~/.claude/agents/` exists, verify settings.json |

**Troubleshooting:**

```bash
# Check Docker containers
docker ps

# Restart database
cd continuous-claude/opc
docker-compose down
docker-compose up -d

# Reinstall components
uv run python -m scripts.setup.wizard
# Select the step you want to re-run
```

**Get help:**
- [GitHub Issues](https://github.com/parcadei/continuous-claude/issues) — file a bug report
- [Discussions](https://github.com/parcadei/continuous-claude/discussions) — ask questions
- [Documentation](https://github.com/parcadei/continuous-claude/tree/main/docs) — detailed guides
- [Architecture Docs](.claude/docs/architecture/INDEX.md) — navigable system diagrams

</details>

<details>
<summary><strong>How Do I Uninstall?</strong></summary>

```bash
cd continuous-claude/opc
uv run python -m scripts.setup.wizard --uninstall
```

This will:
1. Archive your current setup (timestamped, nothing deleted)
2. Restore your pre-installation backup
3. Preserve your data:
   - Command history
   - API keys
   - MCP servers
   - Project configurations
4. Remove Continuous Claude components (hooks, skills, agents, rules)

Your Claude Code setup returns to exactly how it was before installation.

</details>

<details>
<summary><strong>Do I Need API Keys?</strong></summary>

**Optional API keys** (features work without them):

| Service | What It Does | Cost |
|---------|--------------|------|
| [Perplexity](https://www.perplexity.ai/settings/api) | AI-powered web search | $5/mo or pay-per-use |
| [Nia](https://trynia.ai) | Library documentation search | Free tier available |
| [Braintrust](https://braintrust.dev) | Session tracing and debugging | Free tier available |

**Core features work without any keys:**
- Continuity system (ledgers, handoffs, memory)
- Code analysis (95% token savings)
- All workflows (/build, /fix, /tdd, /refactor)
- Local agents (scout, kraken, sleuth)
- Git operations

API keys unlock optional research features, not core functionality.

</details>

<details>
<summary><strong>What About Privacy?</strong></summary>

**Data stored locally:**
- Continuity ledgers (Markdown files in `thoughts/`)
- Handoffs (YAML files in `thoughts/shared/`)
- Code analysis cache (`.tldr/` directory)
- PostgreSQL database (Docker container on your machine)

**Data sent to Anthropic:**
- Your prompts and Claude's responses (standard Claude usage)
- Code you ask Claude to analyze (only what you share)

**Data sent to third-party APIs (if you use them):**
- Perplexity: Search queries only
- Nia: Library names for documentation lookup
- Braintrust: Session traces for debugging (opt-in)

**No data leaves your machine** except what you explicitly share with Claude or optional third-party APIs.

</details>

<details>
<summary><strong>Can I Use This with Existing Projects?</strong></summary>

**Yes.** After installation:

```bash
# Navigate to your project
cd ~/my-project

# Start Claude
claude

# Run onboarding
> /onboard
```

The onboard agent will:
1. Analyze your codebase structure
2. Detect languages and frameworks
3. Create an initial continuity ledger
4. Build a semantic index for code search

Then you can use all features (`/build`, `/fix`, etc.) with full context about your project.

</details>

<details>
<summary><strong>How Does It Compare to X?</strong></summary>

**vs. GitHub Copilot:**
- Copilot autocompletes as you type (editor-focused)
- Continuous Claude orchestrates workflows (task-focused)
- Use both together — they solve different problems

**vs. Cursor:**
- Cursor is an IDE with AI built in
- Continuous Claude extends Claude Code (works in any terminal)
- Similar multi-agent concepts, different execution

**vs. Vanilla Claude Code:**
- Claude Code gives you Claude in the terminal
- Continuous Claude adds memory, agents, and workflows
- Like upgrading from a chat interface to a development environment

</details>

---

## For Developers

<details>
<summary>Click to expand technical architecture, code analysis, and advanced features</summary>

**For Technical Users:**
- **95% Efficiency Boost** — Analyzes code structure instead of reading every line. Smart search finds relevant code instantly. Pattern detection finds similar code across your project.
- **Developer Workflows** — Test-driven development with automatic test generation. Risk analysis before implementation. Automated code review with multiple specialized reviewers. Cross-file refactoring with impact analysis. Browser automation for E2E testing.
- **Advanced Capabilities** — Mathematical proof verification (for those who need formal guarantees). Symbolic computation for equations and constraints. Machine-verified proofs without learning specialized syntax.

<details>
<summary><strong>Architecture Overview</strong></summary>

```mermaid
graph TB
    UP[User Prompt] --> HL[Hook Layer<br/>120 hooks]
    HL --> CC[Claude Core]
    CC --> TE[Tool Execution]
    CC --> SK[Skills - 120+]
    CC --> AG[Agents - 31]
    CC --> MS[Memory System]
    SK --> AG
    AG --> TE
    TE --> TLDR[TLDR Code Analysis<br/>95% token savings]
    MS --> CL[Continuity<br/>Ledgers + Handoffs]
    MS --> CO[Coordination<br/>Cross-terminal]
    CL --> RM[ROADMAP<br/>Auto-sync]
    SD[Session Dashboard<br/>7-pillar monitoring] --> MS
    SD --> AG
    SD --> CL
```

> **Detailed architecture diagrams:** [System Overview](docs/architecture/diagrams/01-system-overview.md) | [Hook Lifecycle](docs/architecture/diagrams/02-hook-lifecycle.md) | [Memory System](docs/architecture/diagrams/03-memory-system.md) | [Agent Orchestration](docs/architecture/diagrams/04-agent-orchestration.md) | [Continuity Flow](docs/architecture/diagrams/05-continuity-flow.md) | [TLDR Stack](docs/architecture/diagrams/06-tldr-analysis-stack.md)

</details>

<details>
<summary><strong>5-Layer Code Analysis Stack</strong></summary>

**Problem:** Reading a 1,000-line file costs ~23,000 tokens and provides mostly irrelevant details.

**Solution:** Extract 5 layers of structural information totaling ~1,200 tokens.

| Layer | Name | What It Provides | Tokens |
|-------|------|------------------|--------|
| **L1** | AST | Functions, classes, signatures | ~500 |
| **L2** | Call Graph | Who calls what (cross-file) | +440 |
| **L3** | CFG | Control flow, complexity | +110 |
| **L4** | DFG | Data flow, variable tracking | +130 |
| **L5** | PDG | Program slicing, impact analysis | +150 |

**Total: ~1,200 tokens vs. 23,000 raw = 95% savings**

**CLI Examples:**

```bash
# See what exists without reading files
tldr tree src/ --ext .py

# Find code structurally, not textually
tldr search "process_data" src/

# Get context for implementation
tldr context process_data --project src/ --depth 2

# Understand control flow
tldr cfg src/processor.py process_data

# Impact analysis before refactoring
tldr impact process_data src/ --depth 3

# Find dead code for cleanup
tldr dead src/ --entry main cli

# Detect architectural layers
tldr arch src/
```

#### Semantic Index

Beyond structural analysis, TLDR builds a semantic index:

- **Natural language queries** — "where is error handling?" instead of grepping
- **Auto-rebuild** — Hooks track file changes, index rebuilds when dirty
- **Selective indexing** — `.tldrignore` controls what gets indexed

```bash
# Natural language search
tldr daemon semantic "find authentication logic"
```

The index uses all 5 layers plus 10 lines of surrounding code — not just docstrings.

</details>

<details>
<summary><strong>Memory System Architecture</strong></summary>

**How it works:**

```
Session ends → Database detects stale heartbeat (>5 min)
            → Daemon spawns headless Claude (Sonnet)
            → Analyzes thinking blocks from session
            → Extracts learnings to archival_memory
            → Next session recalls via semantic search
```

**Key insight:** Thinking blocks contain real reasoning (not just actions). The daemon extracts this automatically.

**Database schema (4 tables):**

| Table | Purpose |
|-------|---------|
| `sessions` | Cross-terminal awareness (heartbeat tracking) |
| `file_claims` | Cross-terminal file locking |
| `archival_memory` | Long-term learnings with BGE embeddings (1024-dim) |
| `handoffs` | Session handoffs with embeddings |

**Recall examples:**

```bash
# Hybrid search (text + vector, RRF ranking)
cd continuous-claude/opc
uv run python scripts/core/recall_learnings.py --query "authentication patterns"

# Store a learning explicitly
cd continuous-claude/opc
uv run python scripts/core/store_learning.py \
    --session-id "my-session" \
    --type WORKING_SOLUTION \
    --content "What I learned" \
    --context "Relevant context" \
    --tags "auth,jwt,security" \
    --confidence high
```

</details>

<details>
<summary><strong>Continuity System</strong></summary>

**Ledgers (within-session):** Track state during work

Location: `thoughts/ledgers/CONTINUITY_<topic>.md`

```markdown
# Session: feature-x
Updated: 2026-01-23

## Goal
Implement feature X with proper error handling

## Completed
- [x] Designed API schema
- [x] Implemented core logic

## In Progress
- [ ] Add error handling

## Blockers
- Need clarification on retry policy
```

**Handoffs (between-session):** Transfer knowledge between sessions

Location: `thoughts/shared/handoffs/<session>/current.yaml`

```yaml
---
date: 2026-01-23T15:26:01+0000
session_name: feature-x
status: complete
---

# Handoff: Feature X Implementation

## Tasks
| Task | Status |
|------|--------|
| Design API | Completed |
| Implement core | Completed |
| Error handling | Pending |

## Next Steps
1. Add retry logic to API calls
2. Write integration tests
```

</details>

<details>
<summary><strong>Workflow Examples</strong></summary>

**Test-Driven Development:**

```
> /tdd "implement retry logic with exponential backoff"

Chain:
  1. plan-agent → designs test cases
  2. arbiter → writes failing tests (🔴)
  3. kraken → implements until tests pass (🟢)
  4. arbiter → verifies all tests pass (✓)
  5. commit → descriptive commit message
```

**Safe Refactoring:**

```
> /refactor "extract auth module"

Chain:
  1. phoenix → analyzes dependencies
  2. plan-reviewer → validates approach
  3. kraken → transforms code (TDD)
  4. judge → reviews changes
  5. arbiter → runs full test suite
```

**Formal Verification:**

```
> /prove "every group homomorphism preserves identity"

5-Phase Workflow:
  📚 RESEARCH → Find Mathlib lemmas, proof strategies
  🏗️ DESIGN → Create skeleton with sorry placeholders
  🧪 TEST → Search for counterexamples
  ⚙️ IMPLEMENT → Fill sorries with compiler feedback
  ✅ VERIFY → Audit axioms, confirm zero sorries
```

</details>

<details>
<summary><strong>Hook Integration Points</strong></summary>

| Event | Key Hooks | What They Do |
|-------|-----------|--------------|
| **SessionStart** | session-start-continuity, session-register | Load ledger, register in DB |
| **PreToolUse** | tldr-read-enforcer, smart-search-router | Token savings, route searches |
| **PostToolUse** | post-edit-diagnostics, handoff-index | Type check, update indexes |
| **PreCompact** | pre-compact-continuity | Auto-save before context clears |
| **UserPromptSubmit** | skill-activation-prompt, memory-awareness | Route to skills (95 auto-matched), recall learnings |
| **SubagentStop** | subagent-stop-continuity | Save agent state |
| **SessionEnd** | session-end-cleanup, session-outcome | Extract learnings, cleanup |
| **Ralph hooks** | ralph-delegation-enforcer, ralph-task-monitor, ralph-retry-reminder, ralph-progress-inject | Enforce delegation, track progress, bounded iterations |

</details>

<details>
<summary><strong>Ralph Architecture</strong></summary>

Ralph is the autonomous development orchestrator — Maestro's "set and forget" mode.

**State Management:**
```
.ralph/
├── state.json              # Unified state (version 2.x) — tasks, status, retries
├── IMPLEMENTATION_PLAN.md  # Human-readable task checklist
├── agent-output.json       # Last agent's structured results
└── orchestration.json      # Iteration counts, timing, escalation state
```

**8 Ralph Hooks:**

| Hook | Event | Purpose |
|------|-------|---------|
| ralph-delegation-enforcer | PreToolUse | Blocks Edit/Write/Bash during Ralph mode |
| ralph-monitor | PostToolUse | Tracks agent spawns and completions |
| ralph-task-monitor | PostToolUse | Updates task status in state.json |
| ralph-watchdog | PreToolUse | Enforces iteration limits (10/30/50) |
| ralph-retry-reminder | UserPromptSubmit | Injects retry context for failed tasks |
| ralph-progress-inject | UserPromptSubmit | Shows current progress in context |
| ralph-template-inject | UserPromptSubmit | Injects PRD templates |
| session-start-recovery | SessionStart | Resumes interrupted Ralph sessions |

**Retry Escalation Pattern:**
```
Attempt 1: Same agent with original instruction
Attempt 2: Same agent with error context
Attempt 3: Escalate to spark (quick fix specialist)
Attempt 4: Escalate to debug-agent (root cause analysis)
Attempt 5: BLOCKED → requires user intervention
```

**Supporting Scripts:**

| Script | Purpose |
|--------|---------|
| `ralph-state-v2.py` | Unified state management (CRUD for tasks) |
| `ralph-checkpoint.py` | Commit/restore progress checkpoints |
| `ralph-scheduler.py` | Task ordering: ready-tasks, parallel-batch, critical-path |
| `ralph-skill-query.py` | Routes tasks to optimal agents |

</details>

<details>
<summary><strong>Browser Automation Architecture</strong></summary>

Two complementary browser automation systems:

| Feature | agent-browser (`ab` CLI) | claude-in-chrome (MCP) |
|---------|--------------------------|------------------------|
| Interface | PowerShell/Bash commands | MCP tool calls |
| Rendering | Headless (default) | Always visible |
| Selection | `@ref` from snapshots | `ref` from read_page |
| Best for | CI/CD, scripting, parallel sessions | Visual debugging, GIF recording |
| Network mocking | Yes (route interception) | No |
| State persistence | Yes (state_save/load) | No |

**E2E Testing Methodology (4 phases):**
1. **Preflight** — Verify dev server, DB, auth env vars, seed data
2. **Browser Pass** — Navigate, interact, capture state via refs
3. **Assertions** — isvisible, gettext, ischecked, count, URL verification
4. **Report** — Screenshots, pass/fail summary, error details

**Key Patterns:**
- Always re-snapshot after navigation or DOM changes
- Wait 1-2s after React/SPA route changes before reading
- Use refs from snapshots (`@e1`), never stale references
- Preflight checks catch 80% of test failures before they happen

</details>

<details>
<summary><strong>Environment Variables</strong></summary>

| Variable | Purpose | Required |
|----------|---------|----------|
| `CONTINUOUS_CLAUDE_DB_URL` | PostgreSQL connection | Yes (wizard sets) |
| `CLAUDE_OPC_DIR` | Path to opc/ directory | Yes (wizard sets) |
| `CLAUDE_PROJECT_DIR` | Current project root | Yes (hook sets) |
| `BRAINTRUST_API_KEY` | Session tracing | No |
| `PERPLEXITY_API_KEY` | Web search | No |
| `NIA_API_KEY` | Documentation search | No |

</details>

<details>
<summary><strong>Directory Structure</strong></summary>

```
continuous-claude/
├── .claude/
│   ├── agents/           # 31 specialized AI agents
│   ├── hooks/            # 120 lifecycle hooks
│   │   ├── src/          # TypeScript source
│   │   └── dist/         # Compiled JavaScript
│   ├── skills/           # 120+ modular capabilities
│   ├── rules/            # 24 system policies
│   ├── docs/architecture/ # Navigable architecture docs
│   ├── scripts/          # Python utilities
│   └── settings.json     # Hook configuration
├── .ralph/               # Ralph autonomous build state
│   ├── state.json        # Unified task/status tracking
│   └── orchestration.json # Iteration counts and timing
├── opc/
│   ├── packages/
│   │   └── tldr-code/    # 5-layer code analysis
│   ├── scripts/
│   │   ├── setup/        # Wizard, Docker, integration
│   │   ├── core/         # recall_learnings, store_learning
│   │   └── dashboard/    # Session Dashboard (FastAPI + React)
│   │       ├── routers/  # 10 API route modules
│   │       ├── services/ # 9 pillar health services
│   │       ├── websocket/# Real-time WebSocket manager
│   │       ├── frontend/ # React + shadcn/ui + Vite
│   │       └── static/   # Production build output
│   └── docker/
│       └── init-schema.sql  # 4-table PostgreSQL schema
├── thoughts/
│   ├── ledgers/          # Continuity ledgers (CONTINUITY_*.md)
│   └── shared/
│       ├── handoffs/     # Session handoffs (*.yaml)
│       └── plans/        # Implementation plans
└── docs/                 # Documentation
```

</details>

<details>
<summary><strong>Remote Database Setup</strong></summary>

For production or team setups, use a remote PostgreSQL instance:

```bash
# 1. Enable pgvector extension (requires superuser)
psql -h hostname -U user -d continuous_claude
CREATE EXTENSION IF NOT EXISTS vector;

# 2. Apply schema
psql -h hostname -U user -d continuous_claude -f docker/init-schema.sql

# 3. Configure connection
# In ~/.claude/settings.json:
{
  "env": {
    "CONTINUOUS_CLAUDE_DB_URL": "postgresql://user:password@hostname:5432/continuous_claude"
  }
}
```

**Managed PostgreSQL tips:**
- **AWS RDS:** Add `vector` to `shared_preload_libraries` in Parameter Group
- **Supabase:** Enable via Database Extensions page
- **Azure:** Use Extensions pane to enable pgvector

</details>

<details>
<summary><strong>Installation Modes</strong></summary>

| Mode | How It Works | Best For |
|------|--------------|----------|
| **Copy** (default) | Copies files to `~/.claude/` | End users, stable setup |
| **Symlink** | Links `~/.claude/` to repo | Contributors, development |

**Switching to symlink mode:**

```bash
# Backup current config
mkdir -p ~/.claude/backups/$(date +%Y%m%d)
cp -r ~/.claude/{rules,skills,hooks,agents} ~/.claude/backups/$(date +%Y%m%d)/

# Remove copies
rm -rf ~/.claude/{rules,skills,hooks,agents}

# Create symlinks
REPO="$HOME/continuous-claude"
ln -s "$REPO/.claude/rules" ~/.claude/rules
ln -s "$REPO/.claude/skills" ~/.claude/skills
ln -s "$REPO/.claude/hooks" ~/.claude/hooks
ln -s "$REPO/.claude/agents" ~/.claude/agents

# Verify
ls -la ~/.claude | grep -E "rules|skills|hooks|agents"
```

</details>

<details>
<summary><strong>Contributing</strong></summary>

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Adding skills
- Creating agents
- Developing hooks
- Extending TLDR
- Testing workflows

</details>

</details>

---

## What's Next?

After installation, try these in order:

1. **First workflow:** `/workflow` → Pick "Research" → "Understand codebase"
2. **Save state:** "Done for today" → Creates handoff automatically
3. **Resume:** Next session, "Resume work" → Loads handoff
4. **Build something:** `/build greenfield "describe feature"`
5. **Fix something:** `/fix bug "describe problem"`
6. **Risk analysis:** `/premortem` → See what could go wrong before implementing
7. **Go autonomous:** `/ralph "describe a feature"` → Set it and forget it

The system learns from each session. The more you use it, the smarter it gets.

---

## Acknowledgments

### Patterns & Architecture
- **[@numman-ali](https://github.com/numman-ali)** - Continuity ledger pattern
- **[Anthropic](https://anthropic.com)** - Claude Code
- **[obra/superpowers](https://github.com/obra/superpowers)** - Agent orchestration patterns
- **[EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)** - Compound engineering workflow

### Tools & Services
- **[uv](https://github.com/astral-sh/uv)** - Python packaging
- **[tree-sitter](https://tree-sitter.github.io/)** - Code parsing
- **[Braintrust](https://braintrust.dev)** - LLM tracing and evaluation
- **[qlty](https://github.com/qltysh/qlty)** - Universal code quality (70+ linters)
- **[ast-grep](https://github.com/ast-grep/ast-grep)** - AST-based code search
- **[Nia](https://trynia.ai)** - Library documentation search
- **[Morph](https://www.morphllm.com)** - Fast code search
- **[Firecrawl](https://www.firecrawl.dev)** - Web scraping API

---

## License

[MIT](LICENSE) - Use freely, contribute back.

---

**Continuous Claude**: Not just a coding assistant — a persistent, learning, autonomous multi-agent development environment that gets smarter with every session.
