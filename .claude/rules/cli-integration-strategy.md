# CLI Integration Strategy

## Decision Tree: How to Give Claude Code Access to a New Platform

When a new platform or application needs agent access, follow this priority order:

### 1. Native CLI exists? (gh, vercel, railway, neonctl, docker)
Install it, create skill + rule, use **Pattern 1** (Direct Bash + Skill + Rule).
This is the gold standard — maintained by the vendor, structured output, battle-tested.

### 2. Web platform with browser login? (Twitter, Reddit, HN, LinkedIn)
Use **OpenCLI** adapter (existing or generate new with `opencli generate`).
Zero API keys — reuses Chrome session cookies via browser bridge.

### 3. Accessible via MCP? (Notion, Playwright, Paper, Neon)
Use **MCP integration**. Best when the tool vendor ships an MCP server.
Note: CLI is often better than MCP for scripted/batch operations (32x fewer tokens).

### 4. Desktop software with source code? (GIMP, Blender, LibreOffice)
Use **CLI-Anything** plugin to auto-generate a Python Click CLI wrapper.
Install: `/plugin marketplace add HKUDS/CLI-Anything`
Review generated code for security before deploying.

### 5. Has a REST API but no CLI? (internal services, custom platforms)
Write a **thin CLI wrapper script** (like `scripts/cdp.mjs`).
Pattern: single file, JSON output to stdout, subcommand interface.

### 6. None of the above?
Use **browser automation** (Playwright MCP) as last resort.
Highest friction, lowest reliability — only for truly GUI-only workflows.

## Current CLI Inventory (21 tools)

| Pattern | Tools |
|---------|-------|
| Direct Bash + Skill + Rule | tldr, opencli, gh, vercel, railway, neonctl, qlty, git, playwright, playwright-cli, cdp.mjs, linearis, sentry-cli |
| Python harness via uv run | ast-grep, morph, braintrust, github-search |
| MCP server | Serena, Playwright MCP, Notion, Paper, Exa, Neon, Vercel Cloud, Linear, Sentry |
| Agent delegation | deployer (Vercel + Railway + Sentry + Linear), arbiter/atlas (tests) |

## Known Gaps

| Platform | Status | Priority |
|----------|--------|----------|
| Railway CLI | INTEGRATED — skill + rule + deployer agent (2026-03-23) | DONE |
| neonctl | INTEGRATED — skill + databases cross-ref (2026-03-23) | DONE |
| Linear | INTEGRATED — MCP (remote) + linearis CLI + linear-cli + skill + rule + deployer (2026-03-25) | DONE |
| Sentry | INTEGRATED — MCP (remote) + sentry-cli + skill + rule + deployer + 3 hooks (2026-03-25) | DONE |
| CLI-Anything | Not installed — for future desktop software control | LOW |

## Agent Compatibility Checklist

When evaluating a new CLI for CCv3 integration, score it against these criteria:

| Criteria | Required | Nice-to-have |
|----------|----------|-------------|
| Non-interactive mode | REQUIRED | — |
| Per-subcommand --help | REQUIRED | With examples |
| JSON/structured output | REQUIRED | Default JSON preferred |
| Flag-based inputs (no positional-only) | REQUIRED | stdin support |
| Fail-fast on missing args | REQUIRED | With correct invocation shown |
| Idempotent commands | — | Document which commands are safe to retry |
| --dry-run for destructive ops | — | Compensate with safety rules if missing |
| --yes/--force for confirmations | — | Compensate with safety rules if missing |
| Predictable resource+verb structure | REQUIRED | Matches existing patterns |
| Structured success output (IDs, URLs) | REQUIRED | Not just "Success!" |

Source: "Building CLIs for agents" by @ericzakariasson

## Integration Checklist (when adding a new CLI)

1. Install the CLI globally (`npm i -g` or `pip install`)
2. Verify it works: `<tool> --version` or `<tool> --help`
3. Score against Agent Compatibility Checklist above
4. Create skill at `.claude/skills/<tool-name>/SKILL.md`
5. Create rule if safety gates needed (deploy, delete, etc.)
6. Update this inventory table
7. Sync to `~/.claude/`: `bash scripts/sync-to-active.sh`
