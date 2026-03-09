# Tasks: Continuous Claude Platform Optimization

## Relevant Files

### Skills (New)
- `.claude/skills/hook-audit/SKILL.md` — Hook registration audit skill
- `.claude/skills/sync-drift/SKILL.md` — Sync drift detector skill
- `.claude/skills/memory-curate/SKILL.md` — Memory curator skill
- `.claude/skills/post-ship-audit/SKILL.md` — Post-ship audit checklist skill
- `.claude/skills/hook-scaffold/SKILL.md` — Hook scaffold skill
- `.claude/skills/project-registry/SKILL.md` — Project registry query skill
- `.claude/skills/stale-scan/SKILL.md` — Stale reference scanner skill
- `.claude/skills/win-preflight/SKILL.md` — Windows pre-flight checker skill
- `.claude/skills/session-score/SKILL.md` — Session quality score skill
- `.claude/skills/extract-v2/SKILL.md` — Enhanced learning extractor skill

### Plugins/Tools (New + Modified)
- `scripts/sync-to-active.sh` — Enhanced sync script (modify existing)
- `.claude/hooks/src/hook-health-monitor.ts` — Session start hook health check
- `.claude/hooks/src/shared/memory-quality-scorer.ts` — Quality scoring for extraction
- `.claude/hooks/src/pre-compact-extract.ts` — Modified extraction with quality gate
- `.claude/hooks/src/agent-telemetry-restart.ts` — Fixed telemetry hook

### Documentation (New)
- `.claude/rules/hook-dev-lifecycle.md` — Hook development lifecycle doc
- `.claude/rules/sync-known-gaps.md` — What doesn't sync and why
- `.claude/rules/memory-usage-guidelines.md` — When/how to store learnings
- `.claude/rules/project-registry.md` — Centralized project info
- `.claude/project-registry.json` — Project registry data file

### Configuration (Modified)
- `.claude/settings.json` — Hook registrations for new hooks

### Agents (Cycle 2)
- `.claude/agents/hook-lifecycle-agent.yml` — Hook lifecycle orchestrator
- `.claude/agents/post-ship-audit-agent.yml` — Post-ship audit agent
- `.claude/agents/memory-curator-agent.yml` — Memory curator agent
- `.claude/agents/drift-detection-agent.yml` — Drift detection agent
- `.claude/agents/windows-compat-agent.yml` — Windows compatibility agent

### Tests
- `.claude/hooks/src/__tests__/hook-health-monitor.test.ts` — Hook health monitor tests
- `.claude/hooks/src/__tests__/memory-quality-scorer.test.ts` — Quality scorer tests

### Notes

- Skills follow v5 Hybrid format: `SKILL.md` under 404 lines + `references/` for detail
- Hooks are TypeScript in `.claude/hooks/src/`, compiled to `dist/` via `npm run build`
- Run hook tests: `cd .claude/hooks && npm test`
- Memory operations: `cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/...`

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, check it off by changing `- [ ]` to `- [x]`. Update after each sub-task, not just parent tasks.

**Execution Order:** Phases A→E within Cycle 1, then Cycle 2.
**Agent routing:** All implementation via kraken (complex) or spark (simple). Tests via arbiter. Research via scout.

---

## Tasks

### Phase A: Quick Wins (Immediate ROI)

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout `feature/platform-optimization` branch
  - [x] 0.2 Verify clean git state and correct base (main)

- [x] 1.0 Hook Health Monitor (Plugin — SessionStart hook)
  - [x] 1.1 Create `.claude/hooks/src/hook-health-monitor.ts` — SessionStart hook that reads `settings.json`, iterates all registered hooks, checks each `dist/*.mjs` file exists
  - [x] 1.2 For each hook: compare dist file mtime vs src file mtime — flag stale builds where src is newer than dist
  - [x] 1.3 Report format: list broken/stale hooks with specific fix command (`npm run build` or `bash scripts/sync-to-active.sh`)
  - [x] 1.4 Output via `hookSpecificOutput.additionalContext` — human-readable summary injected into session context
  - [x] 1.5 Register hook in `.claude/settings.json` under `hooks.SessionStart`
  - [x] 1.6 Write tests in `.claude/hooks/src/__tests__/hook-health-monitor.test.ts` — test: all healthy, some broken, missing dist dir
  - [x] 1.7 Build hooks (`cd .claude/hooks && npm run build`) and verify `dist/hook-health-monitor.mjs` exists
  - [ ] 1.8 Manual verification: start new session, confirm hook runs and reports status

