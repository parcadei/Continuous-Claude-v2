# Tier 3: Playwright-core CDP Scripting Reference

## Setup

### 1. Launch Chrome with remote debugging

```powershell
# PowerShell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\chrome-debug-profile"
```

Or use `scripts/browser-setup.ps1` if present.

### 2. Install playwright-core

```bash
npm install playwright-core
```

Note: `playwright-core` does NOT download browsers — it connects to an existing Chrome instance via CDP.

### 3. Connect to Chrome

```javascript
// connect-to-chrome.mjs
import { chromium } from 'playwright-core';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = context.pages()[0] || await context.newPage();
```

## Unique Capabilities

Tier 3 provides capabilities neither Tier 1 nor Tier 2 can offer:

- **Network interception and mocking** via `page.route()`
- **HAR recording and replay** via `page.routeFromHAR()`
- **Trace capture** via `context.tracing.start()` / `stop()`
- **Video recording** via context options `recordVideo`
- **State persistence** via `context.storageState()` and cookie manipulation
- **Viewport matrix testing** via `page.setViewportSize()` in a loop
- **Multi-page orchestration** with multiple pages
- **Custom wait conditions** via `page.waitForFunction()`, `page.waitForResponse()`

## Code Patterns

### Network Mocking

```javascript
// Mock an API endpoint
await page.route('**/api/users', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 1, name: 'Test User' },
      { id: 2, name: 'Mock User' }
    ])
  });
});

// Block specific resources (e.g., analytics)
await page.route('**/*analytics*', route => route.abort());

// Modify request headers
await page.route('**/api/**', route => {
  route.continue({
    headers: { ...route.request().headers(), 'X-Test': 'true' }
  });
});
```

### Viewport Matrix Testing

```javascript
const viewports = [
  { width: 375, height: 812, name: 'iPhone-SE' },
  { width: 390, height: 844, name: 'iPhone-14' },
  { width: 768, height: 1024, name: 'iPad' },
  { width: 1024, height: 768, name: 'iPad-landscape' },
  { width: 1280, height: 720, name: 'laptop' },
  { width: 1920, height: 1080, name: 'desktop' }
];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.waitForTimeout(500); // Let layout settle
  await page.screenshot({ path: `screenshots/${vp.name}.png`, fullPage: true });
  console.log(`Captured ${vp.name} (${vp.width}x${vp.height})`);
}
```

### State Save and Restore

```javascript
// Save state (cookies, localStorage, sessionStorage)
const cookies = await context.cookies();
const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
const state = { cookies, localStorage };
await fs.writeFile('browser-state.json', JSON.stringify(state, null, 2));

// Restore state in a later session
const saved = JSON.parse(await fs.readFile('browser-state.json', 'utf-8'));
await context.addCookies(saved.cookies);
await page.evaluate(data => {
  const storage = JSON.parse(data);
  Object.entries(storage).forEach(([k, v]) => window.localStorage.setItem(k, v));
}, saved.localStorage);
```

### Trace Recording

```javascript
await context.tracing.start({ screenshots: true, snapshots: true });

// ... perform the workflow ...

await context.tracing.stop({ path: 'trace.zip' });
// Open trace: npx playwright show-trace trace.zip
```

### HAR Recording and Replay

```javascript
// Record HAR
await page.routeFromHAR('recorded.har', { update: true });
await page.goto('https://example.com');
// ... interact ...
await context.close(); // HAR saved on close

// Replay HAR (offline, no network needed)
await page.routeFromHAR('recorded.har');
await page.goto('https://example.com');
```

## Running Scripts

```bash
node viewport-test.mjs
node --experimental-specifier-resolution=node viewport-test.mjs
```

## Pre-built Scripts

See `scripts/` directory:
- `scripts/browser-setup.ps1` — Launch Chrome with debugging port
- `scripts/viewport-test.mjs` — Viewport matrix capture
- `scripts/playwright-helper.mjs` — Common CDP connection helpers
- `scripts/network-mock.mjs` — Network interception boilerplate
