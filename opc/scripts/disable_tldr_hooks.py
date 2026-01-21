#!/usr/bin/env python3
"""Disable TLDR hooks from existing Claude Code installation.

This script removes TLDR hooks from your ~/.claude/settings.json file.
It imports the logic from claude_integration.py to avoid duplication.

USAGE:
    cd opc && python3 scripts/disable_tldr_hooks.py
"""

import sys
from pathlib import Path

# Ensure project root is in sys.path for imports
_this_file = Path(__file__).resolve()
_opc_root = _this_file.parent.parent  # scripts/disable_tldr_hooks.py -> opc/
if str(_opc_root) not in sys.path:
    sys.path.insert(0, str(_opc_root))

try:
    from scripts.setup.claude_integration import strip_tldr_hooks_from_settings, get_global_claude_dir
except ImportError:
    print("❌ Could not import strip_tldr_hooks_from_settings from scripts.setup.claude_integration")
    sys.exit(1)


def main():
    """Main entry point."""
    print("=" * 60)
    print("Disable TLDR Hooks Script")
    print("=" * 60)
    print()

    settings_path = get_global_claude_dir() / "settings.json"
    print(f"Settings file: {settings_path}")
    print()

    if not settings_path.exists():
        print("❌ Settings file not found!")
        print("   Have you run the setup wizard?")
        sys.exit(1)

    print("Removing TLDR hooks...")
    print()

    success = strip_tldr_hooks_from_settings(settings_path)

    if success:
        print()
        print("=" * 60)
        print("✓ Done! Restart your Claude Code session to apply changes.")
        print("=" * 60)
        sys.exit(0)
    else:
        print()
        print("=" * 60)
        print("❌ Failed to disable TLDR hooks")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()
