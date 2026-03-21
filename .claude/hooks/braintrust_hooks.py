#!/usr/bin/env python3
"""Braintrust tracing hooks - Cross-platform Python port.

Replaces the 5 bash hooks + common.sh:
- session_start
- session_end
- user_prompt_submit
- post_tool_use
- stop (creates LLM spans)

Usage:
    python3 braintrust_hooks.py <hook_name>

    # In settings.json:
    "command": "python3 $HOME/.claude/hooks/braintrust_hooks.py session_start"
"""

from __future__ import annotations

import json
import os
import socket
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

# Config from environment
STATE_DIR = Path.home() / ".claude" / "state" / "braintrust_sessions"
LOG_FILE = Path.home() / ".claude" / "state" / "braintrust_hook.log"
GLOBAL_STATE_FILE = Path.home() / ".claude" / "state" / "braintrust_global.json"

API_KEY = os.environ.get("BRAINTRUST_API_KEY", "")
PROJECT = os.environ.get("BRAINTRUST_CC_PROJECT", "claude-code")
API_URL = os.environ.get("BRAINTRUST_API_URL", "https://api.braintrust.dev")
DEBUG = os.environ.get("BRAINTRUST_CC_DEBUG", "false").lower() == "true"
TRACE_ENABLED = os.environ.get("TRACE_TO_BRAINTRUST", "false").lower() == "true"


def ensure_dirs():
    """Ensure state directories exist."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


def log(level: str, message: str):
    """Log to file."""
    ensure_dirs()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{timestamp} [{level}] {message}\n")


def debug(message: str):
    """Debug log if enabled."""
    if DEBUG:
        log("DEBUG", message)


def get_timestamp() -> str:
    """Get ISO timestamp."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def generate_uuid() -> str:
    """Generate a UUID."""
    return str(uuid.uuid4())


def get_hostname() -> str:
    """Get hostname."""
    return socket.gethostname()


def get_username() -> str:
    """Get username."""
    return os.environ.get("USER", os.environ.get("USERNAME", "unknown"))


def get_os() -> str:
    """Get OS name."""
    return sys.platform


def get_workspace_project_id(workspace: str) -> str:
    """Generate stable project ID from workspace path (matches memory system).

    Uses SHA-256 hash of absolute path, first 16 chars.
    This matches the project_id format used in archival_memory for isolation.
    """
    import hashlib
    if not workspace:
        return "global"
    abs_path = os.path.abspath(workspace)
    return hashlib.sha256(abs_path.encode()).hexdigest()[:16]