- [x] 2.0 Enhanced Post-Commit Sync (Plugin — script modification)
  - [x] 2.1 Read current `scripts/sync-to-active.sh` to understand existing sync logic
  - [x] 2.2 Add sync step for `hooks/dist/*.mjs` → `~/.claude/hooks/dist/`
  - [x] 2.3 Add sync step for `scripts/ralph/*.py` → `~/.claude/scripts/ralph/` (if target dir exists)
  - [x] 2.4 Add verification step: after sync, compare file counts between source and target directories
  - [x] 2.5 Add `--dry-run` flag that shows what would sync without copying
  - [x] 2.6 Test: make a change to a hook src, build, commit — verify dist syncs automatically
  - [x] 2.7 Test: verify existing sync behavior (src, rules, agents, skills) still works unchanged

- [x] 3.0 Sync Drift Detector (Skill)
  - [x] 3.1 Create `.claude/skills/sync-drift/SKILL.md` — skill definition with triggers: "sync drift", "what's out of sync", "check sync"
  - [x] 3.2 Core logic: diff `continuous-claude/.claude/hooks/src/` vs `~/.claude/hooks/src/` — list files that differ
  - [x] 3.3 Diff `continuous-claude/.claude/hooks/dist/` vs `~/.claude/hooks/dist/` — list stale or missing dist files
  - [x] 3.4 Diff `continuous-claude/.claude/rules/` vs `~/.claude/rules/`
  - [x] 3.5 Diff `continuous-claude/.claude/skills/` vs `~/.claude/skills/` (only SKILL.md and references/)
  - [x] 3.6 Diff `continuous-claude/.claude/agents/` vs `~/.claude/agents/`
  - [x] 3.7 Classify diffs: known local-only files (settings.json, CLAUDE.md, RULES.md) vs unexpected drift
  - [x] 3.8 Output: table of drifted files with "fix" column (sync command to resolve each)
  - [x] 3.9 Register skill triggers in skill-rules.json (both project-level and ~/.claude)

### Phase B: Hook Infrastructure

- [x] 4.0 Hook Registration Audit (Skill)
  - [x] 4.1 Create `.claude/skills/hook-audit/SKILL.md` — skill definition with triggers: "hook audit", "unregistered hooks", "wire hooks"
  - [x] 4.2 Core logic: list all `.ts` files in `hooks/src/` (excluding `__tests__/`, `shared/`)
  - [x] 4.3 Parse `settings.json` to extract all registered hook command paths
  - [x] 4.4 Cross-reference: find hooks in src with no matching registration
  - [x] 4.5 For each unregistered hook: read the file, detect event type from code (PreToolUse, PostToolUse, SessionStart, etc.), detect tool pattern
  - [x] 4.6 Output: table of unregistered hooks with detected event type, suggested registration JSON
  - [x] 4.7 Include "archive candidates" section: hooks that look experimental or abandoned (no meaningful logic, placeholder only)
  - [x] 4.8 Register skill triggers in skill-rules.json

- [x] 5.0 Hook Scaffold (Skill)
  - [x] 5.1 Create `.claude/skills/hook-scaffold/SKILL.md` — skill definition with triggers: "new hook", "scaffold hook", "create hook"
  - [x] 5.2 Define template for each event type: PreToolUse (with `permissionDecision`), PostToolUse (with `additionalContext`), SessionStart, SessionEnd, UserPromptSubmit
  - [x] 5.3 Skill workflow: ask hook name → ask event type → ask tool pattern → generate TS file → add registration → build → verify
  - [x] 5.4 Template includes: proper imports, `parseInput()`, `main()`, error handling, JSON output format
  - [x] 5.5 Auto-registration: generate the correct `settings.json` entry and add it
  - [x] 5.6 Post-scaffold: run `npm run build`, verify dist file created, report success/failure
  - [x] 5.7 Create `references/hook-templates.md` with all 5 event type templates

- [x] 6.0 Hook Development Lifecycle Doc (CLAUDE.md — new rule)
  - [x] 6.1 Create `.claude/rules/hook-dev-lifecycle.md`
  - [x] 6.2 Document full workflow: scaffold → implement → build → register → test → sync → verify
  - [x] 6.3 Include common failure modes: dist missing, registration wrong event type, stale build, sync gap
  - [x] 6.4 Include recovery commands for each failure mode
  - [x] 6.5 Reference the hook-scaffold skill and hook-health-monitor for automation

### Phase C: Memory Overhaul

