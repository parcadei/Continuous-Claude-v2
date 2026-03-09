---
name: extract-v2
description: Smart learning extraction with signal/noise classification. Scans conversation for extractable insights, scores confidence, and generates store commands. Triggered by "extract learnings", "smart extract", or "extract v2".
user-invocable: true
---

# Learning Extractor v2

Enhanced extraction with signal/noise classification. Reviews the current conversation, identifies extractable insights, scores them by confidence, and presents findings before storing.

## When to Use

- "extract learnings" / "smart extract" / "extract v2"
- After completing a debugging session or multi-file change
- After making an architectural decision
- Before ending a session with significant new knowledge

---

## Signal vs Noise Classification

### SIGNAL — Store These

| Pattern | Example | Type |
|---------|---------|------|
| Error message + fix | "Error: X. Fixed by Y" | `ERROR_FIX` |
| Explicit decision with reasoning | "decided to / chose X because Y" | `ARCHITECTURAL_DECISION` |
| Specific file path + explanation | "`src/hooks/foo.ts` does X" | `CODEBASE_PATTERN` |
| Root cause identification | "root cause was / doesn't work because" | `ERROR_FIX` or `FAILED_APPROACH` |
| Code pattern discovery | Recurring structure, convention found | `CODEBASE_PATTERN` |
| Working solution | "fixed by / resolved with" | `WORKING_SOLUTION` |
| User correction | "I prefer / don't do" | `USER_PREFERENCE` |

### NOISE — Skip These

| Pattern | Why Skip |
|---------|----------|
| "periodic extraction" / "session checkpoint" | Metadata, not a learning |
| Task status only ("completed", "in progress") | No insight content |
| Generic statement with no specifics | Not actionable |
| Duplicates existing memory content | Already stored |
| Plan fragments or TODO lists | Pre-implementation, not knowledge |

---

## Confidence Scoring

| Level | Criteria |
|-------|----------|
| **high** | Explicit decision with rationale, or error + confirmed fix |
| **medium** | Inferred pattern or contextual observation with supporting detail |
| **low** | Ambient extraction, borderline content, single data point |

---

## Extraction Workflow

### Step 1: Scan

Review the conversation from the beginning. For each substantive exchange, ask:
- Does this contain new information not obvious from the code/docs?
- Is there a specific fix, decision, or pattern described?
- Would a future session benefit from knowing this?

### Step 2: Classify

For each candidate:
1. Match against SIGNAL patterns above
2. Match against NOISE patterns (skip if matched)
3. Assign type and confidence

### Step 3: Generate Store Commands

For each SIGNAL entry, produce:

```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/store_learning.py \
  --session-id "<short-identifier>" \
  --type <TYPE> \
  --content "<what was learned>" \
  --context "<what it relates to>" \
  --tags "<tag1,tag2,scope:project|scope:global>" \
  --confidence <high|medium|low>
```

### Step 4: Present Findings

Show the user a summary before storing:

```
## Extraction Results — <N> signals found

### 1. [ERROR_FIX] (confidence: high)
Content: TypeScript hooks fail silently when dist/ missing.
Command: [store command]

### 2. [ARCHITECTURAL_DECISION] (confidence: medium)
Content: ...
Command: [store command]

Store all? (y/n) Or pick individual entries.
```

### Step 5: Store on Confirmation

Run approved store commands. Report stored IDs.

---

## Scope Detection

| Signal | Tag |
|--------|-----|
| File paths, module names, "this codebase" | `scope:project` |
| "In general", "always", generic patterns | `scope:global` |
| Mixed or unclear | `scope:project` (safer default) |

---

## Integration Note

When used programmatically inside the extraction pipeline, this skill references `memory-quality-scorer.ts` for automated scoring. In interactive use (this skill), classification is performed by Claude following the rules above.

---

## Quick Reference

| Shortcut | Action |
|----------|--------|
| "extract learnings" | Full extraction workflow |
| "smart extract" | Same — full workflow |
| "extract v2" | Same — full workflow |
| "store all" | Run all approved commands after review |
| "skip noise" | Confirm skipping NOISE-classified items |
