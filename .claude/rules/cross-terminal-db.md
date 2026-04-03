# Cross-Terminal Coordination Database

## Connection Details

```bash
# Credentials (from opc/.env)
DATABASE_URL=postgresql://claude:claude_dev@localhost:5432/continuous_claude

# Query via docker
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c "SQL"
```

## Quick Queries

```bash
# Active sessions (last 5 min)
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "SELECT id, project, working_on, last_heartbeat FROM sessions WHERE last_heartbeat > NOW() - INTERVAL '5 minutes';"

# All sessions
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "SELECT id, project, working_on, last_heartbeat FROM sessions ORDER BY last_heartbeat DESC LIMIT 10;"

# File claims
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c \
  "SELECT file_path, session_id, claimed_at FROM file_claims ORDER BY claimed_at DESC LIMIT 10;"
```

## Testing Cross-Terminal Coordination

1. **Terminal 1**: Run `claude` - registers session on start
2. **Terminal 2**: Run `claude` - should see Terminal 1 in peer sessions message
3. **Conflict test**: Have both edit the same file - Terminal 2 should get a warning

## Tables

| Table         | Purpose                         |
| ------------- | ------------------------------- |
| `sessions`    | Cross-session awareness         |
| `file_claims` | File locking/conflict detection |
