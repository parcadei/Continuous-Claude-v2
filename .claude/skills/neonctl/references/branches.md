# Branches

Neon branches are copy-on-write forks of your database, similar to git branches.

## List Branches

```bash
neonctl branches list                         # table format
neonctl branches list -o json                 # structured JSON
neonctl branches list --project-id <id>       # specific project
```

## Create a Branch

```bash
neonctl branches create --name feature/auth          # from default branch
neonctl branches create --name dev --parent main      # from specific parent
neonctl branches create --name dev --schema-only      # schema only, no data
neonctl branches create --name temp --psql            # create and connect via psql
```

Key flags: `--name`, `--parent`, `--schema-only`, `--cu <size>`, `--suspend-timeout <seconds>`, `--expires-at <ISO-date>`, `--no-compute`, `--type read_only` (creates a read replica)

## Get Branch Details

```bash
neonctl branches get <id|name> -o json
```

## Reset a Branch

Resets branch data to match its parent (like a hard reset):

```bash
neonctl branches reset dev --parent                   # reset to parent state
neonctl branches reset dev --preserve-under-name old  # keep old data under new name
```

## Delete a Branch

```bash
neonctl branches delete feature/auth
```

## Additional Operations

```bash
neonctl branches restore <target> <source>[@timestamp]  # Point-in-time restore
neonctl branches rename <id|name> <new-name>            # Rename branch
neonctl branches set-default <id|name>                  # Change default branch
```

## Schema Diff

Compare schemas between branches:

```bash
neonctl branches schema-diff main dev                         # compare two branches
neonctl branches schema-diff main dev@2024-06-01T00:00:00Z    # compare to point-in-time
neonctl branches schema-diff main dev --database mydb         # specific database
```

Alias: `neonctl branches sd`

## Dev Workflow Pattern

```bash
# 1. Create branch for feature work
neonctl branches create --name feature/new-api --parent main

# 2. Get connection string for the branch
neonctl connection-string feature/new-api

# 3. Develop and test against the branch
# ... run migrations, test queries ...

# 4. Compare schema changes
neonctl branches schema-diff main feature/new-api

# 5. After merge, reset or delete the branch
neonctl branches delete feature/new-api
```

All commands support `-o json` for structured output.
