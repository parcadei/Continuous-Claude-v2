# Context Management System -- Architecture Review

**Date:** 2026-03-06
**Scope:** Memory, Hooks, Knowledge Tree, Handoffs, Extraction subsystems
**Method:** 3 parallel agents (architect, critic, scout) reviewing code + docs
**Verdict:** Solid architecture with specific, fixable gaps. No systemic failures.

---

## System Health Scorecard

| Subsystem | Grade | Summary |
|-----------|-------|---------|
| **Memory & Recall** | B | Robust fail-open recall; `python3` bug on Windows; two competing `getSessionId` modules |
| **Hook Lifecycle** | B+ | Correct ordering, fail-open everywhere; 12 UserPromptSubmit hooks add latency |
| **Learning Extraction** | C+ | L1 layer missing (dead code); L0/L3 race on shared state; periodic extract is noise |
| **Session Isolation** | B+ | Well-designed isolation module; inconsistent adoption (`smarter-everyday` writes to `.claude/`) |
| **Knowledge Tree** | B | Working but daemons archived; docs reference stale components |
| **Handoffs & Continuity** | B+ | Clean ledger loading; `session-start-continuity` is 881 lines (cohesion risk) |
| **Documentation** | D+ | ARCHITECTURE.md references 5 non-existent hooks, wrong counts everywhere, 3 competing taxonomies |
| **Shared Modules** | B+ | Clean dependency graph, no circular imports; `memory-client.ts` low cohesion (4 concerns, 456 lines) |
| **Atomic Write / State** | B- | Excellent module design; inconsistent adoption (3 hooks bypass it) |
| **Overall** | **B** | **Production-viable with targeted fixes needed** |

---

## What's Working Well

### 1. Fail-Open Philosophy (A)
Every context management hook wraps its main logic in try/catch and returns `{ result: 'continue' }` on failure. The pattern `main().catch(() => outputContinue())` appears in 14 of 16 reviewed hooks. A hook crash can never block user prompts. This is the single strongest design decision in the system.

### 2. Defense-in-Depth Extraction (B+)
The multi-layer extraction design ensures learnings are captured even if individual layers fail:
- **L0** (PreCompact): Extracts from transcript before context compression
- **L2** (PostToolUse): Detects multi-attempt victory patterns via state machine
- **L3** (SessionEnd): Final sweep extraction
- **Periodic** (every 50 tool uses): Checkpoint extraction

### 3. Atomic Write Module (A-)
`shared/atomic-write.ts` is production-grade: temp-file-then-rename (atomic on POSIX and NTFS), `O_CREAT | O_EXCL` advisory locking, 10-second stale lock detection, and fail-open fallback. This is the right solution -- it just needs wider adoption.

### 4. Session Isolation Design (A-)
`shared/session-isolation.ts` provides `getSessionStatePath`, migration from legacy global state, and automatic cleanup of old state files. Multi-terminal safety is properly addressed for hooks that use it.

### 5. Hook Dependency Chain (B+)
SessionStart hooks execute in correct order: `init-check` (ensures knowledge tree) -> `continuity` (loads handoffs/state) -> state-dependent hooks. No circular dependencies between hooks. Shared modules are leaf utilities that don't import each other.

---

## Structural Risks

### CRITICAL

#### C1: Five non-existent hooks described as active in ARCHITECTURE.md
**Source:** `docs/ARCHITECTURE.md` hook tables and data flow diagrams
**Ghosts:** `pattern-orchestrator.ts`, `pre-edit-context`, `subagent-start`, `subagent-stop-continuity.ts`, `stop-coordinator`
**Impact:** Anyone reading the architecture doc gets a false picture of the hook system. The entire subagent coordination lifecycle described in Section 2 references a superseded system.
**Fix:** Remove phantom entries, update to reflect current 57-hook reality.

#### C2: L1 extraction layer is missing -- `shared/learning-extractor.ts` is orphaned
**Source:** `shared/learning-extractor.ts` (197 lines)
**Evidence:** Exports `extractConfirmationLearning`, `extractTestPassLearning`, `extractPeriodicLearning`, `extractAgentLearning` -- none are imported by any active hook. The "4 defense layers" claim has only 3 functional layers.
**Impact:** Mid-session user confirmations and test-pass events don't trigger learning extraction. The system relies entirely on L0 (compact), L2 (smarter-everyday), and L3 (session-end).
**Fix:** Either wire up L1 via a UserPromptSubmit or PostToolUse hook, or remove the dead code and update docs to describe 3 layers.

