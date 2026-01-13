#!/usr/bin/env python3
"""Composition validation stub for hook tests."""
import sys
import json

if __name__ == "__main__":
    # Tests expect JSON output matching Python bridge format
    result = {
        "all_valid": True,
        "expression": " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "",
        "compositions": [
            {
                "valid": True,
                "errors": [],
                "warnings": [],
                "scope_trace": []
            }
        ]
    }
    print(json.dumps(result))
    sys.exit(0)
