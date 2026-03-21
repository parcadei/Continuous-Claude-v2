#!/usr/bin/env bash
# Post-commit hook: auto-sync continuous-claude repo to ~/.claude/
# Canonical source: scripts/post-commit-hook.sh
# Installed to .git/hooks/post-commit by the setup wizard
# --skip-build: dist/*.mjs already copied from repo; npm run build hangs on Windows in post-commit context

REPO_ROOT="$(git rev-parse --show-toplevel)"
SYNC_SCRIPT="$REPO_ROOT/scripts/sync-to-active.sh"

if [[ -f "$SYNC_SCRIPT" ]]; then
    echo "Syncing to ~/.claude (background)..."
    bash "$SYNC_SCRIPT" --skip-build &
fi
