# SQL Execution & Database Management

## Running SQL

The `neonctl` CLI does not have a direct SQL execution command. Use one of these approaches:

### Neon MCP Server (preferred for interactive use)

```
mcp__Neon__run_sql(sql="SELECT * FROM users LIMIT 10", database="neondb")
mcp__Neon__run_sql(sql="CREATE TABLE ...", database="neondb")
```

### psql via neonctl

Connect to a branch with psql and run SQL interactively:

```bash
neonctl connection-string --psql              # opens psql for default branch
neonctl connection-string my-branch --psql    # opens psql for specific branch
neonctl branches create --name temp --psql    # create branch and connect
```

### psql with connection string

```bash
psql "$(neonctl connection-string)"
psql "$(neonctl connection-string my-branch)" -c "SELECT version()"
```

## List Databases

```bash
neonctl databases list                        # list databases in current project
neonctl databases list --branch main          # list databases on specific branch
neonctl databases list -o json                # structured output
```

## Create a Database

```bash
neonctl databases create --name analytics --branch main
```

## Delete a Database

```bash
neonctl databases delete analytics --branch main
```

## List Roles

```bash
neonctl roles list                            # list roles in current project
neonctl roles list -o json                    # structured output
```

## Create / Delete Roles

```bash
neonctl roles create --name readonly_user
neonctl roles delete readonly_user
```

## When to Use CLI vs MCP

| Task | Tool |
|------|------|
| Ad-hoc SQL queries | MCP (`mcp__Neon__run_sql`) |
| Database/role admin | CLI (`neonctl databases`, `neonctl roles`) |
| Schema migrations | psql via `neonctl cs --psql` or Drizzle Kit |
| Scripted batch SQL | psql with `neonctl connection-string` pipe |

All commands support `-o json` for structured output.
