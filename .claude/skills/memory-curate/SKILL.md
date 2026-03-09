---
name: memory-curate
description: Audit and curate the memory system -- identify signal vs noise, score entries, and archive low-quality learnings.
allowed-tools: [Bash, Read]
---

# Memory Curate

Audit and curate the persistent memory system (PostgreSQL `archival_memory` table). Most auto-extracted entries are noise. This skill identifies signal vs noise and helps clean up.

**References:**
- Scoring rubric, examples, and SQL commands: `references/scoring-rubric.md`

## Triggers

Activate this skill when the user says any of:
- "curate memory"
- "clean memory"
- "memory audit"
- "memory curate"
- "review memory entries"
- "memory cleanup"

## Usage

```
/memory-curate              # Dry-run audit (default, report only)
/memory-curate --archive    # Archive noise entries (requires confirmation)
/memory-curate --restore    # Restore previously archived entries
```

## Safety Requirements

1. **Default mode is always dry-run / report only** -- never modify data without explicit request
2. **Destructive operations require explicit user confirmation** -- user must say "archive" or "confirm"
3. **Always archive before deleting** -- entries move to `archival_memory_archived`, never hard-deleted
4. **Restore capability** -- archived entries can be restored at any time
5. **Show what will change** -- always display the full list of entries before any modification

## Workflow

### Step 1: Query All Entries

Run the following to fetch all memory entries:

```bash
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "SELECT id, session_id, learning_type, content, tags, confidence, created_at FROM archival_memory ORDER BY created_at DESC;"
```

If the table has many entries, paginate with LIMIT/OFFSET:

```bash
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "SELECT COUNT(*) FROM archival_memory;"
```

### Step 2: Score Each Entry

Apply the scoring rubric from `references/scoring-rubric.md` to each entry:

| Points | Criterion |
|--------|-----------|
| +3 | Manual store (session_id does NOT contain "auto-" or "periodic-") |
| +2 | Unique content > 100 chars with specific file paths or error messages |
| +1 | High confidence tag |
| +1 | Contains actionable fix (error message paired with solution) |
| -2 | Tags contain both "periodic" AND "extraction" |
| -1 | Content is heartbeat/checkpoint (e.g. "Session checkpoint at...", "Periodic extraction...") |
| -1 | Near-duplicate of another entry (similar content, same topic) |
| -1 | Generic statement with no specific details |

### Step 3: Classify

| Score | Class | Meaning |
|-------|-------|---------|
| >= 3 | KEEP | High-quality signal -- retain |
| 1-2 | REVIEW | Ambiguous -- present to user for decision |
| <= 0 | ARCHIVE | Noise -- recommend removal |

### Step 4: Present Report

Format the curation report as follows:

```
Memory Curation Report
======================
Total entries: N
KEEP:    X (signal)
REVIEW:  Y (needs decision)
ARCHIVE: Z (noise)

Top 10 Highest Quality:
1. [ID] [type] score=S  "first 80 chars of content..."
2. ...

Archive Candidates (bottom 10):
1. [ID] [type] score=S  "first 80 chars of content..."
2. ...

REVIEW entries (need your decision):
1. [ID] [type] score=S  "first 80 chars of content..."
   Reason: <why it's ambiguous>
```

**Stop here in dry-run mode** (default). Ask the user what they want to do:
- "archive" or "confirm" to proceed with archiving ARCHIVE-class entries
- Select specific REVIEW entries to keep or archive
- "cancel" to make no changes

### Step 5: Archive (Only With Confirmation)

**REQUIRED:** User must explicitly say "archive" or "confirm" before proceeding.

1. **Create archive table** (if not exists):

```bash
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "CREATE TABLE IF NOT EXISTS archival_memory_archived (
    LIKE archival_memory INCLUDING ALL,
    archived_at TIMESTAMP DEFAULT NOW(),
    archive_reason TEXT
  );"
```

2. **Show exactly what will be archived** -- list all entries by ID with content preview.

3. **Archive entries** (copy then delete):

```bash
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "INSERT INTO archival_memory_archived (id, session_id, learning_type, content, context, tags, confidence, embedding, created_at, archive_reason)
   SELECT id, session_id, learning_type, content, context, tags, confidence, embedding, created_at, 'memory-curate: score <= 0'
   FROM archival_memory
   WHERE id IN (<comma-separated IDs>);"
```

4. **DELETE only after successful archive:**

```bash
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "DELETE FROM archival_memory WHERE id IN (<comma-separated IDs>);"
```

5. **Verify** -- confirm row counts match expectations.

### Step 6: Restore (If Requested)

To restore previously archived entries:

```bash
# List archived entries
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "SELECT id, learning_type, content, archived_at, archive_reason FROM archival_memory_archived ORDER BY archived_at DESC;"

# Restore specific entries
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "INSERT INTO archival_memory (id, session_id, learning_type, content, context, tags, confidence, embedding, created_at)
   SELECT id, session_id, learning_type, content, context, tags, confidence, embedding, created_at
   FROM archival_memory_archived
   WHERE id IN (<comma-separated IDs>);
   DELETE FROM archival_memory_archived WHERE id IN (<comma-separated IDs>);"
```

## Docker Connection

All database operations use the standard connection:

```bash
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c "SQL"
```

Credentials: `postgresql://claude:claude_dev@localhost:5432/continuous_claude`

## Output

Write the curation report to:

```
$CLAUDE_PROJECT_DIR/.claudedocs/memory-curation-report.md
```

Include: date, total entries, KEEP/REVIEW/ARCHIVE counts, top entries, archive candidates, and any actions taken.
