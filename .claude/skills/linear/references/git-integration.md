# Linear Git Integration Reference

## Branch Naming

Include `LIN-<number>` in the branch name for auto-linking:

```bash
# Convention: dave/LIN-<number>-<slug>
git checkout -b dave/LIN-42-fix-login-redirect

# Also works (Linear finds the issue ID anywhere in the branch name):
git checkout -b feature/LIN-42-auth-fix
git checkout -b LIN-42
```

When a branch with `LIN-42` in the name is pushed, Linear auto-transitions issue LIN-42 to In Progress.

## Using linear CLI for Branch Workflow

```bash
# Start working on an issue (creates branch + transitions to In Progress)
linear issue start LIN-42

# Get the issue ID from current branch
linear issue id

# View the issue for current branch
linear issue view

# Create a PR pre-filled with issue details
linear issue pr LIN-42
```

The `linear issue start` command is the fastest way to begin work -- it creates a properly named branch and updates the issue status in one step.

## Commit Message Linking

Include the issue identifier in commit messages:

```bash
# Reference an issue
git commit -m "Add OAuth callback handler LIN-42"

# Close an issue via commit (when merged)
git commit -m "Fixes LIN-42: resolve redirect loop on OAuth callback"
```

Keywords that close issues on merge: `Fixes`, `Closes`, `Resolves` followed by `LIN-<number>`.

## Pull Request Linking

Include `LIN-<number>` in PR title or description:

```bash
# PR title
gh pr create --title "Fix OAuth redirect LIN-42" --body "Resolves LIN-42"

# Using linear CLI (auto-fills from issue)
linear issue pr LIN-42
```

## Auto-Status Transitions

| Git Event | Linear Status Change |
|-----------|---------------------|
| Branch pushed with `LIN-<id>` | -> In Progress |
| PR opened with `LIN-<id>` | -> In Review |
| PR merged with `LIN-<id>` | -> Done |

These require the Linear GitHub integration to be active (Linear Settings -> Integrations -> GitHub).

## Linear Keyboard Shortcut

In the Linear web/desktop app, press `Ctrl+Shift+.` on an issue to copy the git branch name to clipboard.

## Full Workflow Example

```bash
# 1. Find or create the issue
linearis issues search "login redirect" --team "The Lab"
# or
linearis issues create "Fix login redirect" --team "The Lab" --priority 2

# 2. Start work (creates branch, transitions to In Progress)
linear issue start LIN-42
# Creates branch: dave/lin-42-fix-login-redirect

# 3. Do the work, commit
git add .
git commit -m "Fix OAuth redirect loop LIN-42"

# 4. Push and create PR
git push -u origin dave/lin-42-fix-login-redirect
linear issue pr LIN-42
# or: gh pr create --title "Fix login redirect LIN-42"

# 5. On merge, Linear auto-transitions to Done
```

## GitHub Integration Setup

The Linear GitHub integration is configured at:
- Linear: Settings -> Integrations -> GitHub
- Connects Linear workspace to GitHub org/repos
- Enables branch/PR auto-linking and status transitions
- First-party integration maintained by Linear

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Branch not linking | Issue ID not in branch name | Rename branch to include `LIN-<number>` |
| Status not changing | GitHub integration disconnected | Check Linear Settings -> Integrations |
| PR not linking | Issue ID not in title or body | Add `LIN-<number>` to PR description |
| Wrong issue linked | Multiple `LIN-` patterns in branch | Use only one issue ID per branch |
