# agent-browser: Full API Reference

## Navigation

```powershell
ab open <url>          # Navigate to URL (aliases: goto, navigate)
ab back                # Go back
ab forward             # Go forward
ab reload              # Reload page
ab close               # Close browser
ab url                 # Get current URL
ab title               # Get page title
```

## Snapshots (Essential for AI)

```powershell
ab snapshot              # Full accessibility tree
ab snapshot -i           # Interactive elements only (recommended)
ab snapshot -i --json    # JSON output for parsing
ab snapshot -c           # Compact (remove empty elements)
ab snapshot -d 3         # Limit depth
ab snapshot '@e1'        # Snapshot within element
ab snapshot -i -c        # Combine flags
```

## Screenshots & PDFs

```powershell
ab screenshot                      # Viewport screenshot
ab screenshot --full               # Full page screenshot
ab screenshot output.png           # Save to file
ab screenshot output.png --full    # Full page to file
ab pdf output.pdf                  # Save as PDF
ab pdf output.pdf A4               # PDF with format (Letter, A4, etc.)
```

## Click & Interaction

```powershell
ab click '@e1'           # Click element
ab click '@e1' --new-tab # Click link, open in new tab (v0.10)
ab dblclick '@e1'        # Double-click
ab hover '@e1'           # Hover element
ab tap '@e1'             # Tap (touch event)
ab drag '@e1' '@e2'      # Drag from source to target
ab focus '@e1'           # Focus element
```

## Form Input

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

## Element Queries

```powershell
ab gettext '@e1'                 # Get text content (textContent)
ab innertext '@e1'               # Get inner text (rendered text)
ab innerhtml '@e1'               # Get inner HTML
ab inputvalue '@e1'              # Get input value
ab getattribute '@e1' href       # Get element attribute
ab content                       # Get full page HTML
ab content '@e1'                 # Get element HTML content
```

## State Checks (Assertions)

```powershell
ab isvisible '@e1'               # true/false - is element visible?
ab isenabled '@e1'               # true/false - is element enabled?
ab ischecked '@e1'               # true/false - is checkbox checked?
ab count "button"                # Count matching elements
ab boundingbox '@e1'             # Get position {x, y, width, height}
```

## Scroll

```powershell
ab scroll down 500               # Scroll page down 500px
ab scroll up 300                 # Scroll page up
ab scroll left 200               # Scroll left
ab scroll right 200              # Scroll right
ab scroll '@e1' down 300         # Scroll within element
ab scrollintoview '@e1'          # Scroll element into view
ab wheel 0 500                   # Mouse wheel (deltaX, deltaY)
```

## Wait

```powershell
ab wait '@e1'                             # Wait for element to appear
ab wait '@e1' --timeout 5000              # Wait with timeout (ms)
ab waitforurl "https://example.com/done"  # Wait for URL change
ab waitforloadstate networkidle           # Wait for load state
ab waitforfunction "document.readyState === 'complete'"  # Wait for JS condition
```

## JavaScript Evaluation

```powershell
ab eval "document.title"                    # Get page title via JS
ab eval "window.innerWidth"                 # Get viewport width
ab eval "document.querySelectorAll('a').length"  # Count links
ab eval "localStorage.getItem('token')"     # Read localStorage
```

## Semantic Locators (Alternative to Refs)

```powershell
# By role
ab find role button click                          # Click first button
ab find role textbox fill "hello" --name "Email"   # Fill input by name
ab find role checkbox check --name "Terms"         # Check by name
ab find role button click --name "Submit" --exact  # Exact name match (v0.10)

# By text
ab find text "Sign up" click                       # Click by visible text
ab find text "Submit" click --exact                # Exact text match

# By label
ab find label "Email" fill "user@example.com"      # Fill by label text
ab find label "Remember me" check                  # Check by label
ab find label "Email" fill "test@example.com" --exact  # Exact label match (v0.10)

# By placeholder
ab find placeholder "Search..." fill "query"       # Fill by placeholder
ab find placeholder "Search" fill "q" --exact      # Exact placeholder match (v0.10)

# By alt text, title, test ID
ab find alt "Company Logo" click
ab find title "Close dialog" click
ab find testid "submit-btn" click
ab find testid "email-input" fill "user@example.com"
```

> **v0.10 fix:** `--exact` now works correctly for `find role`, `find label`, and `find placeholder`. Before v0.10, the flag was silently dropped.

