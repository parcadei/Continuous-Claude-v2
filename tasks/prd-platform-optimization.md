# PRD: Continuous Claude Platform Optimization

## Introduction/Overview

Continuous Claude has grown to 119 skills, 64 hooks, 31 agents, and 397 memory entries across 521 sessions. A comprehensive session analysis revealed systemic friction points: hooks silently break and go unnoticed for weeks, the sync pipeline has known gaps that require manual intervention every commit, memory recall is buried under 98% auto-extracted noise, and critical documentation is fragmented across tribal knowledge rather than centralized.

This PRD defines a platform-wide optimization pass to eliminate recurring friction, harden infrastructure, and build the missing automation layer — turning the analysis findings into concrete, shippable improvements across skills, plugins/tools, agents, and documentation.

## Goals

1. **Eliminate hook breakage cycle** — hooks should never silently break; health is verified every session start
2. **Close sync gaps** — `dist/*.mjs` and Python scripts auto-sync like everything else; drift is detectable in one command
3. **Make memory useful** — reduce noise from 98% to <30%; quality scoring at capture time
4. **Wire orphaned hooks** — 33 built-but-unregistered hooks gain their registrations
5. **Standardize repeated workflows** — hook development, post-ship audit, Windows pre-flight become one-command skills
6. **Document the undocumented** — hook lifecycle, sync gaps, memory guidelines, project registry centralized in CLAUDE.md/rules
7. **Build autonomous agents** — hook lifecycle, post-ship audit, memory curator, drift detection, Windows compat agents for Cycle 2

## User Stories

- **As a developer**, I want hooks to be validated at session start so I never waste 30+ minutes debugging a silently broken hook.
- **As a developer**, I want one command to see what's out of sync between the repo and `~/.claude` so I stop guessing why changes aren't taking effect.
- **As a developer**, I want memory recall to return actionable insights, not periodic extraction heartbeats, so past learnings actually inform current work.
- **As a developer**, I want a hook scaffold command that creates, registers, builds, and tests a new hook in one step so I stop doing it manually every week.
- **As a developer**, I want post-ship audits to be standardized so I don't spend 2-4 sessions manually checking for regressions after every feature.
- **As a developer**, I want Windows-specific gotchas caught before commit, not after hours of debugging.
- **As a developer**, I want autonomous agents to handle lifecycle management, drift detection, and memory curation without manual intervention.

## Functional Requirements

### Cycle 1: Skills (10)

1. **Hook Registration Audit** (`/hook-audit`) — Compare `hooks/src/*.ts` against `settings.json` registrations. Report unregistered hooks. Offer to wire them. Detect stale registrations pointing to missing dist files.
2. **Sync Drift Detector** (`/sync-drift`) — Diff `continuous-claude/.claude/` vs `~/.claude/` across hooks/src, rules, agents, skills, dist. Classify differences as intentional (local-only files like settings.json) vs accidental drift. Report with fix suggestions.
3. **Memory Curator** (`/memory-curate`) — Query all archival_memory entries. Score by: manual vs auto-extracted, uniqueness, tag quality, content length, age. Archive entries scoring below threshold. Report: kept/archived/deduplicated counts.
4. **Post-Ship Audit** (`/post-ship-audit`) — Standardized checklist: run test suite, verify all registered hooks have valid dist, check sync state, scan for stale references to archived components, verify ROADMAP reflects completion. Output pass/fail report.
5. **Hook Scaffold** (`/hook-scaffold`) — Input: hook name, event type (PreToolUse/PostToolUse/etc), tool pattern. Output: creates TS source file from template, adds registration to settings.json, runs build, verifies dist file exists.
6. **Project Registry** (`/project-registry`) — Structured registry of all projects with: path, port, URL, stack, dev command, current status. Queryable: "what port does NorthStar use?" Stored as `.claude/project-registry.json` with a skill to query/update.
7. **Stale Reference Scanner** (`/stale-scan`) — Grep CLAUDE.md, rules, skills for references to archived agents (Sentinel, Warden), deleted hooks, removed scripts. Report with line numbers and suggested fixes.
8. **Windows Pre-flight** (`/win-preflight`) — Scan modified files for 6 known Windows anti-patterns: Unicode/emoji in Python stdout, `python3` command, bare `/Users/` paths without drive letter, `npx` without `cmd /c` wrapper, `net.Socket` spin-loops, `cp1252` encoding assumptions. Report with fixes.
9. **Session Quality Score** (`/session-score`) — Analyze current session: count fix vs feat commits, task completion rate, agent spawn count, memory stores. Output productivity score with breakdown.
10. **Learning Extractor v2** (`/extract-v2`) — Enhanced extraction with quality gate: classify content as signal (unique insight, decision, error fix) vs noise (heartbeat, checkpoint, plan fragment). Only store signal entries. Add confidence score to each entry.

