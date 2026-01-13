# Hooks Deep Dive Fix Plan

**Branch:** `fix/hooks-deep-dive-fixes`
**Generated:** 2026-01-12
**Research Team:** 9 agents (20 planned)

---

## Overview

Based on comprehensive analysis, this plan addresses **35 issues** across **20 fix tasks**.

### Issue Summary

| Severity | Count | Category |
|----------|-------|----------|
| CRITICAL | 8 | Security, broken functionality |
| HIGH | 12 | Reliability, performance |
| MEDIUM | 15 | Code quality, error handling |
| LOW | 10 | Code smells, documentation |

---

## Execution Order (Groups of 5)

### Group 1: Critical Security Fixes

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1 | Fix SQL injection in `getRelevantFindings()` | `db-utils-pg.ts` | 30 min |
| 2 | Fix SQL injection in `session-outcome.ts` | `session-outcome.ts` | 20 min |
| 3 | Fix file claims race condition | `file-claims.ts` | 45 min |
| 4 | Fix memory-client import paths | `memory-client.ts` | 15 min |
| 5 | Fix database URL consistency | `heartbeat.mjs`, `.env` | 15 min |

### Group 2: TypeScript Compilation

| # | Task | Files | Effort |
|---|------|-------|--------|
| 6 | Add SessionStartInput to types.ts | `types.ts` | 10 min |
| 7 | Add DaemonResponse.imports property | `daemon-client.ts` | 10 min |
| 8 | Add .js extensions to imports (3 files) | `impact-refactor.ts`, etc. | 10 min |
| 9 | Add type definitions to package.json | `package.json` | 5 min |
| 10 | Rebuild hooks and verify | Build process | 15 min |

### Group 3: Hook Output & Error Handling

| # | Task | Files | Effort |
|---|------|-------|--------|
| 11 | Fix session-start-dead-code.ts output | `session-start-dead-code.ts` | 15 min |
| 12 | Fix session-start-tldr-cache.ts output | `session-start-tldr-cache.ts` | 15 min |
| 13 | Create hook logger utility | `hook-logger.ts` (new) | 30 min |
| 14 | Update hooks with proper error handling | 4 hook files | 45 min |
| 15 | Add DB write result checking | `session-register.ts` | 15 min |

### Group 4: Auto-Learning & Schema

| # | Task | Files | Effort |
|---|------|-------|--------|
| 16 | Create user-confirm-learning.ts hook | New file | 60 min |
| 17 | Create auto-learning state module | `auto-learning-state.ts` (new) | 30 min |
| 18 | Create settings.json for hook registration | New file | 15 min |
| 19 | Move findings table to init-db.sql | `init-db.sql`, `db-utils-pg.ts` | 30 min |
| 20 | Add coordination table indexes | Migration SQL | 20 min |

---

## Detailed Task Specifications

### Task 1: Fix SQL Injection in getRelevantFindings()

**File:** `.claude/hooks/src/shared/db-utils-pg.ts`

**Current (VULNERABLE):**
```typescript
rows = await conn.fetch('''
    SELECT ...
    WHERE session_id != $1
      AND (topic ILIKE '%' || $2 || '%'    -- DANGER: $2 interpolated
           OR $2 = ANY(relevant_to)
           OR finding ILIKE '%' || $2 || '%')  -- DANGER: $2 interpolated
''', exclude_session, query, limit)
```

**Fixed:**
```typescript
rows = await conn.fetch('''
    SELECT ...
    WHERE session_id != $1
      AND (topic ILIKE $2
           OR $2 = ANY(relevant_to)
           OR finding ILIKE $2)
''', exclude_session, `%${query}%`, limit)
```

---

### Task 2: Fix SQL Injection in session-outcome.ts

**File:** `.claude/hooks/src/session-outcome.ts`

**Current (VULNERABLE):**
```typescript
sqlite3 "${dbPath}" \
  "SELECT id, file_path FROM handoffs WHERE session_name='${sessionName}'"
```

