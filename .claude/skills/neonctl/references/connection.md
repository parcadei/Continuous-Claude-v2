# Connection Strings

## Basic Usage

```bash
neonctl connection-string                     # default branch
neonctl connection-string main                # specific branch by name
neonctl connection-string br-abc123           # specific branch by ID
```

Alias: `neonctl cs`

## Pooled vs Direct Connections

```bash
neonctl connection-string --pooled            # pooled (PgBouncer, port 5432)
neonctl connection-string                     # direct (port 5432, no pooler)
```

- **Pooled (`--pooled`)**: Use for serverless/edge functions, short-lived connections, high concurrency
- **Direct**: Use for long-running processes, migrations, session-level features (prepared statements, advisory locks)

## Flags

| Flag | Purpose |
|------|---------|
| `--pooled` | Use pooled connection (PgBouncer) |
| `--prisma` | Format for Prisma (adds `?pgbouncer=true&connect_timeout=15`) |
| `--database-name <db>` | Specify database (default: project default) |
| `--role-name <role>` | Specify role |
| `--endpoint-type read_only\|read_write` | Target read replica or primary |
| `--extended` | Show extended connection info |
| `--psql` | Connect directly via psql |
| `--ssl require\|verify-ca\|verify-full\|omit` | SSL mode (default: require) |

## Point-in-Time Connection

```bash
neonctl cs main@2024-06-01T00:00:00Z          # connect to branch at timestamp
neonctl cs main@0/234235                       # connect to branch at LSN
```

## Env Var Pattern (Drizzle ORM)

We use Drizzle ORM, not Prisma (see `rules/prefer-drizzle-orm.md`).

```bash
# Get the connection string and set as env var
DATABASE_URL=$(neonctl connection-string --pooled)

# For .env files
echo "DATABASE_URL=$(neonctl connection-string --pooled)" >> .env.local
```

In `drizzle.config.ts`, reference `process.env.DATABASE_URL`.

## Structured Output

```bash
neonctl connection-string -o json             # JSON with host, port, user, etc.
neonctl connection-string --extended          # detailed connection properties
```

All commands support `-o json` for structured output.