## Tabs

```powershell
ab tab_new                    # Open new empty tab
ab tab_list                   # List all tabs with URLs
ab tab_switch 1               # Switch to tab by index (0-based)
ab tab_close                  # Close current tab
ab tab_close 2                # Close tab by index
ab bringtofront               # Bring browser window to front
```

## Cookies

```powershell
ab cookies_get                               # Get all cookies
ab cookies_get https://example.com           # Get cookies for URL
ab cookies_clear                             # Clear all cookies
ab cookies_set '{"name":"session","value":"abc123","domain":".example.com"}'
```

## Storage (localStorage / sessionStorage)

```powershell
ab storage_get local                    # Get all localStorage
ab storage_get local myKey              # Get specific key
ab storage_get session                  # Get all sessionStorage
ab storage_set local myKey "myValue"    # Set localStorage
ab storage_set session myKey "myValue"  # Set sessionStorage
ab storage_clear local                  # Clear localStorage
ab storage_clear session                # Clear sessionStorage
```

## Console & Errors

```powershell
ab console                    # Get console messages
ab console --clear            # Get and clear console
ab errors                     # Get page errors
ab errors --clear             # Get and clear errors
```

## Network

```powershell
ab requests                           # List captured requests
ab requests "api" --clear             # Filter by URL pattern, then clear
ab route "**/*.png" --abort           # Block all PNG requests
ab route "https://api.com/*" --status 200 --body '{"mock":true}'
ab unroute "**/*.png"                 # Remove route
ab responsebody "https://api.com/data"  # Get response body
ab download '@e1' ./file.pdf          # Download via click
```

## Viewport & Device Emulation

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

## Recording & Tracing

```powershell
ab video_start ./recording.webm       # Start video recording
ab video_stop                         # Stop recording
ab trace_start --screenshots          # Start trace with screenshots
ab trace_stop ./trace.zip             # Stop + save trace
ab har_start                          # Start HAR capture
ab har_stop ./network.har             # Stop + save HAR
```

## State Persistence (v0.10)

Auto-save and restore cookies + localStorage across browser restarts:

```powershell
# First run: logs in, state auto-saved on close
ab --session-name myapp open https://app.example.com/login
# ... login flow ...
ab close

# Next run: state auto-restored, already logged in
ab --session-name myapp open https://app.example.com/dashboard
```

Or via environment variable:
```powershell
$env:AGENT_BROWSER_SESSION_NAME = "myapp"
ab open https://app.example.com     # Auto-restores state
```

### Encryption

```powershell
openssl rand -hex 32   # Generate key (run once, save somewhere safe)
$env:AGENT_BROWSER_ENCRYPTION_KEY = "<64-char-hex-key>"
```

### State Expiration

```powershell
$env:AGENT_BROWSER_STATE_EXPIRE_DAYS = "7"    # Default: 30
```

### State Management Commands

```powershell
ab state list                           # List saved state files
ab state show myapp-default.json        # Show state summary
ab state rename old-name new-name       # Rename state file
ab state clear                          # Clear current session state
ab state clear --all                    # Clear all saved states
ab state clean --older-than 7           # Delete states older than 7 days
```

### Manual State Save/Load

```powershell
ab state save ./auth-state.json       # Save cookies + storage
ab state load ./auth-state.json       # Restore browser state
```

## Parallel Sessions

```powershell
$env:AGENT_BROWSER_SESSION = "browser1"
ab open https://site1.com

$env:AGENT_BROWSER_SESSION = "browser2"
ab open https://site2.com
```

## Dialog Handling

```powershell
ab dialog accept                      # Accept alert/confirm
ab dialog dismiss                     # Dismiss dialog
ab dialog accept "prompt text"        # Accept with prompt input
```

## Clipboard

```powershell
ab clipboard read                     # Read clipboard
ab clipboard copy "text to copy"      # Write to clipboard
```

## Frames

```powershell
ab frame '@e1'                        # Switch to iframe
ab mainframe                          # Switch back to main frame
```

## Misc

```powershell
ab highlight '@e1'                    # Highlight element visually
ab dispatch '@e1' click               # Dispatch custom event
ab nth "button" 2 click               # Click nth matching element (0-based)
ab pause                              # Pause execution (for debugging)
```

## JSON Output

Add `--json` to any command for structured output:

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
