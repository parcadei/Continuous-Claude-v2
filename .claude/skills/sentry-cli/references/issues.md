# Sentry Issues

## CLI Error Querying

```bash
# List all unresolved issues
sentry-cli issues list <ORG>/<PROJECT>

# Filter with search queries
sentry-cli issues list <ORG>/<PROJECT> --query "is:unresolved"
sentry-cli issues list <ORG>/<PROJECT> --query "is:unresolved level:error"
sentry-cli issues list <ORG>/<PROJECT> --query "firstSeen:>now-1h"
sentry-cli issues list <ORG>/<PROJECT> --query "lastSeen:>now-24h"
sentry-cli issues list <ORG>/<PROJECT> --query "assigned:me"
sentry-cli issues list <ORG>/<PROJECT> --query "release:<VERSION>"

# Resolve an issue (DANGEROUS -- confirm first)
sentry-cli issues resolve <ISSUE_ID>

# Mute an issue (DANGEROUS -- confirm first)
sentry-cli issues mute <ISSUE_ID>
```

## Common Search Queries

| Query | What It Finds |
|-------|---------------|
| `is:unresolved` | Open issues (default) |
| `is:unresolved level:error` | Only errors, not warnings |
| `firstSeen:>now-1h` | New issues in the last hour |
| `lastSeen:>now-24h` | Active issues in the last day |
| `times_seen:>100` | High-frequency issues |
| `release:<VERSION>` | Issues introduced in a release |
| `assigned:me` | Issues assigned to you |
| `!has:assignee` | Unassigned issues |

## MCP for Investigation

For interactive error investigation, use the Sentry MCP server instead of CLI:

- **Error details**: MCP provides full event payloads, breadcrumbs, and context
- **Seer AI analysis**: Automated root cause analysis and suggested fixes
- **Performance data**: Transaction traces, span waterfall, slow DB queries
- **Replay**: Session replay events linked to errors

The MCP server connects via remote SSE at `https://mcp.sentry.dev/sse` (OAuth).

## Triage Workflow

1. **Check new issues**: `sentry-cli issues list <ORG>/<PROJECT> --query "firstSeen:>now-24h"`
2. **Investigate top issue**: Use Sentry MCP for full event details + Seer AI analysis
3. **Reproduce**: Use breadcrumbs and session replay to understand the user flow
4. **Fix**: Implement the fix in code
5. **Verify**: After deploying, check that the issue stops receiving new events
6. **Resolve**: `sentry-cli issues resolve <ISSUE_ID>` (confirm with user first)

## Notes

- Issue IDs are numeric (e.g., `12345`) and visible in the Sentry dashboard URL
- Resolving an issue marks it as fixed -- it will reopen if the same error occurs again
- Muting suppresses notifications but does not resolve the issue
- Use `--query` syntax from Sentry search docs for advanced filtering
