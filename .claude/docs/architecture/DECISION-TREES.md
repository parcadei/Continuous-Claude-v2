# Decision Trees

## Task Type Detection

```
User Request
    │
    ├── "understand/explore/how does" ──→ RESEARCH
    │
    ├── "build/create/implement/add" ───→ IMPLEMENTATION
    │
    ├── "fix/debug/broken/error/bug" ───→ DEBUGGING
    │
    ├── "refactor/clean/restructure" ───→ REFACTORING
    │
    └── "review/audit/check/verify" ────→ REVIEW
```

---

## Research

```
RESEARCH
    │
    ├── Internal codebase only?
    │   └── YES → scout
    │
    ├── External docs/APIs/libraries?
    │   └── YES → oracle
    │
    ├── GitHub repos/issues/PRs?
    │   └── YES → pathfinder
    │
    ├── Multiple sources needed?
    │   └── YES → Parallel: scout + oracle
    │
    ├── Symbol navigation (go-to-def, find-refs)?
    │   └── YES → Serena MCP (resolves through barrel files, re-exports)
    │   Text pattern search → scout / Grep
    │
    └── Structured platform data (Twitter, Reddit, HN, YouTube)?
        └── YES → opencli first (44 platform adapters)
        General web research → oracle (WebSearch)
```

**Quick Reference:**
| Need | Agent/Tool | Notes |
|------|------------|-------|
| Find code patterns | scout | Uses Grep, Glob, Read |
| Library docs | oracle | Uses WebSearch, WebFetch |
| External repo | pathfinder | Clones and analyzes |
| Symbol navigation | Serena MCP | Go-to-def, find-refs, resolves barrel files |
| Platform data | opencli | Twitter, Reddit, HN, YouTube (44 adapters) |

---

## Implementation

```
IMPLEMENTATION
    │
    ├── Simple fix (<50 lines)?
    │   └── YES → spark
    │
    ├── Need tests first (TDD)?
    │   └── YES → kraken
    │
    ├── Need design/planning?
    │   └── YES → architect → kraken
    │
    ├── Full feature with PRD?
    │   └── YES → /ralph workflow
    │
    └── Multi-step orchestration?
        └── YES → /maestro workflow
```

**Quick Reference:**
| Scope | Agent/Workflow | When |
|-------|----------------|------|
| Trivial | spark | <50 lines, obvious fix |
| Standard | kraken | New feature with tests |
| Complex | architect → kraken | Needs design first |
| Full product | /ralph | PRD → Design → Build |

---

## Debugging

```
DEBUGGING
    │
    ├── Know the file/function?
    │   └── YES → spark (quick fix)
    │
    ├── Need to investigate?
    │   └── YES → debug-agent
    │
    ├── Performance issue?
    │   └── YES → profiler
    │
    ├── Complex multi-file bug?
    │   └── YES → sleuth → spark
    │
    └── Security vulnerability?
        └── YES → aegis
```

**Quick Reference:**
| Symptom | Agent | Notes |
|---------|-------|-------|
| Known location | spark | Direct fix |
| Unknown cause | debug-agent | Investigation |
| Slow/memory | profiler | Performance analysis |
| Complex trace | sleuth | Root cause analysis |

---

## Refactoring

```
REFACTORING
    │
    ├── Single file cleanup?
    │   └── YES → spark
    │
    ├── Architecture change?
    │   └── YES → phoenix → kraken
    │
    ├── Migration/upgrade?
    │   └── YES → phoenix (plan) + surveyor (review)
    │
    └── Strategic refactor?
        └── YES → strategic-refactorer
```

---

## Review

```
REVIEW
    │
    ├── Code review (features)?
    │   └── YES → critic
    │
    ├── Refactoring review?
    │   └── YES → judge
    │
    ├── API/integration review?
    │   └── YES → liaison
    │
    ├── Migration review?
    │   └── YES → surveyor
    │
    └── High-level architecture?
        └── YES → principal-reviewer (Opus)
```

---

## Memory Integration

```
Before ANY task:
    │
    └── Check memory for prior work
        │
        ├── Memory match found?
        │   └── YES → Apply learnings, skip re-research
        │
        └── No match?
            └── Proceed with task → Store learnings after
```

**Commands:**
```bash
# Recall before starting
recall_learnings.py --query "relevant keywords"

# Store after learning something
store_learning.py --type WORKING_SOLUTION --content "what worked"
```

---

## Workflow Selection

| Goal | Workflow | Description |
|------|----------|-------------|
| Explore codebase | `/explore` | scout with depth control |
| Fix a bug | `/fix` | debug → implement → test |
| Build feature | `/build` | plan → implement → review |
| Full product | `/ralph` | PRD → design → architecture |
| Orchestrate many | `/maestro` | Coordinate specialists |
| Security audit | `/security` | aegis + verification |
| Release prep | `/release` | audit → test → changelog |
