# Workflow Tests -- CCv3 New Functionality Validation

Test framework for validating new functionalities, workflows, and features added to CCv3.
Run after adding CLI tools, changing skills/rules, deploying new integrations, or before major releases.

## Purpose

This folder is **exclusively** for testing new CCv3 capabilities -- CLI integrations, skills, agents,
rules, and workflows. It validates that everything works reliably when Ralph/Maestro agents reach
for a CLI tool mid-workflow, when a new platform needs onboarding, or when adapters need generating on the fly.

## Quick Start

```bash
# Run all 14 suites with combined report
node tests/workflow-tests/run-all.mjs

# Run a single suite
node tests/workflow-tests/suites/cdp-cli.test.mjs
node tests/workflow-tests/suites/opencli.test.mjs
node tests/workflow-tests/suites/stale-refs.test.mjs
```

## Key Files

| File | Purpose |
|------|---------|
| `suites/OVERVIEW.md` | What each test suite validates -- descriptions, test counts, tiers |
| `results/RESULTS-LOG.md` | Chronological test run history -- latest at top |
| `harness.mjs` | Shared test framework (assert, exec, grade, report) |
| `run-all.mjs` | Combined runner -- executes all suites, produces combined JSON |

## Results

- JSON results: `results/<suite>-<timestamp>.json`
- Combined: `results/combined-<timestamp>.json`
- Results log: `results/RESULTS-LOG.md` (human-readable history)
- Console: Summary table with suite grades

## Test Tiers

- **Smoke**: No deps, instant -- file existence, --help commands, structure checks
- **Integration**: CLI installed + optional auth -- actual command execution, JSON output
- **E2E**: Live services needed -- auto-skipped if unavailable

## Suites (14)

| Suite | What | Tier |
|-------|------|------|
| cdp-cli | CDP CLI 13 commands, auto-launch, PID management | smoke + integration |
| opencli | 44 adapters, browser bridge, output formats | smoke + integration |
| vercel-cli | Vercel CLI install + skill structure | smoke + integration |
| gh-cli | GitHub CLI install + auth | smoke + integration |
| railway-cli | Railway CLI install + skill + auth detection | smoke + integration |
| neonctl | neonctl install + skill + auth detection | smoke + integration |
| docker | Docker daemon + Postgres container health | smoke + integration |
| tldr | TLDR 5 analysis layers + diagnostics | smoke + integration |
| qlty | Code quality CLI | smoke |
| deployer-agent | Agent structure, platform detection, routing tables | smoke |
| skill-rules | All CLI skills registered in skill-rules.json | smoke |
| cli-strategy | Decision tree completeness, inventory accuracy | smoke |
| stale-refs | No dead tool references | smoke |
| browser-automation | Browser tier documentation consistency | smoke |

See `suites/OVERVIEW.md` for detailed descriptions of every test in every suite.

## After Running Tests -- MANDATORY Updates

After each test run, update these files:

### 1. `results/RESULTS-LOG.md`
Add a new entry at the TOP with:
- Date/time
- Trigger (what prompted the test run)
- Suite results table (pass/fail/skip/grade per suite)
- Notes on any failures or skips
- Result file name

### 2. `suites/OVERVIEW.md`
Update if:
- A new suite was added (add its row to the table)
- Test count changed (update the number)
- Suite scope changed (update the description)

## Adding a New Test Suite

1. Create `suites/<tool>.test.mjs`
2. Import: `import { describe, test, assertEqual, assertFileExists, execCmd, run } from '../harness.mjs'`
3. Add smoke tests (file exists, --help works)
4. Add integration tests (commands, JSON validation)
5. Call `await run('<tool>')` at end
6. Update `suites/OVERVIEW.md` with the new suite description
7. Run `node run-all.mjs` and update `results/RESULTS-LOG.md`

## When to Run

- After adding a new CLI tool, skill, or agent
- After editing cli-integration-strategy.md, deployer.md, or skill-rules.json
- Before /ralph workflows that depend on CLI tools
- As part of /release or /post-ship-audit
- After any session that modifies browser-dev-cycle, rules, or MCP configs

## Grade Scale

A = 100% | B = 90%+ | C = 80%+ | D = 70%+ | F = <70%
