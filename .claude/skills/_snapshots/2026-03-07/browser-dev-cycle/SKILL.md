---
name: browser-dev-cycle
description: Full development cycle browser automation - viewing, debugging, testing, and visual inspection of web apps. Three-tier strategy using @playwright/mcp (MCP tools), Chrome DevTools MCP (performance), and Playwright-core (scripting). Triggers on "browse", "browser", "screenshot", "viewport", "performance trace", "network debug", "visual QA", "responsive test".
---

# Browser Dev Cycle: Three-Tier Automation Strategy

Comprehensive browser automation covering interaction, performance analysis, and scripted testing. Three tiers serve different needs -- use the lightest tier that gets the job done.

## 1. Decision Tree

### Which Tier for Which Task

| Task | Tier | Tool |
|------|------|------|
| Navigate, click, fill forms, screenshot | Tier 1 | @playwright/mcp |
| Accessibility snapshot | Tier 1 | `browser_snapshot` |
| Performance trace / profiling | Tier 2 | Chrome DevTools MCP |
| Core Web Vitals | Tier 2 | Chrome DevTools MCP |
| Network HAR detail | Tier 2 | Chrome DevTools MCP |
| Console errors with stack traces | Tier 2 | Chrome DevTools MCP |
| CSS computed styles debugging | Tier 2 | Chrome DevTools MCP |
| Network mocking / interception | Tier 3 | Playwright-core scripts |
| Viewport matrix testing | Tier 3 | Playwright-core scripts |
| Video / trace recording | Tier 3 | Playwright-core scripts |
| State save / restore | Tier 3 | Playwright-core scripts |
| Multi-page orchestration | Tier 3 | Playwright-core scripts |
| Visual regression | Tier 1 + Tier 3 | Screenshot compare |

### ASCII Decision Tree

```
What do you need?
|
+-- Basic interaction (nav, click, type, screenshot)
|   +-> Tier 1: @playwright/mcp
|       Direct MCP tool calls. No scripting needed.
|
+-- Performance profiling / network analysis
|   +-> Tier 2: Chrome DevTools MCP
|       CPU traces, Core Web Vitals, response bodies, computed styles.
|
+-- Scripted tests / network mocking / recording
|   +-> Tier 3: Playwright-core CDP scripts
|       Full Playwright API via CDP connection. Write and run .mjs scripts.
|
+-- Multiple of the above
    +-> Combine tiers as needed
        Example: Tier 1 for navigation + Tier 2 for perf metrics
        Example: Tier 1 for screenshots + Tier 3 for viewport matrix
```

### Quick Selection Rules

- **Start with Tier 1** for any interactive task. It covers 80% of browser automation needs.
- **Escalate to Tier 2** when you need data that Tier 1 cannot provide (performance metrics, network bodies, computed CSS).
- **Escalate to Tier 3** when you need programmatic control (loops, conditionals, mocking, recording).
- **Tier 1 + Tier 2** can run against the same browser instance simultaneously. Both connect via CDP.
- **Tier 3** scripts run as standalone Node.js processes and manage their own connections.

---

## 2. TIER 1: @playwright/mcp Reference

The primary tool for browser interaction. Uses MCP protocol -- tools are called directly from Claude without writing scripts.

### Setup

Already configured in project `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@latest"],
      "type": "stdio"
    }
  }
}
```

Tools become available after Claude session restart. No additional installation required -- `npx` downloads the package on first use.

### Modes

| Mode | Flag | How It Works | Best For |
|------|------|--------------|----------|
| **Snapshot** (default) | none | Accessibility tree with element refs | Most interactions -- no vision needed |
| **Vision** | `--caps vision` | Screenshots + XY coordinates | Visual elements without accessibility labels |
| **PDF** | `--caps pdf` | PDF generation | Saving pages as PDF |
| **Testing** | `--caps testing` | Expect assertions | Automated validation |
| **Tracing** | `--caps tracing` | Code generation | Recording interactions as Playwright scripts |

Combine capabilities: `--caps vision,pdf,testing`

**Snapshot mode** is the default and preferred mode. It returns an accessibility tree where each interactive element has a ref like `[ref="e3"]`. Use these refs for all interactions. This is more reliable than XY coordinates and works without vision capabilities.

