# Tier 2: Chrome DevTools MCP Full Reference

## Setup

Add to project `.mcp.json`:

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

Requires Chrome running with `--remote-debugging-port=9222`. The MCP server connects via CDP.

## When to Use Tier 2 Over Tier 1

| Scenario | Why Tier 2 |
|----------|-----------|
| Measure FCP, LCP, CLS, TTI | `devtools_performance_getMetrics` — Tier 1 has no performance API |
| Debug failed API calls | `devtools_network_getRequestContent` shows response bodies |
| Console errors with stack traces | `devtools_console_getMessages` includes source-mapped locations |
| CSS debugging | `devtools_css_getComputedStyles` shows final computed values |
| Memory leak investigation | `devtools_performance_getMetrics` tracks JS heap size over time |
| Profile rendering | `devtools_performance_startTrace` captures CPU profiles and paint events |

## Tool Reference

### Screenshots and DOM

| Tool | Description |
|------|-------------|
| `devtools_screenshot` | Capture page screenshot. |
| `devtools_dom_querySelector` | Find a single element by CSS selector. Returns node ID. |
| `devtools_dom_querySelectorAll` | Find all elements matching CSS selector. |
| `devtools_dom_getAttributes` | Get attributes for a DOM node. |
| `devtools_dom_getOuterHTML` | Get outer HTML of a node. |

### Network

| Tool | Description |
|------|-------------|
| `devtools_network_getRequests` | List all network requests with URL, method, status, timing. |
| `devtools_network_getRequestContent` | Get the response body for a specific request. |
| `devtools_network_enable` | Start capturing network traffic. |
| `devtools_network_disable` | Stop capturing network traffic. |

### Performance

| Tool | Description |
|------|-------------|
| `devtools_performance_getMetrics` | Get runtime metrics (JS heap, DOM nodes, layouts, etc.). |
| `devtools_performance_startTrace` | Start a performance trace (CPU profile, rendering, etc.). |
| `devtools_performance_stopTrace` | Stop trace and get results. |

### Console

| Tool | Description |
|------|-------------|
| `devtools_console_getMessages` | Get console messages with source-mapped stack traces. |
| `devtools_console_evaluate` | Evaluate JavaScript expression in page context. |
| `devtools_console_clear` | Clear console messages. |

### CSS

| Tool | Description |
|------|-------------|
| `devtools_css_getComputedStyles` | Get computed CSS properties for a DOM node. |
| `devtools_css_getMatchedStyles` | Get matched CSS rules for a node. |
| `devtools_css_getInlineStyles` | Get inline styles for a node. |

### Accessibility

| Tool | Description |
|------|-------------|
| `devtools_accessibility_getTree` | Get the full accessibility tree. |
| `devtools_accessibility_queryNodes` | Query accessibility nodes by role or name. |

## Tier 1 + Tier 2 Combined Workflow

Both tiers can connect to the same Chrome instance simultaneously — no conflicts, they use separate CDP sessions.

Example: Navigate with Tier 1, measure Core Web Vitals with Tier 2.

```
1. devtools_network_enable          -> start capturing
2. browser_navigate (Tier 1)        -> load the page
3. devtools_network_getRequests     -> list all requests
4. devtools_network_getRequestContent -> inspect response bodies
5. devtools_console_getMessages     -> check for JS errors
```

## Core Web Vitals Targets

| Metric | Target | Description |
|--------|--------|-------------|
| FCP | < 1.8s | First Contentful Paint |
| LCP | < 2.5s | Largest Contentful Paint |
| CLS | < 0.1 | Cumulative Layout Shift |
| TTI | < 3.8s | Time to Interactive |
