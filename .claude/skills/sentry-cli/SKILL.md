---
name: sentry-cli
description: Sentry error monitoring -- release management, source map upload, error queries, and SDK setup via CLI and MCP
---

# Sentry CLI Skill

The Sentry CLI (`sentry-cli`) manages releases, uploads source maps, queries errors, and monitors cron jobs from the command line. The Sentry MCP server provides interactive error investigation with Seer AI analysis. Use `sentry-cli <command> --help` for full flag details on any command.

## Auth

Two env vars required (set as Windows user env vars):

- `SENTRY_AUTH_TOKEN` -- API token from sentry.io/settings/auth-tokens/ (org-level, scopes: project:read, project:releases, org:read, event:read)
- `SENTRY_ORG` -- organization slug (visible in your Sentry URL: sentry.io/organizations/<slug>/)

Optional per-project: `SENTRY_PROJECT` env var or `--project` flag on each command.

```bash
sentry-cli info                    # verify auth + org
sentry-cli projects list           # list all projects in the org
```

If commands fail with auth errors, verify `SENTRY_AUTH_TOKEN` is set and not expired.

## Quick Start

```bash
sentry-cli info                              # check auth and connection
sentry-cli releases list                     # list recent releases
sentry-cli issues list <ORG>/<PROJECT>       # list unresolved issues
sentry-cli monitors list                     # list cron monitors
```

## CLI vs MCP

| Task | Use | Why |
|------|-----|-----|
| Release management | sentry-cli | Scripted, CI/CD friendly, deterministic |
| Source map upload | sentry-cli | Build pipeline step, batch upload |
| Error investigation | Sentry MCP | Interactive, Seer AI root cause analysis |
| Performance analysis | Sentry MCP | Rich structured data, drill-down |
| Cron monitoring | sentry-cli | Wraps existing commands, scripted |
| Alert configuration | Sentry dashboard | No CLI/MCP support for alert rules |

**MCP server**: Remote SSE at `https://mcp.sentry.dev/sse` (OAuth). Provides error querying, Seer AI autofix, and release management tools.

## Decision Tree

| Task | Reference |
|------|-----------|
| Create releases, associate commits, finalize | `references/releases.md` |
| Upload source maps per framework | `references/source-maps.md` |
| Query errors, resolve issues, investigate | `references/issues.md` |
| SDK installation per framework | `references/sdk-setup.md` |
| Performance monitoring, session replay, alerts, crons | `references/monitoring.md` |

## Project Creation

When adding Sentry to a new project for the first time:

1. Create the project: `sentry-cli projects create --org <ORG> --team <TEAM> --platform <PLATFORM> <PROJECT_NAME>`
   - Platforms: `javascript-nextjs`, `node-express`, `python`, `python-fastapi`
2. Get the DSN: visit sentry.io > Project Settings > Client Keys (DSN)
3. Install the SDK per framework (see `references/sdk-setup.md`)
4. Set `SENTRY_DSN` in the project env (Vercel dashboard, Railway vars, or `.env.local`)
5. Verify: trigger a test error and confirm it appears in Sentry

## Anti-Patterns

- **Forgetting source maps**: JavaScript errors show minified stack traces without uploaded source maps. Always upload after build.
- **Not setting environment**: Without `environment` tag, you cannot filter errors by staging vs production.
- **100% sample rate in production**: `tracesSampleRate: 1.0` generates excessive data and cost. Use `0.1`-`0.2` in production.
- **Skipping release association**: Without `set-commits`, Sentry cannot link errors to commits or suggest owners.
- **Uploading stale maps**: Always build fresh before uploading source maps. Stale maps produce misleading stack traces.

## When to Use

Trigger keywords: `sentry`, `error monitoring`, `source maps`, `release`, `sentry-cli`, `error tracking`, `crash reporting`, `sentry mcp`, `seer`