# State management
def load_session_state(session_id: str) -> dict:
    """Load session state from file."""
    ensure_dirs()
    state_file = STATE_DIR / f"{session_id}.json"
    if state_file.exists():
        try:
            return json.loads(state_file.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def save_session_state(session_id: str, state: dict):
    """Save session state atomically."""
    ensure_dirs()
    state_file = STATE_DIR / f"{session_id}.json"
    temp_file = state_file.with_suffix(".tmp")
    temp_file.write_text(json.dumps(state, indent=2))
    os.replace(temp_file, state_file)


def get_session_value(session_id: str, key: str) -> str | None:
    """Get a value from session state."""
    state = load_session_state(session_id)
    return state.get(key)


def set_session_value(session_id: str, key: str, value: Any):
    """Set a value in session state."""
    state = load_session_state(session_id)
    state[key] = value
    save_session_state(session_id, state)


def load_global_state() -> dict:
    """Load global state."""
    if GLOBAL_STATE_FILE.exists():
        try:
            return json.loads(GLOBAL_STATE_FILE.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def save_global_state(state: dict):
    """Save global state."""
    ensure_dirs()
    GLOBAL_STATE_FILE.write_text(json.dumps(state, indent=2))


# Braintrust API
def get_project_id(project_name: str) -> str | None:
    """Get or cache project ID from Braintrust."""
    global_state = load_global_state()
    cached = global_state.get("project_ids", {}).get(project_name)
    if cached:
        return cached

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                f"{API_URL}/v1/project",
                headers={"Authorization": f"Bearer {API_KEY}"},
                params={"project_name": project_name},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("objects"):
                    project_id = data["objects"][0]["id"]
                    global_state.setdefault("project_ids", {})[project_name] = project_id
                    save_global_state(global_state)
                    return project_id
    except Exception as e:
        log("ERROR", f"Failed to get project ID: {e}")
    return None


def insert_span(project_id: str, event: dict) -> str | None:
    """Insert a single span into Braintrust."""
    result = batch_insert_spans(project_id, [event])
    return result[0] if result else None


def batch_insert_spans(project_id: str, events: list[dict]) -> list[str | None]:
    """Insert multiple spans into Braintrust in a single API call."""
    if not events:
        return []
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                f"{API_URL}/v1/project_logs/{project_id}/insert",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"events": events},
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("row_ids", [])
    except Exception as e:
        log("ERROR", f"Failed to batch insert {len(events)} spans: {e}")
    return []


# Hook implementations
def session_start(input_data: dict) -> dict:
    """Handle SessionStart hook."""
    debug("SessionStart hook triggered")

    if not TRACE_ENABLED:
        return {"result": "continue"}

    if not API_KEY:
        log("ERROR", "BRAINTRUST_API_KEY not set")
        return {"result": "continue"}

    session_id = input_data.get("session_id", generate_uuid())

    # Check if already has root span
    existing = get_session_value(session_id, "root_span_id")
    if existing:
        debug(f"Session already has root span: {existing}")
        return {"result": "continue"}

    project_id = get_project_id(PROJECT)
    if not project_id:
        log("ERROR", "Failed to get project")
        return {"result": "continue"}

    root_span_id = session_id
    timestamp = get_timestamp()
    workspace = input_data.get("cwd", "")
    workspace_name = Path(workspace).name if workspace else "Claude Code"
    workspace_project_id = get_workspace_project_id(workspace)

    event = {
        "id": root_span_id,
        "span_id": root_span_id,
        "root_span_id": root_span_id,
        "created": timestamp,
        "input": f"Session: {workspace_name}",
        "metadata": {
            "session_id": session_id,
            "workspace": workspace,
            "workspace_project_id": workspace_project_id,
            "hostname": get_hostname(),
            "username": get_username(),
            "os": get_os(),
            "source": "claude-code",
        },
        "span_attributes": {
            "name": f"Claude Code: {workspace_name}",
            "type": "task",
        },
    }

    insert_span(project_id, event)

    set_session_value(session_id, "root_span_id", root_span_id)
    set_session_value(session_id, "project_id", project_id)
    set_session_value(session_id, "turn_count", 0)
    set_session_value(session_id, "started", timestamp)

    log("INFO", f"Created session root: {session_id} workspace={workspace_name}")
    return {"result": "continue"}


def session_end(input_data: dict) -> dict:
    """Handle SessionEnd hook."""
    debug("SessionEnd hook triggered")

    if not TRACE_ENABLED:
        return {"result": "continue"}

    session_id = input_data.get("session_id", "")
    if not session_id:
        return {"result": "continue"}

    root_span_id = get_session_value(session_id, "root_span_id")
    turn_count = get_session_value(session_id, "turn_count") or 0

    log("INFO", f"Session ended: {session_id} (turns={turn_count})")
    return {"result": "continue"}


def user_prompt_submit(input_data: dict) -> dict:
    """Handle UserPromptSubmit hook."""
    debug("UserPromptSubmit hook triggered")

    if not TRACE_ENABLED:
        return {"result": "continue"}

    session_id = input_data.get("session_id", "")
    if not session_id:
        return {"result": "continue"}

    root_span_id = get_session_value(session_id, "root_span_id")
    project_id = get_session_value(session_id, "project_id")

    if not root_span_id or not project_id:
        # Create session root if missing
        session_start(input_data)
        root_span_id = get_session_value(session_id, "root_span_id")
        project_id = get_session_value(session_id, "project_id")
        if not root_span_id or not project_id:
            return {"result": "continue"}

    # Increment turn count
    turn_count = (get_session_value(session_id, "turn_count") or 0) + 1
    turn_span_id = generate_uuid()
    timestamp = get_timestamp()
    prompt = input_data.get("prompt", "")[:100]

    event = {
        "id": turn_span_id,
        "span_id": turn_span_id,
        "root_span_id": root_span_id,
        "span_parents": [root_span_id],
        "created": timestamp,
        "input": prompt,
        "span_attributes": {
            "name": f"Turn {turn_count}",
            "type": "task",
        },
    }

    insert_span(project_id, event)

    set_session_value(session_id, "turn_count", turn_count)
    set_session_value(session_id, "current_turn_span_id", turn_span_id)

    log("INFO", f"Turn {turn_count} started: {turn_span_id}")
    return {"result": "continue"}


def post_tool_use(input_data: dict) -> dict:
    """Handle PostToolUse hook."""
    debug("PostToolUse hook triggered")

    if not TRACE_ENABLED:
        return {"result": "continue"}

    session_id = input_data.get("session_id", "")
    tool_name = input_data.get("tool_name", "")

    if not session_id or not tool_name:
        return {"result": "continue"}

    turn_span_id = get_session_value(session_id, "current_turn_span_id")
    project_id = get_session_value(session_id, "project_id")
    root_span_id = get_session_value(session_id, "root_span_id")

    if not turn_span_id or not project_id:
        return {"result": "continue"}

    span_id = generate_uuid()
    timestamp = get_timestamp()
    tool_input = input_data.get("tool_input", {})
    tool_output = input_data.get("tool_response", input_data.get("output", {}))

    # Determine span name
    if tool_name in ("Read", "Write", "Edit", "MultiEdit"):
        file_path = tool_input.get("file_path", tool_input.get("path", ""))
        span_name = f"{tool_name}: {Path(file_path).name}" if file_path else tool_name
    elif tool_name in ("Bash", "Terminal"):
        cmd = str(tool_input.get("command", ""))[:50]
        span_name = f"Terminal: {cmd}"
    else:
        span_name = tool_name

    event = {
        "id": span_id,
        "span_id": span_id,
        "root_span_id": root_span_id,
        "span_parents": [turn_span_id],
        "created": timestamp,
        "input": tool_input,
        "output": tool_output,
        "metadata": {"tool_name": tool_name},
        "span_attributes": {
            "name": span_name,
            "type": "tool",
        },
    }

    insert_span(project_id, event)
    log("INFO", f"Tool: {span_name}")
    return {"result": "continue"}


def stop(input_data: dict) -> dict:
    """Handle Stop hook - creates LLM spans for model calls within the turn.

    Parses the conversation JSONL to identify LLM calls (assistant messages
    after user/tool_result) and creates Braintrust spans for each.
    """
    log("INFO", "=== STOP HOOK CALLED ===")

    if not TRACE_ENABLED:
        return {"result": "continue"}

    # Get session ID
    session_id = input_data.get("session_id", "")
    if not session_id:
        transcript_path = input_data.get("transcript_path", "")
        if transcript_path:
            session_id = Path(transcript_path).stem

    if not session_id:
        debug("No session ID")
        return {"result": "continue"}

    # Get session state
    root_span_id = get_session_value(session_id, "root_span_id")
    project_id = get_session_value(session_id, "project_id")
    turn_span_id = get_session_value(session_id, "current_turn_span_id")

    if not turn_span_id or not project_id:
        log("WARN", f"No current turn to finalize (turn={turn_span_id}, project={project_id})")
        return {"result": "continue"}

    log("INFO", f"Stop hook processing turn: {turn_span_id} (session={session_id})")

    # Find conversation file
    conv_file = input_data.get("transcript_path", "")
    if not conv_file or not Path(conv_file).exists():
        sessions_dir = Path.home() / ".claude" / "projects"
        for jsonl in sessions_dir.rglob(f"{session_id}.jsonl"):
            conv_file = str(jsonl)
            break

    if not conv_file or not Path(conv_file).exists():
        debug("No conversation file")
        return {"result": "continue"}

    debug(f"Processing transcript: {conv_file}")

    # Get last processed line
    turn_last_line = get_session_value(session_id, "turn_last_line") or 0

    # Process transcript — collect events for batch insert
    llm_calls_created = 0
    pending_events: list = []
    current_output_text = ""
    current_tool_calls: list = []
    current_model = ""
    current_prompt_tokens = 0
    current_completion_tokens = 0
    current_start_timestamp = ""
    current_end_timestamp = ""
    conversation_history: list = []
    line_num = 0

    def create_llm_span(output_text: str, model: str, prompt_tokens: int,
                        completion_tokens: int, start_ts: str, end_ts: str,
                        tool_calls: list, input_history: list) -> bool:
        """Collect an LLM span event for batch insert."""
        nonlocal llm_calls_created

        if not output_text and not tool_calls:
            return False

        span_id = generate_uuid()
        total_tokens = prompt_tokens + completion_tokens

        # Parse timestamps
        try:
            start_time = int(datetime.fromisoformat(start_ts.replace("Z", "+00:00")).timestamp()) if start_ts else int(datetime.now().timestamp())
            end_time = int(datetime.fromisoformat(end_ts.replace("Z", "+00:00")).timestamp()) if end_ts else int(datetime.now().timestamp())
        except (ValueError, AttributeError):
            start_time = end_time = int(datetime.now().timestamp())

        # Format output
        if tool_calls:
            output_json = {"role": "assistant", "content": output_text or "", "tool_calls": tool_calls}
        else:
            output_json = {"role": "assistant", "content": output_text}

        event = {
            "id": span_id,
            "span_id": span_id,
            "root_span_id": root_span_id,
            "span_parents": [turn_span_id],
            "created": start_ts or get_timestamp(),
            "input": input_history,
            "output": output_json,
            "metrics": {
                "start": start_time,
                "end": end_time,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "tokens": total_tokens,
            },
            "metadata": {"model": model or "claude"},
            "span_attributes": {
                "name": model or "claude",
                "type": "llm",
            },
        }

        pending_events.append(event)
        llm_calls_created += 1
        log("INFO", f"LLM span queued: {model} tokens={total_tokens} (turn={turn_span_id})")
        return True

    # Read and process JSONL
    with open(conv_file, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line_num += 1
            if line_num <= turn_last_line:
                continue

            line = line.strip()
            if not line:
                continue

            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")
            msg_timestamp = msg.get("timestamp", "")

            if msg_type == "user":
                content = msg.get("message", {}).get("content", "")

                # Check if tool_result
                is_tool_result = False
                if isinstance(content, list) and content:
                    is_tool_result = content[0].get("type") == "tool_result"

                if is_tool_result:
                    # Save pending output first
                    if current_output_text or current_tool_calls:
                        create_llm_span(current_output_text, current_model,
                                       current_prompt_tokens, current_completion_tokens,
                                       current_start_timestamp, current_end_timestamp,
                                       current_tool_calls, conversation_history.copy())
                        conversation_history.append({
                            "role": "assistant",
                            "content": current_output_text,
                            "tool_calls": current_tool_calls if current_tool_calls else None,
                        })

                    # Add tool result to history
                    tool_content = content[0].get("content", "tool result")[:51200]
                    tool_id = content[0].get("tool_use_id", "")
                    conversation_history.append({
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "content": tool_content,
                    })

                    # Reset
                    current_output_text = ""
                    current_tool_calls = []
                    current_model = ""
                    current_prompt_tokens = 0
                    current_completion_tokens = 0
                    current_start_timestamp = ""
                    current_end_timestamp = ""
                else:
                    # Real user message
                    if current_output_text or current_tool_calls:
                        create_llm_span(current_output_text, current_model,
                                       current_prompt_tokens, current_completion_tokens,
                                       current_start_timestamp, current_end_timestamp,
                                       current_tool_calls, conversation_history.copy())
                        conversation_history.append({
                            "role": "assistant",
                            "content": current_output_text,
                            "tool_calls": current_tool_calls if current_tool_calls else None,
                        })

                    # Add user message
                    content_str = content if isinstance(content, str) else json.dumps(content)[:51200]
                    conversation_history.append({"role": "user", "content": content_str})

                    # Reset
                    current_output_text = ""
                    current_tool_calls = []
                    current_model = ""
                    current_prompt_tokens = 0
                    current_completion_tokens = 0
                    current_start_timestamp = msg_timestamp
                    current_end_timestamp = ""

            elif msg_type == "assistant":
                message = msg.get("message", {})
                content = message.get("content", "")

                # Extract text
                if isinstance(content, list):
                    texts = [c.get("text", "") for c in content if c.get("type") == "text"]
                    text = "\n".join(texts)
                elif isinstance(content, str):
                    text = content
                else:
                    text = ""

                # Extract tool calls
                if isinstance(content, list):
                    tool_calls = [
                        {
                            "id": c.get("id", ""),
                            "type": "function",
                            "function": {
                                "name": c.get("name", ""),
                                "arguments": json.dumps(c.get("input", {})),
                            },
                        }
                        for c in content if c.get("type") == "tool_use"
                    ]
                else:
                    tool_calls = []

                # Set start timestamp from first assistant message
                if not current_start_timestamp:
                    current_start_timestamp = msg_timestamp

                if text:
                    current_output_text = f"{current_output_text}\n{text}" if current_output_text else text
                    current_end_timestamp = msg_timestamp

                if tool_calls:
                    current_tool_calls = tool_calls
                    current_end_timestamp = msg_timestamp

                # Extract model
                model = message.get("model", "")
                if model:
                    current_model = model

                # Extract tokens
                usage = message.get("usage", {})
                if usage:
                    current_prompt_tokens += usage.get("input_tokens", 0) or 0
                    current_completion_tokens += usage.get("output_tokens", 0) or 0

    log("DEBUG", f"Finished processing transcript (lines={line_num}, llm_calls={llm_calls_created})")

    # Save final LLM call
    if current_output_text or current_tool_calls:
        log("DEBUG", "Saving final LLM call")
        create_llm_span(current_output_text, current_model,
                       current_prompt_tokens, current_completion_tokens,
                       current_start_timestamp, current_end_timestamp,
                       current_tool_calls, conversation_history.copy())

    # Add turn finalization event to the batch
    end_time = int(datetime.now().timestamp())
    turn_update = {
        "id": turn_span_id,
        "_is_merge": True,
        "metrics": {"end": end_time},
    }
    pending_events.append(turn_update)

    # Send all events in a single batch API call
    log("DEBUG", f"Batch inserting {len(pending_events)} events: turn={turn_span_id} project={project_id}")
    batch_insert_spans(project_id, pending_events)

    # Update state
    set_session_value(session_id, "turn_last_line", line_num)
    set_session_value(session_id, "current_turn_span_id", "")

    if llm_calls_created > 0:
        log("INFO", f"Created {llm_calls_created} LLM spans for turn")
    log("INFO", f"Turn finalized (end={end_time})")

    return {"result": "continue"}


HOOKS = {
    "session_start": session_start,
    "session_end": session_end,
    "user_prompt_submit": user_prompt_submit,
    "post_tool_use": post_tool_use,
    "stop": stop,
}


def main():
    """CLI entrypoint."""
    if len(sys.argv) < 2:
        print("Usage: braintrust_hooks.py <hook_name>", file=sys.stderr)
        sys.exit(1)

    hook_name = sys.argv[1]
    if hook_name not in HOOKS:
        print(f"Unknown hook: {hook_name}", file=sys.stderr)
        sys.exit(1)

    # Load .env if exists
    env_file = Path.home() / ".claude" / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                key, _, value = line.partition("=")
                os.environ[key.strip()] = value.strip()

    # Reload config after .env
    global API_KEY, PROJECT, API_URL, DEBUG, TRACE_ENABLED
    API_KEY = os.environ.get("BRAINTRUST_API_KEY", "")
    PROJECT = os.environ.get("BRAINTRUST_CC_PROJECT", "claude-code")
    API_URL = os.environ.get("BRAINTRUST_API_URL", "https://api.braintrust.dev")
    DEBUG = os.environ.get("BRAINTRUST_CC_DEBUG", "false").lower() == "true"
    TRACE_ENABLED = os.environ.get("TRACE_TO_BRAINTRUST", "false").lower() == "true"

    try:
        stdin_data = sys.stdin.read()
        input_data = json.loads(stdin_data) if stdin_data.strip() else {}
    except json.JSONDecodeError:
        input_data = {}

    result = HOOKS[hook_name](input_data)
    print(json.dumps(result))
    sys.exit(0)


if __name__ == "__main__":
    main()
