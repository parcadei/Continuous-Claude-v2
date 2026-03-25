---
name: linear
description: Linear issue tracking -- create, manage, and search issues, projects, and cycles via CLI and MCP
---

# Linear Skill

Linear (`linear.app/minions-lab`) is our issue tracker. Two CLIs and one MCP server provide access.

**Workspace:** `minions-lab` (Name: "The Lab")

## Authentication

| Tool | Auth Method | Setup |
|------|------------|-------|
| linearis CLI | API token | `LINEAR_API_TOKEN` env var (set permanently) |
| linear CLI | OAuth | `linear auth` (browser login, stores credentials) |
| Linear MCP | OAuth | Remote HTTP at `https://mcp.linear.app/mcp` |

## Quick Start

```bash
# List your issues (scripted)
linearis issues list

# List your issues (interactive, paged)
linear issue list

# Search issues
linearis issues search "authentication" --team "The Lab"

# Create an issue
linearis issues create "Fix login redirect" --team "The Lab" --description "Redirect fails on OAuth callback" --priority 2

# View issue details
linearis issues read LIN-42

# Update issue status
linearis issues update LIN-42 --status "In Progress"
```

## CLI vs MCP Routing

| Task | Use | Why |
|------|-----|-----|
| Scripted/batch operations | linearis CLI | JSON output, API key auth, low token cost |
| Interactive git workflow | linear CLI | OAuth, branch integration, `issue start` |
| Conversational issue management | Linear MCP | Natural language, in-session context |
| Issue search from agents | linearis CLI | Structured JSON, filterable |
| Creating PRs linked to issues | linear CLI | `linear issue pr` auto-fills PR details |

## Decision Tree

| Task | Reference |
|------|-----------|
| Create, list, search, update, delete issues | `references/issues.md` |
| Projects, cycles, labels, milestones | `references/projects.md` |
| Status workflows and automations | `references/workflows.md` |
| Git branch linking and GitHub integration | `references/git-integration.md` |

## Branch Naming Convention

Use `dave/LIN-<number>-<slug>` for auto-linking with GitHub:

```bash
git checkout -b dave/LIN-42-fix-login-redirect
```

Linear auto-detects `LIN-<number>` in branch names and transitions the issue to In Progress.

## linearis CLI Global Patterns

All linearis commands output JSON by default. Common patterns:

```bash
linearis issues list --limit 50           # Increase result limit (default: 25)
linearis issues search "query" --team "The Lab" --status "In Progress"
linearis issues create "Title" --team "The Lab" --labels "bug,frontend"
```

## linear CLI Global Flags

```bash
linear -w minions-lab issue list          # Target workspace explicitly
linear issue list --team "The Lab"        # Filter by team
linear issue list --all-states            # Show all states (default: unstarted only)
linear issue list --no-pager              # Disable paging
```

## Anti-Patterns

- **Creating duplicate issues**: Search before creating. `linearis issues search "keyword"` first.
- **Changing status without context**: Always show current issue state before updating.
- **Forgetting the team flag**: linearis requires `--team "The Lab"` on create. linear uses your default team.
- **Not linking branches**: Always include `LIN-<number>` in branch names for auto-tracking.
- **Using linear CLI in scripts**: linear is interactive (pager, prompts). Use linearis for automation.

## When to Use

Trigger keywords: `linear`, `issue`, `ticket`, `backlog`, `sprint`, `cycle`, `LIN-`, `issue tracking`