**Fixed (using better-sqlite3):**
```typescript
import Database from 'better-sqlite3';
const db = new Database(dbPath);
const stmt = db.prepare(`
  SELECT id, file_path FROM handoffs
  WHERE session_name = ?
  ORDER BY indexed_at DESC LIMIT 1
`);
const row = stmt.get(sessionName);
```

---

### Task 3: Fix File Claims Race Condition

**File:** `.claude/hooks/src/file-claims.ts`

**Current (RACE CONDITION):**
```typescript
const claimCheck = checkFileClaim(filePath, project, sessionId);
if (!claimCheck.claimed) {
  claimFile(filePath, project, sessionId);  // Another session can interleave
}
```

**Fixed (ATOMIC):**
```typescript
export function claimFileAtomic(...) {
  // Uses PostgreSQL SELECT FOR UPDATE with SKIP LOCKED
  // Single atomic transaction
}
```

---

### Task 4: Fix Memory Client Import Paths

**File:** `.claude/hooks/src/shared/memory-client.ts`

**Lines 174, 216, 267 - Change:**
```typescript
// FROM:
from scripts.agentica.memory_factory import get_default_backend

// TO:
from scripts.core.db.memory_factory import get_default_backend
```

---

### Task 5: Fix Database URL Consistency

**Change `heartbeat.mjs:70`:**
```python
# FROM:
pg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL', ...)

# TO:
pg_url = os.environ.get('OPC_POSTGRES_URL', ...)
```

**Add to `opc/.env`:**
```bash
OPC_POSTGRES_URL=postgresql://claude:claude_dev@localhost:5432/continuous_claude
```

---

### Task 6-10: TypeScript Compilation Fixes

**Add to `src/shared/types.ts`:**
```typescript
export interface SessionStartInput {
  session_id: string;
  project?: string;
  working_on?: string;
  parent_session_id?: string;
  agent_id?: string;
  metadata?: Record<string, unknown>;
}
```

**Add to `src/daemon-client.ts` (DaemonResponse interface):**
```typescript
imports?: any[];
```

**Add to `package.json`:**
```json
"@types/better-sqlite3": "^11.0.0",
"@vitest/types": "^2.0.0"
```

**Add .js extensions to 3 files:**
- `impact-refactor.ts:12`
- `tldr-context-inject.ts:25`
- `tldr-read-enforcer.ts:14`

---

### Task 11-12: Hook Output Format Fixes

**Before (WRONG):**
```typescript
console.log(warning);  // Plain text
```

**After (CORRECT):**
```typescript
console.log(JSON.stringify({
  result: 'continue',
  message: warning
}));
```

---

### Task 13-15: Error Handling Improvements

**Create `src/shared/hook-logger.ts`:**
```typescript
export function hookLog(level: 'debug'|'info'|'warn'|'error', ...args: unknown[]): void {
  if (level === 'debug' && !process.env.HOOK_DEBUG) return;
  const msg = args.map(String).join(' ');
  console.error(`[HOOK ${level.toUpperCase()}] ${msg}`);
}
```

**Update all hooks to use logger instead of empty catch blocks.**

---

### Task 16-18: Auto-Learning Implementation

**Create `user-confirm-learning.ts`:**
- Triggers on `UserPromptSubmit`
- Detects positive responses ("thanks", "works", "good")
- Calls `learning-extractor.extractConfirmationLearning()`

**Create `auto-learning-state.ts`:**
- Tracks recent edits for context
- Prevents duplicate extractions
- State cleanup on session end

**Create `settings.json`:**
```json
{
  "hooks": [
    {
      "type": "UserPromptSubmit",
      "hooks": [{
        "type": "command",
        "command": "node $HOOK_DIR/dist/user-confirm-learning.mjs"
      }]
    }
  ]
}
```

---

### Task 19: Schema Migration

**Add to `init-db.sql`:**
```sql
CREATE TABLE IF NOT EXISTS findings (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    finding TEXT NOT NULL,
    relevant_to TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_findings_session ON findings(session_id);
CREATE INDEX idx_findings_topic ON findings(topic);
CREATE INDEX idx_findings_created ON findings(created_at DESC);
CREATE INDEX idx_findings_relevant ON findings USING GIN(relevant_to);
```

