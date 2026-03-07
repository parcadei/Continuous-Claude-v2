---
name: mot
description: System health check (MOT) for skills, agents, hooks, memory, ROADMAP, knowledge tree, and Braintrust
allowed-tools: [Read, Bash, Glob, Grep]
metadata:
  model: sonnet
---

# MOT - System Health Check

Run comprehensive health checks on all Claude Code components.

## Usage

```
/mot              # Full audit (all 8 phases)
/mot skills       # Just skills
/mot agents       # Just agents
/mot hooks        # Just hooks
/mot memory       # Just memory system
/mot state        # Just state management (phases 4,6,7,8)
/mot roadmap      # Just ROADMAP
/mot tree         # Just knowledge tree
/mot braintrust   # Just Braintrust tracing
/mot --fix        # Auto-fix simple issues
/mot --quick      # P0 checks only (fast)
```

## Phases & Pass/Fail Criteria

Full bash scripts for each phase: `references/audit-scripts.md`

### Phase 1: Skills Audit
- Frontmatter (`---`) present in every SKILL.md
- `name:` field matches parent directory name

### Phase 2: Agents Audit
- Every agent has a `name:` field
- `model:` is one of: `opus`, `sonnet`, `haiku`
- No `subagent_type` references pointing to missing agent files

### Phase 3: Hooks Audit
- TypeScript source count matches built bundle count
- All `.sh` wrappers are executable (`chmod +x`)
- Every hook registered in `settings.json` exists on disk

### Phase 4: Memory Audit
- `DATABASE_URL` env var set
- PostgreSQL reachable
- `pgvector` extension installed
- `archival_memory` table exists
- At least 1 learning captured in last 7 days (WARN if 0)
- Unique content ratio >= 90% (WARN if lower — duplicates)
- Spot-check: recall query for "hook development" returns results

### Phase 5: Cross-Reference Audit
- All `subagent_type` values in SKILL.md files resolve to existing agents

### Phase 6: ROADMAP Health
- `ROADMAP.md` exists and is non-empty
- Current Focus section is parseable
- Completed items <= 50 (WARN if more — archive old entries)
- Latest `[x]` entry includes a valid git commit hash

### Phase 7: Knowledge Tree Health
- `.claude/knowledge-tree.json` exists and non-empty
- Not marked `"_stale": true`
- Age <= 24h (WARN if older)
- Schema validation passes

### Phase 8: Braintrust Tracing Health
- If `TRACE_TO_BRAINTRUST=true`: `BRAINTRUST_API_KEY` must also be set
- Session trace file count <= 100 (WARN if more — cleanup needed)
- Hook log error count <= 10

## Auto-Fix (--fix flag)

Automatically remediates:
1. `chmod +x .claude/hooks/*.sh` — shell wrappers executable
2. `cd .claude/hooks && npm run build` — rebuild if TS newer than dist
3. `mkdir -p .claude/cache/agents/{scout,kraken,oracle,spark} .claude/cache/mot` — missing dirs
4. Regenerate knowledge tree if stale or missing
5. `chmod +x .claude/plugins/braintrust-tracing/hooks/*.sh` — Braintrust wrappers

Full auto-fix scripts: `references/audit-scripts.md`

## Output Format

Write full report to `.claude/cache/mot/report-{timestamp}.md`:

```markdown
# MOT Health Report
Generated: {timestamp}

## Summary
| Category   | Pass | Fail | Warn |
|------------|------|------|------|
| Skills     | 204  | 2    | 0    |
| Agents     | 47   | 1    | 3    |
| Hooks      | 58   | 2    | 1    |
| Memory     | 6    | 0    | 1    |
| X-Refs     | 0    | 0    | 2    |
| ROADMAP    | 2    | 0    | 1    |
| Tree       | 3    | 0    | 0    |
| Braintrust | 1    | 0    | 1    |

## Issues Found

### P0 - Critical
- [FAIL] Hook build failed: tldr-context-inject.ts

### P1 - High
- [FAIL] Agent references missing: scot -> scout (typo)

### P2 - Medium
- [WARN] 3 hooks need rebuild (dist older than src)
- [WARN] Knowledge tree is 36h old

### P3 - Low
- [INFO] VOYAGE_API_KEY not set (using local BGE)
- [INFO] Braintrust tracing disabled
```

## Exit Codes

- `0` — All P0/P1 checks pass
- `1` — Any P0/P1 failure
- `2` — Only P2/P3 warnings

## Quick Mode (--quick)

Only run P0 checks:
1. Frontmatter parses
2. Hooks build
3. Shell wrappers executable
4. PostgreSQL reachable
5. ROADMAP.md exists
6. Knowledge tree exists and non-empty