- [x] 7.0 Memory Curator (Skill)
  - [x] 7.1 Create `.claude/skills/memory-curate/SKILL.md` — skill with triggers: "curate memory", "clean memory", "memory audit"
  - [x] 7.2 Query all `archival_memory` entries via psql: `SELECT id, learning_type, content, tags, confidence, created_at FROM archival_memory ORDER BY created_at`
  - [x] 7.3 Score each entry: +3 manual store, +2 unique content >100 chars, +1 high confidence, -2 periodic+extraction tag, -1 heartbeat/checkpoint content, -1 duplicate (similar content to another entry)
  - [x] 7.4 Classification: score >= 3 = KEEP, 1-2 = REVIEW, <= 0 = ARCHIVE
  - [x] 7.5 Archive operation: move low-score entries to `archival_memory_archived` table (create if needed) — preserve data, remove from active recall
  - [x] 7.6 Deduplication: find entries with >0.85 cosine similarity, keep highest-scored, archive others
  - [x] 7.7 Report: entries kept / archived / deduplicated, before/after signal ratio, top 10 highest-quality entries
  - [x] 7.8 Safety: `--dry-run` flag that reports without modifying, `--confirm` flag required for actual changes

- [x] 8.0 Memory Quality Scorer (Plugin — extraction hook modification)
  - [x] 8.1 Read current `pre-compact-extract.mjs` to understand extraction pipeline
  - [x] 8.2 Create `.claude/hooks/src/shared/memory-quality-scorer.ts` — quality scoring module
  - [x] 8.3 Scoring criteria: content length (>50 chars), uniqueness (not duplicate of recent entries), substance (not just a status update or heartbeat), has actionable insight
  - [x] 8.4 Minimum threshold: only pass entries scoring above threshold to `store_learning.py`
  - [x] 8.5 Add confidence field: high (explicit insight), medium (contextual pattern), low (ambient extraction)
  - [x] 8.6 Write tests for quality scorer: test signal entries pass, noise entries blocked
  - [ ] 8.7 Integrate into extraction pipeline: scorer runs before storage, below-threshold entries logged but not stored
  - [x] 8.8 Build and verify

- [x] 9.0 Memory Usage Guidelines Doc (CLAUDE.md — new rule)
  - [x] 9.1 Create `.claude/rules/memory-usage-guidelines.md`
  - [x] 9.2 Document when to use manual `store_learning.py`: after solving tricky bugs, architectural decisions, discovering codebase patterns, user corrections
  - [x] 9.3 Document what NOT to store: trivial fixes, info already in docs, generic patterns, test data
  - [x] 9.4 Document quality criteria: what makes a good learning entry (specific, actionable, includes context)
  - [x] 9.5 Include examples of good vs bad learning entries
  - [x] 9.6 Reference the `/remember` skill for interactive storage

### Phase D: Remaining Skills

- [x] 10.0 Post-Ship Audit (Skill)
  - [x] 10.1 Create `.claude/skills/post-ship-audit/SKILL.md` — skill with triggers: "post-ship", "audit", "verify ship"
  - [x] 10.2 Checklist step 1: Run project test suite (`npm test` or `pytest`) — capture pass/fail
  - [x] 10.3 Checklist step 2: Run hook health check (invoke hook-health-monitor logic)
  - [x] 10.4 Checklist step 3: Run sync drift check (invoke sync-drift logic)
  - [x] 10.5 Checklist step 4: Run stale reference scan (invoke stale-scan logic)
  - [x] 10.6 Checklist step 5: Verify ROADMAP reflects completed work
  - [x] 10.7 Checklist step 6: Check for uncommitted changes or orphaned branches
  - [x] 10.8 Output: pass/fail scorecard with details for each failed check
  - [x] 10.9 Create `references/audit-checklist.md` with the full checklist and expected outcomes

- [x] 11.0 Project Registry (Skill + Data)
  - [x] 11.1 Create `.claude/project-registry.json` — structured JSON with known projects
  - [x] 11.2 Initial data: continuous-claude (path, no port, infrastructure), NorthStar (path, port 3002, northstar.localhost, Next.js), Fourth Platform (path, port 3000), LinkMap, agent-factory
  - [x] 11.3 Create `.claude/skills/project-registry/SKILL.md` — skill with triggers: "project registry", "what port", "project info"
  - [x] 11.4 Query operations: lookup by name, list all, filter by stack
  - [x] 11.5 Update operations: add project, update port/URL, mark inactive
  - [x] 11.6 Create `.claude/rules/project-registry.md` — rule file referencing the JSON and skill