### Cycle 1: Plugins/Tools (5)

11. **Enhanced Post-Commit Sync** — Extend `scripts/sync-to-active.sh` to also copy `hooks/dist/*.mjs` and `scripts/ralph/*.py` to `~/.claude/`. Add verification step that confirms sync succeeded.
12. **Hook Health Monitor** — New SessionStart hook (`hook-health-monitor.ts`). On every session start: iterate all registered hooks in `settings.json`, verify each dist file exists and is newer than its source. Report broken hooks with specific fix commands.
13. **Memory Quality Scorer** — Modify `pre-compact-extract.mjs` (or the extraction pipeline) to add quality scoring. Score based on: content uniqueness (compare against existing embeddings), information density (length vs substance), duplication check (0.85 similarity threshold). Only store entries scoring above minimum threshold.
14. **Agent Telemetry Restart** — Fix `skill-telemetry.jsonl` logging (died after Jan 18). Verify the telemetry hook is registered and functioning. Add agent type, duration, and outcome tracking.
15. **Cross-Project Sync Status** — New skill or script that checks sync state across all known projects (from project registry). Shows last sync time, drift count, and health status per project.

### Cycle 1: CLAUDE.md / Documentation (5)

16. **Hook Development Lifecycle Doc** — New rule file `hook-dev-lifecycle.md` documenting the full workflow: scaffold TS → implement logic → build (`npm run build`) → register in settings.json → test → verify dist exists → sync to `~/.claude`. Include common failure modes and recovery.
17. **Sync Gap Documentation** — New rule file `sync-known-gaps.md` documenting what DOESN'T auto-sync: `hooks/dist/*.mjs`, `scripts/ralph/*.py`, `settings.json`, `CLAUDE.md`, `RULES.md`. Include manual sync commands for each.
18. **Memory Usage Guidelines** — New rule file `memory-usage-guidelines.md` documenting when to use manual `store_learning.py` vs rely on auto-extraction. Include quality criteria: what makes a good learning entry, when to store, what NOT to store.
19. **Project Registry Rule** — New rule file `project-registry.md` with centralized project info. Initial population: continuous-claude, NorthStar, Fourth Platform, LinkMap, agent-factory + paths, ports, stacks, URLs.
20. **Archived Component Cleanup** — Update CLAUDE.md to remove references to Sentinel/Warden as active review gates. Clean up 4 stale sync-test rule files. Update any docs referencing archived agents.

### Cycle 2: Agents (5) — Future Session

21. **Hook Lifecycle Agent** — Orchestrator agent: scaffold → kraken (implement) → build → register → arbiter (test) → sync verify. Handles failures at each step with retry logic.
22. **Post-Ship Audit Agent** — Autonomous agent: run test suite → check hook health → verify sync → scan stale refs → update ROADMAP → report. Decision branching on pass/fail at each step.
23. **Memory Curator Agent** — Agent with psql access: query all entries → score relevance → deduplicate (0.85 threshold) → archive noise → surface buried signal → report stats.
24. **Drift Detection Agent** — Agent: diff all dirs between repo and active → classify each diff → report intentional vs accidental → offer fixes → run sync if approved.
25. **Windows Compat Agent** — Agent: scan all modified files → check 6 Windows anti-patterns → suggest fixes → optionally auto-fix safe patterns → report.

## Non-Goals (Out of Scope)

- Rewriting existing hooks (only wiring missing ones and monitoring health)
- Changing the fundamental sync architecture (only closing known gaps)
- Building a web dashboard for any of these tools (CLI/skill only)
- Migrating to a different memory backend (PostgreSQL stays)
- Changing the hook build system (esbuild stays)
- Rewriting Ralph's core workflow (only adding the lifecycle agent that uses it)

