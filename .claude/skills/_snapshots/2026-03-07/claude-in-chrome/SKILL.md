---
name: claude-in-chrome
description: Browser automation via Claude-in-Chrome MCP with full navigation, tab management, and debugging
---

# Claude-in-Chrome Browser Automation

Control Chrome browser with full navigation support, multi-tab management, and real-time debugging.

## When to Use

- Multi-page workflows (login → dashboard → report)
- Form testing across navigation
- Real-time debugging (console/network)
- Visual documentation (screenshots, GIFs)
- Responsive design testing

## Prerequisites

1. Chrome with Claude-in-Chrome extension active
2. **ALWAYS** call `tabs_context_mcp` first
3. Create new tabs for each conversation

## Tool Reference (15 Tools)

### Tab Management
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `tabs_context_mcp` | Get/create tab context | `createIfEmpty: bool` |
| `tabs_create_mcp` | Create new tab | (none) |

### Navigation
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `navigate` | Go to URL or history | `url`, `tabId` |

### Page Reading
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `read_page` | Accessibility tree | `tabId`, `depth`, `filter` |
| `find` | Natural language search | `query`, `tabId` |
| `get_page_text` | Extract text content | `tabId` |

### Interaction
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `computer` | Mouse/keyboard/screenshot | `action`, `tabId`, `ref`/`coordinate` |
| `form_input` | Set form values | `ref`, `value`, `tabId` |
| `javascript_tool` | Execute page JS | `text`, `tabId` |

### Debugging
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `read_console_messages` | Console log access | `tabId`, `pattern`, `onlyErrors` |
| `read_network_requests` | Network monitoring | `tabId`, `urlPattern` |

### Utilities
| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `resize_window` | Window sizing | `width`, `height`, `tabId` |
| `gif_creator` | GIF recording | `action`, `tabId` |
| `upload_image` | File uploads | `imageId`, `ref`/`coordinate`, `tabId` |
| `shortcuts_list/execute` | Workflow shortcuts | `tabId`, `command` |

## Workflow Pattern (CRITICAL)

```javascript
// 1. ALWAYS get context first
const context = await tabs_context_mcp({ createIfEmpty: true });

// 2. Create new tab for this conversation
const newTab = await tabs_create_mcp();
const tabId = newTab.tabId;

// 3. Navigate to target
await navigate({ url: "http://localhost:8080/meetings/", tabId });

// 4. Read page structure
const tree = await read_page({ tabId, filter: "interactive" });

// 5. Interact using refs from read_page
await computer({ action: "left_click", ref: "ref_34", tabId });

// 6. Verify with screenshot
await computer({ action: "screenshot", tabId });
```

## Computer Actions

| Action | Parameters | Use |
|--------|------------|-----|
| `screenshot` | tabId | Capture current state |
| `left_click` | ref OR coordinate, tabId | Click element |
| `right_click` | ref OR coordinate, tabId | Context menu |
| `double_click` | ref OR coordinate, tabId | Double-click |
| `type` | text, tabId | Type text |
| `key` | text (e.g., "Escape"), tabId | Key press |
| `scroll` | scroll_direction, tabId | Scroll page |
| `wait` | duration (seconds), tabId | Wait for load |
| `hover` | ref OR coordinate, tabId | Hover element |
| `zoom` | region [x0,y0,x1,y1], tabId | Zoom region |

## Code Patterns

### Navigation with Verification
```javascript
await navigate({ url: "https://example.com", tabId });
await computer({ action: "wait", duration: 2, tabId });
await computer({ action: "screenshot", tabId });
```

### Form Completion
```javascript
// Get interactive elements
const elements = await read_page({ tabId, filter: "interactive" });
// Find input by placeholder or position
await form_input({ ref: "ref_32", value: "search term", tabId });
```

### Button Click by Ref
```javascript
const page = await read_page({ tabId, filter: "interactive" });
// Find button ref from output, e.g., button "Submit" [ref_15]
await computer({ action: "left_click", ref: "ref_15", tabId });
```

