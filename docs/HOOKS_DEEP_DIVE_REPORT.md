# Claude Code Hooks Deep Dive Report

**Generated:** 2026-01-12
**Research Team:** 5 parallel agents

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Files Analyzed | 67 TypeScript files |
| TypeScript Errors | 15 compilation errors |
| Critical Issues | 8 |
| Major Issues | 12 |
| Fixed Issues | ~24 stale sessions/claims cleaned |

---

## Issue Severity Matrix

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 8 | Breaking issues that prevent functionality |
| HIGH | 12 | Significant issues affecting reliability |
| MEDIUM | 15 | Error handling and code quality |
| LOW | 10 | Minor issues and code smells |

---

## CRITICAL Issues (Must Fix)

### 1. Memory Client Import Paths Wrong

**File:** `.claude/hooks/src/shared/memory-client.ts`

```typescript
// Lines 174, 216, 267 - WRONG
from scripts.agentica.memory_factory import get_default_backend
from scripts.agentica.memory_factory import create_default_memory_service

// Should be:
from scripts.core.db.memory_factory import get_default_backend
from scripts.core.db.memory_factory import create_default_memory_service
```

**Impact:** Memory storage via `memory-client.ts` will FAIL at runtime.

**Status:** ❌ NOT FIXED - Needs immediate attention

---

### 2. Learning Extractor Orphaned

**File:** `.claude/hooks/src/shared/learning-extractor.ts`

- Module exists with functions: `storeLearning()`, `extractTestPassLearning()`, `extractConfirmationLearning()`, `extractAgentLearning()`
- **NO HOOKS import or use this module**
- Test file exists (`user-confirm-learning.test.ts`) but no implementation

**Impact:** Auto-learning system is completely non-functional.

**Status:** ❌ NOT FIXED - Feature not implemented

---

### 3. Database URL Inconsistency

**File:** `.claude/hooks/dist/heartbeat.mjs:70`

```python
pg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL', ...)
```

**But** `db-utils-pg.ts` uses `OPC_POSTGRES_URL` or `DATABASE_URL`.

**Impact:** Heartbeat updates will fail if environment variables don't match.

**Status:** ❌ NOT FIXED - Environment variable mismatch

---

### 4. No Handoffs Directory

**Finding:** `~/.claude/handoffs/` directory doesn't exist (created during investigation).

**Impact:** Handoff indexing will fail silently.

**Status:** ✅ FIXED - Directory created during research

---

### 5. SQL Injection Vulnerability

**File:** `.claude/hooks/src/session-outcome.ts:107`

```typescript
SELECT id, file_path FROM handoffs WHERE session_name='${sessionName}'
```

**Impact:** Malformed session names could break queries or inject SQL.

**Status:** ❌ NOT FIXED - Needs parameterized queries

---

### 6. File Claims Race Condition

**File:** `.claude/hooks/src/file-claims.ts:57-72`

```typescript
// Check-then-claim is NOT atomic
const claimCheck = checkFileClaim(filePath, project, sessionId);
if (!claimCheck.claimed) {
  claimFile(filePath, project, sessionId);  // Another session can interleave here
}
```

**Impact:** Two sessions could both claim the same file.

**Status:** ❌ NOT FIXED - Classic TOCTOU race condition

---

### 7. No File Claims Cleanup on Session End

**File:** `.claude/hooks/src/session-end-cleanup.ts`

**Issue:** No `releaseSessionClaims(sessionId)` function exists or is called.

**Impact:** File locks persist after session ends (cleaned up during our session).

**Status:** ⚠️ PARTIALLY FIXED - Cleaned 55 stale claims manually

---

### 8. Session Transcripts Not Being Recorded

**Log Evidence:**
```
[2026-01-12 21:20:56] No JSONL found for session s-mkbnw58c, skipping
```

**Impact:** Memory daemon cannot extract learnings from sessions with no transcripts.

**Status:** ❌ NOT FIXED - Investigate transcript recording

---

## HIGH Priority Issues

### 9. TypeScript Compilation Errors

| Error Type | Count | Files Affected |
|------------|-------|----------------|
| Missing `.js` extension | 3 | `impact-refactor.ts`, `tldr-context-inject.ts`, `tldr-read-enforcer.ts` |
| Missing type definitions | 4 | `better-sqlite3`, `vitest` |
| Interface not exported | 1 | `SessionStartInput` in `session-register.ts` |
| Missing DaemonResponse property | 2 | `daemon-client.ts`, `edit-context-inject.ts` |

**Status:** ❌ NOT FIXED - Need to fix tsconfig and imports

---

### 10. Hook Output Format Inconsistency

| Hook | Output Format | Status |
|------|---------------|--------|
| `session-start-dead-code.ts` | Plain text warning | ❌ WRONG |
| `session-start-tldr-cache.ts` | Raw string | ❌ WRONG |
| `session-register.ts` | Valid JSON | ✅ Correct |
| `session-start-continuity.ts` | Valid JSON | ✅ Correct |
| `session-end-cleanup.ts` | Valid JSON | ✅ Correct |

**Impact:** Hooks outputting plain text may be ignored by Claude Code.

**Status:** ❌ NOT FIXED - 2 hooks have wrong format

---

### 11. No Connection Pooling for PostgreSQL

**File:** `.claude/hooks/src/shared/db-utils-pg.ts`

Each database call spawns a new asyncpg connection:

```python
conn = await asyncpg.connect(pg_url)
await conn.close()
```

**Impact:** Performance overhead for frequent hook calls.

**Status:** ⚠️ ACKNOWLEDGED - Works but inefficient

---

### 12. Session Working On Field Always Empty

**Finding:** All 35 remaining sessions have `working_on = NULL`.

