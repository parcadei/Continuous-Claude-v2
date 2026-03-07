---
name: mot
description: System health check (MOT) for skills, agents, hooks, memory, ROADMAP, knowledge tree, and Braintrust
model: sonnet
allowed-tools: [Read, Bash, Glob, Grep]
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

## Audit Process

### Phase 1: Skills Audit
```bash
# Count skills
echo "=== SKILLS ==="
SKILL_COUNT=$(find .claude/skills -name "SKILL.md" | wc -l | xargs)
echo "Found $SKILL_COUNT skill files"

# Check frontmatter parsing
FAIL=0
for skill in $(find .claude/skills -name "SKILL.md"); do
  if ! head -1 "$skill" | grep -q "^---$"; then
    echo "FAIL: No frontmatter: $skill"
    FAIL=$((FAIL+1))
  fi
done
echo "Frontmatter: $((SKILL_COUNT - FAIL)) pass, $FAIL fail"

# Check name matches directory
FAIL=0
for skill in $(find .claude/skills -name "SKILL.md"); do
  dir=$(basename $(dirname "$skill"))
  name=$(grep "^name:" "$skill" 2>/dev/null | head -1 | cut -d: -f2 | xargs)
  if [ -n "$name" ] && [ "$dir" != "$name" ]; then
    echo "FAIL: Name mismatch $dir vs $name"
    FAIL=$((FAIL+1))
  fi
done
echo "Name consistency: $((SKILL_COUNT - FAIL)) pass, $FAIL fail"
```

### Phase 2: Agents Audit
```bash
echo "=== AGENTS ==="
AGENT_COUNT=$(ls .claude/agents/*.md 2>/dev/null | wc -l | xargs)
echo "Found $AGENT_COUNT agent files"

# Check required fields
FAIL=0
for agent in .claude/agents/*.md; do
  [ -f "$agent" ] || continue

  # Check name field exists
  if ! grep -q "^name:" "$agent"; then
    echo "FAIL: Missing name: $agent"
    FAIL=$((FAIL+1))
    continue
  fi

  # Check model is valid
  model=$(grep "^model:" "$agent" | head -1 | cut -d: -f2 | xargs)
  case "$model" in
    opus|sonnet|haiku) ;;
    *) echo "FAIL: Invalid model '$model': $agent"; FAIL=$((FAIL+1)) ;;
  esac
done
echo "Agent validation: $((AGENT_COUNT - FAIL)) pass, $FAIL fail"

# Check for dangling references (agents that reference non-existent agents)
echo "Checking agent cross-references..."
for agent in .claude/agents/*.md; do
  [ -f "$agent" ] || continue
  # Find subagent_type references
  refs=$(grep -oE 'subagent_type[=:]["'\'']*([a-z-]+)' "$agent" 2>/dev/null | sed 's/.*["'\'']//' | sed 's/["'\'']$//')
  for ref in $refs; do
    if [ ! -f ".claude/agents/$ref.md" ]; then
      echo "WARN: $agent references non-existent agent: $ref"
    fi
  done
done
```

### Phase 3: Hooks Audit
```bash
echo "=== HOOKS ==="

# Check TypeScript source count
TS_COUNT=$(ls .claude/hooks/src/*.ts 2>/dev/null | wc -l | xargs)
echo "Found $TS_COUNT TypeScript source files"

# Check bundles exist
BUNDLE_COUNT=$(ls .claude/hooks/dist/*.mjs 2>/dev/null | wc -l | xargs)
echo "Found $BUNDLE_COUNT built bundles"

# Check shell wrappers are executable
FAIL=0
for sh in .claude/hooks/*.sh; do
  [ -f "$sh" ] || continue
  if [ ! -x "$sh" ]; then
    echo "FAIL: Not executable: $sh"
    FAIL=$((FAIL+1))
  fi
done
SH_COUNT=$(ls .claude/hooks/*.sh 2>/dev/null | wc -l | xargs)
echo "Shell wrappers: $((SH_COUNT - FAIL)) executable, $FAIL need chmod +x"

# Check hooks registered in settings.json exist
echo "Checking registered hooks..."
FAIL=0
# Extract hook commands from settings.json and verify files exist
grep -oE '"command":\s*"[^"]*\.sh"' .claude/settings.json 2>/dev/null | \
  sed 's/.*"\([^"]*\.sh\)".*/\1/' | \
  sed 's|\$CLAUDE_PROJECT_DIR|.claude|g' | \
  sed "s|\$HOME|$HOME|g" | \
  sort -u | while read hook; do
    # Resolve to actual path
    resolved=$(echo "$hook" | sed 's|^\./||')
    if [ ! -f "$resolved" ] && [ ! -f "./$resolved" ]; then
      echo "WARN: Registered hook not found: $hook"
    fi
  done
```