### Console Debugging
```javascript
// Get all errors
const errors = await read_console_messages({
  tabId,
  onlyErrors: true,
  limit: 20
});

// Filter by pattern
const warnings = await read_console_messages({
  tabId,
  pattern: "warning|deprecated"
});
```

### Network Monitoring
```javascript
// Note: Tracking starts on first call
await read_network_requests({ tabId }); // Start tracking

// Trigger action that makes API calls
await computer({ action: "left_click", ref: "ref_submit", tabId });

// Check captured requests
const apiCalls = await read_network_requests({
  tabId,
  urlPattern: "/api/"
});
```

### GIF Recording
```javascript
// Start recording
await gif_creator({ action: "start_recording", tabId });
await computer({ action: "screenshot", tabId }); // First frame

// Perform actions to record
await computer({ action: "left_click", ref: "ref_5", tabId });
await computer({ action: "wait", duration: 1, tabId });
await computer({ action: "screenshot", tabId });

// Stop and export
await gif_creator({ action: "stop_recording", tabId });
await gif_creator({ action: "export", download: true, tabId });
```

## Limitations & Workarounds

### Cannot Enter Passwords
Claude cannot enter passwords or sensitive credentials.
**Workaround:** User enters manually; Claude verifies form state afterward.

### Bot Detection (CAPTCHAs)
Cannot bypass verification challenges.
**Workaround:** User completes CAPTCHA; Claude continues automation.

### OAuth/SSO Flows
May trigger external authentication popups.
**Workaround:** User completes auth; wait and verify logged-in state.

### Dynamic Content Loading
SPAs may need explicit waits.
**Workaround:** Use `computer({ action: "wait", duration: N })` between actions.

### find Tool OAuth Error
Natural language find may fail with OAuth errors.
**Workaround:** Use refs from `read_page` instead.

## Best Use Cases

1. **Multi-page Workflows:** Complete user journeys across navigation
2. **API Debugging:** Monitor network requests during interactions
3. **Visual Documentation:** GIF recordings of workflows
4. **Form Testing:** Complex multi-field forms with validation
5. **Console Debugging:** Monitor JS errors during automation
6. **Responsive Testing:** Test layouts at different viewport sizes

## Timing Patterns [H:8]

| After Action | Wait | Reason |
|--------------|------|--------|
| `navigate` to React app | 2s | Hydration + data fetch |
| `navigate` to static page | 0.5s | DOM rendering |
| `form_input` | 0s | Immediate propagation |
| `left_click` on button | 1s | State updates |
| SPA route change | Re-read | Refs completely change |
| Screenshot "Detached" error | 1s then retry | Frame not ready |

### React/SPA Pattern
```javascript
await navigate({ url, tabId });
await computer({ action: "wait", duration: 2, tabId });
await read_page({ tabId, filter: "interactive" });
```

### Screenshot Recovery
```javascript
try {
  await computer({ action: "screenshot", tabId });
} catch (e) {
  if (e.message?.includes("Detached")) {
    await computer({ action: "wait", duration: 1, tabId });
    await computer({ action: "screenshot", tabId }); // Retry succeeds
  }
}
```

## Error Recovery [H:9]

| Error | Detection | Recovery |
|-------|-----------|----------|
| Stale ref | "No element found with reference" | Re-read page, find element again |
| Tab closed | "No tabs available" | `tabs_context_mcp`, create new tab |
| Invalid tab | "No tabs available" | `tabs_context_mcp`, verify tabId |
| Detached | "Detached while handling" | `wait(1)`, retry action |
| Unsupported input | "not a supported form input" | Use `computer({ action: "left_click" })` |

### Recovery Pattern
```javascript
// On stale ref error
const page = await read_page({ tabId, filter: "interactive" });
// Find element again using text/role from page output
await computer({ action: "left_click", ref: "ref_NEW", tabId });
```

## Form Widget Patterns [H:8]

