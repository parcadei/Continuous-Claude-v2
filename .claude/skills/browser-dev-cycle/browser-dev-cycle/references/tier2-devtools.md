# Tier 2: CDP CLI (`scripts/cdp.mjs`)

Replaces chrome-devtools-mcp. Stateless CLI using playwright-core over CDP.

## Setup

Chrome must be running with remote debugging enabled:

```bash
chrome.exe --remote-debugging-port=9222 --user-data-dir=%TEMP%\chrome-cdp
```

Override the CDP URL with `CDP_URL` env var (default: `http://localhost:9222`).

## When to Use Tier 2 Over Tier 1

| Scenario | Why Tier 2 |
|----------|-----------|
| Measure TTFB, LCP, DOM timing | `cdp.mjs perf` -- Tier 1 has no performance API |
| List network requests with sizes | `cdp.mjs network` -- Resource Timing API data |
| Console error capture | `cdp.mjs console` -- captures console messages |
| Accessibility audit | `cdp.mjs a11y` -- checks images, labels, headings, lang |
| Lighthouse scores | `cdp.mjs lighthouse <url>` -- full Lighthouse audit |
| Full a11y tree | `cdp.mjs snapshot` -- accessibility tree snapshot |

## Command Reference

### Navigation & Inspection

| Command | Description |
|---------|-------------|
| `node cdp.mjs navigate <url>` | Navigate to URL, return title + status |
| `node cdp.mjs snapshot [-i]` | Accessibility tree (-i = interesting only) |
| `node cdp.mjs screenshot [path] [--full]` | Screenshot (default: screenshot.png) |
| `node cdp.mjs eval <expression>` | Evaluate JS in page context |
| `node cdp.mjs title` | Get page title |
| `node cdp.mjs url` | Get current URL |
| `node cdp.mjs tabs` | List all open browser tabs |

### Performance & Network

| Command | Description |
|---------|-------------|
| `node cdp.mjs perf` | TTFB, domInteractive, domComplete, LCP, resource count/size |
| `node cdp.mjs network` | List all resource timing entries with name, type, duration, size |
| `node cdp.mjs lighthouse <url>` | Lighthouse audit: performance, a11y, best practices, SEO scores + Core Web Vitals |

### Debugging

| Command | Description |
|---------|-------------|
| `node cdp.mjs console` | Capture console messages |
| `node cdp.mjs a11y` | Accessibility audit: img-no-alt, no-accessible-name, input-no-label, heading-skip, missing-lang |

## Tier 1 + Tier 2 Combined Workflow

Both tiers connect to the same Chrome instance -- no conflicts.

```bash
# 1. Navigate with Tier 1 (Playwright MCP)
browser_navigate "https://example.com"

# 2. Measure performance with Tier 2 (CDP CLI)
node scripts/cdp.mjs perf

# 3. Check network requests
node scripts/cdp.mjs network

# 4. Run accessibility audit
node scripts/cdp.mjs a11y

# 5. Get Lighthouse scores
node scripts/cdp.mjs lighthouse https://example.com
```

## Core Web Vitals Targets

| Metric | Target | Description |
|--------|--------|-------------|
| FCP | < 1.8s | First Contentful Paint |
| LCP | < 2.5s | Largest Contentful Paint |
| CLS | < 0.1 | Cumulative Layout Shift |
| TBT | < 200ms | Total Blocking Time |

## Output Format

All commands output JSON to stdout:

```json
{"success": true, "url": "...", "ttfb": 42, "domInteractive": 180, ...}
```

On error:
```json
{"success": false, "error": "Cannot connect to Chrome at http://localhost:9222..."}
```

## Why CLI Over MCP

| Dimension | MCP (old) | CLI (current) |
|-----------|-----------|---------------|
| Reliability | 72% (Scalekit benchmark) | 100% |
| Token cost | 44,026 per query | 1,365 per query |
| Schema overhead | ~17,000 tokens | 0 |
| Tool names | Undocumented, changed between versions | Stable CLI interface |
