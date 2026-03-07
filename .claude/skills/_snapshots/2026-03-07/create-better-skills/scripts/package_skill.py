#!/usr/bin/env python3
"""
Skill Packager - Creates a distributable zip file of a skill folder

Usage:
    python utils/package_skill.py <path/to/skill-folder> [output-directory]

Example:
    python utils/package_skill.py skills/public/my-skill
    python utils/package_skill.py skills/public/my-skill ./dist
"""

import sys
import zipfile
from pathlib import Path
from quick_validate import validate_skill


# Files and directories to exclude from packaging
EXCLUDE_PATTERNS = [
    '.DS_Store',        # macOS metadata
    '__pycache__',      # Python cache
    '*.pyc',            # Compiled Python
    '*.pyo',            # Optimized Python
    '*.py[cod]',        # Python bytecode
    '.git',             # Git repository
    '.gitignore',       # Git ignore file
    '.gitattributes',   # Git attributes
    '.env',             # Environment variables (sensitive!)
    '.env.local',       # Local environment
    '.env.*',           # Any env files
    '*.swp',            # Vim swap files
    '*~',               # Backup files
    '.vscode',          # VS Code settings
    '.idea',            # IntelliJ/PyCharm settings
    'Thumbs.db',        # Windows thumbnail cache
    'desktop.ini',      # Windows folder settings
    '*.log',            # Log files
    '.pytest_cache',    # Pytest cache
    '.coverage',        # Coverage reports
    'htmlcov',          # Coverage HTML
    'dist',             # Distribution folder
    'build',            # Build folder
    '*.egg-info',       # Python egg metadata
]


def should_exclude(file_path):
    """
    Check if file should be excluded from packaging.

    Args:
        file_path: Path object to check

    Returns:
        Boolean indicating if file should be excluded
    """
    path_str = str(file_path)
    name = file_path.name

    for pattern in EXCLUDE_PATTERNS:
        # Check exact match
        if pattern == name:
            return True
        # Check if pattern is in path (for directories like __pycache__)
        if pattern in path_str:
            return True
        # Check wildcard patterns
        if pattern.startswith('*'):
            if name.endswith(pattern[1:]):
                return True
        elif pattern.endswith('*'):
            if name.startswith(pattern[:-1]):
                return True

    return False


def package_skill(skill_path, output_dir=None):
    """
    Package a skill folder into a zip file.

    Args:
        skill_path: Path to the skill folder
        output_dir: Optional output directory for the zip file (defaults to current directory)

    Returns:
        Path to the created zip file, or None if error
    """
    skill_path = Path(skill_path).resolve()

    # Validate skill folder exists
    if not skill_path.exists():
        print(f"❌ Error: Skill folder not found: {skill_path}")
        return None

    if not skill_path.is_dir():
        print(f"❌ Error: Path is not a directory: {skill_path}")
        return None

    # Validate SKILL.md exists
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        print(f"❌ Error: SKILL.md not found in {skill_path}")
        return None

    # Run validation before packaging
    print("🔍 Validating skill...")
    valid, message = validate_skill(skill_path)
    if not valid:
        print(f"❌ Validation failed: {message}")
        print("   Please fix the validation errors before packaging.")
        return None
    print(f"✅ {message}\n")

    # Determine output location
    skill_name = skill_path.name
    if output_dir:
        output_path = Path(output_dir).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = Path.cwd()

    zip_filename = output_path / f"{skill_name}.zip"

    # Create the zip file
    try:
        added_files = []
        excluded_files = []

        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Walk through the skill directory
            for file_path in skill_path.rglob('*'):
                if file_path.is_file():
                    # Check if file should be excluded
                    if should_exclude(file_path):
                        excluded_files.append(file_path.relative_to(skill_path))
                        continue

                    # Calculate the relative path within the zip
                    arcname = file_path.relative_to(skill_path.parent)
                    zipf.write(file_path, arcname)
                    added_files.append(arcname)
                    print(f"  ✅ Added: {arcname}")

        # Show excluded files if any
        if excluded_files:
            print(f"\n  ⏭️  Excluded {len(excluded_files)} system files:")
            for exc_file in excluded_files[:5]:  # Show first 5
                print(f"     - {exc_file}")
            if len(excluded_files) > 5:
                print(f"     ... and {len(excluded_files) - 5} more")

        # Package verification
        print(f"\n📋 Package Verification:")
        print(f"  Total files: {len(added_files)}")

        # Show first 10 files
        print(f"\n  First 10 files:")
        with zipfile.ZipFile(zip_filename, 'r') as zipf:
            names = zipf.namelist()
            for name in names[:10]:
                print(f"    - {name}")
            if len(names) > 10:
                print(f"    ... and {len(names) - 10} more files")

        # Size reporting
        size_bytes = zip_filename.stat().st_size
        size_mb = size_bytes / (1024 * 1024)
        size_kb = size_bytes / 1024

        if size_mb >= 1:
            print(f"\n  📦 Package size: {size_mb:.2f} MB")
        else:
            print(f"\n  📦 Package size: {size_kb:.2f} KB")

        # Warn on large packages
        if size_mb > 10:
            print(f"  ⚠️  Warning: Package is large (>{size_mb:.1f}MB)")
            print(f"     Consider:")
            print(f"     - Compressing images in assets/")
            print(f"     - Removing unnecessary files")
            print(f"     - Moving large references to external docs")

        print(f"\n✅ Successfully packaged skill to: {zip_filename}")
        return zip_filename

    except Exception as e:
        print(f"❌ Error creating zip file: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python utils/package_skill.py <path/to/skill-folder> [output-directory]")
        print("\nExample:")
        print("  python utils/package_skill.py skills/public/my-skill")
        print("  python utils/package_skill.py skills/public/my-skill ./dist")
        sys.exit(1)

    skill_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"📦 Packaging skill: {skill_path}")
    if output_dir:
        print(f"   Output directory: {output_dir}")
    print()

    result = package_skill(skill_path, output_dir)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