### Phase 4: Memory Audit (Connectivity + Quality)
```bash
echo "=== MEMORY SYSTEM ==="

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "FAIL: DATABASE_URL not set"
else
  echo "PASS: DATABASE_URL is set"

  # Test connection
  if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "PASS: PostgreSQL reachable"

    # Check pgvector
    if psql "$DATABASE_URL" -c "SELECT extname FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep -q vector; then
      echo "PASS: pgvector extension installed"
    else
      echo "FAIL: pgvector extension not installed"
    fi

    # Check table exists
    if psql "$DATABASE_URL" -c "\d archival_memory" > /dev/null 2>&1; then
      echo "PASS: archival_memory table exists"

      # Count learnings
      COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM archival_memory" 2>/dev/null | xargs)
      echo "INFO: $COUNT learnings stored"

      # --- Quality checks ---

      # Learning count by type
      echo "Learning distribution:"
      docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
        "SELECT learning_type, COUNT(*) FROM archival_memory GROUP BY learning_type ORDER BY count DESC;" 2>/dev/null

      # Recent learnings (last 7 days)
      RECENT=$(docker exec continuous-claude-postgres psql -U claude -d continuous_claude -t -c \
        "SELECT COUNT(*) FROM archival_memory WHERE created_at > NOW() - INTERVAL '7 days';" 2>/dev/null | xargs)
      if [ -n "$RECENT" ] && [ "$RECENT" -gt 0 ] 2>/dev/null; then
        echo "PASS: $RECENT learnings in last 7 days"
      else
        echo "WARN: No learnings captured in last 7 days"
      fi

      # Duplicates check
      TOTAL=$(docker exec continuous-claude-postgres psql -U claude -d continuous_claude -t -c \
        "SELECT COUNT(*) FROM archival_memory;" 2>/dev/null | xargs)
      UNIQUE=$(docker exec continuous-claude-postgres psql -U claude -d continuous_claude -t -c \
        "SELECT COUNT(DISTINCT content) FROM archival_memory;" 2>/dev/null | xargs)
      if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ] 2>/dev/null; then
        RATIO=$((UNIQUE * 100 / TOTAL))
        echo "INFO: $UNIQUE unique / $TOTAL total learnings (${RATIO}% unique)"
        if [ "$RATIO" -lt 90 ]; then
          echo "WARN: Unique ratio ${RATIO}% < 90% -- possible duplicates"
        else
          echo "PASS: Unique ratio ${RATIO}% >= 90%"
        fi
      fi

      # Spot check: recall a known-good query
      echo "Spot check recall..."
      RECALL_OUT=$(cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/recall_learnings.py \
        --query "hook development" --k 1 --text-only 2>&1 | head -5)
      if [ -n "$RECALL_OUT" ] && echo "$RECALL_OUT" | grep -qv "^$"; then
        echo "PASS: Recall returns results for 'hook development'"
      else
        echo "WARN: Recall returned empty for spot check query"
      fi
    else
      echo "FAIL: archival_memory table missing"
    fi
  else
    echo "FAIL: PostgreSQL not reachable"
  fi
fi

# Check Python dependencies
echo "Checking Python dependencies..."
(cd opc && uv run python -c "import psycopg2; import pgvector; import sentence_transformers" 2>/dev/null) && \
  echo "PASS: Python dependencies available" || \
  echo "WARN: Some Python dependencies missing"
```