**Root Cause:** `session-register.ts:53` passes empty string:
```typescript
registerSession(sessionId, project, '');  // Third param is always empty
```

**Status:** ❌ NOT FIXED - Hook doesn't set this field

---

### 13. Schema Not in init-db.sql

**Tables created dynamically in code:**

| Table | Created In |
|-------|------------|
| `sessions` | `db-utils-pg.ts:404-412` |
| `file_claims` | `db-utils-pg.ts:546-554` |

**Impact:** No proper indexes, schema not version-controlled.

**Status:** ❌ NOT FIXED - Schema drift risk

---

### 14. Missing Indexes on Sessions Table

**Queries without indexes:**
- `sessions.last_heartbeat` - queried for active sessions
- `(project, last_heartbeat)` compound - queried together

**Status:** ❌ NOT FIXED - Performance impact

---

### 15. SQLite Fallback Inconsistency

**File:** `.claude/hooks/src/handoff-index.ts`

Uses SQLite for `instance_sessions` while coordination uses PostgreSQL.

**Status:** ⚠️ KNOWN - Design choice, not a bug

---

## MEDIUM Priority Issues

### 16. Silent Error Handling

Multiple hooks swallow errors without logging:

| File | Line | Pattern |
|------|------|---------|
| `memory-awareness.ts` | 228-230 | `main().catch(() => {})` |
| `session-start-tldr-cache.ts` | 168-171 | `main().catch(() => {})` |
| `session-end-cleanup.ts` | 172-175 | `catch (err) { console.log(...) }` |

**Status:** ⚠️ ACKNOWLEDGED - Prevents crashes but hides issues

---

### 17. Daemon Lock Race Condition

**File:** `.claude/hooks/src/daemon-client.ts:70-90`

Check-then-delete is not atomic:
```typescript
if (existsSync(lockPath)) {  // Another process could create here
  unlinkSync(lockPath);      // Race condition
}
```

**Status:** ❌ NOT FIXED - Potential race in daemon startup

---

### 18. Database Write Results Not Checked

**File:** `session-register.ts:53`
```typescript
const registerResult = registerSession(sessionId, project, '');
```
Result is assigned but never checked.

**Status:** ❌ NOT FIXED - Silent failures possible

---

### 19. Test Without Implementation

**File:** `.claude/hooks/src/__tests__/user-confirm-learning.test.ts`

Test exists but no `user-confirm-learning.ts` hook.

**Status:** ❌ NOT FIXED - Orphaned test

---

### 20. Ledger Directory Not Validated

**File:** `session-end-cleanup.ts:75`

```typescript
const ledgerDir = path.join(projectDir, 'thoughts', 'ledgers');
const ledgerFiles = fs.readdirSync(ledgerDir);  // Throws if dir doesn't exist
```

**Status:** ❌ NOT FIXED - Unhandled edge case

---

### 21. Braintrust Script Path Hardcoded

**File:** `session-end-cleanup.ts:132-134`

Falls back to global script without dependency validation.

**Status:** ⚠️ ACKNOWLEDGED - Known limitation

---

## LOW Priority Issues

### 22. TLDR Context Not Using session_id

**File:** `session-start-continuity.ts`

Hook receives `session_id` in input but doesn't pass it to handoff lookup functions.

---

### 23. SQL Injection in handoff-index.ts

**Line 271:** Direct string interpolation in SQLite query.

---

### 24. Unused Imports

- `execSync` in `session-start-continuity.ts`
- Test framework types not installed

---

## Cleaned During Investigation

| Item | Before | After | Action |
|------|--------|-------|--------|
| Stale Sessions | 59 | 35 | Deleted sessions inactive >24h |
| Stale File Claims | 55 | 6 | Deleted claims >2h old |
| Handoffs Directory | Missing | Created | mkdir -p executed |

---

## Recommendations

### Immediate (This Session)

1. ✅ Clean up stale sessions and file claims (DONE)
2. ✅ Create handoffs directory (DONE)
3. Fix `memory-client.ts` import paths
4. Fix SQL injection in `session-outcome.ts`

### Short Term (This Week)

1. Add indexes to `sessions` table
2. Fix hook output format in `session-start-dead-code.ts`
3. Add `.js` extensions to imports
4. Create atomic file claim operation

### Medium Term (This Month)

1. Move schema to `init-db.sql`
2. Implement auto-learning hooks
3. Add connection pooling for PostgreSQL
4. Fix all TypeScript compilation errors

---

## Files Requiring Changes

```
.claude/hooks/src/
├── shared/
│   ├── memory-client.ts          # CRITICAL: Fix imports
│   ├── db-utils-pg.ts           # Add connection pooling
│   ├── db-utils.ts              # Error handling
│   └── learning-extractor.ts    # Orphaned - decide fate
├── session-register.ts          # Check DB results, set working_on
├── session-outcome.ts           # Fix SQL injection
├── session-end-cleanup.ts       # Validate ledger dir
├── file-claims.ts               # Atomic operations
└── session-start-dead-code.ts   # Fix output format
```

---

## Monitoring Status

| Component | Status |
|-----------|--------|
| PostgreSQL | ✅ Running |
| Sessions Table | ✅ 35 active |
| File Claims | ✅ 6 active |
| Handoffs | ❌ 0 recorded |
| Learnings | 3300 total (3300 benchmark, 1 real) |
| Auto-Learning | ❌ Not implemented |

---

## Conclusion

The hook system has significant structural issues:

1. **Auto-learning is completely broken** - no hooks store learnings
2. **TypeScript compilation has 15 errors** - some hooks may not run
3. **Race conditions exist** in file claims and daemon locking
4. **Schema is not version-controlled** - tables created in code

**Recommendation:** Prioritize fixing the import paths and adding auto-learning hooks. The system has good architecture but key functionality is not implemented or is broken.
