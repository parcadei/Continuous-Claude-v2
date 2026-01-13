#!/usr/bin/env python3
"""Auto-detect and report documentation counts."""

import json
from pathlib import Path

def count_skills() -> int:
    """Count the number of skills by finding SKILL.md files."""
    return len(list(Path(".claude/skills").glob("*/SKILL.md")))

def count_hooks() -> int:
    """Count the number of hooks by finding compiled JS files."""
    return len(list(Path(".claude/hooks/dist").glob("*.mjs")))

def count_agents() -> int:
    """Count the number of agent documentation files."""
    return len(list(Path(".claude/agents").glob("*.md")))

def main():
    """Output counts as JSON for easy parsing."""
    counts = {
        "skills": count_skills(),
        "hooks": count_hooks(),
        "agents": count_agents(),
    }
    print(json.dumps(counts))

if __name__ == "__main__":
    main()
