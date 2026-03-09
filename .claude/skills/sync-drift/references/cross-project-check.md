# Cross-Project Sync Health Check

Verify `.claude/` presence and sync state across all projects in the registry.

```bash
REPO="C:/Users/david.hayes/continuous-claude/.claude"
```

## Step 1: List Active Projects and Check .claude/ Presence

```bash
node -e "
const fs = require('fs');
const path = require('path');
const reg = JSON.parse(fs.readFileSync('C:/Users/david.hayes/continuous-claude/.claude/project-registry.json', 'utf8'));
const active = reg.projects.filter(p => p.status === 'active');
console.log('Project'.padEnd(28) + 'Path'.padEnd(52) + '.claude/');
console.log('-'.repeat(90));
for (const p of active) {
  const claudeDir = path.join(p.path, '.claude');
  const exists = fs.existsSync(claudeDir) ? 'YES' : 'NO';
  console.log(p.name.padEnd(28) + p.path.padEnd(52) + exists);
}
"
```

## Step 2: Compare rules/ Against Repo for Each Project

```bash
for PROJECT_PATH in \
  "C:/Users/david.hayes/Projects/northstar-transformation" \
  "C:/Users/david.hayes/Projects/fourth-connect" \
  "C:/Users/david.hayes/Projects/agent-factory"; do

  PROJECT_NAME=$(basename "$PROJECT_PATH")
  CLAUDE_DIR="$PROJECT_PATH/.claude"

  if [[ ! -d "$CLAUDE_DIR" ]]; then
    echo "[$PROJECT_NAME] SKIP -- no .claude/ directory"
    continue
  fi

  echo "[$PROJECT_NAME] rules/ diff:"
  diff -rq "$REPO/rules/" "$CLAUDE_DIR/rules/" 2>/dev/null \
    | grep -vE "settings|CLAUDE\.md|RULES\.md|extraction-state|knowledge-tree|\.env|credentials|history" \
    || echo "  In sync"
done
```

## Step 3: Compare skills/ SKILL.md Files

```bash
for PROJECT_PATH in \
  "C:/Users/david.hayes/Projects/northstar-transformation" \
  "C:/Users/david.hayes/Projects/fourth-connect" \
  "C:/Users/david.hayes/Projects/agent-factory"; do

  PROJECT_NAME=$(basename "$PROJECT_PATH")
  CLAUDE_DIR="$PROJECT_PATH/.claude"

  [[ ! -d "$CLAUDE_DIR/skills" ]] && echo "[$PROJECT_NAME] no skills/ dir" && continue

  DRIFT=0
  for skill_dir in "$REPO/skills"/*/; do
    skill_name=$(basename "$skill_dir")
    [[ "$skill_name" == _* ]] && continue
    repo_skill="$skill_dir/SKILL.md"
    proj_skill="$CLAUDE_DIR/skills/$skill_name/SKILL.md"
    [[ ! -f "$repo_skill" ]] && continue
    if [[ ! -f "$proj_skill" ]]; then
      echo "  [$PROJECT_NAME] MISSING: skills/$skill_name/SKILL.md"
      DRIFT=$((DRIFT + 1))
    elif ! diff -q "$repo_skill" "$proj_skill" > /dev/null 2>&1; then
      echo "  [$PROJECT_NAME] DIFFERS: skills/$skill_name/SKILL.md"
      DRIFT=$((DRIFT + 1))
    fi
  done
  [[ $DRIFT -eq 0 ]] && echo "[$PROJECT_NAME] skills: in sync"
done
```

## Fix Command

If rules/ or skills/ are out of sync in a project:

```bash
# Sync repo rules/ into a project's .claude/rules/
rsync -av --delete \
  C:/Users/david.hayes/continuous-claude/.claude/rules/ \
  C:/Users/david.hayes/Projects/northstar-transformation/.claude/rules/
```

Replace the destination path with the affected project.
## Related

| Resource | Purpose |
|----------|---------|
| `SKILL.md` | Repo-to-active drift detection |
| `references/drift-categories.md` | Files expected to differ (local-only) |
| `project-registry.json` | Authoritative project list |
