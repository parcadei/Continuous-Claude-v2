# Post-Ship Audit Checklist

Detailed checklist for each audit step with expected outcomes and remediation commands.

## 1. Test Suite

**What to check:**
- Run the project's test suite (`npm test` or `pytest`)
- All tests should pass with exit code 0
- No new warnings or deprecation notices

**Expected outcome:** 0 failures, 0 errors.

**Pass criteria:**
- Exit code 0
- All test cases pass
- No skipped tests that were previously passing

**Remediation if FAIL:**
```bash
# View full test output
cd <project-dir> && npm test 2>&1

# Run specific failing test
cd <project-dir> && npm test -- --grep "failing test name"

# For Python
cd <project-dir> && pytest -v --tb=long
```

**Common causes:**
- Import path changed but tests reference old path
- Dependency version conflict introduced
- Environment variable missing after deploy

---

## 2. Hook Health Check

**What to check:**
- `npm run build` in hooks directory succeeds
- Every hook registered in `~/.claude/settings.json` has a corresponding `.mjs` file in `hooks/dist/`
- No TypeScript compilation errors

**Expected outcome:** Build succeeds. All registered hooks have dist files.

**Pass criteria:**
- Build exit code 0
- Zero MISSING dist files
- No compilation warnings

**Remediation if FAIL:**
```bash
# Rebuild hooks
cd ~/.claude/hooks && npm run build

# If build fails, check TypeScript errors
cd ~/.claude/hooks && npx tsc --noEmit

# If dist file missing, check if source exists
ls ~/.claude/hooks/src/<hook-name>.ts

# If source missing, may need to sync from repo
bash ~/continuous-claude/scripts/sync-to-active.sh
```

**Common causes:**
- Source file edited but not rebuilt
- TypeScript type error in new hook
- Missing dependency in hooks/package.json

---

## 3. Sync Drift Check

**What to check:**
- Compare `continuous-claude/.claude/` (repo) with `~/.claude/` (active)
- Check: hooks/src/, rules/, agents/, skills/
- Ignore known local-only files (settings.json, CLAUDE.md, RULES.md, knowledge-tree.json)

**Expected outcome:** No unexpected drift between repo and active directory.

**Pass criteria:**
- All synced directories match
- No stale builds (src newer than dist)
- No files missing from active that exist in repo

**Remediation if FAIL:**
```bash
# Forward sync (repo to active)
bash ~/continuous-claude/scripts/sync-to-active.sh

# Rebuild after sync
cd ~/.claude/hooks && npm run build

# Reverse sync if active has newer changes
bash ~/continuous-claude/scripts/sync-claude.sh --to-repo

# Full drift report
# Use: /skill sync-drift
```

**Common causes:**
- Forgot to run sync after git pull
- Made edits in ~/.claude directly without syncing back
- Post-commit hook didn't trigger

---

## 4. Stale Reference Scan

**What to check:**
- Search CLAUDE.md, RULES.md, and rules/ for references to archived or removed components
- Known archived components: Sentinel, Warden, and any hooks/agents that were retired
- Check for file references that point to non-existent files

**Expected outcome:** No stale references to archived components.

**Pass criteria:**
- Zero matches for archived component names
- All file references resolve to existing files
- No dangling cross-references

**Remediation if FAIL:**
```bash
# Find all stale references
grep -rn "sentinel\|warden\|<archived-name>" ~/.claude/CLAUDE.md ~/.claude/RULES.md ~/.claude/rules/

# Fix: Edit the file to remove or update the reference
# Use Read tool to check the context, then Edit to fix
```

**Common causes:**
- Component was archived but docs not updated
- Hook was renamed but old name persists in rules
- Skill was split/merged but references not updated

---

## 5. ROADMAP Verification

**What to check:**
- Read ROADMAP.md in the project root
- Find the shipped feature entry
- Verify its status reflects completion or current progress

**Expected outcome:** Shipped feature is marked as completed or in-progress.

**Pass criteria:**
- Feature is listed in ROADMAP.md
- Status is accurate (not still "planned" if shipped)
- Sub-tasks reflect actual completion state
- No stale dates or outdated descriptions

**Remediation if FAIL:**
```bash
# Read current ROADMAP
cat ROADMAP.md

# Update feature status
# Use Edit tool to change status from "planned" to "completed"
# or add the feature if it's missing entirely
```

**Common causes:**
- ROADMAP auto-sync hook didn't fire
- Feature shipped on a branch but ROADMAP only updated on main
- Manual ROADMAP update was forgotten

---

## 6. Git State Check

**What to check:**
- `git status` for uncommitted changes
- `git branch --no-merged main` for orphaned branches
- Recent commit history to verify the ship commit landed

**Expected outcome:** Clean working tree. No orphaned feature branches.

**Pass criteria:**
- No unexpected uncommitted changes (staged or unstaged)
- No feature branches from the shipped work still lingering
- Ship commit is visible in recent history

**Remediation if FAIL:**
```bash
# Commit uncommitted changes
git add <specific-files> && git commit -m "post-ship: <description>"

# Delete merged branches (after confirming they're merged)
git branch -d <branch-name>

# If branch wasn't merged, check if it should be
git log main..<branch-name> --oneline
```

**Common causes:**
- Debug files left uncommitted
- Feature branch not deleted after merge
- Generated files changed but not committed

---

## Quick Reference

| Step | Command | Pass When |
|------|---------|-----------|
| Test suite | `npm test` / `pytest` | Exit code 0 |
| Hook health | `cd ~/.claude/hooks && npm run build` | Build succeeds, all dist files exist |
| Sync drift | `diff -rq repo/ active/` | No unexpected differences |
| Stale refs | `grep -ri "archived-name" docs/` | Zero matches |
| ROADMAP | `cat ROADMAP.md` | Feature status is current |
| Git state | `git status --short` | Clean tree, no orphaned branches |

## Overall Result

- **PASS:** All 6 steps pass. Ship is clean.
- **FAIL:** Any step fails. Run the remediation for that step, then re-run the audit.

A successful post-ship audit confirms the system is healthy and no regressions were introduced.