### Core Workflow

```
1. browser_navigate  ->  Load the page
2. browser_snapshot  ->  Get accessibility tree with element refs
3. browser_click / browser_type / browser_select_option  ->  Interact using refs
4. browser_snapshot  ->  Re-read after DOM changes (refs are invalidated)
```

**Critical rule:** After any navigation or significant DOM change, you MUST call `browser_snapshot` again. Element refs from a previous snapshot are stale and will fail.

### Tool Reference

#### Core Interaction

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_navigate` | `url` | Navigate to URL. Waits for page load. |
| `browser_snapshot` | -- | Returns accessibility tree with interactive element refs. |
| `browser_click` | `element: "Submit [ref=\"e3\"]"`, `ref: "e3"` | Click an element by its ref. |
| `browser_type` | `element: "Search [ref=\"e5\"]"`, `ref: "e5"`, `text: "query"` | Type text into an input field. Clears existing text first. |
| `browser_select_option` | `element: "Country [ref=\"e7\"]"`, `ref: "e7"`, `values: ["US"]` | Select option(s) from a dropdown. |
| `browser_press_key` | `key: "Enter"` | Press a keyboard key. Supports modifiers: `Control+A`, `Shift+Tab`. |
| `browser_hover` | `element: "Menu [ref=\"e2\"]"`, `ref: "e2"` | Hover over an element. Triggers hover states and tooltips. |
| `browser_handle_dialog` | `accept: true`, `promptText: "input"` | Handle alert, confirm, or prompt dialogs. |
| `browser_wait_for` | `time: 2000` or `text: "Loading complete"` | Wait for time (ms) or text to appear on page. |
| `browser_evaluate` | `expression: "document.title"` | Execute JavaScript in the page context. Returns result. |

#### Tab Management

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_tab_new` | `url` | Open a new tab with the given URL. |
| `browser_tab_select` | `index` | Switch to tab by index (0-based). |
| `browser_tab_close` | `index` | Close a tab by index. |
| `browser_tab_list` | -- | List all open tabs with titles and URLs. |

#### Vision Mode (requires `--caps vision`)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_take_screenshot` | -- | Capture a screenshot of the current page. Returns base64 image. |
| `browser_move_mouse` | `x`, `y` | Move mouse to XY coordinates. |
| `browser_drag` | `startX`, `startY`, `endX`, `endY` | Drag from one point to another. |
| `browser_screen_size` | -- | Get the current viewport dimensions. |

#### PDF (requires `--caps pdf`)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_save_as_pdf` | -- | Save current page as PDF. Returns base64. |

#### Testing (requires `--caps testing`)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_expect_text` | `text`, `ref` | Assert element contains text. |
| `browser_expect_visible` | `ref` | Assert element is visible. |
| `browser_expect_hidden` | `ref` | Assert element is hidden. |
| `browser_expect_enabled` | `ref` | Assert element is enabled. |
| `browser_expect_editable` | `ref` | Assert element is editable. |
| `browser_expect_checked` | `ref` | Assert checkbox/radio is checked. |
| `browser_expect_url` | `url` | Assert page URL matches pattern. |
| `browser_expect_title` | `title` | Assert page title matches. |

#### Tracing (requires `--caps tracing`)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_start_codegen` | -- | Start recording interactions as Playwright test code. |

### Windows Notes

- **Profile directory:** `%USERPROFILE%\AppData\Local\ms-playwright\mcp-chrome-profile`
- **Headless by default.** Add `--headed` to args in `.mcp.json` to see the browser window.
- **Connect to existing Chrome:** Add `--cdp-endpoint ws://localhost:9222` to args. Useful when Chrome is already running with remote debugging.
- **npx caching:** First run downloads the package. Subsequent runs use the npx cache. If you see version issues, use `npx -y @playwright/mcp@latest` (already configured).

### Snapshot Mode Best Practices

