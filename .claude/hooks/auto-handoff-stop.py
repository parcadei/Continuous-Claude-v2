#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Stop hook: Block when context is too high and suggest handoff."""
import json, sys, glob, os, tempfile

data = json.load(sys.stdin)
if data.get('stop_hook_active'):
    print('{}'); sys.exit(0)

tmp_dir = tempfile.gettempdir()
ctx_files = glob.glob(os.path.join(tmp_dir, 'claude-context-pct-*.txt'))
if ctx_files:
    try:
        with open(ctx_files[0]) as f:
            pct = int(f.read().strip())
        if pct >= 85:
            print(json.dumps({
                "decision": "block",
                "reason": f"Context at {pct}%. Run: /create_handoff"
            }))
            sys.exit(0)
    except Exception:
        pass
print('{}')
