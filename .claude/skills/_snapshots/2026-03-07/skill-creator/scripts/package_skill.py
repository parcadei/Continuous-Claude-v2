#!/usr/bin/env python3
"""
Skill Packager - Creates a distributable .skill file of a skill folder.

Merged from Anthropic's skill-creator (.skill format, fnmatch exclusion,
ROOT_EXCLUDE_DIRS) and create-better-skills (size reporting, file listing,
>10MB warning).

Usage:
    python -m scripts.package_skill <path/to/skill-folder> [output-directory]
"""

import fnmatch
import sys
import zipfile
from pathlib import Path

from scripts.quick_validate import validate_skill


# Patterns to exclude when packaging skills
EXCLUDE_DIRS = {"__pycache__", "node_modules", ".git", ".vscode", ".idea",
                ".pytest_cache", "htmlcov", "dist", "build"}
EXCLUDE_GLOBS = {"*.pyc", "*.pyo", "*.py[cod]", "*.swp", "*~", "*.log",
                 "*.egg-info"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", "desktop.ini", ".gitignore",
                 ".gitattributes", ".coverage", ".env", ".env.local"}
# Directories excluded only at the skill root (not when nested deeper)
ROOT_EXCLUDE_DIRS = {"evals"}


def should_exclude(rel_path: Path) -> bool:
    """Check if a path should be excluded from packaging."""
    parts = rel_path.parts
    # Check directory exclusions anywhere in path
    if any(part in EXCLUDE_DIRS for part in parts):
        return True
    # Root-only directory exclusions (parts[0] is skill folder name, parts[1] is first subdir)
    if len(parts) > 1 and parts[1] in ROOT_EXCLUDE_DIRS:
        return True
    name = rel_path.name
    # Exact file matches
    if name in EXCLUDE_FILES:
        return True
    # Glob pattern matches
    return any(fnmatch.fnmatch(name, pat) for pat in EXCLUDE_GLOBS)


def package_skill(skill_path, output_dir=None):
    """
    Package a skill folder into a .skill file.

    Returns:
        Path to the created .skill file, or None if error
    """
    skill_path = Path(skill_path).resolve()

    if not skill_path.exists():
        print(f"Error: Skill folder not found: {skill_path}")
        return None

    if not skill_path.is_dir():
        print(f"Error: Path is not a directory: {skill_path}")
        return None

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        print(f"Error: SKILL.md not found in {skill_path}")
        return None

    # Run validation before packaging
    print("Validating skill...")
    valid, message = validate_skill(skill_path)
    if not valid:
        print(f"Validation failed: {message}")
        print("   Please fix the validation errors before packaging.")
        return None
    print(f"{message}\n")

    # Determine output location
    skill_name = skill_path.name
    if output_dir:
        output_path = Path(output_dir).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = Path.cwd()

    skill_filename = output_path / f"{skill_name}.skill"

    # Create the .skill file (zip format)
    try:
        added_files = []
        excluded_files = []

        with zipfile.ZipFile(skill_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in skill_path.rglob('*'):
                if not file_path.is_file():
                    continue
                arcname = file_path.relative_to(skill_path.parent)
                if should_exclude(arcname):
                    excluded_files.append(arcname)
                    continue
                zipf.write(file_path, arcname)
                added_files.append(arcname)
                print(f"  Added: {arcname}")

        # Show excluded files summary
        if excluded_files:
            print(f"\n  Excluded {len(excluded_files)} system files:")
            for exc_file in excluded_files[:5]:
                print(f"     - {exc_file}")
            if len(excluded_files) > 5:
                print(f"     ... and {len(excluded_files) - 5} more")

        # Package verification with file listing
        print(f"\nPackage Verification:")
        print(f"  Total files: {len(added_files)}")

        print(f"\n  First 10 files:")
        with zipfile.ZipFile(skill_filename, 'r') as zipf:
            names = zipf.namelist()
            for name in names[:10]:
                print(f"    - {name}")
            if len(names) > 10:
                print(f"    ... and {len(names) - 10} more files")

        # Size reporting
        size_bytes = skill_filename.stat().st_size
        size_mb = size_bytes / (1024 * 1024)
        size_kb = size_bytes / 1024

        if size_mb >= 1:
            print(f"\n  Package size: {size_mb:.2f} MB")
        else:
            print(f"\n  Package size: {size_kb:.2f} KB")

        if size_mb > 10:
            print(f"  Warning: Package is large (>{size_mb:.1f}MB)")
            print(f"     Consider:")
            print(f"     - Compressing images in assets/")
            print(f"     - Removing unnecessary files")
            print(f"     - Moving large references to external docs")

        print(f"\nSuccessfully packaged skill to: {skill_filename}")
        return skill_filename

    except Exception as e:
        print(f"Error creating .skill file: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.package_skill <path/to/skill-folder> [output-directory]")
        print("\nExample:")
        print("  python -m scripts.package_skill skills/public/my-skill")
        print("  python -m scripts.package_skill skills/public/my-skill ./dist")
        sys.exit(1)

    skill_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"Packaging skill: {skill_path}")
    if output_dir:
        print(f"   Output directory: {output_dir}")
    print()

    result = package_skill(skill_path, output_dir)
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
