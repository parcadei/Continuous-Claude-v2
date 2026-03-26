# Tier 4: Playwright CLI Testing

Full E2E test suite support using `@playwright/test` — the official Playwright test runner with built-in reporters, trace viewer, and codegen.

---

## Setup

Already done for projects that have completed onboarding:

```bash
npm install -D playwright @playwright/test
npx playwright install chromium
```

Config lives at `playwright.config.ts` in the project root.

---

## CLI Commands Quick Reference

| Command | Purpose |
|---------|---------|
| `npx playwright test` | Run all tests headless |
| `npx playwright test --grep "keyword"` | Run tests matching pattern |
| `npx playwright test --headed` | Run with visible browser |
| `npx playwright test --debug` | Pause at each step in Playwright Inspector |
| `npx playwright codegen <url>` | Record user actions -> generate test code |
| `npx playwright show-trace trace.zip` | Open trace viewer for a recorded trace |
| `npx playwright show-report` | Open HTML report from last run |

---

## When to Use CLI vs MCP

| Scenario | Use | Why |
|----------|-----|-----|
| Exploratory interaction, one-off tasks | Tier 1 (MCP) | Faster, no file overhead |
| Scripted programmatic automation | Tier 3 (CDP scripts) | Flexible, no test framework needed |
| Repeatable regression tests | Tier 4 (CLI) | Persistent, CI-runnable, structured |
| Recording a test from scratch | Tier 4 codegen | Generates correct locators automatically |
| Debugging a failing test | Tier 4 --debug | Playwright Inspector shows step-by-step |
| Cross-browser coverage | Tier 4 (CLI) | Config supports chromium/firefox/webkit |

---

## Codegen Workflow

### Record

```bash
npx playwright codegen http://localhost:3000
```

Codegen opens a browser window + a code panel. Everything you click, type, or assert gets recorded as Playwright test code in real time.

### Refine

Paste the generated code into a `.spec.ts` file and:
- Replace `page.locator('text=...')` with role-based locators where possible (`getByRole`, `getByLabel`)
- Add `expect` assertions for success states
- Add `test.beforeEach` for repeated setup (login, navigation)
- Wrap data-specific values in variables

### Commit

Place the file under `tests/` or `e2e/` and commit. It now runs in CI.

---

## Codegen Features

| Feature | How to Activate |
|---------|----------------|
| Locator picker | Click the target icon in codegen panel, hover elements to see locator strings |
| Assertion mode | Click the assertion icon (checkmark) to record `expect()` assertions |
| Pause recording | Click the pause button -- useful before asserting on dynamic content |
| Copy to clipboard | Click copy in the panel to grab generated code without saving |

---

## When to Use Codegen vs Manual Tests

**Use codegen when:**
- Bootstrapping a test for a complex multi-step flow (login, checkout, form wizard)
- Quickly generating locators for an unfamiliar page structure
- You want to verify the correct locator strategy before writing assertions

**Write manual tests when:**
- The test involves dynamic data (API responses, random IDs)
- You need parameterized tests (`test.each`)
- The flow requires programmatic state setup (database seeding, mocking)
- Codegen produces fragile CSS-based locators that need replacing anyway

---

## npm Scripts Reference

Add these to `package.json` for project-standard commands:

```json
{
  "scripts": {
    "test:e2e":          "playwright test",
    "test:e2e:headed":   "playwright test --headed",
    "test:e2e:debug":    "playwright test --debug",
    "test:e2e:codegen":  "playwright codegen",
    "test:e2e:report":   "playwright show-report",
    "test:e2e:trace":    "playwright show-trace"
  }
}
```

---

## Ralph Integration

| Role | Responsibility |
|------|---------------|
| arbiter | Runs `npx playwright test` and reports pass/fail counts |
| atlas | Runs full E2E suite across browsers |
| sentinel | Live browser QA -- auth-aware, multi-role, graded reports (A-F) |
| kraken | Writes new `.spec.ts` files for complex, multi-step flows |
| spark | Adds assertions to existing tests or writes single-scenario specs |
| ralph | Creates `e2e_test` + `browser_qa` task types; delegates accordingly |

### Task type: `e2e_test`

Ralph tasks with `type: e2e_test` follow this flow:
1. spark/kraken writes the `.spec.ts` file
2. arbiter runs `npx playwright test tests/<file>.spec.ts`
3. arbiter reports: pass count, fail count, and path to trace on failure
4. kraken fixes failures (max 3 attempts per RULES.md self-healing limit)

### Task type: `browser_qa`

Ralph tasks with `type: browser_qa` follow this flow:
1. sentinel logs in as each required role (credentials from project CLAUDE.md)
2. sentinel navigates key user flows from the PRD
3. sentinel captures failures with screenshots + console errors
4. sentinel generates graded report (A-F)
5. Grade B+ or above: PASS. Below B+: kraken fixes, sentinel re-verifies (max 3 attempts per RULES.md self-healing limit)
