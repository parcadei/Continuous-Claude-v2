#!/usr/bin/env python3
"""
Auto-update documentation counts in README.md and other markdown files.

This script counts skills, hooks, and agents in the codebase and updates
any documentation that references these counts.
"""

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent


def get_actual_counts() -> dict:
    """Get actual counts of skills, hooks, and agents in the codebase."""
    skills_dir = PROJECT_ROOT / ".claude" / "skills"
    hooks_dir = PROJECT_ROOT / ".claude" / "hooks" / "dist"
    agents_dir = PROJECT_ROOT / ".claude" / "agents"

    skills = len(list((skills_dir).glob("*/SKILL.md"))) if skills_dir.exists() else 0
    hooks = len(list(hooks_dir.glob("*.mjs"))) if hooks_dir.exists() else 0
    agents = len(list(agents_dir.glob("*.md"))) if agents_dir.exists() else 0

    return {
        "skills": skills,
        "hooks": hooks,
        "agents": agents,
    }


def update_readme_counts(readme_path: Path, counts: dict) -> bool:
    """Update skills/hooks/agents counts in README.md."""
    if not readme_path.exists():
        print(f"WARNING: README.md not found at {readme_path}")
        return False

    content = readme_path.read_text()
    original_content = content

    # Patterns to match various count formats in README
    patterns = [
        # Badge patterns: [Skills-105-green.svg]
        (r"Skills-(\d+)-", f"Skills-{counts['skills']}-"),
        # Table of Contents references
        (r"Skills \((\d+)\)", f"Skills ({counts['skills']})"),
        # Section headers
        (r"### Skills \((\d+)\)", f"### Skills ({counts['skills']})"),
        # Badge patterns for hooks
        (r"Hooks-(\d+)-", f"Hooks-{counts['hooks']}-"),
        (r"Hooks \((\d+)\)", f"Hooks ({counts['hooks']})"),
        (r"### Hooks \((\d+)\)", f"### Hooks ({counts['hooks']})"),
        # Badge patterns for agents
        (r"Agents-(\d+)-", f"Agents-{counts['agents']}-"),
        (r"Agents \((\d+)\)", f"Agents ({counts['agents']})"),
        (r"### Agents \((\d+)\)", f"### Agents ({counts['agents']})"),
        # Bullet point references
        (r"(\d+)\s+skills", f"{counts['skills']} skills"),
        (r"(\d+)\s+hooks", f"{counts['hooks']} hooks"),
        (r"(\d+)\s+agents", f"{counts['agents']} agents"),
        # Installation counts
        (r"Agents \((\d+)\)", f"Agents ({counts['agents']})"),
        (r"Skills \((\d+)\)", f"Skills ({counts['skills']})"),
        (r"Hooks \((\d+)\)", f"Hooks ({counts['hooks']})"),
    ]

    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)

    # Update if changed
    if content != original_content:
        readme_path.write_text(content)
        print(f"Updated README.md counts: skills={counts['skills']}, hooks={counts['hooks']}, agents={counts['agents']}")
        return True

    print(f"Counts unchanged: skills={counts['skills']}, hooks={counts['hooks']}, agents={counts['agents']}")
    return False


def update_contributing_md(contributing_path: Path, counts: dict) -> bool:
    """Update counts in CONTRIBUTING.md."""
    if not contributing_path.exists():
        return False

    content = contributing_path.read_text()
    original_content = content

    # Update specific count references in CONTRIBUTING
    patterns = [
        # Skill count references
        (r"(\d+)\s+skills", f"{counts['skills']} skills"),
        # Hook count references
        (r"(\d+)\s+hooks", f"{counts['hooks']} hooks"),
        # Agent count references
        (r"(\d+)\s+agents", f"{counts['agents']} agents"),
    ]

    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)

    if content != original_content:
        contributing_path.write_text(content)
        print(f"Updated CONTRIBUTING.md counts")
        return True

    return False


def main():
    """Main entry point."""
    print("Updating documentation counts...")

    counts = get_actual_counts()
    print(f"Actual counts: skills={counts['skills']}, hooks={counts['hooks']}, agents={counts['agents']}")

    # Update README.md
    readme_path = PROJECT_ROOT / "README.md"
    readme_changed = update_readme_counts(readme_path, counts)

    # Update CONTRIBUTING.md
    contributing_path = PROJECT_ROOT / "CONTRIBUTING.md"
    contributing_changed = update_contributing_md(contributing_path, counts)

    if readme_changed or contributing_changed:
        print("Documentation counts updated successfully.")
        return 0
    else:
        print("No documentation updates needed.")
        return 0


if __name__ == "__main__":
    exit(main())
