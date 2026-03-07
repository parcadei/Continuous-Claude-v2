#!/usr/bin/env python3
"""
Comprehensive skill validation - aligned with skill-creator v2.0

Validates skills against the quality checklist from Step 5 of the skill creation process.
"""

import sys
import os
import re
from pathlib import Path
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class ValidationResult:
    """Result of a validation check"""
    severity: str  # "error", "warning", "info"
    category: str  # "metadata", "content", "resources"
    message: str
    passed: bool


def validate_basic_structure(skill_path: Path) -> List[ValidationResult]:
    """Validate basic skill structure"""
    results = []

    # Check SKILL.md exists
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        results.append(ValidationResult(
            severity="error",
            category="structure",
            message="SKILL.md not found",
            passed=False
        ))
        return results  # Can't continue without SKILL.md

    results.append(ValidationResult(
        severity="info",
        category="structure",
        message="SKILL.md found",
        passed=True
    ))

    return results


def validate_frontmatter(content: str) -> List[ValidationResult]:
    """Validate YAML frontmatter"""
    results = []

    # Check frontmatter exists
    if not content.startswith('---'):
        results.append(ValidationResult(
            severity="error",
            category="metadata",
            message="No YAML frontmatter found (must start with ---)",
            passed=False
        ))
        return results

    # Extract frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        results.append(ValidationResult(
            severity="error",
            category="metadata",
            message="Invalid frontmatter format",
            passed=False
        ))
        return results

    frontmatter = match.group(1)

    # Check required fields
    if 'name:' not in frontmatter:
        results.append(ValidationResult(
            severity="error",
            category="metadata",
            message="Missing 'name' field in frontmatter",
            passed=False
        ))

    if 'description:' not in frontmatter:
        results.append(ValidationResult(
            severity="error",
            category="metadata",
            message="Missing 'description' field in frontmatter",
            passed=False
        ))

    # Extract and validate name
    name_match = re.search(r'name:\s*(.+)', frontmatter)
    if name_match:
        name = name_match.group(1).strip()

        # Check naming convention
        if not re.match(r'^[a-z0-9-]+$', name):
            results.append(ValidationResult(
                severity="error",
                category="metadata",
                message=f"Name '{name}' must be hyphen-case (lowercase, digits, hyphens only)",
                passed=False
            ))
        elif name.startswith('-') or name.endswith('-') or '--' in name:
            results.append(ValidationResult(
                severity="error",
                category="metadata",
                message=f"Name '{name}' cannot start/end with hyphen or have consecutive hyphens",
                passed=False
            ))
        else:
            results.append(ValidationResult(
                severity="info",
                category="metadata",
                message=f"Name '{name}' follows naming convention",
                passed=True
            ))

    # Extract description for further validation
    desc_match = re.search(r'description:\s*(.+?)(?=\n[a-z_-]+:|$)', frontmatter, re.DOTALL)
    if desc_match:
        description = desc_match.group(1).strip()

        # Check for angle brackets
        if '<' in description or '>' in description:
            results.append(ValidationResult(
                severity="error",
                category="metadata",
                message="Description cannot contain angle brackets (< or >)",
                passed=False
            ))

        # Validate description length (50-150 words)
        word_count = len(description.split())
        if word_count < 50:
            results.append(ValidationResult(
                severity="warning",
                category="metadata",
                message=f"Description too short ({word_count} words, recommend 50-150)",
                passed=False
            ))
        elif word_count > 150:
            results.append(ValidationResult(
                severity="warning",
                category="metadata",
                message=f"Description too long ({word_count} words, recommend 50-150)",
                passed=False
            ))
        else:
            results.append(ValidationResult(
                severity="info",
                category="metadata",
                message=f"Description length OK ({word_count} words)",
                passed=True
            ))

        # Check for trigger keywords
        trigger_patterns = [
            r'when\s+users?\s+(request|ask|need|want)',
            r'use\s+when',
            r'for\s+(creating|generating|building|working with)',
            r'this\s+skill\s+(should\s+be\s+)?used?\s+when',
        ]
        has_trigger = any(re.search(p, description.lower()) for p in trigger_patterns)
        if not has_trigger:
            results.append(ValidationResult(
                severity="warning",
                category="metadata",
                message="Description missing trigger keywords (e.g., 'when users request', 'use when', 'for creating')",
                passed=False
            ))
        else:
            results.append(ValidationResult(
                severity="info",
                category="metadata",
                message="Trigger keywords present in description",
                passed=True
            ))

        # Check for third-person perspective (not overusing "you")
        you_count = len(re.findall(r'\byou\b', description.lower()))
        if you_count > 3:  # Threshold for description
            results.append(ValidationResult(
                severity="warning",
                category="metadata",
                message=f"Description may use second-person (found {you_count} instances of 'you') - prefer third-person",
                passed=False
            ))

    return results


def check_todo_markers(content: str) -> List[ValidationResult]:
    """Check for remaining TODO markers"""
    results = []

    # Find TODO markers
    todos = re.findall(r'\[?TODO:?.*?\]?', content, re.IGNORECASE)
    if todos:
        results.append(ValidationResult(
            severity="error",
            category="content",
            message=f"Found {len(todos)} TODO markers - complete before packaging",
            passed=False
        ))
    else:
        results.append(ValidationResult(
            severity="info",
            category="content",
            message="No TODO markers found",
            passed=True
        ))

    return results


