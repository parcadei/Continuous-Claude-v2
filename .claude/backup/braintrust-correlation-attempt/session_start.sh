#!/bin/bash
###
# SessionStart Hook - Creates the root trace span when a Claude Code session begins
###

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

debug "SessionStart hook triggered"

tracing_enabled || { debug "Tracing disabled"; exit 0; }
check_requirements || exit 0

# Read input from stdin
INPUT=$(cat)
debug "SessionStart input: $INPUT"

# Extract session ID from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)

if [ -z "$SESSION_ID" ]; then
    # Generate a session ID if not provided
    SESSION_ID=$(generate_uuid)
    debug "Generated session ID: $SESSION_ID"
fi

# Check for injected trace context from parent Task tool
# The context is in the prompt field if this is a sub-agent
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)
TRACE_CONTEXT=""

if [ -n "$PROMPT" ]; then
    TRACE_CONTEXT=$(extract_trace_context "$PROMPT")
fi

if [ -n "$TRACE_CONTEXT" ]; then
    # This is a sub-agent with injected context
    PARENT_ROOT_SPAN_ID=$(echo "$TRACE_CONTEXT" | jq -r '.root_span_id // empty')
    PARENT_SPAN_ID=$(echo "$TRACE_CONTEXT" | jq -r '.parent_span_id // empty')
    PARENT_PROJECT_ID=$(echo "$TRACE_CONTEXT" | jq -r '.project_id // empty')
    TASK_SPAN_ID=$(echo "$TRACE_CONTEXT" | jq -r '.task_span_id // empty')

    if [ -n "$PARENT_ROOT_SPAN_ID" ] && [ -n "$PARENT_SPAN_ID" ] && [ -n "$PARENT_PROJECT_ID" ]; then
        log "INFO" "Sub-agent detected: inheriting trace context from parent"

        # Update the correlation record with this sub-agent's session_id
        # This allows PostToolUse (in parent) to find the child_session_id
        if [ -n "$TASK_SPAN_ID" ]; then
            update_correlation_with_child "$TASK_SPAN_ID" "$SESSION_ID"
            log "INFO" "Updated correlation: task_span_id=$TASK_SPAN_ID, child_session_id=$SESSION_ID"
        fi

        # Use parent's root_span_id (CRITICAL: do not generate new)
        SUBAGENT_SPAN_ID="$SESSION_ID"  # span_id is still unique to this sub-agent
        INHERITED_ROOT="$PARENT_ROOT_SPAN_ID"

        # Create sub-agent root span linked to parent
        TIMESTAMP=$(get_timestamp)
        WORKSPACE=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
        WORKSPACE_NAME=$(basename "$WORKSPACE" 2>/dev/null || echo "Sub-Agent")
        HOSTNAME=$(get_hostname)
        USERNAME=$(get_username)
        OS=$(get_os)

        # Extract agent type from prompt if available
        AGENT_TYPE=$(echo "$PROMPT" | grep -oP 'subagent_type["\s:]+\K[a-zA-Z_-]+' 2>/dev/null | head -1 || echo "task")
        # Fallback if grep -P not available
        [ -z "$AGENT_TYPE" ] && AGENT_TYPE="task"

        EVENT=$(jq -n \
            --arg id "$SUBAGENT_SPAN_ID" \
            --arg span_id "$SUBAGENT_SPAN_ID" \
            --arg root_span_id "$INHERITED_ROOT" \
            --arg parent "$PARENT_SPAN_ID" \
            --arg created "$TIMESTAMP" \
            --arg session "$SESSION_ID" \
            --arg workspace "$WORKSPACE_NAME" \
            --arg cwd "$WORKSPACE" \
            --arg hostname "$HOSTNAME" \
            --arg username "$USERNAME" \
            --arg os "$OS" \
            --arg agent_type "$AGENT_TYPE" \
            '{
                id: $id,
                span_id: $span_id,
                root_span_id: $root_span_id,
                span_parents: [$parent],
                created: $created,
                input: ("Sub-Agent: " + $workspace),
                metadata: {
                    session_id: $session,
                    workspace: $cwd,
                    hostname: $hostname,
                    username: $username,
                    os: $os,
                    source: "claude-code-subagent",
                    agent_type: $agent_type,
                    parent_span_id: $parent
                },
                span_attributes: {
                    name: ("Sub-Agent: " + $workspace),
                    type: "task"
                }
            }')

        PROJECT_ID="$PARENT_PROJECT_ID"

        # Save session state with INHERITED root_span_id FIRST (before API call)
        # This ensures state is preserved even if API fails
        set_session_state "$SESSION_ID" "root_span_id" "$INHERITED_ROOT"
        set_session_state "$SESSION_ID" "project_id" "$PROJECT_ID"
        set_session_state "$SESSION_ID" "turn_count" "0"
        set_session_state "$SESSION_ID" "tool_count" "0"
        set_session_state "$SESSION_ID" "started" "$TIMESTAMP"
        set_session_state "$SESSION_ID" "is_subagent" "true"
        set_session_state "$SESSION_ID" "subagent_span_id" "$SUBAGENT_SPAN_ID"

        # Try to insert span (non-fatal if it fails)
        ROW_ID=$(insert_span "$PROJECT_ID" "$EVENT") || log "WARN" "Failed to create sub-agent root span"

        log "INFO" "Created sub-agent root: $SUBAGENT_SPAN_ID (parent=$PARENT_SPAN_ID, root=$INHERITED_ROOT)"
        exit 0
    fi
