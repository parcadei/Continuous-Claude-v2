---
name: agent-browser
description: Browser automation using Vercel's agent-browser CLI. Use when you need to interact with web pages, fill forms, take screenshots, or scrape data. Uses Bash commands with ref-based element selection. Triggers on "browse website", "fill form", "click button", "take screenshot", "scrape page", "web automation".
---

# agent-browser: CLI Browser Automation

Vercel's headless browser automation CLI designed for AI agents. Uses ref-based selection (@e1, @e2) from accessibility snapshots.

## Windows Setup

The official Rust CLI has daemon startup issues on Windows (GitHub #89, #90). A Node.js workaround (`ab`) bypasses this:

```powershell
# Use 'ab' command (fast Node.js wrapper)
ab open https://example.com
ab snapshot -i
ab click '@e1'      # Quote the @ symbol in PowerShell!
ab close
```

**Performance:** ~1s per command (first command ~4s for daemon startup)

**From Bash environments (git bash, WSL):**
```bash
powershell.exe -Command "ab open https://example.com"
powershell.exe -Command "ab click '@e1'"
```

**Location:** `%APPDATA%\npm\node_modules\agent-browser\bin\agent-browser.js`

> **PowerShell Note:** Always quote `@e1` as `'@e1'` - the `@` symbol is special in PowerShell.

## Setup Check

```powershell
# Windows: Check ab wrapper
ab --help

# Linux/Mac: Check agent-browser
command -v agent-browser && agent-browser --help
```

### Auto-Connect (v0.10)

Connect to an already-running Chrome instance instead of launching a new one:

```powershell
ab --auto-connect open https://example.com    # Auto-discover running Chrome via CDP
ab --auto-connect snapshot -i                 # Snapshot existing browser
```

Or set the environment variable:
```powershell
$env:AGENT_BROWSER_AUTO_CONNECT = "true"
ab open https://example.com                   # Auto-connects without flag
```

> **Note:** Requires Chrome launched with `--remote-debugging-port`. Use `--cdp <port>` if you know the specific port.

### Install if needed

```bash
npm install -g agent-browser
agent-browser install  # Downloads Chromium (Linux/Mac)
```

> **Note:** On Windows, use `ab` command. On Linux/Mac, use `agent-browser`.

## Core Workflow

**The snapshot + ref pattern is optimal for LLMs:**

1. **Navigate** to URL
2. **Snapshot** to get interactive elements with refs
3. **Interact** using refs (@e1, @e2, etc.)
4. **Re-snapshot** after navigation or DOM changes

```powershell
# Step 1: Open URL
ab open https://example.com

# Step 2: Get interactive elements with refs
ab snapshot -i --json

# Step 3: Interact using refs
ab click '@e1'
ab fill '@e2' "search query"

# Step 4: Re-snapshot after changes
ab snapshot -i
```

## Command Reference

### Navigation

```powershell
ab open <url>          # Navigate to URL (aliases: goto, navigate)
ab back                # Go back
ab forward             # Go forward
ab reload              # Reload page
ab close               # Close browser
ab url                 # Get current URL
ab title               # Get page title
```

### Snapshots (Essential for AI)

```powershell
ab snapshot              # Full accessibility tree
ab snapshot -i           # Interactive elements only (recommended)
ab snapshot -i --json    # JSON output for parsing
ab snapshot -c           # Compact (remove empty elements)
ab snapshot -d 3         # Limit depth
ab snapshot '@e1'        # Snapshot within element
ab snapshot -i -c        # Combine flags
```

### Screenshots & PDFs

```powershell
ab screenshot                      # Viewport screenshot
ab screenshot --full               # Full page screenshot
ab screenshot output.png           # Save to file
ab screenshot output.png --full    # Full page to file
ab pdf output.pdf                  # Save as PDF
ab pdf output.pdf A4               # PDF with format (Letter, A4, etc.)
```

### Click & Interaction

```powershell
ab click '@e1'           # Click element
ab click '@e1' --new-tab # Click link, open in new tab (v0.10)
ab dblclick '@e1'        # Double-click
ab hover '@e1'           # Hover element
ab tap '@e1'             # Tap (touch event)
ab drag '@e1' '@e2'      # Drag from source to target
ab focus '@e1'           # Focus element
```

### Form Input

```powershell
ab fill '@e1' "text"              # Clear + fill input
ab type '@e1' "text"              # Type without clearing
ab press Enter                    # Press key (no selector)
ab press Enter '@e1'              # Press key on element
ab keyboard "Control+a"           # Key combination
ab check '@e1'                    # Check checkbox
ab uncheck '@e1'                  # Uncheck checkbox
ab select '@e1' "Option A"        # Select dropdown option
ab multiselect '@e1' "A" "B" "C"  # Multi-select
ab clear '@e1'                    # Clear input field
ab setvalue '@e1' "value"         # Set value directly (bypasses events)
ab upload '@e1' file.png          # Upload file(s)
ab selectall '@e1'                # Select all text in element
ab inserttext "text"              # Insert text at cursor
```

### Element Queries

```powershell
ab gettext '@e1'                 # Get text content (textContent)
ab innertext '@e1'               # Get inner text (rendered text)
ab innerhtml '@e1'               # Get inner HTML
ab inputvalue '@e1'              # Get input value
ab getattribute '@e1' href       # Get element attribute
ab content                       # Get full page HTML
ab content '@e1'                 # Get element HTML content
```

### State Checks (Assertions)

Use these to verify page state in test scenarios:

```powershell
ab isvisible '@e1'               # true/false - is element visible?
ab isenabled '@e1'               # true/false - is element enabled?
ab ischecked '@e1'               # true/false - is checkbox checked?
ab count "button"                # Count matching elements
ab boundingbox '@e1'             # Get position {x, y, width, height}
```

**Testing pattern:**
```powershell
# Assert element exists and is visible
ab isvisible '@e3' --json
# Assert text content matches
ab gettext '@e5' --json
# Assert checkbox state
ab ischecked '@e4' --json
```

### Scroll

```powershell
ab scroll down 500               # Scroll page down 500px
ab scroll up 300                  # Scroll page up
ab scroll left 200                # Scroll left
ab scroll right 200               # Scroll right
ab scroll '@e1' down 300          # Scroll within element
ab scrollintoview '@e1'           # Scroll element into view
ab wheel 0 500                    # Mouse wheel (deltaX, deltaY)
```

### Wait

```powershell
ab wait '@e1'                             # Wait for element to appear
ab wait '@e1' --timeout 5000              # Wait with timeout (ms)
ab waitforurl "https://example.com/done"  # Wait for URL change
ab waitforloadstate networkidle           # Wait for load state
ab waitforfunction "document.readyState === 'complete'"  # Wait for JS condition
```

### JavaScript Evaluation

```powershell
ab eval "document.title"                    # Get page title via JS
ab eval "window.innerWidth"                 # Get viewport width
ab eval "document.querySelectorAll('a').length"  # Count links
ab eval "localStorage.getItem('token')"     # Read localStorage
```

### Semantic Locators (Alternative to Refs)

Find and interact with elements by semantic attributes instead of refs:

```powershell
# By role
ab find role button click                          # Click first button
ab find role textbox fill "hello" --name "Email"   # Fill input by name
ab find role checkbox check --name "Terms"         # Check by name
ab find role button click --name "Submit" --exact   # Exact name match (v0.10 fix)

# By text
ab find text "Sign up" click                       # Click by visible text
ab find text "Submit" click --exact                 # Exact text match

# By label
ab find label "Email" fill "user@example.com"      # Fill by label text
ab find label "Remember me" check                  # Check by label
ab find label "Email" fill "test@example.com" --exact  # Exact label match (v0.10 fix)

# By placeholder
ab find placeholder "Search..." fill "query"       # Fill by placeholder
ab find placeholder "Search" fill "q" --exact       # Exact placeholder match (v0.10 fix)

# By alt text, title, test ID
ab find alt "Company Logo" click
ab find title "Close dialog" click
ab find testid "submit-btn" click
ab find testid "email-input" fill "user@example.com"
```

> **v0.10 fix:** `--exact` now works correctly for `find role`, `find label`, and `find placeholder`. Before v0.10, the flag was silently dropped for these locator types.

### Tabs

```powershell
ab tab_new                    # Open new empty tab
ab tab_list                   # List all tabs with URLs
ab tab_switch 1               # Switch to tab by index (0-based)
ab tab_close                  # Close current tab
ab tab_close 2                # Close tab by index
ab bringtofront               # Bring browser window to front
```

### Cookies

```powershell
ab cookies_get                               # Get all cookies
ab cookies_get https://example.com           # Get cookies for URL
ab cookies_clear                             # Clear all cookies
ab cookies_set '{"name":"session","value":"abc123","domain":".example.com"}'
```

### Storage (localStorage / sessionStorage)

```powershell
ab storage_get local                    # Get all localStorage
ab storage_get local myKey              # Get specific key
ab storage_get session                  # Get all sessionStorage
ab storage_set local myKey "myValue"    # Set localStorage
ab storage_set session myKey "myValue"  # Set sessionStorage
ab storage_clear local                  # Clear localStorage
ab storage_clear session                # Clear sessionStorage
```

### Console & Errors

```powershell
ab console                    # Get console messages
ab console --clear            # Get and clear console
ab errors                     # Get page errors
ab errors --clear             # Get and clear errors
```

### Network

```powershell
ab requests                           # List captured requests
ab requests "api" --clear             # Filter by URL pattern, then clear
ab route "**/*.png" --abort           # Block all PNG requests
ab route "https://api.com/*" --status 200 --body '{"mock":true}'
ab unroute "**/*.png"                 # Remove route
ab responsebody "https://api.com/data"  # Get response body
ab download '@e1' ./file.pdf          # Download via click
```

### Viewport & Device Emulation

```powershell
ab viewport 1920 1080                 # Set viewport size
ab device "iPhone 12"                 # Emulate device
ab useragent "CustomAgent/1.0"        # Set user agent
ab geolocation 37.7749 -122.4194     # Set geolocation (lat, lon)
ab timezone "America/New_York"        # Set timezone
ab locale "en-US"                     # Set locale
ab emulatemedia --color-scheme dark   # Dark mode
ab offline true                       # Toggle offline mode
```

### Recording & Tracing

```powershell
ab video_start ./recording.webm       # Start video recording
ab video_stop                         # Stop recording
ab trace_start --screenshots          # Start trace with screenshots
ab trace_stop ./trace.zip             # Stop + save trace
ab har_start                          # Start HAR capture
ab har_stop ./network.har             # Stop + save HAR
```

### State Persistence (Manual)

```powershell
ab state save ./auth-state.json       # Save cookies + storage
ab state load ./auth-state.json       # Restore browser state
```

> **Tip:** For automatic state persistence, use `--session-name` instead (see [Session Persistence](#session-persistence-v010) below).

### Dialog Handling

```powershell
ab dialog accept                      # Accept alert/confirm
ab dialog dismiss                     # Dismiss dialog
ab dialog accept "prompt text"        # Accept with prompt input
```

### Clipboard

```powershell
ab clipboard read                     # Read clipboard
ab clipboard copy "text to copy"      # Write to clipboard
```

### Frames

```powershell
ab frame '@e1'                        # Switch to iframe
ab mainframe                          # Switch back to main frame
```

### Other

```powershell
ab highlight '@e1'                    # Highlight element visually
ab dispatch '@e1' click               # Dispatch custom event
ab nth "button" 2 click               # Click nth matching element (0-based)
ab pause                              # Pause execution (for debugging)
```

## Selector Reference

| Format | Example | When to Use |
|--------|---------|-------------|
| `@ref` | `'@e1'` | After snapshot - most reliable |
| CSS | `"button.submit"` | When you know the DOM structure |
| `text=` | `"text=Sign up"` | Match by visible text |
| `role=` | `"role=button"` | Match by ARIA role |

> **Best practice:** Always use `@ref` selectors from snapshots. They're stable across page states and work with all commands.

## Session Persistence (v0.10)

Auto-save and restore cookies + localStorage across browser restarts using `--session-name`:

```powershell
# First run: logs in, state auto-saved on close
ab --session-name myapp open https://app.example.com/login
# ... login flow ...
ab close

# Next run: state auto-restored, already logged in
ab --session-name myapp open https://app.example.com/dashboard
```

Or set via environment variable:
```powershell
$env:AGENT_BROWSER_SESSION_NAME = "myapp"
ab open https://app.example.com     # Auto-restores state
```

### Encryption

Encrypt saved state at rest with AES-256-GCM:
```powershell
# Generate key (run once, save somewhere safe)
openssl rand -hex 32
# Set encryption key
$env:AGENT_BROWSER_ENCRYPTION_KEY = "<64-char-hex-key>"
```

### State Expiration

Auto-delete stale state files:
```powershell
$env:AGENT_BROWSER_STATE_EXPIRE_DAYS = "7"    # Default: 30
```

### State Management Commands (v0.10)

```powershell
ab state list                           # List saved state files
ab state show myapp-default.json        # Show state summary
ab state rename old-name new-name       # Rename state file
ab state clear                          # Clear current session state
ab state clear --all                    # Clear all saved states
ab state clean --older-than 7           # Delete states older than 7 days
```

## Sessions (Parallel Browsers)

```powershell
# Set session via environment variable
$env:AGENT_BROWSER_SESSION = "browser1"
ab open https://site1.com

$env:AGENT_BROWSER_SESSION = "browser2"
ab open https://site2.com
```

## JSON Output

Add `--json` for structured output on any command:

```powershell
ab snapshot -i --json
ab gettext '@e1' --json
ab isvisible '@e1' --json
```

Returns:
```json
{
  "success": true,
  "data": {
    "refs": {
      "e1": {"name": "Submit", "role": "button"},
      "e2": {"name": "Email", "role": "textbox"}
    },
    "snapshot": "- button \"Submit\" [ref=e1]\n- textbox \"Email\" [ref=e2]"
  }
}
```

## Examples

### Login Flow

```powershell
ab open https://app.example.com/login
ab snapshot -i
# Output: textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Sign in" [ref=e3]
ab fill '@e1' "user@example.com"
ab fill '@e2' "password123"
ab click '@e3'
ab waitforurl "**/dashboard"       # Wait for redirect
ab snapshot -i                      # Verify logged in
```

### Form with Dropdowns and Checkboxes

```powershell
ab open https://forms.example.com
ab snapshot -i
ab fill '@e1' "John Doe"
ab fill '@e2' "john@example.com"
ab select '@e3' "United States"           # Dropdown
ab check '@e4'                             # Checkbox
ab multiselect '@e5' "Red" "Blue" "Green"  # Multi-select
ab click '@e6'                             # Submit
ab screenshot confirmation.png
```

### Assertions for Testing

```powershell
ab open https://app.example.com
ab snapshot -i

# Verify element visibility
ab isvisible '@e3' --json           # {"success":true,"data":true}

# Verify text content
ab gettext '@e5' --json             # {"success":true,"data":"Welcome, John"}

# Verify checkbox state
ab ischecked '@e4' --json           # {"success":true,"data":true}

# Count elements
ab count "button" --json            # {"success":true,"data":5}

# Verify URL
ab url --json                       # {"success":true,"data":"https://..."}
```

### JavaScript Evaluation

```powershell
# Get computed values
ab eval "document.title"
ab eval "getComputedStyle(document.body).backgroundColor"

# Interact with app state
ab eval "window.__APP_STATE__.user.name"
ab eval "document.querySelectorAll('.error').length"

# Modify page for testing
ab eval "document.body.style.zoom = '150%'"
```

### Multi-Tab Workflow

```powershell
ab open https://site1.com
ab tab_new                          # Open new tab (index 1)
ab open https://site2.com           # Navigate in new tab
ab tab_list --json                  # See all tabs
ab tab_switch 0                     # Back to first tab
ab snapshot -i                      # Snapshot first tab
ab tab_switch 1                     # Back to second tab
ab tab_close 1                      # Close second tab
```

### Cookie and Storage Management

```powershell
# Option 1: Auto-persist with --session-name (recommended, v0.10)
ab --session-name myapp open https://app.example.com/login
# ... login ...
ab close
# Next time: auto-restored
ab --session-name myapp open https://app.example.com/dashboard  # Already logged in

# Option 2: Manual save/load
ab open https://app.example.com/login
# ... login ...
ab state save ./auth.json
# Later:
ab state load ./auth.json
ab open https://app.example.com/dashboard   # Already logged in

# Direct cookie manipulation
ab cookies_get --json
ab storage_get local authToken --json
```

### Network Mocking

```powershell
# Mock API response
ab route "https://api.example.com/users" --status 200 --body '[{"name":"Mock User"}]'
ab open https://app.example.com      # App uses mocked API

# Block analytics
ab route "**/*analytics*" --abort
ab route "**/*tracking*" --abort

# Capture network requests
ab requests "api" --json             # Filter to API calls
```

### Debug Mode

```powershell
# Run with visible browser window
ab open https://example.com --headed
ab snapshot -i --headed
ab click '@e1' --headed
```

## Preflight Checks (Before Any Auth-Dependent Testing) [H:9]

Run these BEFORE launching any authenticated browser tests. All 3 are environment issues that block testing but are detectable upfront.

1. **Dev server health:** `curl -s -o /dev/null -w "%{http_code}" <baseURL>/` — expect 200
2. **DB connection alive:** Hit a DB-dependent API endpoint (e.g., `/api/users`), not just the server root — a 200 on `/` does NOT prove the DB works
3. **Auth env vars:** Verify `NEXTAUTH_URL` / `AUTH_URL` matches the actual running port — port mismatch causes silent auth redirect failures
4. **Seed data present:** Query DB counts before testing data-dependent features
5. **Restart stale servers:** If dev server uptime > 4h, restart before testing — connection pools die silently

### Server Freshness Check

Long-running dev servers (16h+) suffer silent connection pool death. Pages render (200) but all API calls return 500.

1. Test a data-dependent endpoint (not just `/`): `curl <baseURL>/api/<endpoint>`
2. If 500: restart dev server before proceeding
3. After restart: wait 5s, re-verify the endpoint

## Agent Assignment Guidance

When assigning agents to browser testing tasks:

- **atlas agent** = visual browser validation using `ab` CLI or Claude-in-Chrome MCP tools. Must include at least one `navigate` + `read_page` (or `ab open` + `ab snapshot`) cycle.
- If an agent falls back to API-level testing (HTTP requests, direct DB queries), label the output as **"API Integration Tests"**, not "Browser Tests"
- For true E2E browser coverage, require the agent prompt to include: "You MUST use browser automation tools (ab or claude-in-chrome) — do not substitute with API calls"

## vs claude-in-chrome (MCP)

| Feature | ab (CLI) | claude-in-chrome (MCP) |
|---------|----------|------------------------|
| Speed | ~1s/cmd | ~1-2s/cmd |
| Interface | PowerShell/Bash | MCP tools |
| Selection | `'@e1'` | `ref_1` |
| Output | Text/JSON | Tool responses |
| Parallel | Sessions | Tabs |
| GIF recording | No | Yes |
| Visual debugging | No (headless default) | Yes |
| Console/Network | Yes | Yes |
| JS evaluation | Yes | Yes |
| State persistence | Yes (auto via --session-name + manual save/load) | No |
| Network mocking | Yes (route) | No |
| Video recording | Yes | No |
| Headed mode | --headed flag | Always visible |

### Decision Framework

```
Is this CI/CD or headless server?
+-- YES -> ab (no browser window needed)
+-- NO -> Do you need to see the browser?
          +-- YES -> claude-in-chrome
          +-- NO -> Do you need GIF recording?
                    +-- YES -> claude-in-chrome
                    +-- NO -> Either works (prefer ab for scripting)
```

**Use ab when:**
- Headless/CI/CD environments
- Shell scripting and chaining
- Parallel sessions needed
- Simple scrape/fill/submit tasks
- Network mocking / route interception
- State save/restore across sessions
- Test assertions (isvisible, gettext, etc.)

**Use claude-in-chrome when:**
- Need to see what's happening
- Recording demos (GIF)
- Complex visual debugging
- Debugging automation issues