1. **Read the snapshot carefully.** The accessibility tree shows element roles, names, and refs. Use the exact ref string.
2. **Prefer `ref` over `element` when both are accepted.** The ref is unambiguous.
3. **After clicking a link or button that navigates:** wait briefly, then snapshot again.
4. **For SPAs:** DOM changes happen without navigation. Always re-snapshot after clicks that change content.
5. **Dialog handling:** If a dialog appears (alert/confirm/prompt), you must handle it with `browser_handle_dialog` before other interactions will work.

---

## 3. TIER 2: Chrome DevTools MCP Reference

For performance analysis, network debugging, and CSS inspection. Provides data that Tier 1 cannot access.

### Setup

Already configured in project `.mcp.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "chrome-devtools-mcp@latest"],
      "type": "stdio"
    }
  }
}
```

Requires a Chrome instance running with `--remote-debugging-port=9222`. The MCP server connects via CDP.

### Key Tools Reference

#### Screenshots and DOM

| Tool | Description |
|------|-------------|
| `devtools_screenshot` | Capture page screenshot. |
| `devtools_dom_querySelector` | Find a single element by CSS selector. Returns node ID. |
| `devtools_dom_querySelectorAll` | Find all elements matching CSS selector. |
| `devtools_dom_getAttributes` | Get attributes for a DOM node. |
| `devtools_dom_getOuterHTML` | Get outer HTML of a node. |

#### Network

| Tool | Description |
|------|-------------|
| `devtools_network_getRequests` | List all network requests with URL, method, status, timing. |
| `devtools_network_getRequestContent` | Get the response body for a specific request. |
| `devtools_network_enable` | Start capturing network traffic. |
| `devtools_network_disable` | Stop capturing network traffic. |

#### Performance

| Tool | Description |
|------|-------------|
| `devtools_performance_getMetrics` | Get runtime performance metrics (JS heap, DOM nodes, layouts, etc.). |
| `devtools_performance_startTrace` | Start a performance trace (CPU profile, rendering, etc.). |
| `devtools_performance_stopTrace` | Stop trace and get results. |

#### Console

| Tool | Description |
|------|-------------|
| `devtools_console_getMessages` | Get console messages with source-mapped stack traces. |
| `devtools_console_evaluate` | Evaluate JavaScript expression in page context. |
| `devtools_console_clear` | Clear console messages. |

#### CSS

| Tool | Description |
|------|-------------|
| `devtools_css_getComputedStyles` | Get computed CSS properties for a DOM node. |
| `devtools_css_getMatchedStyles` | Get matched CSS rules for a node. |
| `devtools_css_getInlineStyles` | Get inline styles for a node. |

#### Accessibility

| Tool | Description |
|------|-------------|
| `devtools_accessibility_getTree` | Get the full accessibility tree. |
| `devtools_accessibility_queryNodes` | Query accessibility nodes by role or name. |

### When to Use Tier 2 Over Tier 1

| Scenario | Why Tier 2 |
|----------|-----------|
| Measure FCP, LCP, CLS, TTI | `devtools_performance_getMetrics` provides runtime metrics. Tier 1 has no performance API. |
| Debug failed API calls | `devtools_network_getRequestContent` shows response bodies. Tier 1 only navigates. |
| Console errors with stack traces | `devtools_console_getMessages` includes source-mapped locations. |
| CSS debugging | `devtools_css_getComputedStyles` shows final computed values. |
| Memory leak investigation | `devtools_performance_getMetrics` tracks JS heap size over time. |
| Profile rendering performance | `devtools_performance_startTrace` captures CPU profiles and paint events. |

### Tier 1 + Tier 2 Combined Workflow

Both tiers can connect to the same Chrome instance:

1. Use Tier 1 (`@playwright/mcp`) for navigation and interaction.
2. Use Tier 2 (`chrome-devtools`) for inspection and measurement.
3. No conflicts -- they use separate CDP sessions.

Example: Navigate to a page with Tier 1, then measure Core Web Vitals with Tier 2.

---

## 4. TIER 3: Playwright-core CDP Scripting Reference

For programmatic control when MCP tools are insufficient. Write `.mjs` scripts that use the full Playwright API via CDP connection.

### Setup

```javascript
// connect-to-chrome.mjs
import { chromium } from 'playwright-core';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = context.pages()[0] || await context.newPage();
```

