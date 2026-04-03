#!/bin/bash
# Compiler-in-the-Loop Stop Hook
# Early exit in bash to avoid Node startup latency when Lean isn't active

STATE_FILE="$HOME/.claude/cache/lean/compiler-state.json"

# Early exit if no Lean state - skip Node entirely (~500ms saved)
if [[ ! -f "$STATE_FILE" ]]; then
  echo '{}'
  exit 0
fi

# Only invoke TypeScript if Lean compiler state exists
set -e
cd "$HOME/.claude/hooks"
cat | npx tsx src/compiler-in-the-loop-stop.ts
