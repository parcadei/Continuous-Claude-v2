#!/usr/bin/env python3
"""Validate documented counts match actual filesystem counts."""

import json
import re
import subprocess
from pathlib import Path


def get_actual_counts():
    """Get actual counts from the filesystem via auto-detect script."""
    result = subprocess.run(
        ["python", "scripts/auto-detect-counts.py"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)


def extract_documented_counts(readme_path: str = "README.md"):
    """Extract documented counts from README.md using regex patterns."""
    documented = {}

    if not Path(readme_path).exists():
        return documented

    content = Path(readme_path).read_text()

    # Pattern to find counts like "109 skills", "65 hooks", etc.
    patterns = {
        "skills": r'(\d+)\s+skill',
        "hooks": r'(\d+)\s+hook',
        "agents": r'(\d+)\s+agent',
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            documented[key] = int(match.group(1))

    return documented


def validate_counts():
    """Main validation function."""
    actual = get_actual_counts()
    documented = extract_documented_counts()

    print("=" * 50)
    print("Documentation Count Validation")
    print("=" * 50)

    all_passed = True

    for key in ["skills", "hooks", "agents"]:
        actual_val = actual.get(key, 0)
        documented_val = documented.get(key, "NOT FOUND")

        match = actual_val == documented_val
        status = "PASS" if match else "MISMATCH"

        print(f"\n{key.upper()}:")
        print(f"  Documented: {documented_val}")
        print(f"  Actual:     {actual_val}")
        print(f"  Status:     {status}")

        if not match:
            all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print("RESULT: All counts match!")
    else:
        print("RESULT: Count mismatch detected!")
    print("=" * 50)

    return all_passed


def main():
    """Entry point."""
    success = validate_counts()
    exit(0 if success else 1)


if __name__ == "__main__":
    main()
