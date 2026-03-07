# agent-browser: Testing Patterns & Examples

## Preflight Checks (Before Any Auth-Dependent Testing) [H:9]

Run these BEFORE launching authenticated browser tests. All are detectable upfront.

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

- **atlas agent** = visual browser validation using `ab` CLI or Claude-in-Chrome MCP tools. Must include at least one `navigate` + `read_page` (or `ab open` + `ab snapshot`) cycle.
- If an agent falls back to API-level testing (HTTP requests, direct DB queries), label the output as **"API Integration Tests"**, not "Browser Tests"
- For true E2E browser coverage, require the agent prompt to include: "You MUST use browser automation tools (ab or claude-in-chrome) — do not substitute with API calls"

## Example: Login Flow

```powershell
ab open https://app.example.com/login
ab snapshot -i
# Output: textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Sign in" [ref=e3]
ab fill '@e1' "user@example.com"
ab fill '@e2' "password123"
ab click '@e3'
ab waitforurl "**/dashboard"       # Wait for redirect
ab snapshot -i                     # Verify logged in
```

## Example: Form with Dropdowns and Checkboxes

```powershell
ab open https://forms.example.com
ab snapshot -i
ab fill '@e1' "John Doe"
ab fill '@e2' "john@example.com"
ab select '@e3' "United States"           # Dropdown
ab check '@e4'                            # Checkbox
ab multiselect '@e5' "Red" "Blue" "Green" # Multi-select
ab click '@e6'                            # Submit
ab screenshot confirmation.png
```

## Example: Assertions for Testing

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

## Example: JavaScript Evaluation

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

## Example: Multi-Tab Workflow

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

## Example: Cookie and Storage Management

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

## Example: Network Mocking

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

## Example: Debug Mode

```powershell
# Run with visible browser window
ab open https://example.com --headed
ab snapshot -i --headed
ab click '@e1' --headed
```
