#!/usr/bin/env python3
"""Python bridge stub for hook tests."""
import sys
import json

if __name__ == "__main__":
    # Tests expect some output
    result = {"status": "ok", "output": "bridge_test"}
    print(json.dumps(result))
    sys.exit(0)