### Prerequisites

1. **Chrome running with remote debugging:**
   ```powershell
   # PowerShell - launch Chrome with debugging port
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\chrome-debug-profile"
   ```
   Or use `browser-setup.ps1` if available in the scripts directory.

2. **playwright-core installed:**
   ```bash
   npm install playwright-core
   ```
   Note: `playwright-core` does NOT download browsers. It connects to an existing Chrome instance via CDP. This is intentional -- we use the system Chrome.

### Unique Capabilities

Tier 3 provides capabilities that neither Tier 1 nor Tier 2 can offer:

- **Network interception and mocking** via `page.route()`
- **HAR recording and replay** via `page.routeFromHAR()`
- **Trace capture** via `context.tracing.start()` / `stop()`
- **Video recording** via context options `recordVideo`
- **State persistence** via `context.storageState()` and cookie manipulation
- **Viewport matrix testing** via `page.setViewportSize()` in a loop
- **Multi-page orchestration** with multiple pages and coordinated actions
- **Custom wait conditions** via `page.waitForFunction()`, `page.waitForResponse()`

### Code Patterns

#### Network Mocking

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

#### Viewport Matrix Testing

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

#### State Save and Restore

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

#### Trace Recording

```javascript
// Start trace before the workflow you want to profile
await context.tracing.start({ screenshots: true, snapshots: true });

// ... perform the workflow ...

await context.tracing.stop({ path: 'trace.zip' });
// Open trace: npx playwright show-trace trace.zip
```

#### HAR Recording and Replay

```javascript
// Record HAR
await page.routeFromHAR('recorded.har', { update: true });
await page.goto('https://example.com');
// ... interact with the page ...
await context.close(); // HAR file is saved on close

// Replay HAR (offline, no network needed)
await page.routeFromHAR('recorded.har');
await page.goto('https://example.com');
// Page loads from recorded responses
```

### Running Tier 3 Scripts

```bash
# Run a script
node viewport-test.mjs

# Run with ES module support (if needed)
node --experimental-specifier-resolution=node viewport-test.mjs
```

---

## 5. Workbook-Specific Patterns

Patterns for the executive Workbook platform (Next.js deployed on Railway).

### Railway Production URL

The production URL follows the pattern: `https://<app-name>.up.railway.app`. Navigate with Tier 1:

```
browser_navigate to the production URL
browser_snapshot to see the landing page / login state
```

### Sidebar Navigation (SPA)

The Workbook uses a sidebar layout. After clicking a sidebar item, the SPA changes route without a full page navigation.

```
1. browser_snapshot -> find sidebar nav items
2. browser_click -> click desired nav item (e.g., "Dashboard [ref=\"e12\"]")
3. browser_wait_for -> wait 1-2 seconds for SPA route change
4. browser_snapshot -> MUST re-snapshot; all refs have changed
5. Interact with new page content using fresh refs
```

**Common mistake:** Using refs from before the sidebar click. They are stale after SPA navigation.

### Command Palette

```
1. browser_press_key -> "Control+k" (or "Meta+k" on Mac) to open command palette
2. browser_snapshot -> find the search input
3. browser_type -> type search query into the palette input
4. browser_snapshot -> see search results
5. browser_click -> select desired result
6. browser_wait_for -> wait for navigation
7. browser_snapshot -> verify destination page
```

### Theme Toggle

```
1. browser_snapshot -> find theme toggle (usually in header or settings)
2. browser_click -> click the toggle
3. browser_snapshot -> verify theme has changed (check background color via accessibility tree)
```

### Workspace Switching

```
1. browser_snapshot -> find workspace selector dropdown
2. browser_click -> open the dropdown
3. browser_snapshot -> see workspace list
4. browser_click -> select target workspace
5. browser_wait_for -> wait for workspace data to load
6. browser_snapshot -> verify new workspace is active
```

### Data Tables

