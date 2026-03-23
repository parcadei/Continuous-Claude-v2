---
name: neonctl
description: Neon Postgres CLI -- branch management, connection strings, SQL execution, and database migrations
---

# Neon CLI Skill

The Neon CLI (`neonctl`) manages Neon Postgres projects, branches, databases, and connection strings from the command line. Use `neonctl <command> --help` for full flag details on any command.

## Auth

`neonctl auth` opens a browser for OAuth login. Credentials are stored in `~/.config/neonctl/`. Alternatively, set `--api-key` or the `NEON_API_KEY` env var.

## Quick Start

```bash
neonctl auth                              # authenticate (browser OAuth)
neonctl projects list -o json             # list all projects
neonctl set-context --project-id <id>     # set default project
neonctl branches list                     # list branches in current project
neonctl connection-string                 # get connection string for default branch
neonctl connection-string my-branch       # get connection string for specific branch
```

## CLI vs MCP

- **CLI (`neonctl`)**: Scripted/batch operations, branch management, connection strings, project admin
- **MCP (`mcp__Neon__*`)**: Interactive single queries, `run_sql`, `create_branch` during development

Use CLI when automating or when you need structured JSON output (`-o json`). Use MCP for ad-hoc SQL and quick branch operations within a session.

## Decision Tree

| Task | Reference |
|------|-----------|
| Create, list, reset, delete branches | `references/branches.md` |
| Connection strings, pooling, env vars | `references/connection.md` |
| SQL execution, databases, roles | `references/sql.md` |
| Projects, context, user info | `references/projects.md` |

## Global Flags

All commands support:
- `-o json` / `-o yaml` / `-o table` -- output format (default: table)
- `--project-id <id>` -- target a specific project (overrides context)
- `--api-key <key>` -- authenticate without `neonctl auth`
- `--context-file <path>` -- use a custom context file
- `--no-color` -- disable colored output

## When to Use

Trigger keywords: `neonctl`, `neon branch`, `connection string`, `neon database`, `neon project`, `neon context`, `schema-diff`
