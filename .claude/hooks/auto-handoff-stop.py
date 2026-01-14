#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Stop hook: Block when context is too high and suggest handoff.

Calculates context percentage directly from stdin JSON for accuracy.
This ensures 1:1 match with status line even after auto-compaction.
"""
import json
import sys

SYSTEM_OVERHEAD = 45000  # Match status.py
CONTEXT_THRESHOLD = 85   # Block at 85%+


def get_context_percent(data: dict) -> int:
    """Calculate context percentage from Claude Code JSON input.

    Uses same formula as status.py for 1:1 consistency.
    """
    ctx = data.get("context_window", {})
    usage = ctx.get("current_usage", {})

    input_tokens = usage.get("input_tokens", 0) or 0
    cache_read = usage.get("cache_read_input_tokens", 0) or 0
    cache_creation = usage.get("cache_creation_input_tokens", 0) or 0

    total_tokens = input_tokens + cache_read + cache_creation + SYSTEM_OVERHEAD
    context_size = ctx.get("context_window_size", 200000) or 200000

    return min(100, total_tokens * 100 // context_size)


def main():
    data = json.load(sys.stdin)

    # Avoid recursion if stop hook triggers itself
    if data.get('stop_hook_active'):
        print('{}')
        sys.exit(0)

    pct = get_context_percent(data)

    if pct >= CONTEXT_THRESHOLD:
        print(json.dumps({
            "decision": "block",
            "reason": f"Context at {pct}%. Run: /create_handoff"
        }))
    else:
        print('{}')


if __name__ == "__main__":
    main()
