# Browser Automation Tool Comparison

## Status Overview (March 2026)

| Tool | Status | Windows | MCP | Use Case |
|------|--------|---------|-----|----------|
| **@playwright/mcp** | ACTIVE - PRIMARY | Yes | Yes (70+ tools) | Navigate, click, type, screenshot, forms |
| **@playwright/cli** | ACTIVE - AI AGENTS | Yes | No (shell) | Token-efficient browser automation, disk-based snapshots |
| **CDP CLI (cdp.mjs)** | ACTIVE - DEBUGGING | No (connects to existing) | 12 commands | Perf traces, network, console |
| **Playwright-core (CDP)** | ACTIVE - SCRIPTING | Yes | No (scripts) | Network mock, recording, viewport matrix |
| **Playwright CLI** | ACTIVE - TESTING | Yes | No (CLI) | E2E test suites, codegen, traces, reports |
| agent-browser CLI (`ab`) | BROKEN | No (daemon) | No | Deprecated - Unix socket dependency |
| Claude-in-Chrome | BROKEN | Partial | Built-in | Deprecated - 6+ Windows 11 bugs |
| Puppeteer MCP | BROKEN | No | Deprecated | Abandoned - ESM errors |
| Browserbase/Stagehand | ACTIVE (cloud) | Via cloud | Yes | Paid service, can't debug localhost |
| Browser MCP (extension) | ACTIVE | Yes | Yes | Uses existing auth, limited automation |

## Detailed Capability Matrix

| Capability | @playwright/mcp | CDP CLI (cdp.mjs) | Playwright-core CDP | agent-browser | Claude-in-Chrome |
|-----------|:---:|:---:|:---:|:---:|:---:|
| **Navigation** | Yes | Via eval | Yes | BROKEN | BROKEN |
| **Click/Type** | Yes | No | Yes | BROKEN | BROKEN |
| **Screenshots** | Yes | Yes | Yes | BROKEN | BROKEN |
| **Accessibility tree** | Yes (snapshot) | Yes | Yes | BROKEN | BROKEN |
| **Form filling** | Yes | No | Yes | BROKEN | BROKEN |
| **Tab management** | Yes | No | Yes | BROKEN | BROKEN |
| **JS evaluation** | Yes | Yes | Yes | BROKEN | BROKEN |
| **Network requests** | No | Yes (detailed) | Yes (route) | BROKEN | BROKEN |
| **Network mocking** | No | No | Yes (route) | BROKEN | No |
| **Performance traces** | No | Yes | No | No | No |
| **CPU/Memory profiling** | No | Yes | No | No | No |
| **Core Web Vitals** | No | Yes | No | No | No |
| **Console (source-mapped)** | No | Yes | Yes | BROKEN | BROKEN |
| **Computed CSS** | No | Yes | Yes | BROKEN | No |
| **HAR recording** | No | Yes | Yes | BROKEN | No |
| **Video recording** | No | No | Yes | BROKEN | GIF only |
| **Trace capture** | Yes (codegen) | Yes | Yes | BROKEN | No |
| **State save/restore** | No | No | Yes | BROKEN | No |
| **Viewport control** | Yes (resize) | No | Yes | BROKEN | No |
| **Dialog handling** | Yes | No | Yes | BROKEN | BROKEN |
| **PDF generation** | Yes | No | Yes | BROKEN | No |
| **Headed mode** | Yes (flag) | N/A | Yes | BROKEN | Always |
| **Connect existing Chrome** | Yes (--cdp-endpoint) | Yes | Yes (CDP) | BROKEN | Extension |
| **Headless** | Default | N/A | Yes | BROKEN | No |

## Decision Matrix

| I need to... | Use |
|-------------|-----|
| Navigate and interact with a page | @playwright/mcp |
| Fill out forms | @playwright/mcp |
| Take screenshots | @playwright/mcp |
| Check accessibility | @playwright/mcp (snapshot) |
| Profile performance | CDP CLI (cdp.mjs) |
| Debug network issues | CDP CLI (cdp.mjs) |
| Check Core Web Vitals | CDP CLI (cdp.mjs) |
| Debug CSS issues | CDP CLI (cdp.mjs) |
| Mock API responses | Playwright-core script |
| Test responsive layouts | Playwright-core script |
| Record network traffic | Playwright-core script |
| Save/restore browser state | Playwright-core script |
| Run repeatable test suites | Playwright-core script |

## Setup Comparison

| Tool | Setup Complexity | Dependencies |
|------|-----------------|--------------|
| @playwright/mcp | Low (1 line in .mcp.json) | npx, Node.js |
| CDP CLI (cdp.mjs) | Low (node script, no install) | Node.js, Chrome with CDP |
| Playwright-core | Medium (npm install + Chrome launch) | playwright-core, Chrome with CDP |

## Sources

- [@playwright/mcp](https://github.com/microsoft/playwright-mcp) - Microsoft official
- [CDP CLI](scripts/cdp.mjs) - local script, connects to Chrome via `--remote-debugging-port=9222`
- [Playwright docs](https://playwright.dev/docs/api/class-page)
