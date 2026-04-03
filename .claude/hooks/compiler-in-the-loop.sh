#!/bin/bash
# Compiler-in-the-Loop PostToolUse Hook
# Early exit in bash to avoid Node startup latency for non-Lean files
# Requires: jq

# Read input once
INPUT=$(cat)

# Extract file path (try both locations)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_response.filePath // ""' 2>/dev/null)

# Early exit if not a .lean file - skip Node entirely (~500ms saved)
if [[ ! "$FILE_PATH" == *.lean ]]; then
  echo '{}'
  exit 0
fi

# Only invoke TypeScript for .lean files
set -e
cd "$HOME/.claude/hooks"
echo "$INPUT" | npx tsx src/compiler-in-the-loop.ts
