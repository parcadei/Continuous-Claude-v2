---
name: browser-dev-cycle
description: Full development cycle browser automation - viewing, debugging, testing, and visual inspection of web apps. Three-tier strategy using @playwright/mcp (MCP tools), Chrome DevTools MCP (performance), and Playwright-core (scripting). Triggers on "browse", "browser", "screenshot", "viewport", "performance trace", "network debug", "visual QA", "responsive test".
---

# Browser Dev Cycle: Three-Tier Automation Strategy

Comprehensive browser automation covering interaction, performance analysis, and scripted testing. Use the lightest tier that gets the job done.

## 1. Decision Tree

### Quick Selector

| Task | Tier | Tool |
|------|------|------|
| Navigate, click, fill forms, screenshot | Tier 1 | @playwright/mcp |
| Accessibility snapshot | Tier 1 | `browser_snapshot` |
| Performance trace / profiling | Tier 2 | Chrome DevTools MCP |
| Core Web Vitals | Tier 2 | Chrome DevTools MCP |
| Network HAR detail / response bodies | Tier 2 | Chrome DevTools MCP |
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
```

### Selection Rules

- **Start with Tier 1** for any interactive task — covers 80% of browser automation needs.
- **Escalate to Tier 2** when you need performance metrics, network bodies, or computed CSS.
- **Escalate to Tier 3** when you need programmatic control (loops, conditionals, mocking, recording).
- **Tier 1 + Tier 2** can run against the same browser instance simultaneously via separate CDP sessions.
- **Tier 3** scripts run as standalone Node.js processes and manage their own connections.

---

## 2. TIER 1: @playwright/mcp

Primary tool for browser interaction. Tools are called directly from Claude via MCP — no scripting needed.

**Setup** (add to `.mcp.json`):
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

**Core workflow:**
```
1. browser_navigate  ->  Load the page
2. browser_snapshot  ->  Get accessibility tree with element refs
3. browser_click / browser_type / browser_select_option  ->  Interact using refs
4. browser_snapshot  ->  Re-read after DOM changes (refs are invalidated)
```

**Critical:** After any navigation or DOM change, call `browser_snapshot` again — prior refs are stale.

**Key tools:** `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_select_option`, `browser_press_key`, `browser_hover`, `browser_wait_for`, `browser_evaluate`, `browser_tab_new/select/close`, `browser_take_screenshot` (vision mode), `browser_handle_dialog`

Full tool reference with all parameters: `references/tier1-playwright-mcp.md`

---

## 3. TIER 2: Chrome DevTools MCP

For performance analysis, network debugging, and CSS inspection.

**Setup** (add to `.mcp.json`):
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

Requires Chrome running with `--remote-debugging-port=9222`.

**Key tools by category:**
- **DOM:** `devtools_dom_querySelector`, `devtools_dom_getOuterHTML`
- **Network:** `devtools_network_enable`, `devtools_network_getRequests`, `devtools_network_getRequestContent`
- **Performance:** `devtools_performance_getMetrics`, `devtools_performance_startTrace`, `devtools_performance_stopTrace`
- **Console:** `devtools_console_getMessages`, `devtools_console_evaluate`
- **CSS:** `devtools_css_getComputedStyles`, `devtools_css_getMatchedStyles`
- **Accessibility:** `devtools_accessibility_getTree`

Full tool reference with all parameters: `references/tier2-devtools.md`

---

## 4. TIER 3: Playwright-core CDP Scripting

For programmatic control — loops, mocking, recording, viewport matrix.

**Connect to Chrome:**
```javascript
import { chromium } from 'playwright-core';
const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = context.pages()[0] || await context.newPage();
```

**Unique capabilities:** `page.route()` (network mock), `page.routeFromHAR()`, `context.tracing`, `page.setViewportSize()`, `context.storageState()`, `page.waitForFunction()`

**Pre-built scripts** in `scripts/`: `browser-setup.ps1`, `viewport-test.mjs`, `playwright-helper.mjs`, `network-mock.mjs`

Full patterns and code examples: `references/tier3-scripting.md`

---

## 5. Error Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| "Element not found" / "No element with ref" | Stale ref after DOM change | Call `browser_snapshot` again, find element with new ref |
| "Target page closed" | Navigation changed page | Reconnect; get a new page reference |
| "Navigation timeout" | Slow page or server down | Increase timeout; check server is running |
| "Connection refused" on CDP | Chrome not running with debug port | Launch Chrome with `--remote-debugging-port=9222` |
| "Protocol error" | CDP connection dropped | Reconnect to CDP endpoint |
| No MCP tools available | MCP server not started | Restart the Claude session |
| "Execution context destroyed" | SPA route change during evaluate | Get fresh page reference; re-snapshot |
| "Dialog is active" | Unhandled alert/confirm | Call `browser_handle_dialog` before other actions |

**Stale ref recovery (most common):**
```
Error: Element with ref "e5" not found
Recovery:
  1. browser_snapshot           -> get fresh accessibility tree
  2. Find the element again     -> it may have a new ref like "e17"
  3. browser_click ref="e17"    -> use the new ref
```

**Windows-specific:**
- Chrome profile lock: close other Chrome instances or use a different `--user-data-dir`
- Port 9222 in use: `taskkill /F /IM chrome.exe` (closes all Chrome)
- `cmd /c npx` fails: ensure npm is in PATH

**Retry strategy:** Re-snapshot and retry → wait 2s + retry → stop after 3rd failure and diagnose.

---

## 6. Workbook Platform Patterns

Workbook-specific SPA patterns (Next.js on Railway):

- **Sidebar nav:** click item → wait 1-2s → re-snapshot (SPA changes all refs)
- **Command palette:** `Control+k` → snapshot → type query → click result → re-snapshot
- **Data tables:** find header/pagination refs → click → wait 500ms → re-snapshot
- **Modals:** click trigger → wait 500ms → snapshot → fill form → click submit → verify closed

Full patterns, breakpoints, known issues, and testing checklist: `references/workbook-patterns.md`

---

## 7. Workflow Recipes

Common multi-step workflows: Visual QA, API Debugging, Responsive Testing, Performance Profiling, State Management, End-to-End Feature Testing.

See: `references/workflow-recipes.md`

---

## 8. Deprecation Notes

| Deprecated Tool | Issue | Replacement |
|----------------|-------|-------------|
| **agent-browser CLI (`ab`)** | Windows daemon startup broken (GitHub #89, #90) | Tier 1: @playwright/mcp |
| **Claude-in-Chrome MCP** | 6+ Windows 11 bugs. Extension approach is fragile. | Tier 1: @playwright/mcp |
| **Puppeteer MCP** | Deprecated upstream. ESM import errors. | Tier 1: @playwright/mcp |

The legacy `agent-browser` skill at `.claude/skills/agent-browser/SKILL.md` is preserved for historical reference only.

---

## Reference Files

| File | Contents |
|------|----------|
| `references/tier1-playwright-mcp.md` | Full tool tables, all parameters, modes, best practices |
| `references/tier2-devtools.md` | Full tool tables, combined workflow, CWV targets |
| `references/tier3-scripting.md` | Setup, code patterns, pre-built scripts |
| `references/workflow-recipes.md` | Step-by-step recipes for common workflows |
| `references/workbook-patterns.md` | Workbook SPA patterns, breakpoints, known issues |
| `references/tool-comparison.md` | Capability matrix across all tools |