### HIGH

#### H1: L0/L3 race condition on `extraction-state.json`
**Source:** `pre-compact-extract.ts:83-103`, `session-end-extract.ts:89-113`
**Evidence:** Both hooks call `incremental_extract.py` reading `--start-line` from the same state file. L0 fires detached and returns immediately. If SessionEnd fires before L0's Python process updates the state file, L3 re-extracts the same transcript window. Deduplication via content hashes is the only protection.
**Impact:** Duplicate learnings in PostgreSQL memory store, degrading recall quality.
**Fix:** Use `writeStateWithLock` for `extraction-state.json` and add a "last_launched_pid" field that L3 checks before re-extracting.

#### H2: `pre-compact-extract.ts:152` uses raw `writeFileSync` on shared state
**Source:** `pre-compact-extract.ts:152`
**Evidence:** Read-modify-write on `extraction-state.json` without atomic write or locking. A crash mid-write leaves partial JSON, resetting `last_extracted_line` to 0 on next read (full re-extraction).
**Fix:** Replace with `writeStateWithLock` from `shared/atomic-write.ts` (one-line change).

#### H3: `memory-client.ts:290` uses `python3` (breaks on Windows)
**Source:** `.claude/hooks/src/shared/memory-client.ts:290`
**Evidence:** `spawnSync('python3', ...)` triggers Microsoft Store alias on Windows, failing silently. Per MEMORY.md, the fix is `python` or `uv run python`.
**Fix:** Change `python3` to `python` at line 290.

#### H4: `session-end-cleanup.ts:75` -- missing `existsSync` guard
**Source:** `session-end-cleanup.ts:75`
**Evidence:** `fs.readdirSync(ledgerDir)` throws `ENOENT` for any project without `thoughts/ledgers/`. The outer try/catch suppresses the error, silently skipping the Braintrust extraction block at lines 127-168.
**Fix:** Add `fs.existsSync(ledgerDir) ?` guard (one-line fix, matches `pre-compact-continuity.ts:78` pattern).

#### H5: Two competing `getSessionId()` implementations
**Source:** `shared/session-isolation.ts:23-33` vs `shared/session-id.ts:92-111`
**Evidence:** Different resolution priorities (`CLAUDE_SESSION_ID` + hostname-PID vs `COORDINATION_SESSION_ID` + file persistence + `BRAINTRUST_SPAN_ID`). Hooks importing from different modules may use different IDs for the same session.
**Fix:** Consolidate into one module. Canonical priority: `CLAUDE_SESSION_ID` > file persistence > `BRAINTRUST_SPAN_ID` > PID fallback.

#### H6: `smarter-everyday-state.json` writes to project `.claude/` directory
**Source:** `smarter-everyday.ts:105-107`
**Evidence:** Git status shows `MM .claude/smarter-everyday-state.json` -- pollutes `git status` on every session. All other hooks write state to `$TEMP`.
**Fix:** Move to `getSessionStatePath('smarter-everyday', sessionId)` in `$TEMP`.

### MEDIUM

#### M1: Shell injection risk in `session-start-continuity.ts:360-363`
String-interpolated shell command with `escapedGoal` that only strips `"` characters. Backticks and `$(...)` are not escaped. Use `spawnSync` with args array instead of `execSync` with string.

#### M2: `python-bridge.ts:37,79` uses `execSync` (blocks event loop for up to 10s)
All other Python spawns use `spawnSync`. Replace for consistency and to avoid blocking.

#### M3: `periodic-extract.ts` stores low-signal checkpoint learnings
Content like "Mid-session checkpoint at 150 tool uses. Recent activity: Bash(3), Read(2)" has no semantic value for future recall. Pollutes the memory store.

#### M4: `session-end-cleanup.ts:69` lacks JSON.parse try/catch guard
Only hook that doesn't wrap stdin parsing in try/catch. Throws uncaught exception on malformed input.

#### M5: 12 UserPromptSubmit hooks execute serially (~1-2s latency per prompt)
No parallel execution. At 50-200ms each, user-visible delay accumulates.

---

## Documentation Drift

### Count Discrepancies (verified against codebase)

