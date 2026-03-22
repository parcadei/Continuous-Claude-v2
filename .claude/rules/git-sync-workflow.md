# Git Sync Workflow: continuous-claude → ~/.claude

## Primary Flow (Forward Sync)

```
continuous-claude (repo)  →  ~/.claude (active)
        ↓                         ↓
    Edit here                 Auto-receives
        ↓                         ↓
    git commit              post-commit hook (background)
        ↓                         ↓
    git push                Hooks rebuilt
```

**Note:** Post-commit sync runs in the background (`&`) so `git commit` returns instantly. Sync completes asynchronously.

## Quick Workflow

```bash
# 1. Make changes in continuous-claude
cd ~/continuous-claude
# edit files...

# 2. Commit (auto-syncs to ~/.claude)
git add .claude/
git commit -m "feat: description"

# 3. Push to remote
git push
```

## Pull from Team

```bash
cd ~/continuous-claude && git pull
# If post-commit didn't run, manual sync:
bash ~/continuous-claude/scripts/sync-to-active.sh
```

## Quick Fixes in ~/.claude

For urgent fixes made directly in ~/.claude:

```bash
# 1. Fix is auto-committed by git-auto-commit hook

# 2. Sync back to repo when ready
bash ~/continuous-claude/scripts/sync-claude.sh --to-repo

# 3. Commit in repo
cd ~/continuous-claude && git add .claude/ && git commit -m "fix: description"
```

## Branching in continuous-claude

| Scenario | Branch? |
|----------|---------|
| Quick fix, simple rule | No |
| New hook development | Yes |
| Major refactor | Yes |
| Experimental feature | Yes |

```bash
cd ~/continuous-claude
git checkout -b feature/name
# develop...
git checkout main && git merge feature/name
git branch -d feature/name
```

## Key Commands

| Task | Command |
|------|---------|
| Manual forward sync | `bash ~/continuous-claude/scripts/sync-to-active.sh` |
| Manual reverse sync | `bash ~/continuous-claude/scripts/sync-claude.sh --to-repo` |
| Rebuild hooks | `cd ~/.claude/hooks && npm run build` |
| Check repo status | `cd ~/continuous-claude && git status` |
