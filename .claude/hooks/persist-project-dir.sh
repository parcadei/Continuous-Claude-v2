#!/bin/bash
# SessionStart hook: Persist CLAUDE_PROJECT_DIR to CLAUDE_ENV_FILE
# This makes the project dir available to all subsequent bash commands
# Uses pwd since hooks run in the project directory

# Debug log
echo "[persist-project-dir] CLAUDE_ENV_FILE=${CLAUDE_ENV_FILE:-NOT_SET} PWD=$(pwd)" >> /tmp/claude-hook-debug.log

if [ -n "$CLAUDE_ENV_FILE" ]; then
    echo "export CLAUDE_PROJECT_DIR=\"$(pwd)\"" >> "$CLAUDE_ENV_FILE"
    echo "[persist-project-dir] Wrote to $CLAUDE_ENV_FILE" >> /tmp/claude-hook-debug.log
fi
