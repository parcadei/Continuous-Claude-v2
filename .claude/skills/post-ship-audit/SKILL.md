---
name: post-ship-audit
description: Standardized post-ship audit checklist to verify system health after feature deployment
allowed-tools: [Bash, Read, Grep, Glob]
metadata:
  keywords: [post-ship, audit, verify ship, post-ship audit, ship check, post deploy, regression check]
---

# Post-Ship Audit

Provides a 6-step audit workflow to verify system health after shipping a feature. Replaces manual regression checking that previously consumed 2-4 sessions.

**Triggers:** "post-ship", "audit", "verify ship", "post-ship audit"

**References:**
- Detailed checklist with expected outcomes and remediation: `references/audit-checklist.md`

## Prerequisites

Before starting, identify:
- **Project directory** -- the project that was shipped to
- **Feature name** -- what was just shipped (for ROADMAP verification)
- **Test runner** -- `npm test` (Node/TS) or `pytest` (Python)

## Procedure

### Step 1: Run Test Suite

Run the project's test suite to catch regressions.

```bash
# For Node/TypeScript projects
cd <project-dir> && npm test 2>&1 | tail -30

# For Python projects
cd <project-dir> && pytest 2>&1 | tail -30
```

**Pass criteria:** All tests pass (exit code 0).
**If FAIL:** Stop and report. Fix test failures before continuing the audit.

Record: total test count, pass count, failure count.

### Step 2: Hook Health Check

Verify all registered hooks have built dist files and the build succeeds.

```bash
# Build hooks
cd ~/.claude/hooks && npm run build 2>&1 | tail -5
```

Then check that every hook registered in settings.json has a matching dist file:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const home = process.env.HOME || process.env.USERPROFILE;
const settingsPath = path.join(home, '.claude', 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
const hooks = settings.hooks || {};
let issues = [];
let total = 0;
for (const [event, matchers] of Object.entries(hooks)) {
  for (const m of matchers) {
    const cmd = m.hooks?.[0]?.command || '';
    const match = cmd.match(/hooks\/dist\/([^\"\' ]+)/);
    if (match) {
      total++;
      const distPath = path.join(home, '.claude', 'hooks', 'dist', match[1]);
      if (!fs.existsSync(distPath)) {
        issues.push(match[1] + ' MISSING');
      }
    }
  }
}
console.log('Hooks checked: ' + total);
if (issues.length) {
  console.log('ISSUES: ' + issues.join(', '));
} else {
  console.log('All hooks healthy');
}
"
```

**Pass criteria:** Build succeeds and all registered hook dist files exist.

### Step 3: Sync Drift Check

Compare the continuous-claude repo against the active `~/.claude/` directory for unexpected drift. Use the sync-drift skill logic or run directly:

```bash
REPO="C:/Users/david.hayes/continuous-claude/.claude"
ACTIVE="C:/Users/david.hayes/.claude"

echo "--- hooks/src/ ---"
diff -rq "$REPO/hooks/src/" "$ACTIVE/hooks/src/" 2>/dev/null | grep -v node_modules | grep -v .tldr || echo "  In sync"

echo "--- rules/ ---"
diff -rq "$REPO/rules/" "$ACTIVE/rules/" 2>/dev/null || echo "  In sync"

echo "--- agents/ ---"
diff -rq "$REPO/agents/" "$ACTIVE/agents/" 2>/dev/null || echo "  In sync"
```

Ignore known local-only files: `settings.json`, `settings.local.json`, `CLAUDE.md`, `RULES.md`, `knowledge-tree.json`, `extraction-state.json`.

**Pass criteria:** No unexpected drift between repo and active directory.

### Step 4: Stale Reference Scan

Search CLAUDE.md, RULES.md, and rules/ for references to archived or removed components.

```bash
# Check for stale references to archived components
grep -riE "sentinel|warden|old-hook-name" \
  ~/.claude/CLAUDE.md \
  ~/.claude/RULES.md \
  ~/.claude/rules/*.md \
  2>/dev/null | grep -v "^Binary" || echo "No stale references found"

# Check for references to files that no longer exist
grep -rhoE '\b[a-z_-]+\.ts\b' ~/.claude/CLAUDE.md ~/.claude/RULES.md 2>/dev/null | sort -u | while read -r f; do
  if echo "$f" | grep -qE "^(example|test|sample)" ; then continue; fi
  if [[ ! -f ~/.claude/hooks/src/"$f" ]] && [[ ! -f ~/.claude/hooks/dist/"${f%.ts}.mjs" ]]; then
    echo "STALE REF: $f (not found in hooks/src/ or hooks/dist/)"
  fi
done
```

**Pass criteria:** No references to archived components. No dangling file references.

### Step 5: ROADMAP Verification

Read ROADMAP.md and verify the shipped feature's status is accurate.

```bash
# Read ROADMAP and check for the feature
cat ROADMAP.md 2>/dev/null | head -100
```

Check:
- Is the shipped feature listed?
- Is its status marked as completed or in-progress (not still "planned")?
- Are related sub-tasks accurately reflected?

**Pass criteria:** Shipped feature status is current in ROADMAP.md.

### Step 6: Git State Check

Check for uncommitted changes, orphaned branches, and general repository hygiene.

```bash
# Uncommitted changes
git status --short

# Orphaned branches (not merged to main)
git branch -a --no-merged main 2>/dev/null | head -10

# Recent commits (verify the ship commit is present)
git log --oneline -5
```

**Pass criteria:** No unexpected uncommitted changes. No orphaned feature branches from the shipped work.

## Output Format

Present results in this format:

```
Post-Ship Audit Report
======================
1. Test Suite:     PASS / FAIL (X tests, Y failures)
2. Hook Health:    PASS / FAIL (N hooks, M issues)
3. Sync State:     PASS / FAIL (N drifted files)
4. Stale Refs:     PASS / FAIL (N stale references)
5. ROADMAP:        PASS / FAIL (feature status)
6. Git State:      PASS / FAIL (uncommitted changes, orphaned branches)

Overall: PASS / FAIL
```

If any step is FAIL, include a remediation section below the report referencing `references/audit-checklist.md`.

## When to Run

- After merging a feature branch to main
- After a major refactor or migration
- At the start of a new session after a ship
- When "something feels off" after changes
- Before marking a feature as complete in ROADMAP.md

## Related

| Resource | Purpose |
|----------|---------|
| `references/audit-checklist.md` | Detailed checklist with remediation commands |
| `.claude/skills/sync-drift/SKILL.md` | Full sync drift detection skill |
| `.claude/rules/git-sync-workflow.md` | Git sync workflow documentation |
| `ROADMAP.md` | Project roadmap and feature tracking |