| Entity | Actual | docs/ARCHITECTURE.md | CLAUDE.md | INDEX.md | README.md |
|--------|--------|---------------------|-----------|----------|-----------|
| Hooks (registered) | **57** | 34 | 35 | 28 / 100+ | 120 |
| Hooks (source files) | **92** | -- | -- | -- | -- |
| Agents | **31** | 41 | 18+ | 18+ | 31 |
| Skills (dirs) | **131** | 123 | -- | -- | 120+ |
| Skills (routed) | **97** | -- | -- | -- | 95 |

### Pillar Taxonomy Chaos

| Document | Model | Count | Names |
|----------|-------|-------|-------|
| CLAUDE.md (global) | Four Pillars | 4 | Memory, Hooks, Agents, Workflows |
| INDEX.md (project) | Five Pillars | 5 | Memory, Hooks, Agents, PageIndex, Workflows |
| ARCHITECTURE.md | Four Layers | 4 | Skills, Hooks, Agents, Infrastructure |
| README.md dashboard | Pillars | 7 | memory, knowledge tree, PageIndex, roadmap, handoffs, Ralph, Braintrust |
| health.py (actual code) | Pillars | **10** | memory, knowledge, pageindex, roadmap, handoffs, ralph, braintrust, skills, agents, mcp-servers |

**Recommendation:** Adopt the `health.py` 10-pillar model as canonical (it reflects the actual implementation). Update all docs to match. Use "subsystems" instead of "pillars" to avoid the naming debate.

### Ghost References

| What | Where | Status |
|------|-------|--------|
| `pattern-orchestrator.ts` | ARCHITECTURE.md:164,419,495,772,774 | Does not exist |
| `pre-edit-context` hook | ARCHITECTURE.md:158 | Does not exist |
| `subagent-start` hook | ARCHITECTURE.md:177 | Does not exist |
| `subagent-stop-continuity.ts` | ARCHITECTURE.md:178,772 | Does not exist |
| `stop-coordinator` hook | ARCHITECTURE.md:179 | Does not exist |
| `pioneer` agent | ARCHITECTURE.md:201 | Does not exist |
| `warden` agent | ARCHITECTURE.md:240 | Does not exist |
| `validator` agent | ARCHITECTURE.md:231 | `validate-agent.md` exists, not `validator.md` |
| `strategic-refactorer` agent | DECISION-TREES.md:125 | Does not exist in `.claude/agents/` |
| `principal-reviewer` agent | DECISION-TREES.md:148 | Does not exist in `.claude/agents/` |
| `hook_launcher.py` | ARCHITECTURE.md:386 | Not found anywhere in `opc/` |
| `tree_daemon.py` (active) | knowledge-tree-health.md | Archived at `opc/scripts/archive/` |
| `memory_daemon.py` (active) | SYSTEM-OVERVIEW.md | Archived at `opc/scripts/archive/` |

### Specific Doc Fixes Needed