def check_word_count(content: str) -> List[ValidationResult]:
    """Check that SKILL.md is under 5k words"""
    results = []

    # Strip frontmatter and count words
    content_no_frontmatter = re.sub(r'^---.*?---', '', content, flags=re.DOTALL)
    word_count = len(content_no_frontmatter.split())

    if word_count > 5000:
        results.append(ValidationResult(
            severity="warning",
            category="content",
            message=f"SKILL.md long ({word_count} words, recommend <5000) - consider moving content to references/",
            passed=False
        ))
    else:
        results.append(ValidationResult(
            severity="info",
            category="content",
            message=f"Word count OK ({word_count} words)",
            passed=True
        ))

    return results


def validate_file_paths(skill_path: Path, content: str) -> List[ValidationResult]:
    """Validate that referenced file paths exist"""
    results = []

    # Match file reference patterns
    patterns = [
        r'`(scripts/[^`]+)`',
        r'`(references/[^`]+)`',
        r'`(assets/[^`]+)`',
    ]

    missing_files = []
    referenced_files = set()

    for pattern in patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            referenced_files.add(match)
            file_path = skill_path / match
            if not file_path.exists():
                missing_files.append(match)

    if missing_files:
        results.append(ValidationResult(
            severity="error",
            category="resources",
            message=f"Referenced files don't exist: {', '.join(missing_files)}",
            passed=False
        ))
    elif referenced_files:
        results.append(ValidationResult(
            severity="info",
            category="resources",
            message=f"All {len(referenced_files)} referenced files exist",
            passed=True
        ))

    return results


def validate_scripts(skill_path: Path) -> List[ValidationResult]:
    """Validate scripts have shebangs and are properly formatted"""
    results = []

    scripts_dir = skill_path / 'scripts'
    if not scripts_dir.exists():
        return results  # No scripts directory, skip validation

    scripts = list(scripts_dir.glob('*.py')) + list(scripts_dir.glob('*.sh'))
    if not scripts:
        return results  # No scripts found

    issues = []
    for script in scripts:
        content = script.read_text()

        # Check shebang
        if not content.startswith('#!'):
            issues.append(f"{script.name}: Missing shebang")

        # Check executable permission on Unix systems
        if os.name != 'nt' and not os.access(script, os.X_OK):
            issues.append(f"{script.name}: Not executable")

    if issues:
        results.append(ValidationResult(
            severity="warning",
            category="resources",
            message=f"Script issues: {'; '.join(issues)}",
            passed=False
        ))
    else:
        results.append(ValidationResult(
            severity="info",
            category="resources",
            message=f"All {len(scripts)} scripts validated",
            passed=True
        ))

    return results


def check_examples_present(content: str) -> List[ValidationResult]:
    """Check if skill includes examples"""
    results = []

    # Look for example sections
    has_examples = bool(re.search(r'##\s*Examples?', content, re.IGNORECASE))
    has_example_entries = bool(re.search(r'\*\*Example \d+:', content))

    if not has_examples and not has_example_entries:
        results.append(ValidationResult(
            severity="warning",
            category="content",
            message="No examples section found - examples improve skill usability",
            passed=False
        ))
    else:
        results.append(ValidationResult(
            severity="info",
            category="content",
            message="Examples section present",
            passed=True
        ))

    return results


def validate_skill(skill_path) -> Tuple[bool, str]:
    """
    Comprehensive validation of a skill

    Returns:
        (is_valid, message) tuple
    """
    skill_path = Path(skill_path)
    all_results = []

    # Run basic structure validation
    all_results.extend(validate_basic_structure(skill_path))

    # If SKILL.md doesn't exist, can't continue
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        return False, "SKILL.md not found"

    # Read content for further validation
    content = skill_md.read_text()

    # Run all validation checks
    all_results.extend(validate_frontmatter(content))
    all_results.extend(check_todo_markers(content))
    all_results.extend(check_word_count(content))
    all_results.extend(validate_file_paths(skill_path, content))
    all_results.extend(validate_scripts(skill_path))
    all_results.extend(check_examples_present(content))

    # Categorize results
    errors = [r for r in all_results if r.severity == "error" and not r.passed]
    warnings = [r for r in all_results if r.severity == "warning" and not r.passed]
    passed = [r for r in all_results if r.passed]

    # Build validation report
    report_lines = []
    report_lines.append("\n📋 Validation Report:")
    report_lines.append(f"  ✅ {len(passed)} checks passed")

    if warnings:
        report_lines.append(f"  ⚠️  {len(warnings)} warnings:")
        for w in warnings:
            report_lines.append(f"     - {w.message}")

    if errors:
        report_lines.append(f"  ❌ {len(errors)} errors:")
        for e in errors:
            report_lines.append(f"     - {e.message}")
        report_lines.append("\n  Fix errors before packaging")

    report = "\n".join(report_lines)

    # Return validation result
    is_valid = len(errors) == 0
    if is_valid:
        return True, "Skill validation passed!" + report
    else:
        return False, "Skill has validation errors" + report


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill_directory>")
        print("\nValidates skill against skill-creator v2.0 quality checklist:")
        print("  - Metadata (name, description length, trigger keywords)")
        print("  - Content (TODO markers, word count, examples)")
        print("  - Resources (file paths, script validation)")
        sys.exit(1)

    valid, message = validate_skill(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)