fi

# Get project ID (for main session)
PROJECT_ID=$(get_project_id "$PROJECT") || { log "ERROR" "Failed to get project"; exit 0; }
debug "Using project: $PROJECT (id: $PROJECT_ID)"

# Check if we already have a root span for this session
EXISTING_ROOT=$(get_session_state "$SESSION_ID" "root_span_id")
if [ -n "$EXISTING_ROOT" ]; then
    debug "Session already has root span: $EXISTING_ROOT"
    exit 0
fi

# Create root span for the session
ROOT_SPAN_ID="$SESSION_ID"
TIMESTAMP=$(get_timestamp)

# Extract workspace info if available
WORKSPACE=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
WORKSPACE_NAME=$(basename "$WORKSPACE" 2>/dev/null || echo "Claude Code")

# Get system info
HOSTNAME=$(get_hostname)
USERNAME=$(get_username)
OS=$(get_os)

EVENT=$(jq -n \
    --arg id "$ROOT_SPAN_ID" \
    --arg span_id "$ROOT_SPAN_ID" \
    --arg root_span_id "$ROOT_SPAN_ID" \
    --arg created "$TIMESTAMP" \
    --arg session "$SESSION_ID" \
    --arg workspace "$WORKSPACE_NAME" \
    --arg cwd "$WORKSPACE" \
    --arg hostname "$HOSTNAME" \
    --arg username "$USERNAME" \
    --arg os "$OS" \
    '{
        id: $id,
        span_id: $span_id,
        root_span_id: $root_span_id,
        created: $created,
        input: ("Session: " + $workspace),
        metadata: {
            session_id: $session,
            workspace: $cwd,
            hostname: $hostname,
            username: $username,
            os: $os,
            source: "claude-code"
        },
        span_attributes: {
            name: ("Claude Code: " + $workspace),
            type: "task"
        }
    }')

ROW_ID=$(insert_span "$PROJECT_ID" "$EVENT") || { log "ERROR" "Failed to create session root"; exit 0; }

# Save session state
set_session_state "$SESSION_ID" "root_span_id" "$ROOT_SPAN_ID"
set_session_state "$SESSION_ID" "project_id" "$PROJECT_ID"
set_session_state "$SESSION_ID" "turn_count" "0"
set_session_state "$SESSION_ID" "tool_count" "0"
set_session_state "$SESSION_ID" "started" "$TIMESTAMP"

log "INFO" "Created session root: $SESSION_ID workspace=$WORKSPACE_NAME"

exit 0
