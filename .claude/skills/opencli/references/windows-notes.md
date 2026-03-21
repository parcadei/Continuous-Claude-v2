# OpenCLI on Windows 11

## Installation

```bash
npm install -g @jackwener/opencli
opencli --version   # Verify: v1.1.1+
opencli doctor      # Health check
```

## Chrome Extension Sideload

The extension is NOT in the Chrome Web Store. Sideload manually:

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Browse to: `C:/Users/david.hayes/AppData/Roaming/npm/node_modules/@jackwener/opencli/extension/`
5. Verify the extension appears and is enabled

The extension communicates with the opencli daemon via WebSocket on `localhost:19825`.

## What Works

- All 44 browser-based adapters (social, news, finance, video, etc.)
- CDP desktop adapters (Cursor, Discord, Notion, Codex, Grok)
- Daemon lifecycle (`opencli setup`, auto-start on command)
- Explore/synthesize/generate pipeline
- All output formats (`-f table|json|yaml|md|csv`)
- External CLI passthrough (gh, docker, kubectl)

## What Does Not Work

| Feature | Reason | Impact |
|---------|--------|--------|
| AppleScript adapters | macOS only (ChatGPT new/ask, Feishu, ChatWise) | Irrelevant on Windows |
| Shell completion | bash/zsh/fish only, no PowerShell | Cosmetic -- use `--help` instead |
| External CLI auto-install | No `windows:` entries in built-in CLIs | Install CLIs manually |

## Workarounds

### External CLI Auto-Install

The framework supports a `windows:` install field but no built-in CLIs define it yet. Install manually:

```bash
# GitHub CLI
winget install GitHub.cli

# Docker Desktop
winget install Docker.DockerDesktop

# kubectl
winget install Kubernetes.kubectl
```

After manual install, the opencli passthrough commands (`opencli gh`, `opencli docker`, etc.) work normally.

### ChatGPT Desktop on Windows

Use the `--surface windows-cdp` flag (from PR #192) instead of AppleScript:

```bash
opencli chatgpt --surface windows-cdp
```

### Port Conflicts

The daemon uses port 19825. If blocked:

```bash
# Check if port is in use
netstat -ano | findstr 19825

# Kill process on port (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 19825).OwningProcess | Stop-Process
```

Windows Firewall should not block localhost connections, but if the daemon fails to start, check firewall rules for Node.js.

## Daemon Management

```bash
opencli setup          # Start daemon + verify extension
opencli doctor         # Health check
```

The daemon auto-starts when you run any command. It runs as a background Node.js process on `localhost:19825`.
