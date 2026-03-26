# Linear Workflows Reference

## Default Issue Workflow

```
Triage -> Backlog -> Todo -> In Progress -> In Review -> Done
                                                    \-> Cancelled
```

### State Types

| State | Type | Meaning |
|-------|------|---------|
| Triage | triage | Needs categorization |
| Backlog | backlog | Accepted, not prioritized |
| Todo | unstarted | Prioritized, not started |
| In Progress | started | Actively being worked on |
| In Review | started | Code review / QA |
| Done | completed | Finished |
| Cancelled | canceled | Will not be done |

### linear CLI State Filters

The linear CLI uses state types for filtering:

```bash
linear issue list -s triage          # Triage issues
linear issue list -s backlog         # Backlog
linear issue list -s unstarted       # Todo (default filter)
linear issue list -s started         # In Progress + In Review
linear issue list -s completed       # Done
linear issue list -s canceled        # Cancelled
linear issue list --all-states       # Everything
```

### linearis Status Names

linearis uses the full status name:

```bash
linearis issues update LIN-42 --status "In Progress"
linearis issues update LIN-42 --status "Done"
linearis issues update LIN-42 --status "Todo"
linearis issues search "query" --status "In Progress,In Review"
```

## Automated Status Transitions

These transitions happen automatically via the GitHub integration:

| Trigger | From | To |
|---------|------|----|
| Branch created with `LIN-<id>` | Any | In Progress |
| PR opened with `LIN-<id>` | Any | In Review |
| PR merged with `LIN-<id>` | Any | Done |

### How Auto-Transitions Work

1. Linear's GitHub integration monitors branch names and PR metadata
2. When a branch name contains `LIN-42`, Linear links it to issue LIN-42
3. The integration auto-moves the issue through the workflow
4. No manual status updates needed for the standard dev flow

## Manual Status Updates

For issues not tracked via git (design tasks, research, meetings):

```bash
# Move to In Progress when starting work
linearis issues update LIN-42 --status "In Progress"

# Move to Done when complete
linearis issues update LIN-42 --status "Done"

# Cancel an issue
linearis issues update LIN-42 --status "Cancelled"
```

## Priority Levels

| Value | Label | Use For |
|-------|-------|---------|
| 1 | Urgent | Production down, security issue |
| 2 | High | Blocking other work, deadline-driven |
| 3 | Medium | Standard feature work |
| 4 | Low | Nice-to-have, future improvement |

```bash
linearis issues create "Title" --team "The Lab" --priority 2
linearis issues update LIN-42 --priority 1
```

## Label Conventions

Use labels for cross-cutting concerns:

| Label | Purpose |
|-------|---------|
| bug | Defect in existing functionality |
| feature | New capability |
| improvement | Enhancement to existing feature |
| infra | Infrastructure / DevOps |
| docs | Documentation only |
| design | Design work needed |

```bash
linearis issues create "Title" --team "The Lab" --labels "bug,frontend"
```

## Issue Relationships

```bash
# Parent-child (sub-issues)
linearis issues create "Sub-task" --team "The Lab" --parent-ticket LIN-10
linearis issues update LIN-42 --parent-ticket LIN-10
linearis issues update LIN-42 --clear-parent-ticket

# Relations (linear CLI)
linear issue relation LIN-42                    # Manage relations
```
