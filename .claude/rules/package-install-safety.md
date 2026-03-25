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

| Layer | Check | Source | Speed | Action on Fail |
|-------|-------|--------|-------|---------------|
| 1 | **Typosquat detection** — misspelling of a popular package? | Local curated list + Levenshtein | <1ms | BLOCK |
| 2 | **Known-malicious blocklist** — confirmed compromised package/version? | Local `malicious-packages.json` | <1ms | BLOCK |
| 3 | **OSV.dev real-time query** — malware advisory (MAL-) or CRITICAL CVE? | Google OSV API (no auth) | ~300ms | BLOCK (MAL-/CRITICAL), WARN (HIGH) |
| 4 | **Package age** — published <24h ago? <7d ago? | PyPI/npm registry API | ~500ms | BLOCK (<24h), WARN (<7d) |

## Override

If you need to bypass the guard for a known-good install:

```bash
SKIP_PACKAGE_GUARD=1 pip install <package>
```

This skips all checks. Use only when you've verified the package manually.

## What to Do If Blocked

1. **Typosquat block:** Check the package name spelling. The guard will suggest the correct name.
2. **Malicious version block:** Use a different version. Check the advisory link for details.
3. **OSV.dev block (MAL-):** This package has a confirmed malware advisory. Do NOT install. Check the advisory ID at `https://osv.dev/vulnerability/<ID>`.
4. **OSV.dev block (CRITICAL):** Critical vulnerability detected. Check the CVE details before proceeding.
5. **Age block (<24h):** Wait 24 hours, or use the override if you've verified the package.

## Updating the Blocklist

### Automatic (recommended)

```bash
node scripts/update-blocklist.mjs                    # Dry run — show what would change
node scripts/update-blocklist.mjs --apply            # Write changes
node scripts/update-blocklist.mjs --apply --rebuild   # Write + rebuild hooks + sync
```

This fetches from:
- GitHub Advisory API — npm malware advisories (`type=malware`)
- GitHub Advisory API — PyPI critical CVEs (`type=reviewed, severity=critical`)

Requires `gh` CLI authenticated (`gh auth status`).

### Manual

When a new supply-chain attack is disclosed:
1. Add the package to `.claude/hooks/src/shared/malicious-packages.json`
2. Rebuild: `cd .claude/hooks && npm run build`
3. Sync: `bash scripts/sync-to-active.sh`

## Background

On March 24, 2026, LiteLLM versions 1.82.7-1.82.8 were published to PyPI with a credential-stealing payload. The attack used a `.pth` file that auto-executed on every Python process startup, harvesting SSH keys, cloud credentials, K8s configs, and API keys. LiteLLM gets 3.4M downloads/day — anyone who installed during the window was compromised.

This hook would have caught it at Layer 2 (blocklist), Layer 3 (OSV.dev — the OSSF malicious-packages repo flagged it as MAL-), and Layer 4 (age check — the malicious versions were yanked within hours).