### Phase 5: Cross-Reference Audit
```bash
echo "=== CROSS-REFERENCES ==="

# Check skills reference valid agents
echo "Checking skill -> agent references..."
FAIL=0
for skill in $(find .claude/skills -name "SKILL.md"); do
  refs=$(grep -oE 'subagent_type[=:]["'\'']*([a-z-]+)' "$skill" 2>/dev/null | sed 's/.*["'\'']//' | sed 's/["'\'']$//')
  for ref in $refs; do
    if [ -n "$ref" ] && [ ! -f ".claude/agents/$ref.md" ]; then
      echo "FAIL: $skill references missing agent: $ref"
      FAIL=$((FAIL+1))
    fi
  done
done
echo "Skill->Agent refs: $FAIL broken"
```

### Phase 6: ROADMAP Health
```bash
echo "=== ROADMAP ==="

# Exists and non-empty
if [ -s ROADMAP.md ]; then
  LINES=$(wc -l < ROADMAP.md | xargs)
  echo "PASS: ROADMAP.md exists ($LINES lines)"
else
  echo "FAIL: ROADMAP.md missing or empty"
fi

# Current Focus set?
if grep -q "^_No current goal" ROADMAP.md 2>/dev/null; then
  echo "INFO: No active goal (idle)"
else
  FOCUS=$(grep -A1 "## Current Focus" ROADMAP.md 2>/dev/null | tail -1 | head -c 80)
  if [ -n "$FOCUS" ]; then
    echo "PASS: Current focus: $FOCUS"
  else
    echo "WARN: Could not parse current focus section"
  fi
fi

# Completed section growing unbounded? (warn if >50 items)
COMPLETED=$(grep -c "^\- \[x\]" ROADMAP.md 2>/dev/null || echo 0)
echo "INFO: $COMPLETED completed items"
if [ "$COMPLETED" -gt 50 ]; then
  echo "WARN: ROADMAP has $COMPLETED completed items -- consider archiving old entries"
fi

# Most recent completion has valid commit hash?
LATEST=$(grep "^\- \[x\]" ROADMAP.md 2>/dev/null | head -1)
if [ -n "$LATEST" ]; then
  if echo "$LATEST" | grep -qE '`[0-9a-f]{7}`'; then
    HASH=$(echo "$LATEST" | grep -oE '`[0-9a-f]{7}`' | head -1 | tr -d '`')
    if git log --oneline "$HASH" -1 > /dev/null 2>&1; then
      echo "PASS: Latest completion commit $HASH verified in git"
    else
      echo "WARN: Latest completion references commit $HASH but not found in git log"
    fi
  else
    echo "WARN: Latest completion has no commit hash"
  fi
fi
```

### Phase 7: Knowledge Tree Health
```bash
echo "=== KNOWLEDGE TREE ==="

TREE=".claude/knowledge-tree.json"

if [ ! -f "$TREE" ]; then
  echo "FAIL: $TREE missing"
elif [ ! -s "$TREE" ]; then
  echo "FAIL: $TREE empty (0 bytes) -- delete and regenerate"
else
  BYTES=$(wc -c < "$TREE" | xargs)
  echo "PASS: $TREE exists ($BYTES bytes)"

  # Check staleness marker
  if grep -q '"_stale":\s*true' "$TREE" 2>/dev/null; then
    echo "WARN: Tree marked stale -- needs regeneration"
  fi

  # Check age (warn if >24h old)
  AGE_HOURS=$(node -e "const fs=require('fs');const h=Math.floor((Date.now()-fs.statSync('.claude/knowledge-tree.json').mtimeMs)/3600000);console.log(h)")
  echo "INFO: Tree age: ${AGE_HOURS}h"
  if [ "$AGE_HOURS" -gt 24 ]; then
    echo "WARN: Tree is ${AGE_HOURS}h old -- consider regenerating"
  fi

  # Schema validation
  VALIDATE_OUT=$(cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/tree_schema.py \
    --validate "$CLAUDE_PROJECT_DIR/$TREE" 2>&1 | tail -3)
  if echo "$VALIDATE_OUT" | grep -qi "valid\|pass\|ok"; then
    echo "PASS: Schema validation passed"
  else
    echo "WARN: Schema validation: $VALIDATE_OUT"
  fi
