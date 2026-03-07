# Tier 1: @playwright/mcp Full Reference

## Setup

Add to project `.mcp.json`:

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

Tools available after Claude session restart. No installation needed — `npx` downloads on first use.

## Modes

| Mode | Flag | How It Works | Best For |
|------|------|--------------|----------|
| **Snapshot** (default) | none | Accessibility tree with element refs | Most interactions — no vision needed |
| **Vision** | `--caps vision` | Screenshots + XY coordinates | Visual elements without accessibility labels |
| **PDF** | `--caps pdf` | PDF generation | Saving pages as PDF |
| **Testing** | `--caps testing` | Expect assertions | Automated validation |
| **Tracing** | `--caps tracing` | Code generation | Recording interactions as Playwright scripts |

Combine: `--caps vision,pdf,testing`

**Snapshot mode** is default and preferred. Returns an accessibility tree where each interactive element has a ref like `[ref="e3"]`. More reliable than XY coordinates.

## Core Workflow

```
1. browser_navigate  ->  Load the page
2. browser_snapshot  ->  Get accessibility tree with element refs
3. browser_click / browser_type / browser_select_option  ->  Interact using refs
4. browser_snapshot  ->  Re-read after DOM changes (refs are invalidated)
```

**Critical:** After any navigation or significant DOM change, call `browser_snapshot` again. Previous refs are stale.

## Tool Reference

### Core Interaction

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_navigate` | `url` | Navigate to URL. Waits for page load. |
| `browser_snapshot` | — | Returns accessibility tree with interactive element refs. |
| `browser_click` | `element`, `ref` | Click an element by its ref. |
| `browser_type` | `element`, `ref`, `text` | Type text into an input. Clears existing text first. |
| `browser_select_option` | `element`, `ref`, `values` | Select option(s) from a dropdown. |
| `browser_press_key` | `key` | Press a key. Supports modifiers: `Control+A`, `Shift+Tab`. |
| `browser_hover` | `element`, `ref` | Hover over an element. Triggers hover states and tooltips. |
| `browser_handle_dialog` | `accept`, `promptText` | Handle alert, confirm, or prompt dialogs. |
| `browser_wait_for` | `time` or `text` | Wait for ms or text to appear on page. |
| `browser_evaluate` | `expression` | Execute JavaScript in the page context. Returns result. |

### Tab Management

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_tab_new` | `url` | Open a new tab. |
| `browser_tab_select` | `index` | Switch to tab by index (0-based). |
| `browser_tab_close` | `index` | Close a tab by index. |
| `browser_tab_list` | — | List all open tabs. |

### Vision Mode (requires `--caps vision`)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_take_screenshot` | — | Capture screenshot. Returns base64 image. |
| `browser_move_mouse` | `x`, `y` | Move mouse to XY coordinates. |
| `browser_drag` | `startX`, `startY`, `endX`, `endY` | Drag from point to point. |
| `browser_screen_size` | — | Get current viewport dimensions. |

### PDF (requires `--caps pdf`)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_save_as_pdf` | — | Save current page as PDF. Returns base64. |

### Testing (requires `--caps testing`)

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

### Tracing (requires `--caps tracing`)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `browser_start_codegen` | — | Start recording interactions as Playwright test code. |

## Snapshot Mode Best Practices

1. Read the snapshot carefully — use the exact ref string shown.
2. Prefer `ref` over `element` when both are accepted (ref is unambiguous).
3. After clicking a link or button that navigates: wait briefly, then re-snapshot.
4. For SPAs: DOM changes happen without navigation. Always re-snapshot after clicks that change content.
5. Dialog handling: if a dialog appears (alert/confirm/prompt), handle it with `browser_handle_dialog` before other interactions work.

## Windows Notes

- **Profile directory:** `%USERPROFILE%\AppData\Local\ms-playwright\mcp-chrome-profile`
- **Headless by default.** Add `--headed` to args in `.mcp.json` to see the browser.
- **Connect to existing Chrome:** Add `--cdp-endpoint ws://localhost:9222` to args.
- **npx caching:** First run downloads the package; subsequent runs use cache.
