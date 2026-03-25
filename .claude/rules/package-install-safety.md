# Package Install Safety

## Overview

A PreToolUse:Bash hook (`package-install-guard`) intercepts all package install commands and runs a 4-layer security check before allowing execution. This protects against supply-chain attacks like the LiteLLM/TeamPCP incident (March 2026).

## What's Guarded

All package manager install/add commands are intercepted:
- **Python:** `pip install`, `pip3 install`, `uv pip install`, `uv add`, `poetry add`
- **Node.js:** `npm install`, `npm i`, `yarn add`, `pnpm add`, `pnpm install`, `bun add`, `bun install`
- **Rust:** `cargo add`, `cargo install`
- **Go:** `go get`, `go install`
- **Ruby:** `gem install`, `bundle install`
- **PHP:** `composer require`

## What's NOT Guarded (passthrough)

These commands are never intercepted:
- `pip list`, `pip show`, `pip freeze`
- `npm ls`, `npm list`, `npm info`
- `pip uninstall`, `npm uninstall`
- All non-package-manager commands

## Security Checks (in order)

| Layer | Check | Action on Fail |
|-------|-------|---------------|
| 1 | **Typosquat detection** — is this a misspelling of a popular package? | BLOCK |
| 2 | **Known-malicious blocklist** — is this a confirmed compromised package/version? | BLOCK |
| 3 | **Package age** — was this version published <24 hours ago? | BLOCK |
| 4 | **Package age** — was this version published <7 days ago? | WARN (allow + advisory) |

## Override

If you need to bypass the guard for a known-good install:

```bash
SKIP_PACKAGE_GUARD=1 pip install <package>
```

This skips all checks. Use only when you've verified the package manually.

## What to Do If Blocked

1. **Typosquat block:** Check the package name spelling. The guard will suggest the correct name.
2. **Malicious version block:** Use a different version. Check the advisory link for details.
3. **Age block (<24h):** Wait 24 hours, or use the override if you've verified the package.
4. **CVE block:** Check the vulnerability details. Use `pip-audit` or `npm audit` for more info.

## Updating the Blocklist

When a new supply-chain attack is disclosed:
1. Add the package to `.claude/hooks/src/shared/malicious-packages.json`
2. Rebuild: `cd .claude/hooks && npm run build`
3. Sync: `bash scripts/sync-to-active.sh`

## Background

On March 24, 2026, LiteLLM versions 1.82.7-1.82.8 were published to PyPI with a credential-stealing payload. The attack used a `.pth` file that auto-executed on every Python process startup, harvesting SSH keys, cloud credentials, K8s configs, and API keys. LiteLLM gets 3.4M downloads/day — anyone who installed during the window was compromised.

This hook would have caught it at Layer 2 (blocklist) and Layer 3 (age check — the malicious versions were yanked within hours).