fi
```

### Phase 8: Braintrust Tracing Health
```bash
echo "=== BRAINTRUST TRACING ==="

# Env var check
if [ "$TRACE_TO_BRAINTRUST" = "true" ]; then
  echo "PASS: TRACE_TO_BRAINTRUST=true"
else
  echo "INFO: Tracing disabled (TRACE_TO_BRAINTRUST != true)"
fi

if [ -n "$BRAINTRUST_API_KEY" ]; then
  echo "PASS: BRAINTRUST_API_KEY is set"
else
  if [ "$TRACE_TO_BRAINTRUST" = "true" ]; then
    echo "FAIL: BRAINTRUST_API_KEY not set but tracing enabled"
  else
    echo "INFO: BRAINTRUST_API_KEY not set (tracing disabled, OK)"
  fi
fi

# Session state files
BT_DIR="$HOME/.claude/state/braintrust_sessions"
if [ -d "$BT_DIR" ]; then
  SESSION_COUNT=$(ls "$BT_DIR"/*.json 2>/dev/null | wc -l | xargs)
  echo "INFO: $SESSION_COUNT session trace files"
  if [ "$SESSION_COUNT" -gt 100 ]; then
    echo "WARN: $SESSION_COUNT trace files -- consider cleanup"
  fi
else
  echo "INFO: No Braintrust session state directory"
fi

# Hook log check (recent errors?)
BT_LOG="$HOME/.claude/state/braintrust_hook.log"
if [ -f "$BT_LOG" ]; then
  ERRORS=$(grep -ci "error\|fail" "$BT_LOG" 2>/dev/null || echo 0)
  LINES=$(wc -l < "$BT_LOG" | xargs)
  echo "INFO: Hook log: $LINES lines, $ERRORS error mentions"
  if [ "$ERRORS" -gt 10 ]; then
    echo "WARN: $ERRORS errors in Braintrust hook log"
  fi
else
  echo "INFO: No Braintrust hook log found"
fi
```

## Auto-Fix (--fix flag)

If `--fix` is specified, automatically fix:

1. **Make shell wrappers executable**
   ```bash
   chmod +x .claude/hooks/*.sh
   ```

2. **Rebuild hooks if TypeScript newer than bundles**
   ```bash
   cd .claude/hooks && npm run build
   ```

3. **Create missing cache directories**
   ```bash
   mkdir -p .claude/cache/agents/{scout,kraken,oracle,spark}
   mkdir -p .claude/cache/mot
   ```

4. **Regenerate knowledge tree if stale or missing**
   ```bash
   # If tree is missing, empty, or marked stale
   TREE=".claude/knowledge-tree.json"
   if [ ! -s "$TREE" ] || grep -q '"_stale":\s*true' "$TREE" 2>/dev/null; then
     echo "FIX: Regenerating knowledge tree..."
     cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/knowledge_tree.py \
       --project "$CLAUDE_PROJECT_DIR" --verbose
   fi
   ```

5. **Make Braintrust hook shell wrappers executable**
   ```bash
   if ls .claude/plugins/braintrust-tracing/hooks/*.sh 2>/dev/null; then
     chmod +x .claude/plugins/braintrust-tracing/hooks/*.sh
     echo "FIX: Made Braintrust hook wrappers executable"
   fi
   ```

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

- `0` - All P0/P1 checks pass
- `1` - Any P0/P1 failure
- `2` - Only P2/P3 warnings

## Quick Mode (--quick)

Only run P0 checks:
1. Frontmatter parses
2. Hooks build
3. Shell wrappers executable
4. PostgreSQL reachable
5. ROADMAP.md exists
6. Knowledge tree exists and non-empty
