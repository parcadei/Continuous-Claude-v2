#!/usr/bin/env python3
"""
Validate documentation counts match reality.

This script compares documented claims against actual counts to detect
documentation drift before commit. It outputs JSON for pre-commit integration.

Usage:
    python opc/scripts/validate-doc-counts.py

Expected counts are embedded in the script. Update these when documentation changes.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional

# Project root (relative to this script)
REPO_ROOT = Path(__file__).parent.parent.parent


def get_actual_counts() -> Dict[str, int]:
    """Get actual counts from the filesystem."""
    # Import from auto-detect-counts if available
    try:
        import sys
        sys.path.insert(0, str(REPO_ROOT / "opc" / "scripts"))
        from auto_detect_counts import count_skills, count_hooks, count_agents
        return {
            "skills": count_skills(),
            "hooks": count_hooks(),
            "agents": count_agents(),
        }
    except ImportError:
        # Fallback: count directly
        return {
            "skills": len(list((REPO_ROOT / ".claude" / "skills").glob("*/SKILL.md"))),
            "hooks": len(list((REPO_ROOT / ".claude" / "hooks" / "dist").glob("*.mjs"))),
            "agents": len(list((REPO_ROOT / ".claude" / "agents").glob("*.md"))),
        }


def extract_documented_counts() -> Dict[str, int]:
    """Extract documented counts from README.md using regex patterns."""
    documented = {}

    readme_path = REPO_ROOT / "README.md"
    if not readme_path.exists():
        return documented

    content = readme_path.read_text()

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


def validate_counts() -> Dict:
    """Main validation function returning JSON-serializable result."""
    actual = get_actual_counts()
    documented = extract_documented_counts()

    # Expected counts (should match documented values after updates)
    # These are the ground truth after the audit was applied
    expected = {
        "skills": 105,   # After audit update
        "hooks": 65,     # After audit update
        "agents": 32,    # Verified correct
    }

    results = {
        "status": "pass",
        "drift_detected": False,
        "actual": actual,
        "documented": documented,
        "expected": expected,
        "checks": []
    }

    for key in ["skills", "hooks", "agents"]:
        actual_val = actual.get(key, 0)
        documented_val = documented.get(key, 0)
        expected_val = expected.get(key, 0)

        # Check if documented matches expected
        documented_match = documented_val == expected_val
        # Check if actual matches expected
        actual_match = actual_val == expected_val

        check = {
            "name": key,
            "actual": actual_val,
            "documented": documented_val,
            "expected": expected_val,
            "documented_matches_expected": documented_match,
            "actual_matches_expected": actual_match,
            "drift": abs(actual_val - expected_val),
        }

        if not actual_match:
            check["status"] = "fail"
            results["status"] = "fail"
            results["drift_detected"] = True
        elif not documented_match:
            check["status"] = "warning"
            if results["status"] != "fail":
                results["status"] = "warning"
        else:
            check["status"] = "pass"

        results["checks"].append(check)

    return results


def main():
    """Entry point."""
    results = validate_counts()

    # Print JSON for pre-commit parsing
    print(json.dumps(results, indent=2))

    # Also print human-readable summary
    print("\n" + "=" * 50)
    print("Documentation Count Validation")
    print("=" * 50)

    for check in results["checks"]:
        icon = "PASS" if check["status"] == "pass" else ("WARN" if check["status"] == "warning" else "FAIL")
        print(f"\n{check['name'].upper()}:")
        print(f"  Actual:     {check['actual']}")
        print(f"  Documented: {check['documented']}")
        print(f"  Expected:   {check['expected']}")
        print(f"  Status:     {icon}")

    print("\n" + "=" * 50)
    if results["status"] == "pass":
        print("RESULT: All counts match!")
    elif results["status"] == "warning":
        print("RESULT: Documentation update needed.")
    else:
        print("RESULT: Count mismatch detected!")
        print("Update documentation or fix the implementation.")
    print("=" * 50)

    return 0 if results["status"] != "fail" else 1


if __name__ == "__main__":
    exit(main())
