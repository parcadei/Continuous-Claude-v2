---
name: qa-test
description: E2E testing workflow for recording, running, debugging, and maintaining test suites. Covers test recording with codegen, test execution, visual regression, trace debugging, and CI integration. Use when asked to "test user flow", "E2E test", "QA", "regression test", "visual test", "smoke test", "run playwright tests", "record test", "debug test failure".
metadata:
  user-invocable: true
  triggers:
    - /qa-test
---

# QA Test Skill

E2E testing workflow using Playwright. Covers recording new flows, running suites, debugging failures, visual regression, and CI integration.

## Decision Tree

| Request | Action | Command |
|---------|--------|---------|
| Run existing tests | Execute test suite | `npx playwright test --reporter=json` |
| Record a new flow | Launch codegen browser | `npx playwright codegen <url>` |
| Debug a failure | Open trace viewer | `npx playwright show-trace test-results/<test>/trace.zip` |
| Update visual baselines | Regenerate snapshots | `npx playwright test --update-snapshots` |
| Add test for this feature | Snapshot page, write spec | Use `@playwright/cli` snapshot then write spec |
| Smoke test a deploy | Run smoke suite against URL | `BASE_URL=<url> npx playwright test e2e/smoke.spec.ts` |

---

## Workflow: Record → Refine → Run → Debug → Visual

### 1. Record with Codegen

```bash
npx playwright codegen <project-url>
```

Opens a browser + code panel that records every interaction as test code.

Steps:
1. Perform the user flow manually in the browser
2. Copy the generated code into `e2e/<name>.spec.ts`
3. Refine selectors — replace fragile CSS selectors with role-based locators:
   - `page.locator('.btn-submit')` → `page.getByRole('button', { name: 'Submit' })`
   - `page.locator('#email')` → `page.getByLabel('Email')`
4. Add `expect` assertions at key checkpoints

### 2. Run Tests

| Command | Use |
|---------|-----|
| `npx playwright test` | Headless, all tests |
| `npx playwright test --headed` | Watch tests run in browser |
| `npx playwright test --debug` | Step-through debugger |
| `npx playwright test --grep "login"` | Filter by test name |
| `npx playwright test --project=chromium` | Single browser |
| `npx playwright test --reporter=json` | JSON output for CI parsing |
| `npx playwright show-report` | Open HTML report after run |

### 3. Debug Failures

Playwright traces record DOM snapshots, network activity, console logs, and screenshots at every step.

**View a trace locally:**
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

**View online** (no install): drag the `.zip` to [trace.playwright.dev](https://trace.playwright.dev)

The trace timeline shows exactly where the test diverged from expectations — click any action to see the DOM state at that moment.

**Enable traces in config (always-on for CI):**
```ts
use: {
  trace: 'on-first-retry',  // or 'on' for always
}
```

### 4. Visual Regression

Visual snapshot tests catch unintended layout changes.

**First run — create baselines:**
```bash
npx playwright test --update-snapshots
```

**Subsequent runs — compare against baselines:**
```ts
await expect(page).toHaveScreenshot('homepage.png');
await expect(page.locator('.hero')).toHaveScreenshot('hero.png');
```

Diffs appear in the HTML report: `npx playwright show-report`

**Threshold tuning** (for minor anti-aliasing differences):
```ts
await expect(page).toHaveScreenshot({ maxDiffPixels: 100 });
```

### 5. ARIA Snapshot Testing (v1.52+)

More stable than visual screenshots for verifying structure without pixel-level fragility.

```ts
await expect(page.getByRole('navigation')).toMatchAriaSnapshot(`
  - navigation:
    - link "Home"
    - link "About"
    - link "Contact"
`);
```

Use this for accessibility verification and layout structure checks.

---

## E2E Test Template

`e2e/smoke.spec.ts` — minimal baseline for any deployed page:

```ts
import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads with status 200', async ({ page, request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });

  test('key navigation elements visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('basic responsive check (mobile viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();
  });
});
```

---

## Agent Integration

| Agent | Responsibility |
|-------|---------------|
| arbiter | Runs test suites, reports pass/fail counts, surfaces failures |
| kraken | Writes complex multi-step specs with conditional logic |
| spark | Adds assertions to existing tests, small test updates |
| deployer | Runs smoke suite after deploy — gates promotion on pass |

**Pattern for deployer integration:**
```bash
# In deploy pipeline — run smoke against preview URL before promoting
BASE_URL=$PREVIEW_URL npx playwright test e2e/smoke.spec.ts --reporter=json
```

---

## Config Reference

Key settings in `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results/results.json' }]],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

---

## Anti-Patterns

- **CSS selectors over role-based locators**: `getByRole`, `getByLabel`, `getByText` are more resilient to DOM changes and test intent more clearly.
- **Skipping waits for dynamic content**: Always `await expect(locator).toBeVisible()` before interacting — never assume immediate render.
- **Hardcoded environment-specific URLs**: Use `baseURL` from config and `BASE_URL` env var override so the same tests run locally and in CI.
- **Running `--update-snapshots` in CI**: Snapshot updates are a local, intentional action. CI should fail on diff, not silently update baselines.
- **Ignoring flaky tests**: Flaky tests erode trust. Use `--retries=2` to surface genuine flakes, then fix root cause (timing, data isolation).