| # | Fix | File | Severity |
|---|-----|------|----------|
| 1 | Remove 5 phantom hooks from tables | `docs/ARCHITECTURE.md` | CRITICAL |
| 2 | Update hook count to 57 | Multiple docs | HIGH |
| 3 | Update agent count to 31 | `docs/ARCHITECTURE.md` | HIGH |
| 4 | Resolve pillar taxonomy (pick one model) | All architecture docs | HIGH |
| 5 | Fix `skill-activation` -> `skill-activation-prompt` | `SYSTEM-OVERVIEW.md:79` | MEDIUM |
| 6 | Correct `--hybrid` description (it's not the base default) | `CONTINUOUS-CLAUDE-GUIDE.md:54` | MEDIUM |
| 7 | Fix 8 wrong script paths in Section 5 | `docs/ARCHITECTURE.md` | MEDIUM |
| 8 | Remove `hook_launcher.py` reference | `docs/ARCHITECTURE.md:386` | MEDIUM |
| 9 | Mark daemons as archived | `knowledge-tree-health.md`, `SYSTEM-OVERVIEW.md` | MEDIUM |
| 10 | Add ROADMAP subsystem documentation | `docs/ARCHITECTURE.md` | MEDIUM |
| 11 | Note TLDR benchmarks are macOS-only | `docs/TLDR.md:835` | LOW |

---

## Efficiency Opportunities

### Token Usage
- **12 UserPromptSubmit hooks** execute serially on every prompt. Even with early returns, evaluation cost accumulates. Consider merging related hooks (e.g., combine `navigator-validate` + `navigator-safety` into one hook).
- **periodic-extract.ts** fires on every PostToolUse (all matchers: `*`). The 50-use interval check is cheap, but the hook still loads, parses stdin, and evaluates on every single tool call.

### Latency
- `session-start-continuity.ts:365` uses `execSync` with 5-second timeout for memory recall at startup. Replace with `spawnSync` to match other hooks and avoid event loop blocking.
- `python-bridge.ts` blocks event loop for up to 10s via `execSync`. Switch to `spawnSync`.

### Redundancy
- `shared/learning-extractor.ts` (197 lines) is dead code -- no active importers.
- `shared/python-bridge.ts` still exists despite MEMORY.md noting it was "eliminated." Confirm whether it's still used and remove if not.
- `src/src/` nested directory contains duplicate copies of `session-start-continuity.ts` and `session-end-cleanup.ts`.

---

## Recommended Actions (Prioritized Backlog)

### CRITICAL (do first)

| # | Action | Effort | Files |
|---|--------|--------|-------|
| 1 | Rewrite `docs/ARCHITECTURE.md` or mark sections as stale | Large | `docs/ARCHITECTURE.md` |
| 2 | Wire up L1 extraction OR remove `shared/learning-extractor.ts` | Medium | New hook or delete 197 lines |

### HIGH (do soon)

| # | Action | Effort | Files |
|---|--------|--------|-------|
| 3 | Add `writeStateWithLock` to `pre-compact-extract.ts:152` | Small | 1 file, ~5 lines |
| 4 | Fix `python3` -> `python` in `memory-client.ts:290` | Trivial | 1 line |
| 5 | Add `existsSync` guard in `session-end-cleanup.ts:75` | Trivial | 1 line |
| 6 | Consolidate two `getSessionId()` modules | Medium | 2 files + importers |
| 7 | Move `smarter-everyday-state.json` to `$TEMP` | Small | 1 file, ~3 lines |
| 8 | Fix shell injection in `session-start-continuity.ts:360` (use `spawnSync` with args) | Small | 1 file, ~10 lines |
| 9 | Update all doc counts (hooks=57, agents=31, skills=131) | Small | 5 docs |

### MEDIUM (next sprint)

| # | Action | Effort | Files |
|---|--------|--------|-------|
| 10 | Replace `execSync` with `spawnSync` in `python-bridge.ts` | Small | 1 file |
| 11 | Remove/improve periodic extraction checkpoints | Small | 1 file |
| 12 | Add JSON.parse guard in `session-end-cleanup.ts:69` | Trivial | 1 file |
| 13 | Split `memory-client.ts` (456 lines, 4 concerns) | Medium | 1 -> 2 files |
| 14 | Remove `src/src/` duplicate directory | Trivial | Delete 2 files |
| 15 | Resolve pillar taxonomy across all docs | Medium | ~6 docs |
| 16 | Add tests for `smarter-everyday.ts` state machine | Medium | New test file |
| 17 | Add tests for `session-end-extract.ts` and `session-end-cleanup.ts` | Medium | 2 new test files |

### LOW (opportunistic)

| # | Action | Effort | Files |
|---|--------|--------|-------|
| 18 | Remove duplicate exports in `shared/index.ts:93-95` | Trivial | 1 file |
| 19 | Note TLDR macOS benchmarks in docs | Trivial | 1 doc |
| 20 | Add ROADMAP subsystem to ARCHITECTURE.md | Small | 1 doc |

---

## Methodology

Three agents ran in parallel for ~5-25 minutes each:

1. **Architect agent** (91K tokens, 69 tool uses): Read settings.json, all 6 target hooks, 5 shared modules, 3 architecture docs. Produced pillar coherence, lifecycle ordering, state ownership, and coupling assessments.

2. **Critic agent** (111K tokens, 32 tool uses): Read 18 source files including all extraction hooks, session isolation, atomic write, Python bridge. Produced error handling, defense layer, session isolation, Python integration, and atomic write assessments.

3. **Scout agent** (118K tokens, 92 tool uses): Cross-referenced all 8 architecture docs against codebase reality. Counted hooks, agents, skills, scripts. Verified 6 specific claims. Checked for broken cross-references and stale documentation.

All findings are READ-ONLY observations. No files were modified during this review.

---

*Review saved to `.claude/reviews/context-management-review.md`*
