# Linear Safety Rules

## Safe Commands (no confirmation needed)

- `linearis issues list` (all variants)
- `linearis issues read <id>`
- `linearis issues search` (all variants)
- `linearis projects list`
- `linearis cycles list`, `linearis cycles read`
- `linearis teams list`
- `linearis labels list`
- `linearis comments list`
- `linearis documents list`
- `linear issue list`, `linear issue view`, `linear issue id`, `linear issue url`, `linear issue title`
- `linear team list`, `linear project list`, `linear cycle list`
- Any read-only MCP tool (search_issues, get_teams, get_my_issues)

## Dangerous Commands (ALWAYS confirm first)

Before running ANY of these, explain what it does and wait for explicit user approval:

- `linearis issues create` (creates a new issue in the tracker)
- `linearis issues update` (modifies issue fields or status)
- `linearis comments create` (adds a comment)
- `linear issue create` (creates a new issue)
- `linear issue update` (modifies issue fields)
- `linear issue delete` (permanently deletes an issue -- no undo)
- `linear issue start` (transitions issue and creates branch)
- MCP `create_issue` or `update_issue` calls

## Before Modifying Issues

1. Confirm the target issue ID with the user
2. Show current issue state before changes: `linearis issues read <id>`
3. For status transitions: verify the target state is valid for the workflow
4. For deletion: warn that this is permanent and cannot be undone

## Before Creating Issues

1. Search for duplicates first: `linearis issues search "<keywords>" --team "The Lab"`
2. Confirm title, priority, and team with the user
3. Show what will be created before running the command