```
# Pagination
1. browser_snapshot -> find "Next" / page number buttons
2. browser_click -> navigate to desired page

# Sorting
1. browser_snapshot -> find column headers
2. browser_click -> click header to sort
3. browser_snapshot -> verify sort order changed

# Scrolling (for virtual scroll tables)
1. browser_evaluate -> "window.scrollTo(0, document.body.scrollHeight)"
2. browser_wait_for -> wait for lazy-loaded content
3. browser_snapshot -> see newly loaded rows
```

### Modal Dialogs

```
1. browser_click -> click button that opens modal
2. browser_wait_for -> wait 500ms for animation
3. browser_snapshot -> see modal content and form fields
4. browser_type -> fill form fields using refs
5. browser_click -> click submit/confirm button
6. browser_wait_for -> wait for modal to close
7. browser_snapshot -> verify modal is gone and action took effect
```

---

## 6. Error Recovery Playbook

### Common Errors and Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| "Target page closed" | Navigation changed page | Re-connect; get a new page reference |
| "Element not found" / "No element with ref" | Stale ref after DOM change | Call `browser_snapshot` again, find element with new ref |
| "Navigation timeout" | Slow page load or server down | Increase timeout; check if the server is running |
| "Connection refused" on CDP | Chrome not running with debug port | Launch Chrome with `--remote-debugging-port=9222` |
| "Protocol error" | CDP connection dropped | Reconnect to CDP endpoint |
| No MCP tools available | MCP server not started | Restart the Claude session |
| "Execution context destroyed" | SPA route change during evaluate | Get fresh page reference; re-snapshot |
| "Dialog is active" | Unhandled alert/confirm | Call `browser_handle_dialog` before other actions |
| "Target closed" | Browser or tab was closed | Open a new tab or reconnect |

### Stale Ref Recovery Pattern

This is the most common error. The recovery is always the same:

```
Error: Element with ref "e5" not found
Recovery:
  1. browser_snapshot           -> get fresh accessibility tree
  2. Find the element again     -> it may have a new ref like "e17"
  3. browser_click ref="e17"    -> use the new ref
```

### Windows-Specific Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `cmd /c npx` fails | npm not in PATH | Use full path: `C:\Users\<user>\AppData\Roaming\npm\npx.cmd` |
| Chrome profile lock | Another Chrome instance holds the lock | Close other Chrome instances, or use a different `--user-data-dir` |
| Port 9222 already in use | Previous debug Chrome not closed | Kill the process: `taskkill /F /IM chrome.exe` (careful -- closes all Chrome) |
| Firewall blocking localhost | Windows Defender or corporate policy | Add exception for `localhost:9222` in Windows Defender Firewall |
| `npx` hangs on first run | Package download blocked by proxy | Set `npm config set proxy` or download package manually |

### Retry Strategy

When an action fails:

1. **First failure:** Re-snapshot and retry with fresh refs.
2. **Second failure:** Wait 2 seconds, then re-snapshot and retry.
3. **Third failure:** Stop. Diagnose the root cause. Do not retry the same action more than 3 times.

If the page is in an unexpected state, consider navigating back to a known good URL and starting over.

---

## 7. Development Workflow Recipes

### Visual QA

Verify a page looks correct and has the right content.

```
Step 1: Navigate
  browser_navigate to target URL

Step 2: Full-page screenshot
  browser_take_screenshot (requires vision mode)
  OR use browser_snapshot for structural validation (no vision needed)

Step 3: Check content
  browser_snapshot -> verify expected elements appear
  Look for: correct headings, buttons, navigation items, data

Step 4: Responsive check (Tier 3)
  Run viewport matrix script to capture at 375, 768, 1024, 1920px
  Review all screenshots for layout breakage

Step 5: Accessibility check
  browser_snapshot returns the accessibility tree
  Check for: missing labels, unlabeled buttons, improper heading hierarchy
```

### API Debugging

Investigate failing or incorrect API calls from the frontend.

```
Option A: Chrome DevTools MCP (Tier 2)
  1. devtools_network_enable -> start capturing
  2. browser_navigate (Tier 1) -> trigger the page load
  3. devtools_network_getRequests -> list all requests
  4. devtools_network_getRequestContent -> inspect response bodies
  5. devtools_console_getMessages -> check for JS errors

Option B: Network Mocking (Tier 3)
  1. Write a script that intercepts the failing API
  2. page.route('**/api/failing-endpoint', ...) -> return mock data
  3. Verify the frontend handles the mock response correctly
  4. Compare mock vs real response to identify the discrepancy
```

