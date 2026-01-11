#!/bin/bash
###
# Common utilities for Braintrust Claude Code tracing hooks
#
# FIXED: Per-session state files to prevent multi-instance clobbering
###

# Load environment from ~/.claude/.env if it exists
[ -f "$HOME/.claude/.env" ] && set -a && source "$HOME/.claude/.env" && set +a

# Config
export LOG_FILE="$HOME/.claude/state/braintrust_hook.log"
export STATE_DIR="$HOME/.claude/state/braintrust_sessions"
export GLOBAL_STATE_FILE="$HOME/.claude/state/braintrust_global.json"
export DEBUG="${BRAINTRUST_CC_DEBUG:-false}"
export API_KEY="${BRAINTRUST_API_KEY}"
export PROJECT="${BRAINTRUST_CC_PROJECT:-claude-code}"
export API_URL="${BRAINTRUST_API_URL:-https://api.braintrust.dev}"

# Ensure directories exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$STATE_DIR"

# Logging
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] $2" >> "$LOG_FILE"; }
debug() { [ "$(echo "$DEBUG" | tr '[:upper:]' '[:lower:]')" = "true" ] && log "DEBUG" "$1" || true; }

# Check if tracing is enabled
tracing_enabled() {
    [ "$(echo "$TRACE_TO_BRAINTRUST" | tr '[:upper:]' '[:lower:]')" = "true" ]
}

# Validate requirements
check_requirements() {
    for cmd in jq curl; do
        command -v "$cmd" &>/dev/null || { log "ERROR" "$cmd not installed"; return 1; }
    done
    [ -z "$API_KEY" ] && { log "ERROR" "BRAINTRUST_API_KEY not set"; return 1; }
    return 0
}

# Get session state file path
get_session_file() {
    local session_id="$1"
    echo "$STATE_DIR/${session_id}.json"
}

# Load state from file with validation
load_state_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local content
        content=$(cat "$file" 2>/dev/null)
        # Validate it's valid JSON
        if echo "$content" | jq -e '.' >/dev/null 2>&1; then
            echo "$content"
        else
            debug "Corrupt state file: $file"
            echo "{}"
        fi
    else
        echo "{}"
    fi
}

# Save state to file atomically
save_state_file() {
    local file="$1"
    local content="$2"
    local temp_file="${file}.tmp.$$"

    # Validate content is valid JSON before saving
    if ! echo "$content" | jq -e '.' >/dev/null 2>&1; then
        log "ERROR" "Attempted to save invalid JSON to $file"
        return 1
    fi

    # Write to temp file then atomic rename
    echo "$content" > "$temp_file" && mv "$temp_file" "$file"
}

# Global state (for project_id cache - shared across sessions)
load_global_state() {
    load_state_file "$GLOBAL_STATE_FILE"
}

save_global_state() {
    save_state_file "$GLOBAL_STATE_FILE" "$1"
}

get_state_value() {
    local key="$1"
    load_global_state | jq -r ".$key // empty"
}

set_state_value() {
    local key="$1"
    local value="$2"
    local state
    state=$(load_global_state)
    state=$(echo "$state" | jq --arg k "$key" --arg v "$value" '.[$k] = $v')
    save_global_state "$state"
}

# Per-session state
get_session_state() {
    local session_id="$1"
    local key="$2"
    local file
    file=$(get_session_file "$session_id")
    load_state_file "$file" | jq -r ".$key // empty"
}

set_session_state() {
    local session_id="$1"
    local key="$2"
    local value="$3"
    local file state
    file=$(get_session_file "$session_id")
    state=$(load_state_file "$file")
    state=$(echo "$state" | jq --arg k "$key" --arg v "$value" '.[$k] = $v')
    save_state_file "$file" "$state"
}