| Widget Type | Tool | Pattern |
|-------------|------|---------|
| Text input | `form_input` | Standard |
| Native checkbox | `form_input` | `value: true/false` |
| **Custom checkbox** (button) | `computer` | **Use click, not form_input** |
| Native date picker | `form_input` | ISO format: `"2026-01-15"` |
| Custom dropdown | `computer` | Click to open, click option |
| Autocomplete | `computer` + `form_input` | Type then click suggestion |

### Custom Checkbox Pattern (CRITICAL)
```javascript
// WRONG - fails with "not a supported form input"
await form_input({ ref: "ref_checkbox", value: true, tabId });

// RIGHT - custom checkboxes are <button> elements
await computer({ action: "left_click", ref: "ref_checkbox", tabId });
```

### Native Date Picker
```javascript
await form_input({ ref: "ref_date", value: "2026-01-15", tabId });
```

## SPA Navigation Detection [H:9]

SPA route changes do NOT reload the page but completely change content refs.

### Detection Pattern
```javascript
// Before navigation
const before = await read_page({ tabId, filter: "interactive" });
// Sidebar refs: ref_1-ref_10

// Click sidebar link (SPA navigation)
await computer({ action: "left_click", ref: "ref_5", tabId });
await computer({ action: "wait", duration: 1, tabId });

// MUST re-read - content refs completely changed
const after = await read_page({ tabId, filter: "interactive" });
// Sidebar refs: ref_1-ref_10 (SAME)
// Content refs: ref_11-ref_50 (DIFFERENT)
```

### Key Insight
- **Sidebar/nav refs**: Persist across SPA navigation
- **Content refs**: Completely change after route change
- **Rule**: ALWAYS re-read page after any navigation (URL or SPA)

## Multi-Tab Coordination [M:6]

| Operation | Behavior |
|-----------|----------|
| Parallel `read_page` | Works - independent refs per tab |
| Parallel `screenshot` | Works - independent captures |
| Tab switching | Not needed - use tabId directly |
| Tab creation | `tabs_create_mcp` returns new tabId |

### Two-Tab Pattern
```javascript
// Create two tabs
const tab1 = await tabs_create_mcp();
const tab2 = await tabs_create_mcp();

// Navigate both (can be parallel)
await navigate({ url: "https://site1.com", tabId: tab1.tabId });
await navigate({ url: "https://site2.com", tabId: tab2.tabId });

// Read both (parallel safe)
const [page1, page2] = await Promise.all([
  read_page({ tabId: tab1.tabId }),
  read_page({ tabId: tab2.tabId })
]);
```

## Console Debugging Pattern [M:6]

Console tracking starts on first call. Call BEFORE the action you want to monitor.

```javascript
// Start tracking
await read_console_messages({ tabId });

// Trigger action that may log errors
await computer({ action: "left_click", ref: "ref_submit", tabId });

// Read captured logs
const logs = await read_console_messages({ tabId, pattern: "error|warn" });
```

## Anti-Patterns [C:10]

- Don't skip `tabs_context_mcp` - required for all operations
- Don't reuse tabs from previous conversations
- Don't assume elements persist - re-read page after navigation
- Don't ignore wait times - dynamic content needs loading time
- Don't use `find` if OAuth errors occur - use refs instead
- **Don't use `form_input` for custom checkboxes** - use click
- **Don't skip re-read after SPA navigation** - refs change completely
- **Don't retry immediately on "Detached"** - wait 1s first

## Integration with Continuous Claude

Browser interactions generate automatic learnings via PostToolUse hook:
- Navigation patterns stored as WORKING_SOLUTION
- Console errors stored as CODEBASE_PATTERN
- Extension errors stored as FAILED_APPROACH

Recall browser learnings:
```bash
cd ~/.claude/scripts/core && uv run python core/recall_learnings.py \
  --query "claude-in-chrome browser" --k 5
```

## See Also

- Claude-in-Chrome extension documentation