- [x] 12.0 Stale Reference Scanner (Skill)
  - [x] 12.1 Create `.claude/skills/stale-scan/SKILL.md` — skill with triggers: "stale scan", "stale references", "dead references"
  - [x] 12.2 Core logic: grep CLAUDE.md, RULES.md, all rules/*.md, all skills/*/SKILL.md for known archived items
  - [x] 12.3 Known archived items list: Sentinel, Warden, sync-test-*.md files, any agents in agents/archive/
  - [x] 12.4 Dynamically build archive list from `agents/archive/` directory contents
  - [x] 12.5 Output: table of stale references with file, line number, reference text, suggested fix
  - [x] 12.6 Include auto-fix option: remove or update stale references with user confirmation

- [x] 13.0 Windows Pre-flight (Skill)
  - [x] 13.1 Create `.claude/skills/win-preflight/SKILL.md` — skill with triggers: "windows check", "win preflight", "platform check"
  - [x] 13.2 Check 1: Scan Python files for Unicode/emoji characters that break cp1252
  - [x] 13.3 Check 2: Scan shell scripts for `python3` command (should be `python` or `uv run python`)
  - [x] 13.4 Check 3: Scan for bare `/Users/` paths without drive letter
  - [x] 13.5 Check 4: Scan MCP configs for `npx` without `cmd /c` wrapper
  - [x] 13.6 Check 5: Scan for `net.Socket` spin-loop patterns (should use subprocess)
  - [x] 13.7 Check 6: Scan for hardcoded encoding assumptions that conflict with cp1252
  - [x] 13.8 Output: pass/fail per check with file:line references and fix suggestions
  - [x] 13.9 Create `references/windows-antipatterns.md` with pattern details and examples

### Phase E: Polish & Remaining

- [x] 14.0 Session Quality Score (Skill)
  - [x] 14.1 Create `.claude/skills/session-score/SKILL.md` — skill with triggers: "session score", "how productive", "session quality"
  - [x] 14.2 Metric 1: Count fix vs feat commits in current session (git log --since)
  - [x] 14.3 Metric 2: Task completion rate (if task tracking active)
  - [x] 14.4 Metric 3: Agent spawn count and success rate (from telemetry if available)
  - [x] 14.5 Metric 4: Memory stores made (manual vs auto)
  - [x] 14.6 Metric 5: Files modified count and scope
  - [x] 14.7 Output: score 1-10 with breakdown, comparison to session averages if data available

- [x] 15.0 Learning Extractor v2 (Skill)
  - [x] 15.1 Create `.claude/skills/extract-v2/SKILL.md` — skill with triggers: "extract learnings", "smart extract"
  - [x] 15.2 Enhanced classification: SIGNAL (unique insight, decision, error fix, pattern) vs NOISE (heartbeat, checkpoint, status update, plan fragment)
  - [x] 15.3 Signal detection heuristics: contains error message + fix, contains "decided to" or "chose", contains file path + explanation, contains "doesn't work" or "fixed by"
  - [x] 15.4 Noise detection heuristics: matches "periodic extraction", contains only task status, duplicates existing entry content, generic/obvious statement
  - [x] 15.5 Add confidence scoring: high (explicit decision), medium (inferred pattern), low (ambient context)
  - [x] 15.6 Integration point: can be used standalone or as the quality gate in extraction pipeline

- [x] 16.0 Agent Telemetry Restart (Plugin)
  - [x] 16.1 Locate existing telemetry hook code — check for registration in settings.json
  - [x] 16.2 Verify hook dist file exists and is not stale
  - [x] 16.3 If unregistered: add registration to settings.json
  - [x] 16.4 If code broken: diagnose and fix — ensure it logs agent type, duration, outcome to `skill-telemetry.jsonl`
  - [x] 16.5 Add timestamp and session ID to each telemetry entry
  - [ ] 16.6 Verify: spawn a test agent, confirm telemetry entry appears in log

- [x] 17.0 Cross-Project Sync Status (Plugin/Skill)
  - [x] 17.1 Create sync status check that reads project registry and checks sync state per project
  - [x] 17.2 For each project: check if `.claude/` exists, compare key files against repo versions
  - [x] 17.3 Output: table of projects with sync health (green/yellow/red)
  - [x] 17.4 Integrate into post-ship-audit as optional step

- [x] 18.0 Sync Gap Documentation (CLAUDE.md — new rule)
  - [x] 18.1 Create `.claude/rules/sync-known-gaps.md`
  - [x] 18.2 Document what doesn't auto-sync: `hooks/dist/*.mjs`, `scripts/ralph/*.py`, `settings.json`, `CLAUDE.md`, `RULES.md`
  - [x] 18.3 For each gap: explain why (intentional vs limitation) and manual sync command
  - [x] 18.4 Reference the enhanced sync script (task 2.0) for the automated fix

