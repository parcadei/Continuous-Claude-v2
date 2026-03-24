# Workflow Tests -- CLI Toolset Validation

Comprehensive test framework for every CLI integration in the Continuous Claude system.
Run after adding CLI tools, changing skills/rules, or before major deployments.

## Quick Start

```bash
# Run all 14 suites with combined report
node tests/workflow-tests/run-all.mjs

# Run a single suite
node tests/workflow-tests/suites/cdp-cli.test.mjs
node tests/workflow-tests/suites/opencli.test.mjs
node tests/workflow-tests/suites/stale-refs.test.mjs
```

## Results

- JSON results: `tests/workflow-tests/results/<suite>-<timestamp>.json`
- Combined: `tests/workflow-tests/results/combined-<timestamp>.json`
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

## Adding a New Test

1. Create `suites/<tool>.test.mjs`
2. Import: `import { describe, test, assertEqual, assertFileExists, execCmd, run } from '../harness.mjs'`
3. Add smoke tests (file exists, --help works)
4. Add integration tests (commands, JSON validation)
5. Call `await run('<tool>')` at end

## When to Run

- After adding a new CLI tool or skill
- After editing cli-integration-strategy.md or deployer.md
- Before /ralph workflows that depend on CLI tools
- As part of /release or /post-ship-audit

## Grade Scale

A = 100% | B = 90%+ | C = 80%+ | D = 70%+ | F = <70%
