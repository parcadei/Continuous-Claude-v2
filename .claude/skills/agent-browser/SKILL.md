---
name: agent-browser
description: Browser automation using Vercel's agent-browser CLI. Use when you need to interact with web pages, fill forms, take screenshots, or scrape data. Uses Bash commands with ref-based element selection. Triggers on "browse website", "fill form", "click button", "take screenshot", "scrape page", "web automation".
---

# agent-browser: CLI Browser Automation

Vercel's headless browser automation CLI designed for AI agents. Uses ref-based selection (@e1, @e2) from accessibility snapshots.

**References:**
- Full API: `references/api-reference.md`
- Testing patterns & examples: `references/testing.md`

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

> **PowerShell Note:** Always quote `@e1` as `'@e1'` — the `@` symbol is special in PowerShell.

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
$env:AGENT_BROWSER_AUTO_CONNECT = "true"
ab open https://example.com                   # Auto-connects without flag
```

> Requires Chrome launched with `--remote-debugging-port`. Use `--cdp <port>` if you know the specific port.

### Install if needed

```bash
npm install -g agent-browser
agent-browser install  # Downloads Chromium (Linux/Mac)
```

## Core Workflow

**The snapshot + ref pattern is optimal for LLMs:**

1. **Navigate** to URL
2. **Snapshot** to get interactive elements with refs
3. **Interact** using refs (@e1, @e2, etc.)
4. **Re-snapshot** after navigation or DOM changes

```powershell
ab open https://example.com
ab snapshot -i --json       # Get refs
ab click '@e1'
ab fill '@e2' "search query"
ab snapshot -i              # Re-snapshot after changes
```

## Essential Commands

| Category | Commands |
|----------|----------|
| Navigate | `ab open <url>`, `ab back`, `ab reload`, `ab close` |
| Snapshot | `ab snapshot -i` (interactive), `ab snapshot -i --json` |
| Click | `ab click '@e1'`, `ab dblclick`, `ab hover` |
| Form | `ab fill '@e1' "text"`, `ab select`, `ab check`, `ab press Enter` |
| Assert | `ab isvisible '@e1'`, `ab gettext`, `ab ischecked`, `ab count` |
| Wait | `ab wait '@e1'`, `ab waitforurl`, `ab waitforloadstate` |
| JS | `ab eval "expression"` |
| Screenshot | `ab screenshot output.png`, `ab screenshot --full` |

Full command reference: `references/api-reference.md`

## Selector Reference

| Format | Example | When to Use |
|--------|---------|-------------|
| `@ref` | `'@e1'` | After snapshot — most reliable |
| CSS | `"button.submit"` | When you know the DOM structure |
| `text=` | `"text=Sign up"` | Match by visible text |
| `role=` | `"role=button"` | Match by ARIA role |

> **Best practice:** Always use `@ref` selectors from snapshots. They're stable across page states and work with all commands.

## vs claude-in-chrome (MCP)

| Feature | ab (CLI) | claude-in-chrome (MCP) |
|---------|----------|------------------------|
| Speed | ~1s/cmd | ~1-2s/cmd |
| Interface | PowerShell/Bash | MCP tools |
| Selection | `'@e1'` | `ref_1` |
| Parallel | Sessions | Tabs |
| GIF recording | No | Yes |
| Visual debugging | No (headless default) | Yes |
| State persistence | Yes (auto + manual) | No |
| Network mocking | Yes (route) | No |
| Video recording | Yes | No |
| Headed mode | `--headed` flag | Always visible |

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

**Use ab when:** Headless/CI/CD, shell scripting, parallel sessions, network mocking, state save/restore, test assertions.

**Use claude-in-chrome when:** Need to see what's happening, recording demos (GIF), complex visual debugging.

## Preflight Checks (Before Auth-Dependent Testing)

See `references/testing.md` for full checklist. Key points:

1. Dev server health: `curl -s -o /dev/null -w "%{http_code}" <baseURL>/` — expect 200
2. DB connection alive: hit a DB-dependent endpoint, not just `/`
3. Auth env vars: verify `NEXTAUTH_URL` / `AUTH_URL` matches the running port
4. Restart stale servers: if dev server uptime > 4h, restart before testing
