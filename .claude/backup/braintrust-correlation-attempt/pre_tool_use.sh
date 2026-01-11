#!/bin/bash
###
# PreToolUse Hook - Injects Braintrust trace context into Task tool prompts
###

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

debug "PreToolUse hook triggered"

tracing_enabled || { echo '{"result":"continue"}'; exit 0; }

# Read input from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# Only process Task tool
if [ "$TOOL_NAME" != "Task" ]; then
    echo '{"result":"continue"}'
    exit 0
fi

debug "PreToolUse intercepting Task tool"

# Get current session context
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)
[ -z "$SESSION_ID" ] && { echo '{"result":"continue"}'; exit 0; }

ROOT_SPAN_ID=$(get_session_state "$SESSION_ID" "root_span_id")
PROJECT_ID=$(get_session_state "$SESSION_ID" "project_id")
CURRENT_TURN_SPAN_ID=$(get_session_state "$SESSION_ID" "current_turn_span_id")

# Need all three to inject context
if [ -z "$ROOT_SPAN_ID" ] || [ -z "$PROJECT_ID" ]; then
    debug "Missing trace context (root=$ROOT_SPAN_ID, project=$PROJECT_ID), skipping injection"
    echo '{"result":"continue"}'
    exit 0
fi

# Generate a span ID for this Task tool call (will be the parent for sub-agent)
TASK_SPAN_ID=$(generate_uuid)

# Store the Task span ID so PostToolUse can use it
# (The actual Task tool span is created by PostToolUse after execution)
set_session_state "$SESSION_ID" "pending_task_span_id" "$TASK_SPAN_ID"

# Create correlation record BEFORE sub-agent starts (prevents race condition)
# This record will be updated by sub-agent's SessionStart with child_session_id
create_correlation_record "$TASK_SPAN_ID" "$SESSION_ID" "$CURRENT_TURN_SPAN_ID"

# Build context block using helper function - include task_span_id for correlation lookup
TRACE_CONTEXT=$(build_trace_context "$ROOT_SPAN_ID" "$TASK_SPAN_ID" "$PROJECT_ID")
CONTEXT_BLOCK=$(format_trace_context_block "$TRACE_CONTEXT")

# Get original prompt from tool_input
ORIGINAL_PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // empty' 2>/dev/null)

# Prepend context block to prompt
NEW_PROMPT="${CONTEXT_BLOCK}${ORIGINAL_PROMPT}"

# Build output with modified tool_input
# Note: The hook should return tool_input with the modified prompt
OUTPUT=$(jq -n \
    --arg new_prompt "$NEW_PROMPT" \
    '{
        result: "continue",
        tool_input: {
            prompt: $new_prompt
        }
    }')

echo "$OUTPUT"

log "INFO" "Injected trace context into Task prompt (parent=$TASK_SPAN_ID)"

exit 0
