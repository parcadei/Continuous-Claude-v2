# Browser Automation Rules

## Tool Tiers

| Tier | Tool | Use When |
|------|------|----------|
| 1 | @playwright/mcp | Default for all browser interaction -- navigate, click, screenshot, snapshot |
| 2 | Chrome DevTools MCP | Performance traces, network debugging, memory snapshots, Lighthouse audits |
| 3 | Playwright-core (scripting) | Complex multi-step flows, custom logic, when MCP tools are insufficient |
| 4 | Playwright CLI | E2E test suites (`npx playwright test`), test recording (`npx playwright codegen`) |

Load the `browser-dev-cycle` skill for full decision tree and tool reference.

## Quick Start [H:8]

1. Use `browser_navigate` to open a URL
2. Use `browser_snapshot` to see the page (accessibility tree, not screenshot)
3. Use `browser_click` / `browser_fill` / `browser_select_option` for interaction
4. Use `browser_take_screenshot` for visual verification

## Deprecated Tools [C:10]
- `claude-in-chrome` (tabs_context_mcp, read_page, computer, form_input) -- DEPRECATED
- Do NOT use these for new browser tasks
- Legacy references in other files should be updated to @playwright/mcp

## Timing Rules [H:8]

| After | Wait | Action |
|-------|------|--------|
| `browser_navigate` | Use `browser_wait_for` | Wait for network idle or specific element |
| SPA route change | Re-snapshot | `browser_snapshot` to get fresh accessibility tree |
| Form submission | 1-2s | Before verifying result |

## Error Recovery [H:9]

| Error | Recovery |
|-------|----------|
| Element not found | Re-snapshot, find element in accessibility tree |
| Page not loaded | Check URL, retry navigate |
| Timeout | Increase wait, check if page requires auth |

## Anti-Patterns [C:10]
- NEVER use deprecated claude-in-chrome tools for new work
- NEVER take screenshots when `browser_snapshot` (accessibility tree) would suffice
- NEVER skip waits for dynamic content