- [x] 19.0 Archived Component Cleanup (CLAUDE.md — updates)
  - [x] 19.1 Read CLAUDE.md and find references to Sentinel/Warden as "active review gates"
  - [ ] 19.2 Update to reflect archived status or remove references
  - [x] 19.3 Identify and remove 4 stale sync-test rule files: `sync-test-1769821789.md`, `sync-v2-1769821904.md`, `sync-v3-1769821990.md`
  - [x] 19.4 Scan for any other references to archived agents and update
  - [x] 19.5 Verify no broken references remain

### Cycle 2: Agents (Future Sessions)

- [ ] 20.0 Hook Lifecycle Agent
  - [ ] 20.1 Create `.claude/agents/hook-lifecycle-agent.yml` — YAML front matter with capabilities
  - [ ] 20.2 Define agent prompt: orchestrate scaffold → kraken (implement) → build → register → arbiter (test) → sync verify
  - [ ] 20.3 Error handling: retry build failures, suggest fixes for test failures, report if stuck after 3 attempts
  - [ ] 20.4 Input contract: hook name, event type, tool pattern, description of logic
  - [ ] 20.5 Output contract: created files, registration added, test results, sync status

- [ ] 21.0 Post-Ship Audit Agent
  - [ ] 21.1 Create `.claude/agents/post-ship-audit-agent.yml`
  - [ ] 21.2 Define agent prompt: run test suite → check hook health → verify sync → scan stale refs → update ROADMAP → report
  - [ ] 21.3 Decision branching: if tests fail → investigate before continuing; if hooks broken → report but continue
  - [ ] 21.4 Output: structured audit report with pass/fail per check, action items

- [ ] 22.0 Memory Curator Agent
  - [ ] 22.1 Create `.claude/agents/memory-curator-agent.yml`
  - [ ] 22.2 Define agent prompt: query all entries → score → deduplicate → archive noise → report
  - [ ] 22.3 Safety: always dry-run first, require explicit confirmation for destructive operations
  - [ ] 22.4 Output: curation report with stats, top entries, archived entries list

- [ ] 23.0 Drift Detection Agent
  - [ ] 23.1 Create `.claude/agents/drift-detection-agent.yml`
  - [ ] 23.2 Define agent prompt: diff all dirs → classify diffs → report → offer fixes
  - [ ] 23.3 Classification logic: known local-only vs unexpected drift
  - [ ] 23.4 Output: drift report with fix commands, option to auto-fix

- [ ] 24.0 Windows Compat Agent
  - [ ] 24.1 Create `.claude/agents/windows-compat-agent.yml`
  - [ ] 24.2 Define agent prompt: scan modified files → check 6 patterns → suggest fixes
  - [ ] 24.3 Auto-fix capability for safe patterns (e.g., `python3` → `python`)
  - [ ] 24.4 Output: compatibility report with fixes applied/suggested

### Final Verification

- [ ] 25.0 Integration Testing
  - [ ] 25.1 Run hook-audit skill — verify it detects unregistered hooks correctly
  - [ ] 25.2 Run sync-drift skill — verify it detects known drift
  - [ ] 25.3 Run memory-curate with --dry-run — verify scoring and classification
  - [ ] 25.4 Test hook-health-monitor in fresh session — verify it reports status
  - [ ] 25.5 Test enhanced sync script — verify dist files sync
  - [ ] 25.6 Run full post-ship-audit — verify all checks pass
  - [ ] 25.7 Run hook tests: `cd .claude/hooks && npm test`

- [ ] 26.0 Documentation Verification
  - [ ] 26.1 Verify all new rule files are readable and accurately describe their systems
  - [ ] 26.2 Verify all new skills have proper trigger keywords in skill-rules.json
  - [ ] 26.3 Verify CLAUDE.md has no stale references to archived components
  - [ ] 26.4 Run stale-scan on itself — confirm zero stale references found

- [ ] 27.0 Merge and Ship
  - [ ] 27.1 Run full test suite on feature branch
  - [ ] 27.2 Create commit with all changes
  - [ ] 27.3 Merge feature/platform-optimization to main
  - [ ] 27.4 Run sync-to-active.sh to deploy to ~/.claude
  - [ ] 27.5 Verify all hooks, skills, rules active in ~/.claude
  - [ ] 27.6 Update ROADMAP.md with completion
  - [ ] 27.7 Store learnings from this implementation cycle
