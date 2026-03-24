# Test Suites Overview

Test suites validating CCv3 new functionalities, workflows, and features.
Each suite targets a specific integration or subsystem added to the platform.

## Suites (14)

### Core CLI Tools

| Suite | File | Tests | What It Validates |
|-------|------|-------|-------------------|
| **CDP CLI** | `cdp-cli.test.mjs` | 13 | Custom Chrome DevTools Protocol CLI (`scripts/cdp.mjs`). Smoke: help JSON, file existence, cleanup command. Integration: navigate, title, url, perf metrics, network requests, a11y audit, snapshot, eval, tabs, cleanup. Auto-launches Chrome if needed. |
| **OpenCLI** | `opencli.test.mjs` | 8 | Browser bridge CLI hub with 44+ web platform adapters. Smoke: version, adapter count, skill/rule files. Integration: daemon health (`opencli doctor`), HackerNews JSON output, adapter discovery. |

### Platform CLI Skills

| Suite | File | Tests | What It Validates |
|-------|------|-------|-------------------|
| **Railway CLI** | `railway-cli.test.mjs` | 10 | Railway deployment management. Smoke: CLI installed, version, SKILL.md + 4 reference files, deploy safety rule, frontmatter. Integration: `railway whoami` auth check. |
| **neonctl** | `neonctl.test.mjs` | 11 | Neon Postgres CLI. Smoke: CLI installed, version, SKILL.md + 4 reference files, safety rule, `-o json` flag documented, databases skill cross-reference. Integration: `neonctl me` auth check. |
| **Vercel CLI** | `vercel-cli.test.mjs` | 5 | Vercel deployment. Smoke: CLI installed, SKILL.md, 10+ reference files, deployer agent reference. Integration: `vercel whoami` auth check. |
| **GitHub CLI** | `gh-cli.test.mjs` | 2 | GitHub CLI. Smoke: CLI installed. Integration: `gh api user` returns login. |

### Infrastructure CLIs

| Suite | File | Tests | What It Validates |
|-------|------|-------|-------------------|
| **Docker** | `docker.test.mjs` | 4 | Container runtime. Smoke: Docker + Compose installed. Integration: daemon running, Postgres container healthy (`pg_isready`). |
| **TLDR** | `tldr.test.mjs` | 4 | AST-level code analysis CLI. Smoke: help command. Integration: `tree`, `structure`, `search` commands produce output for repo files. |
| **qlty** | `qlty.test.mjs` | 2 | Code quality CLI. Smoke: version (skips if not installed), skill file exists. |

### Orchestration Layer

| Suite | File | Tests | What It Validates |
|-------|------|-------|-------------------|
| **Deployer Agent** | `deployer-agent.test.mjs` | 11 | Agent YAML structure. Validates: frontmatter (name, model), Vercel + Railway routing tables, `railway down` WARNING label, `.vercel/`/`.railway/` platform detection, dual-platform tie-breaking rule, Ralph output contract. |
| **Skill Rules** | `skill-rules.test.mjs` | 9 | Skill registration system. Validates: `skill-rules.json` exists in repo + active `~/.claude/`, railway-cli + neonctl entries present with score >= 80, correct keywords, repo/active copies in sync. |
| **CLI Strategy** | `cli-strategy.test.mjs` | 13 | CLI integration decision tree. Validates: 6-tier hierarchy, Railway + neonctl marked DONE, inventory includes all 20+ tools, no deprecated tool references, key CLIs actually on PATH. |
| **Stale Refs** | `stale-refs.test.mjs` | 6 | Dead reference scanner. Validates: zero "Chrome DevTools MCP" in skills/rules, zero `devtools_*` tool names, no `chrome-devtools` in MCP configs, CDP CLI properly referenced. |
| **Browser Automation** | `browser-automation.test.mjs` | 8 | Browser tier documentation consistency. Validates: rule file, SKILL.md, tier2-devtools.md, tool-comparison.md, workflow-recipes.md all reference "CDP CLI" and have no stale MCP references. |

## Test Tiers

- **Smoke**: No external dependencies, runs instantly. File existence, `--help`, structure checks.
- **Integration**: Needs CLI installed + optional auth. Actual command execution, JSON output validation.
- **E2E**: Needs live services. Auto-skipped if unavailable (no auth, no daemon).

## Adding a New Suite

1. Create `<name>.test.mjs` in this directory
2. Import from `../harness.mjs`
3. Add smoke + integration tests
4. Call `await run('<name>')` at end
5. Register in `../run-all.mjs` (auto-discovered from `*.test.mjs`)
6. Update this OVERVIEW.md with the new suite description