**Remove redundant CREATE TABLE from `db-utils-pg.ts`:**
- Lines 404-412 (sessions)
- Lines 545-554 (file_claims)
- Lines 663-672 (findings)

---

### Task 20: Database Indexes

**Create migration:**
```sql
CREATE INDEX idx_sessions_heartbeat_extracted
  ON sessions(last_heartbeat, memory_extracted_at);

CREATE INDEX idx_sessions_project_heartbeat
  ON sessions(project, last_heartbeat DESC);

CREATE INDEX idx_sessions_last_heartbeat
  ON sessions(last_heartbeat DESC);

CREATE INDEX idx_file_claims_project
  ON file_claims(project);

CREATE INDEX idx_file_claims_session
  ON file_claims(session_id);
```

---

## Verification Commands

```bash
# After all fixes
cd /Users/grantray/Github/Continuous-Claude-v3/.claude/hooks

# Install dependencies
npm install

# Type check
npm run check

# Build
npm run build

# Test database functions
cd /Users/grantray/Github/Continuous-Claude-v3/opc
uv run pytest tests/ -v

# Verify database state
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c "\dt"
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `docs/HOOKS_DEEP_DIVE_REPORT.md` | Analysis report (DONE) |
| `docs/HOOKS_FIX_PLAN.md` | This plan |
| `.claude/hooks/src/shared/hook-logger.ts` | Logging utility |
| `.claude/hooks/src/user-confirm-learning.ts` | Auto-learning hook |
| `.claude/hooks/src/auto-learning-state.ts` | State management |
| `.claude/settings.json` | Hook registration |
| `opc/scripts/migrations/002_add_coordination_indexes.sql` | Index migration |
| `opc/scripts/migrations/003_add_findings_table.sql` | Findings migration |

---

## Files to Modify

| File | Changes |
|------|---------|
| `.claude/hooks/src/shared/memory-client.ts` | Fix import paths (3 locations) |
| `.claude/hooks/src/shared/db-utils-pg.ts` | Fix SQL injection, remove CREATE TABLE |
| `.claude/hooks/src/session-outcome.ts` | Fix SQL injection |
| `.claude/hooks/src/file-claims.ts` | Fix race condition |
| `.claude/hooks/dist/heartbeat.mjs` | Fix DB URL variable |
| `.claude/hooks/src/shared/types.ts` | Add SessionStartInput |
| `.claude/hooks/src/daemon-client.ts` | Add imports property |
| `.claude/hooks/src/impact-refactor.ts` | Add .js extension |
| `.claude/hooks/src/tldr-context-inject.ts` | Add .js extension |
| `.claude/hooks/src/tldr-read-enforcer.ts` | Add .js extension |
| `.claude/hooks/package.json` | Add type dependencies |
| `.claude/hooks/src/session-start-dead-code.ts` | Fix output format |
| `.claude/hooks/src/session-start-tldr-cache.ts` | Fix output format |
| `.claude/hooks/src/session-register.ts` | Check DB results |
| `.claude/hooks/src/session-end-cleanup.ts` | Add error handling |
| `.claude/hooks/src/memory-awareness.ts` | Add error handling |
| `opc/.env` | Add OPC_POSTGRES_URL |
| `init-db.sql` | Add findings table |

---

## Estimated Total Time

| Phase | Tasks | Time |
|-------|-------|------|
| Group 1: Critical Security | 5 | 2.5 hours |
| Group 2: TypeScript | 5 | 1 hour |
| Group 3: Output & Errors | 5 | 2.5 hours |
| Group 4: Auto-Learning | 4 | 3 hours |
| **Total** | **19** | **~9 hours** |

---

## Approval Required

Shall I proceed with executing this plan? I'll start with **Group 1 (Critical Security Fixes)** which addresses the most urgent issues.

**Key risks to note:**
- Task 3 (file claims) changes database transaction behavior
- Task 19 (schema migration) requires database restart
- Task 16-18 (auto-learning) is new functionality