## Technical Considerations

### Architecture
- All skills follow v5 Hybrid format: `SKILL.md` + `references/` for detail
- All hooks are TypeScript in `.claude/hooks/src/`, built to `.claude/hooks/dist/` via esbuild
- All rules are Markdown in `.claude/rules/`
- Memory operations use `opc/scripts/core/recall_learnings.py` and `store_learning.py`
- Project registry stored as JSON, queryable via skill

### Known Constraints
- Windows cp1252 encoding — all Python scripts must use ASCII only
- Hook context injection requires PostToolUse + `hookSpecificOutput.additionalContext` (not PreToolUse allow)
- Sync script copies `hooks/src` but NOT `hooks/dist` or Python scripts — this is the gap to fix
- Settings.json is NOT synced — registrations must be added in both repo and `~/.claude`
- 33 unregistered hooks need audit — some may be intentionally unregistered (experimental)

### Dependencies
- Docker (PostgreSQL for memory operations)
- Node.js + npm (hook builds)
- Python + uv (memory scripts)
- esbuild (hook compilation)

## Context from Memory

- **Hook context injection pattern**: PostToolUse with `hookSpecificOutput.additionalContext` is the reliable path (from `react-perf-hook-fix`, `path-rules-hook-fix` learnings)
- **Sync gap**: Post-commit hook syncs `hooks/src`, `rules`, `agents`, `skills` but NOT `hooks/dist/*.mjs` or `scripts/ralph/*.py` (confirmed across 3 learnings)
- **Windows encoding**: cp1252 breaks Unicode — `PYTHONUTF8=1` or ASCII-only required (from `windows-path-hooks-fix`)
- **Memory noise**: 98.2% auto-extracted, periodic+extraction tags dominate. Only 4 manual stores in 397 entries.
- **Hook breakage cycle**: Build → silently break → revive weeks later. Confirmed pattern across 300 commits.

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Unregistered hooks | 33 | 0 (all audited, wired or archived) |
| Memory signal ratio | ~2% | >70% (after curation + quality gate) |
| Sync gap items | 3 (dist, python, settings) | 0 (all auto-synced or documented) |
| Hook breakage detection time | Weeks | Session start (immediate) |
| Manual sync interventions | Every commit | Zero (automated) |
| Documented lifecycle workflows | 0 complete | 4 (hook dev, sync, memory, project registry) |
| Windows debugging time | 15-30 min recurring | Near zero (pre-flight catches issues) |

## Open Questions

1. Of the 33 unregistered hooks, how many are intentionally experimental vs accidentally orphaned? (Hook audit will answer this)
2. Should the memory quality scorer use embedding similarity against existing entries, or simpler heuristics? (Start with heuristics, upgrade later)
3. Should settings.json be added to auto-sync, or kept local-only with documentation? (Document first, consider sync later)
4. For agent telemetry — is the existing hook just unregistered, or is the code broken? (Investigation needed)

## Execution Plan

### Cycle 1 (This Session + Next): Infrastructure Pass
- **Phase A**: Quick wins — hook health monitor, enhanced sync, sync drift detector (items 11, 12, 2)
- **Phase B**: Hook infrastructure — registration audit, scaffold skill, hook dev lifecycle doc (items 1, 5, 16)
- **Phase C**: Memory overhaul — curator skill, quality scorer, memory guidelines doc (items 3, 13, 18)
- **Phase D**: Remaining skills — post-ship audit, project registry, stale scanner, Windows pre-flight (items 4, 6, 7, 8)
- **Phase E**: Polish — session score, learning extractor v2, remaining docs, telemetry restart (items 9, 10, 14, 15, 17, 19, 20)

### Cycle 2 (Future Sessions): Agent Development
- All 5 agents (items 21-25)
- Integration testing between agents and Cycle 1 skills
- Telemetry validation for agent effectiveness

---

*PRD v1.0 — Platform Optimization*
*Generated from session analysis: 521 sessions, 300 commits, 397 memory entries, 119 skills, 64 hooks*
