#!/usr/bin/env python
"""
Atomic skill registration into skill-rules.json.

Usage:
  python register_skill.py --rules-path PATH --skill-name NAME --entry JSON_STRING

  Or pipe entry via stdin:
  echo '{"type":"domain",...}' | python register_skill.py --rules-path PATH --skill-name NAME

  Or use a JSON file:
  python register_skill.py --rules-path PATH --skill-name NAME --entry-file entry.json
"""

import argparse
import json
import os
import re
import sys
import tempfile


def error_exit(message, code=1):
    """Print JSON error to stderr and exit."""
    print(json.dumps({"status": "error", "message": message}), file=sys.stderr)
    sys.exit(code)


def read_rules(rules_path):
    """Read and parse skill-rules.json. Returns dict."""
    if not os.path.exists(rules_path):
        return {"version": "1.0", "description": "Skill routing rules", "skills": {}}

    try:
        with open(rules_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except json.JSONDecodeError as e:
        error_exit(f"Invalid JSON in {rules_path}: {e}")
    except OSError as e:
        error_exit(f"Cannot read {rules_path}: {e}")


def write_rules_atomic(rules_path, data):
    """Write skill-rules.json atomically via temp file + os.replace."""
    rules_dir = os.path.dirname(os.path.abspath(rules_path))

    try:
        # Write to temp file in the same directory (required for os.replace on Windows)
        fd, tmp_path = tempfile.mkstemp(
            dir=rules_dir,
            prefix=".skill-rules-",
            suffix=".tmp",
        )
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
            f.write("\n")

        # Atomic swap
        os.replace(tmp_path, rules_path)
    except OSError as e:
        # Clean up temp file if replace failed
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        error_exit(f"Failed to write {rules_path}: {e}")


def parse_entry(entry_str):
    """Parse JSON entry string. Returns dict."""
    try:
        entry = json.loads(entry_str)
        if not isinstance(entry, dict):
            error_exit("Entry must be a JSON object")
        return entry
    except json.JSONDecodeError as e:
        error_exit(f"Invalid JSON in entry: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Register a skill into skill-rules.json atomically."
    )
    parser.add_argument(
        "--rules-path",
        required=True,
        help="Path to skill-rules.json",
    )
    parser.add_argument(
        "--skill-name",
        required=True,
        help="Name of the skill to register",
    )
    parser.add_argument(
        "--entry",
        default=None,
        help="JSON string for the skill entry. If omitted, reads from stdin.",
    )
    parser.add_argument(
        "--entry-file",
        default=None,
        help="Path to JSON file containing the skill entry.",
    )
    args = parser.parse_args()

    if not re.match(r'^[a-z0-9][a-z0-9_-]{0,63}$', args.skill_name):
        error_exit(f"Invalid skill name: '{args.skill_name}'. Must match [a-z0-9][a-z0-9_-]{{0,63}}")

    # Get entry from file, argument, or stdin
    if args.entry_file:
        with open(args.entry_file, "r", encoding="utf-8") as f:
            entry_str = f.read().strip()
        if not entry_str:
            error_exit("Empty entry file")
        entry = parse_entry(entry_str)
    elif args.entry:
        entry = parse_entry(args.entry)
    else:
        if sys.stdin.isatty():
            error_exit("No --entry or --entry-file provided and stdin is a terminal.")
        stdin_data = sys.stdin.read().strip()
        if not stdin_data:
            error_exit("No entry data received from stdin")
        entry = parse_entry(stdin_data)

    # Read existing rules
    data = read_rules(args.rules_path)

    # Ensure "skills" key exists
    if "skills" not in data:
        data["skills"] = {}

    # Check for name collision
    if args.skill_name in data["skills"]:
        print(
            f"Warning: Overwriting existing entry for '{args.skill_name}'",
            file=sys.stderr,
        )

    # Insert/update
    data["skills"][args.skill_name] = entry

    # Write atomically
    write_rules_atomic(args.rules_path, data)

    # Report success
    tier = entry.get("source", {}).get("trustTier", "unknown")
    result = {
        "status": "registered",
        "skill": args.skill_name,
        "tier": tier,
    }
    print(json.dumps(result))
    sys.exit(0)


if __name__ == "__main__":
    main()
