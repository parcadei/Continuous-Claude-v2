---
name: session-score
description: Score the current session's productivity on a 1-10 scale by analyzing git commits, task completion, agent usage, memory stores, and files changed. Use when asked "session score", "how productive was this session", "session quality", or "rate this session".
---

# Session Quality Score

Evaluate the current session's productivity across 5 metrics and produce a score from 1-10.

## When to Use

Triggered by: "session score", "how productive", "session quality", "rate this session", "how'd we do"

## The 5 Metrics

Run each data collection command, then score. Gracefully handle missing data (docker down, no commits, etc.).

### Metric 1: Fix vs Feat Ratio (2 pts)

Count fix commits vs feat commits in the last 8 hours:

```bash
git log --oneline --since="8 hours ago" 2>/dev/null | grep -ci "^[a-f0-9]* fix"
git log --oneline --since="8 hours ago" 2>/dev/null | grep -ci "^[a-f0-9]* feat"
git log --oneline --since="8 hours ago" 2>/dev/null | wc -l
```

Scoring:
- 2 pts: feat > fix (building new things)
- 1 pt: feat == fix, or feat > 0 even if fix is more (mixed session)
- 0.5 pts: all fixes, but commits exist (maintenance is still work)
- 0 pts: no commits this session

### Metric 2: Task Completion (2 pts)

If `.ralph/state.json` exists, check task status:

```bash
node -e "
try {
  const s = JSON.parse(require('fs').readFileSync('.ralph/state.json','utf8'));
  const tasks = s.tasks || [];
  const done = tasks.filter(t => t.status === 'complete' || t.status === 'completed').length;
  const total = tasks.length;
  console.log(done + '/' + total);
} catch(e) { console.log('no-task-file'); }
" 2>/dev/null
```

Scoring:
- 2 pts: all tasks complete, or >75% done
- 1 pt: 25-75% done
- 0.5 pts: <25% done but progress exists
- 0 pts: no task tracking active (note: not penalized, just untracked — give 1 pt default)

### Metric 3: Agent Spawn Count (2 pts)

Check skill telemetry if available, otherwise estimate from session context:

```bash
cat C:/Users/david.hayes/.claude/cache/skill-telemetry.jsonl 2>/dev/null | \
  node -e "
    const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\n').filter(Boolean);
    const today = new Date(); today.setHours(today.getHours()-8);
    const recent = lines.filter(l => { try { return new Date(JSON.parse(l).ts) > today; } catch(e){return false;} });
    console.log(recent.length);
  " 2>/dev/null || echo "0"
```

If telemetry unavailable, estimate from visible agent Task calls in this conversation.

Scoring:
- 2 pts: 3+ distinct agents spawned (delegation pattern working)
- 1 pt: 1-2 agents spawned
- 0.5 pts: 0 agents but complex work done directly (acceptable)
- 0 pts: session was entirely trivial (score 0.5 as floor)

### Metric 4: Memory Stores (2 pts)

Count learnings stored in the last 8 hours:

```bash
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" exec continuous-claude-postgres \
  psql -U claude -d continuous_claude -t -c \
  "SELECT COUNT(*) FROM archival_memory WHERE created_at > NOW() - INTERVAL '8 hours';" \
  2>/dev/null | tr -d ' '
```

Scoring:
- 2 pts: 2+ learnings stored
- 1 pt: 1 learning stored
- 0 pts: 0 stored (note the gap — suggest storing if non-trivial work was done)

### Metric 5: Files Modified (2 pts)

Count files changed this session via recent commits:

```bash
COMMITS=$(git log --oneline --since="8 hours ago" 2>/dev/null | wc -l)
if [ "$COMMITS" -gt 0 ]; then
  git diff --stat HEAD~${COMMITS} 2>/dev/null | tail -1
else
  git diff --stat HEAD 2>/dev/null | tail -1
fi
```

Scoring:
- 2 pts: 5+ files changed (broad, meaningful work)
- 1 pt: 2-4 files changed
- 0.5 pts: 1 file changed
- 0 pts: no file changes (conversation-only session — note this, don't penalize harshly)

## Calculating the Score

Sum all metric scores (max 10). Apply one adjustment:

**Momentum bonus (+0.5):** If all metrics have data (session was active across all dimensions), add 0.5, cap at 10.

## Output Format

Present the report in this structure:

```
Session Quality Score: X/10
=========================

Metric            Score   Signal
---------         -----   ------
Fix/Feat ratio    X/2     [e.g., "2 feats, 1 fix — building mode"]
Task completion   X/2     [e.g., "3/4 tasks done (75%)"]
Agent delegation  X/2     [e.g., "2 agents spawned (scout, kraken)"]
Memory stores     X/2     [e.g., "1 learning stored"]
Files modified    X/2     [e.g., "7 files across 3 commits"]

Final: X/10  [Label]

[1-2 sentence takeaway — what this session accomplished + one suggestion if score < 7]
```

Score labels:
- 9-10: Excellent — high-leverage session
- 7-8: Good — solid progress
- 5-6: Moderate — some gaps
- 3-4: Light — mostly exploratory
- 1-2: Minimal — context only

## Notes

- Missing data (docker down, no commits) never causes a score of 0 — use 0.5 as floor per metric
- Conversation-only sessions (no commits) are valid; reflect this in the takeaway
- If docker is unavailable for Metric 4, note it and skip that metric, redistribute 2 pts to Metric 5
- On Windows, docker path may need the full binary path shown above