# Get or create project ID (cached globally)
get_project_id() {
    local name="$1"

    # Check cache first
    local cached_id
    cached_id=$(get_state_value "project_id")
    if [ -n "$cached_id" ]; then
        echo "$cached_id"
        return 0
    fi

    local encoded_name
    encoded_name=$(printf '%s' "$name" | jq -sRr @uri)

    # Try to get existing project
    local resp
    resp=$(curl -sf -H "Authorization: Bearer $API_KEY" "$API_URL/v1/project?project_name=$encoded_name" 2>/dev/null) || true
    local pid
    pid=$(echo "$resp" | jq -r '.id // empty' 2>/dev/null)

    if [ -n "$pid" ]; then
        set_state_value "project_id" "$pid"
        echo "$pid"
        return 0
    fi

    # Create project
    debug "Creating project: $name"
    resp=$(curl -sf -X POST -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" \
        -d "{\"name\": \"$name\"}" "$API_URL/v1/project" 2>/dev/null) || true
    pid=$(echo "$resp" | jq -r '.id // empty' 2>/dev/null)

    if [ -n "$pid" ]; then
        set_state_value "project_id" "$pid"
        echo "$pid"
        return 0
    fi

    return 1
}

# Insert a span to Braintrust
insert_span() {
    local project_id="$1"
    local event_json="$2"

    debug "Inserting span: $(echo "$event_json" | jq -c '.')"

    # Check if API_KEY is set
    if [ -z "$API_KEY" ]; then
        log "ERROR" "API_KEY is empty - check BRAINTRUST_API_KEY env var"
        return 1
    fi

    local resp http_code
    # Use -w to capture HTTP status, don't use -f so we can see error responses
    resp=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"events\": [$event_json]}" \
        "$API_URL/v1/project_logs/$project_id/insert" 2>&1)

    # Extract HTTP code from last line
    http_code=$(echo "$resp" | tail -1)
    resp=$(echo "$resp" | sed '$d')

    if [ "$http_code" != "200" ]; then
        log "ERROR" "Insert failed (HTTP $http_code): $resp"
        return 1
    fi

    local row_id
    row_id=$(echo "$resp" | jq -r '.row_ids[0] // empty' 2>/dev/null)

    if [ -n "$row_id" ]; then
        echo "$row_id"
        return 0
    else
        log "WARN" "Insert returned empty row_ids: $resp"
        return 1
    fi
}

# Generate a UUID
generate_uuid() {
    uuidgen | tr '[:upper:]' '[:lower:]'
}

# Get current ISO timestamp
get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%S.000Z"
}

# Get system info for metadata
get_hostname() {
    hostname 2>/dev/null || echo "unknown"
}

get_username() {
    whoami 2>/dev/null || echo "unknown"
}

get_os() {
    uname -s 2>/dev/null || echo "unknown"
}

# Cleanup old session state files (older than 7 days)
cleanup_old_sessions() {
    find "$STATE_DIR" -name "*.json" -mtime +7 -delete 2>/dev/null || true
}

