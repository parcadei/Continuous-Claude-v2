# neonctl Safety Rules

## Dangerous Commands (ALWAYS confirm with user)
- `neonctl branches delete` — permanently deletes a branch (no undo)
- `neonctl databases delete` — drops a database
- `neonctl roles delete` — drops a role
- `neonctl projects delete` — deletes an entire project and all its data

## Safe Commands (no confirmation needed)
- `neonctl branches list`, `neonctl projects list`, `neonctl me`
- `neonctl connection-string`, `neonctl set-context`
- Any command with `-o json` (read-only output formatting)

## Before Destructive Operations
1. Confirm the target branch/database name with the user
2. Verify you're targeting the correct project (`neonctl set-context` or `--project-id`)
3. Ask: "This will permanently delete [target]. Proceed?"
