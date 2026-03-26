# Linear Issues Reference

## List Issues

```bash
# linearis (JSON output, scripted)
linearis issues list                          # Default: 25 issues
linearis issues list --limit 50               # More results

# linear (interactive, paged)
linear issue list                             # Your issues, unstarted state
linear issue list --all-states                # All states
linear issue list --team "The Lab"            # Filter by team
linear issue list -s started                  # Filter by state
linear issue list --project "ProjectName"     # Filter by project
linear issue list --cycle active              # Current cycle only
linear issue list --assignee self             # Your issues explicitly
linear issue list -A                          # All assignees
linear issue list -U                          # Unassigned only
linear issue list --no-pager                  # Disable paging for scripts
```

## Search Issues

```bash
# linearis
linearis issues search "query"                         # Free text search
linearis issues search "bug" --team "The Lab"          # Filter by team
linearis issues search "auth" --status "In Progress"   # Filter by status
linearis issues search "fix" --project "Workbook"      # Filter by project
linearis issues search "deploy" --limit 20             # More results (default: 10)

# MCP
# search_issues: natural language query, returns matching issues
```

## Read / View Issue

```bash
# linearis
linearis issues read LIN-42              # Full issue details (JSON)
linearis issues read <uuid>              # Also accepts UUID

# linear
linear issue view LIN-42                 # Formatted view in terminal
linear issue view LIN-42 --web           # Open in browser
linear issue view LIN-42 --app           # Open in Linear desktop app
linear issue url LIN-42                  # Print URL only
linear issue title LIN-42               # Print title only
```

## Create Issue

```bash
# linearis (non-interactive, best for agents)
linearis issues create "Fix login redirect" \
  --team "The Lab" \
  --description "OAuth callback fails on redirect" \
  --priority 2 \
  --labels "bug,frontend" \
  --project "Workbook" \
  --status "Todo" \
  --assignee "<user-id>"

# linear (interactive, prompts for missing fields)
linear issue create \
  -t "Fix login redirect" \
  --team "The Lab" \
  -d "OAuth callback fails on redirect" \
  -p 2 \
  -l bug -l frontend \
  --project "Workbook" \
  -a self \
  --start                                # Auto-transitions to In Progress

# linear non-interactive
linear issue create -t "Title" -d "Desc" --team "The Lab" --no-interactive

# MCP
# create_issue: title, description, teamId, priority, status, labels
```

## Update Issue

```bash
# linearis
linearis issues update LIN-42 --status "In Progress"
linearis issues update LIN-42 --title "New title" --description "Updated desc"
linearis issues update LIN-42 --priority 1 --assignee "<user-id>"
linearis issues update LIN-42 --labels "bug,critical" --label-by overwriting
linearis issues update LIN-42 --project "Workbook" --project-milestone "v1.0"
linearis issues update LIN-42 --cycle "Sprint 4"
linearis issues update LIN-42 --clear-labels     # Remove all labels
linearis issues update LIN-42 --parent-ticket LIN-10

# linear
linear issue update LIN-42                       # Interactive update
linear issue update LIN-42 -s started            # Change state

# MCP
# update_issue: issueId, fields to change (status, assignee, priority, etc.)
```

## Delete Issue

```bash
# linear (DANGEROUS -- always confirm with user first)
linear issue delete LIN-42
```

Note: linearis does not have a delete command. Use the linear CLI or the web UI.

## Priority Levels

| Value | Meaning |
|-------|---------|
| 0 | No priority |
| 1 | Urgent |
| 2 | High |
| 3 | Medium |
| 4 | Low |

## Comments

```bash
# linearis
linearis comments list <issueId>                # List comments on an issue
linearis comments create <issueId> "Comment text"
```

## Labels

```bash
# linearis
linearis labels list                            # All available labels
linearis labels list --team "The Lab"           # Team-scoped labels
```