### Responsive Testing

Test layout across multiple viewport sizes.

```
Step 1: Create viewport-test.mjs script (Tier 3)
  Define viewports: mobile (375), tablet (768), laptop (1024), desktop (1920)
  Loop: set viewport -> wait -> screenshot -> next

Step 2: Run the script
  node viewport-test.mjs

Step 3: Review screenshots
  Read each screenshot file
  Check for: overflow, overlapping elements, hidden content, broken grids

Step 4: Accessibility at each viewport
  For critical viewports, use browser_snapshot (Tier 1) to verify
  the accessibility tree has the expected structure at that size
```

### Performance Profiling

Measure and improve page performance.

```
Step 1: Baseline metrics (Tier 2)
  devtools_performance_getMetrics -> record JS heap, DOM count, layout count

Step 2: Performance trace
  devtools_performance_startTrace
  browser_navigate (Tier 1) -> load the page being profiled
  Wait for page to fully settle (3-5 seconds)
  devtools_performance_stopTrace -> analyze results

Step 3: Evaluate Core Web Vitals
  Targets:
    FCP (First Contentful Paint)  < 1.8s
    LCP (Largest Contentful Paint) < 2.5s
    CLS (Cumulative Layout Shift)  < 0.1
    TTI (Time to Interactive)      < 3.8s

Step 4: Identify bottlenecks
  Long tasks (>50ms) in the trace
  Large JS bundles in network requests
  Render-blocking resources
  Excessive DOM size (>1500 nodes)

Step 5: Re-measure after fixes
  Repeat Steps 1-3 to verify improvement
```

### State Management

Persist and restore browser state across sessions.

```
Step 1: Login using Tier 1
  browser_navigate to login page
  browser_snapshot -> find email/password fields
  browser_type -> fill credentials
  browser_click -> submit login

Step 2: Save state (Tier 1 or Tier 3)
  Tier 1: browser_evaluate -> "JSON.stringify({
    cookies: document.cookie,
    localStorage: JSON.stringify(localStorage)
  })"
  Save the result to a file

  Tier 3: Use context.cookies() and page.evaluate for localStorage
  Write to browser-state.json

Step 3: Restore state in future sessions
  Tier 3 script: read browser-state.json, set cookies and localStorage
  browser_navigate to the app -> should be logged in

Step 4: Validate restored state
  browser_snapshot -> verify logged-in UI appears
  Check for user-specific content
```

### End-to-End Feature Testing

Combine tiers for thorough feature testing.

```
Step 1: Setup (Tier 3 if mocking needed)
  Mock external APIs that are unreliable in testing
  Set up test data via API calls or database seeding

Step 2: Execute user flow (Tier 1)
  Navigate through the feature step by step
  Fill forms, click buttons, verify content at each step
  Use browser_snapshot for assertions

Step 3: Verify network (Tier 2)
  Check that expected API calls were made
  Verify request payloads and response status codes

Step 4: Performance check (Tier 2)
  Ensure the feature meets performance targets

Step 5: Visual check (Tier 1)
  Take screenshots at key states for visual record
```

---

## 8. Deprecation Notes

The following tools are deprecated. Use @playwright/mcp (Tier 1) instead.

| Deprecated Tool | Issue | Replacement |
|----------------|-------|-------------|
| **agent-browser CLI (`ab`)** | Windows daemon startup broken (GitHub #89, #90). Node.js wrapper unreliable. | Tier 1: @playwright/mcp |
| **Claude-in-Chrome MCP** | 6+ Windows 11 bugs. Extension-based approach is fragile. | Tier 1: @playwright/mcp |
| **Puppeteer MCP** (`@modelcontextprotocol/server-puppeteer`) | Deprecated upstream. ESM import errors. | Tier 1: @playwright/mcp |

The legacy `agent-browser` skill at `.claude/skills/agent-browser/SKILL.md` is preserved for historical reference but should not be used for active browser automation. All new work should use the three-tier strategy described in this document.
