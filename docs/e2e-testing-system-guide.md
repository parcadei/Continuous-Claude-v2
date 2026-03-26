# E2E Testing System Guide

**Date:** 2026-03-26
**Branch:** `feature/playwright-cli-e2e` (PR #167)
**Status:** Live -- installed globally, synced to `~/.claude/`, ready for use in any project

---

## What Was Built

A complete E2E testing infrastructure for CCv3 that gives every project the ability to record, run, debug, and maintain browser-based tests. The system has three layers:

1. **Tools** -- the browser automation CLIs and test runner
2. **Skills** -- workflows that guide Claude through testing operations
3. **Agents** -- specialized AI that drives browsers and generates reports

### Inventory

| Component | Type | File | Purpose |
|-----------|------|------|---------|
| `@playwright/cli` v1.59.0 | CLI (global) | `npm i -g @playwright/cli` | Token-efficient browser commands, disk-based snapshots |
| `@playwright/test` v1.58.2 | Package (per-project) | `package.json` devDep | Formal test runner with assertions, traces, reporters |
| `qa-test` | Skill | `.claude/skills/qa-test/SKILL.md` | E2E test mechanics (record, run, debug, visual) |
| `qa-suite` | Skill | `.claude/skills/qa-suite/SKILL.md` | Acceptance test orchestration from plans/PRDs |
| `sentinel` | Agent | `.claude/agents/sentinel.md` | Browser-driving QA agent with auth + multi-role |
| `browser-dev-cycle` | Skill (updated) | `.claude/skills/browser-dev-cycle/SKILL.md` | Five-tier browser strategy with Tier 1.5 added |
| `deployer` | Agent (updated) | `.claude/agents/deployer.md` | Post-deploy E2E smoke test step added |
| `init-project` | Skill (updated) | `.claude/skills/init-project/SKILL.md` | Phase 7: E2E scaffolding for new projects |

---

## The Five-Tier Browser Stack

Every project session has access to five tiers of browser automation. Use the lightest tier that gets the job done.

| Tier | Tool | Audience | Token Cost | State |
|------|------|----------|------------|-------|
| **1** | `@playwright/mcp` | Interactive dev | ~114K/task | In context (dies with session) |
| **1.5** | `@playwright/cli` | AI agents | ~27K/task | On disk (persists) |
| **2** | CDP CLI (`scripts/cdp.mjs`) | Performance | Low | JSON to stdout |
| **3** | Playwright-core scripts | Complex flows | Low | Custom scripts |
| **4** | `npx playwright test` | Formal suites | N/A | Reports on disk |

**When to use which:**
- Browsing a page, clicking around, filling forms? **Tier 1** (Playwright MCP)
- Agent needs to snapshot pages for analysis? **Tier 1.5** (@playwright/cli -- 4x fewer tokens)
- Performance metrics, Core Web Vitals, network timing? **Tier 2** (CDP CLI)
- Network mocking, video recording, viewport matrix? **Tier 3** (Playwright-core scripts)
- Repeatable test suites, CI integration, cross-browser? **Tier 4** (Playwright test runner)

---

## The Two Skills: qa-test vs qa-suite

These are complementary, not overlapping.

### `/qa-test` -- The Mechanics

**Trigger:** "E2E test", "smoke test", "run playwright tests", "record test", "debug test failure"

Covers individual testing operations:

| Task | Command |
|------|---------|
| Run existing tests | `npx playwright test --reporter=json` |
| Record a new flow | `npx playwright codegen <url>` |
| Debug a failure | `npx playwright show-trace test-results/<test>/trace.zip` |
| Update visual baselines | `npx playwright test --update-snapshots` |
| Add test for a feature | Snapshot with @playwright/cli, write spec |
| Smoke test a deploy | `BASE_URL=<url> npx playwright test e2e/smoke.spec.ts` |

**Workflow:** Record (codegen) -> Refine (role-based locators) -> Run -> Debug (traces) -> Visual (screenshots)

### `/qa-suite` -- The Orchestrator

**Trigger:** "run QA suite", "acceptance test", "test the feature", "QA report"

Parses a plan/PRD into a structured test matrix and runs it:

1. Read the plan file (e.g., a Phase B implementation plan)
2. Extract roles, feature areas, and verification criteria
3. Generate a test matrix: roles x flows x assertions
4. Present matrix to user for approval
5. Spawn the **sentinel agent** per role
6. Aggregate results into a graded report (A through F)

**Example:**
```
User: "Run QA suite for Phase B"
-> Parses plan -> 4 roles x 7 areas = 28 scenarios
-> Spawns sentinel for admin (12 scenarios)
-> Spawns sentinel for editor (8 scenarios)
-> Spawns sentinel for viewer (5 scenarios)
-> Spawns sentinel for guest (3 scenarios)
-> Aggregates: 26 PASS, 2 FAIL -> Grade: B+ (93%)
```

---

## The Sentinel Agent

**File:** `~/.claude/agents/sentinel.md`

A browser-driving QA agent purpose-built for acceptance testing. Key capabilities:

- **Auth-aware:** Logs in as admin, editor, viewer, or guest using credentials from the project CLAUDE.md
- **Browser tools:** Uses Playwright MCP (Tier 1) for interaction, CDP CLI (Tier 2) for performance and accessibility
- **Failure capture:** Takes screenshots on any failure, captures console errors after every page load
- **Accessibility:** Runs `node scripts/cdp.mjs a11y` on every major page
- **Structured output:** Writes PASS/FAIL results to `.claude/cache/agents/sentinel/latest-output.md`

**Grading scale:**

| Grade | Pass Rate | Ship Decision |
|-------|-----------|---------------|
| A | 100% | Ship |
| A- | 95-99% | Ship with known issues documented |
| B+ | 90-94% | Review failures before shipping |
| B | 80-89% | Fix critical failures first |
| C | 70-79% | Do not ship |
| F | <70% | Critical failures |

**Test execution pattern per scenario:**
1. Setup: Navigate to starting page, confirm loaded
2. Action: Perform the user action (click, fill, navigate)
3. Assert: Snapshot, verify expected elements exist
4. Capture: On failure -- screenshot + console errors
5. Report: Record PASS/FAIL with details

---

## Deployer Integration

The deployer agent (`~/.claude/agents/deployer.md`) now includes a post-deploy E2E smoke step:

After confirming a deployment succeeded, if the project has an `e2e/` directory:
1. Runs `BASE_URL=<deploy-url> npx playwright test e2e/smoke.spec.ts --reporter=json`
2. Reports "E2E smoke: PASSED" or failure details
3. For Vercel previews: uses the preview URL
4. For Railway: uses the service's public domain

---

## init-project Integration

When initializing a new web project (`/init-project`), **Phase 7** now offers E2E scaffolding:

1. Checks if the project serves on a port
2. Asks: "Want me to set up E2E testing with Playwright?"
3. If yes:
   - Installs `@playwright/test` as devDep
   - Installs Chromium browser
   - Creates `e2e/smoke.spec.ts` with project-specific baseURL
   - Creates/verifies `playwright.config.ts`
   - Adds npm scripts: `test:e2e`, `test:e2e:headed`, `test:e2e:codegen`
   - Runs the smoke test to verify

---

## How to Use This in a Project Session

### Quick Start: Run Existing Tests

```
User: "run the E2E tests"
```
Claude loads `/qa-test` skill, runs `npx playwright test --reporter=json`, reports results.

### Record a New Test

```
User: "record a test for the login flow"
```
Claude runs `npx playwright codegen http://localhost:3003`, you interact with the browser, generated code goes into a spec file.

### Full Acceptance Suite

```
User: "run QA suite for Phase B"
```
Claude loads `/qa-suite`, reads the plan, generates a 28-scenario matrix, spawns sentinel agents per role, produces a graded report.

### Debug a Failure

```
User: "debug the failing test"
```
Claude opens the trace viewer (`npx playwright show-trace`), which shows DOM snapshots, network requests, console logs, and screenshots at every step.

### After a Deploy

The deployer agent automatically runs `e2e/smoke.spec.ts` against the deploy URL if the directory exists.

---

## For the Fourth Connect Testing Session


**Now available (from this work):**
- `sentinel` agent for browser-driven acceptance testing
- `/qa-suite` skill for plan-driven test orchestration
- `/qa-test` skill for individual test operations
- `@playwright/cli` globally for token-efficient snapshots

**To execute the Phase B test suite:**

1. Ensure dev server is running 
2. Ensure database is seeded with test data (admin, editor, viewer users + spaces)
3. Run: `/qa-suite` and point it to the Phase B plan at `.claude/plans/delightful-kindling-rocket.md`
4. Or run individual tests: `npx playwright test --project=public` (starts with public pages)


---

## File Locations

| File | Location | Synced To |
|------|----------|-----------|
| sentinel agent | `continuous-claude/.claude/agents/sentinel.md` | `~/.claude/agents/sentinel.md` |
| qa-test skill | `continuous-claude/.claude/skills/qa-test/SKILL.md` | `~/.claude/skills/qa-test/SKILL.md` |
| qa-suite skill | `continuous-claude/.claude/skills/qa-suite/SKILL.md` | `~/.claude/skills/qa-suite/SKILL.md` |
| browser-dev-cycle | `continuous-claude/.claude/skills/browser-dev-cycle/SKILL.md` | `~/.claude/skills/browser-dev-cycle/SKILL.md` |
| deployer agent | `continuous-claude/.claude/agents/deployer.md` | `~/.claude/agents/deployer.md` |
| browser-automation rule | `continuous-claude/.claude/rules/browser-automation.md` | `~/.claude/rules/browser-automation.md` |
| CLI strategy | `continuous-claude/.claude/rules/cli-integration-strategy.md` | `~/.claude/rules/cli-integration-strategy.md` |
| tool comparison | `continuous-claude/.claude/skills/browser-dev-cycle/references/tool-comparison.md` | synced |
| init-project | `continuous-claude/.claude/skills/init-project/SKILL.md` | `~/.claude/skills/init-project/SKILL.md` |

---

## Common Playwright Commands Reference

| Command | Purpose |
|---------|---------|
| `npx playwright test` | Run all tests headless |
| `npx playwright test --headed` | Watch tests run in a browser |
| `npx playwright test --debug` | Step through with Playwright Inspector |
| `npx playwright test --grep "login"` | Filter by test name |
| `npx playwright test --project=public` | Run specific project |
| `npx playwright test --reporter=json` | JSON output for agent parsing |
| `npx playwright codegen <url>` | Record user actions as test code |
| `npx playwright show-report` | Open HTML test report |
| `npx playwright show-trace <trace.zip>` | Open trace viewer for debugging |
| `npx playwright test --update-snapshots` | Update visual regression baselines |
| `npx playwright install chromium` | Install Chromium browser |
| `playwright-cli snapshot` | Save YAML accessibility snapshot to disk |
| `playwright-cli screenshot` | Save screenshot to disk |
| `playwright-cli open <url>` | Open browser (token-efficient, disk-based) |

---

## Ralph Integration

The `/ralph` autonomous dev workflow now includes browser QA as a conditional gate. When Ralph builds a UI-affecting feature, the GSD lifecycle includes:

```
Phase 3:   RED → GREEN → VERIFY → BROWSER (conditional)
Phase 4.1: npm test + typecheck + lint
Phase 4.1.5: plan-reviewer checks PRD acceptance criteria
Phase 4.1.6: sentinel browser QA gate (conditional)
Phase 4.2: merge
```

**Phase 4.1.6 activates when:** PRD mentions UI flows, or implementation touched frontend paths (`src/app/`, `src/components/`, `pages/`).

**Phase 4.1.6 skips when:** Backend-only, CLI, hooks, or documentation changes.

**New task types in Ralph:**
- `e2e_test` — spark/kraken writes specs, arbiter runs them
- `browser_qa` — sentinel drives live browser, generates graded report (A-F)

**Failure handling:** Grade A/A- proceeds to merge. B+/B requires fixing critical failures. C or below blocks merge and escalates to user.

---

## Git History

| Commit | Description |
|--------|-------------|
| `4ab3b04` | Tier 1.5 in browser-dev-cycle, qa-test skill, deployer E2E step, init-project Phase 7, rule + CLI updates |
| `787b773` | sentinel agent, qa-suite skill, @playwright/cli global install |
| `9b04189` | Wire sentinel + qa-suite into Ralph GSD lifecycle (5 Ralph files) |

Branch: `feature/playwright-cli-e2e` -- PR #167 against `parcadei/Continuous-Claude-v3`
