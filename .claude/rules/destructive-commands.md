# Git & Deletion Safety Rules

**NEVER run destructive commands without explicit user confirmation.**

## Deletion Commands (ALWAYS ASK FIRST)

Before running ANY of these, ask the user:

- `rm` / `rm -rf` (delete files/directories)
- `rmdir` (remove directories)
- `unlink` (remove files)
- `trash` (move to trash)

### Example

WRONG:

```
"Let me clean that up"
rm -rf /tmp/old-cache/
```

RIGHT:

```
"I can delete /tmp/old-cache/. Should I run `rm -rf /tmp/old-cache/`?"
[wait for explicit "yes"]
```

### Archive vs Delete

When user says "archive X":

- MOVE to archive folder (e.g., `mv X opc/archive/`)
- Do NOT delete

---

## Git Commands (ALWAYS ASK FIRST)

## Commands that require confirmation:

- `git checkout` (can overwrite uncommitted changes)
- `git reset` (can lose commits)
- `git clean` (deletes untracked files)
- `git stash` (hides changes)
- `git rebase` (rewrites history)
- `git merge` (modifies branches)
- `git push` (affects remote)
- `git commit` (creates commits)

## Safe commands (no confirmation needed):

- `git status`
- `git log`
- `git diff`
- `git branch` (list only)
- `git show`
- `git blame`

## Before any state-modifying git command:

1. Explain what the command will do
2. Ask: "Should I run this?"
3. Wait for explicit "yes" or approval

## Example

WRONG:

```
"Let me restore that file"
git checkout HEAD -- file.ts
```

RIGHT:

```
"I can restore file.ts from git. This will overwrite any uncommitted changes. Run `git checkout HEAD -- file.ts`?"
[wait for user confirmation]
```