# Extract trace context from prompt string
# Returns JSON object or empty string
extract_trace_context() {
    local prompt="$1"
    local context=""

    # Extract between markers using sed, remove markers with grep -v,
    # then remove whitespace around the JSON (but preserve internal spaces/quotes)
    context=$(echo "$prompt" | sed -n '/\[BRAINTRUST_TRACE_CONTEXT\]/,/\[\/BRAINTRUST_TRACE_CONTEXT\]/p' | grep -v '\[.*BRAINTRUST_TRACE_CONTEXT\]' | tr -d '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Validate it's valid JSON with required fields
    if [ -n "$context" ] && echo "$context" | jq -e '.root_span_id and .parent_span_id and .project_id' >/dev/null 2>&1; then
        echo "$context"
    fi
}

# Build trace context JSON for injection (compact format)
# parent_span_id doubles as task_span_id for correlation lookup
build_trace_context() {
    local root_span_id="$1"
    local parent_span_id="$2"  # Also used as task_span_id for correlation
    local project_id="$3"

    jq -cn \
        --arg root "$root_span_id" \
        --arg parent "$parent_span_id" \
        --arg project "$project_id" \
        --arg task "$parent_span_id" \
        '{root_span_id: $root, parent_span_id: $parent, project_id: $project, task_span_id: $task}'
}

# Format context block for prompt injection
format_trace_context_block() {
    local context_json="$1"
    printf '[BRAINTRUST_TRACE_CONTEXT]\n%s\n[/BRAINTRUST_TRACE_CONTEXT]\n' "$context_json"
}

# ============================================================================
# Task Correlation Helpers
# Manages pending_task_correlations.json for race-free parent/child linking
# ============================================================================

export PENDING_CORRELATIONS_FILE="$HOME/.claude/state/pending_task_correlations.json"

# Load pending correlations file
load_pending_correlations() {
    load_state_file "$PENDING_CORRELATIONS_FILE"
}

# Save pending correlations file atomically
save_pending_correlations() {
    save_state_file "$PENDING_CORRELATIONS_FILE" "$1"
}

# Create a correlation record (called by PreToolUse BEFORE sub-agent starts)
# Args: task_span_id, parent_session_id, parent_span_id
create_correlation_record() {
    local task_span_id="$1"
    local parent_session_id="$2"
    local parent_span_id="$3"
    local timestamp
    timestamp=$(get_timestamp)

    local correlations
    correlations=$(load_pending_correlations)

    # Add the new record
    correlations=$(echo "$correlations" | jq \
        --arg task_span_id "$task_span_id" \
        --arg parent_session_id "$parent_session_id" \
        --arg parent_span_id "$parent_span_id" \
        --arg created_at "$timestamp" \
        '.[$task_span_id] = {
            parent_session_id: $parent_session_id,
            parent_span_id: $parent_span_id,
            created_at: $created_at
        }')

    save_pending_correlations "$correlations"
    debug "Created correlation record: task_span_id=$task_span_id"
}

# Update correlation record with child_session_id (called by SessionStart of sub-agent)
# Args: task_span_id, child_session_id
update_correlation_with_child() {
    local task_span_id="$1"
    local child_session_id="$2"

    local correlations
    correlations=$(load_pending_correlations)

    # Check if record exists
    local exists
    exists=$(echo "$correlations" | jq -r --arg id "$task_span_id" '.[$id] // empty')

    if [ -z "$exists" ]; then
        debug "No correlation record found for task_span_id=$task_span_id"
        return 1
    fi

    # Update with child_session_id
    correlations=$(echo "$correlations" | jq \
        --arg task_span_id "$task_span_id" \
        --arg child_session_id "$child_session_id" \
        '.[$task_span_id].child_session_id = $child_session_id')

    save_pending_correlations "$correlations"
    debug "Updated correlation record: task_span_id=$task_span_id, child_session_id=$child_session_id"
}

# Get child_session_id from correlation record (called by PostToolUse AFTER sub-agent finishes)
# Args: task_span_id
# Returns: child_session_id or empty
get_correlation_child_session() {
    local task_span_id="$1"

    local correlations
    correlations=$(load_pending_correlations)

    echo "$correlations" | jq -r --arg id "$task_span_id" '.[$id].child_session_id // empty'
}

# Remove correlation record after use (called by PostToolUse after consuming)
# Args: task_span_id
remove_correlation_record() {
    local task_span_id="$1"

    local correlations
    correlations=$(load_pending_correlations)

    correlations=$(echo "$correlations" | jq --arg id "$task_span_id" 'del(.[$id])')

    save_pending_correlations "$correlations"
    debug "Removed correlation record: task_span_id=$task_span_id"
}

# Cleanup old correlation records (older than 1 hour - stale tasks)
cleanup_stale_correlations() {
    local correlations
    correlations=$(load_pending_correlations)

    # Get current time as Unix timestamp
    local now_ts
    now_ts=$(date +%s)
    local one_hour_ago=$((now_ts - 3600))

    # Remove records older than 1 hour
    # Note: This is a simple approach - we check created_at
    correlations=$(echo "$correlations" | jq --argjson cutoff "$one_hour_ago" '
        to_entries | map(select(
            (.value.created_at |
                if . then (. | sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601) else 9999999999 end
            ) > $cutoff
        )) | from_entries
    ')

    save_pending_correlations "$correlations"
}
