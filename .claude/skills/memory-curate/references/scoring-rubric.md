# Memory Curation Scoring Rubric

Scoring system for evaluating entries in the `archival_memory` table. Each entry receives a cumulative score that determines its classification.

## Scoring Criteria

### Positive Signals

| Points | Criterion | How to Detect |
|--------|-----------|---------------|
| +3 | Manual store | `session_id` does NOT contain `"auto-"` or `"periodic-"` |
| +2 | Unique, substantive content | Content length > 100 chars AND contains specific file paths (e.g. `src/`, `.ts`, `.py`) or error messages |
| +1 | High confidence | `confidence` = `'high'` |
| +1 | Actionable fix | Content contains both an error description AND a solution/fix |

### Negative Signals

| Points | Criterion | How to Detect |
|--------|-----------|---------------|
| -2 | Periodic extraction noise | `tags` contains both `"periodic"` AND `"extraction"` |
| -1 | Heartbeat/checkpoint | Content starts with `"Session checkpoint"`, `"Periodic extraction"`, or `"Heartbeat"` |
| -1 | Near-duplicate | >80% content overlap with another entry on the same topic |
| -1 | Generic statement | Content has no file paths, no error messages, no specific commands, and < 80 chars |

## Classification Thresholds

| Score | Class | Action |
|-------|-------|--------|
| >= 3 | **KEEP** | High-quality signal. Retain in active memory. |
| 1-2 | **REVIEW** | Ambiguous. Present to user for manual decision. |
| <= 0 | **ARCHIVE** | Noise. Recommend moving to archive table. |

## Examples: Signal vs Noise

### High-Quality Signal (KEEP, score 4+)

```
session_id: "hook-debugging"
learning_type: ERROR_FIX
content: "TypeScript hooks fail silently if dist/ doesn't exist. Always run npm run build after editing src/. The build.sh script compiles TS to JS in dist/."
tags: ["hooks", "typescript", "build"]
confidence: high
```

Score: +3 (manual store) +2 (>100 chars, has file paths) +1 (high confidence) +1 (actionable fix) = **+7**

Why it's signal:
- Manually stored by a human/agent who found it valuable
- Contains specific file paths (`dist/`, `src/`, `build.sh`)
- Pairs the problem with the solution
- High confidence from the author

### Medium-Quality (REVIEW, score 2)

```
session_id: "codebase-exploration"
learning_type: CODEBASE_PATTERN
content: "All session hooks use shared/types.ts for input/output interfaces."
tags: ["hooks", "patterns"]
confidence: medium
```

Score: +3 (manual store) -1 (generic, < 80 chars) = **+2**

Why it needs review:
- Manually stored (positive signal)
- But content is short and may be outdated
- No error/fix pairing
- User should decide if still relevant

### Low-Quality Noise (ARCHIVE, score -2)

```
session_id: "auto-periodic-2026-02-15"
learning_type: CODEBASE_PATTERN
content: "Session checkpoint at 2026-02-15T10:30:00Z. Working on hook development."
tags: ["periodic", "extraction", "checkpoint"]
confidence: low
```

Score: +0 (auto- prefix) -2 (periodic + extraction tags) -1 (heartbeat content) -1 (generic) = **-4**

Why it's noise:
- Auto-generated, not human-curated
- Periodic extraction checkpoint with no actionable content
- Tags mark it as automated noise
- No specific file paths, errors, or solutions

### Another Noise Example (ARCHIVE, score -1)

```
session_id: "auto-extract-session-42"
learning_type: WORKING_SOLUTION
content: "Fixed the issue"
tags: ["auto", "extraction"]
confidence: low
```

Score: +0 (auto- prefix) -1 (generic, < 80 chars, no details) = **-1**

Why it's noise:
- No specifics about what issue, what fix, or where
- Auto-extracted, not intentionally stored
- Useless for future recall -- too vague to act on

## SQL Commands Reference

### Query All Entries

```sql
SELECT id, session_id, learning_type, content, tags, confidence, created_at
FROM archival_memory
ORDER BY created_at DESC;
```

### Count Entries

```sql
SELECT COUNT(*) FROM archival_memory;
```

### Query by Session Type (Manual vs Auto)

```sql
-- Manual entries (likely higher quality)
SELECT id, learning_type, content, confidence
FROM archival_memory
WHERE session_id NOT LIKE 'auto-%' AND session_id NOT LIKE 'periodic-%'
ORDER BY created_at DESC;

-- Auto-extracted entries (likely noise)
SELECT id, learning_type, content, tags
FROM archival_memory
WHERE session_id LIKE 'auto-%' OR session_id LIKE 'periodic-%'
ORDER BY created_at DESC;
```

### Query Periodic Extraction Noise

```sql
SELECT id, content, tags
FROM archival_memory
WHERE tags::text LIKE '%periodic%' AND tags::text LIKE '%extraction%';
```

### Create Archive Table

```sql
CREATE TABLE IF NOT EXISTS archival_memory_archived (
  LIKE archival_memory INCLUDING ALL,
  archived_at TIMESTAMP DEFAULT NOW(),
  archive_reason TEXT
);
```

### Archive Entries (Copy Then Delete)

```sql
-- Step 1: Copy to archive
INSERT INTO archival_memory_archived
  (id, session_id, learning_type, content, context, tags, confidence, embedding, created_at, archive_reason)
SELECT
  id, session_id, learning_type, content, context, tags, confidence, embedding, created_at,
  'memory-curate: score <= 0'
FROM archival_memory
WHERE id IN ('id1', 'id2', 'id3');

-- Step 2: Verify copy succeeded
SELECT COUNT(*) FROM archival_memory_archived WHERE id IN ('id1', 'id2', 'id3');

-- Step 3: Delete from active table ONLY after verification
DELETE FROM archival_memory WHERE id IN ('id1', 'id2', 'id3');
```

### Restore Archived Entries

```sql
-- List archived entries
SELECT id, learning_type, content, archived_at, archive_reason
FROM archival_memory_archived
ORDER BY archived_at DESC;

-- Restore specific entries back to active table
INSERT INTO archival_memory
  (id, session_id, learning_type, content, context, tags, confidence, embedding, created_at)
SELECT
  id, session_id, learning_type, content, context, tags, confidence, embedding, created_at
FROM archival_memory_archived
WHERE id IN ('id1', 'id2', 'id3');

-- Remove from archive after restore
DELETE FROM archival_memory_archived WHERE id IN ('id1', 'id2', 'id3');
```

### Safety Check: Count Before and After

```sql
-- Run before archiving
SELECT 'active' as table_name, COUNT(*) FROM archival_memory
UNION ALL
SELECT 'archived', COUNT(*) FROM archival_memory_archived;

-- Run after archiving -- totals should match
SELECT 'active' as table_name, COUNT(*) FROM archival_memory
UNION ALL
SELECT 'archived', COUNT(*) FROM archival_memory_archived;
```
