"""Tests for register_skill.py."""

import json
import os
import subprocess
import sys

import pytest

sys.path.insert(0, os.path.dirname(__file__))
from register_skill import parse_entry, read_rules, write_rules_atomic

SCRIPT_PATH = os.path.join(os.path.dirname(__file__), "register_skill.py")

SAMPLE_ENTRY = {"type": "domain", "description": "test skill", "source": {"trustTier": "trusted"}}


# ---------------------------------------------------------------------------
# Direct function tests
# ---------------------------------------------------------------------------


def test_atomic_write(tmp_path):
    """write_rules_atomic creates valid JSON and the original data survives round-trip."""
    rules_file = tmp_path / "skill-rules.json"
    data = {"version": "1.0", "skills": {"my-skill": {"type": "domain"}}}

    write_rules_atomic(str(rules_file), data)

    assert rules_file.exists()
    with open(rules_file, encoding="utf-8") as f:
        loaded = json.load(f)

    assert loaded == data
    assert loaded["skills"]["my-skill"]["type"] == "domain"


def test_create_if_missing(tmp_path):
    """read_rules returns a skeleton dict when the file does not exist."""
    missing = tmp_path / "nonexistent.json"

    result = read_rules(str(missing))

    assert isinstance(result, dict)
    assert result.get("version") == "1.0"
    assert "skills" in result
    assert isinstance(result["skills"], dict)


# ---------------------------------------------------------------------------
# CLI tests via subprocess
# ---------------------------------------------------------------------------


def _run(args, stdin_data=None, **kwargs):
    """Run the script and return CompletedProcess."""
    cmd = [sys.executable, SCRIPT_PATH] + args
    return subprocess.run(
        cmd,
        input=stdin_data,
        capture_output=True,
        text=True,
        **kwargs,
    )


def test_name_validation_valid(tmp_path):
    """CLI succeeds for names that match the allowed pattern."""
    rules_file = tmp_path / "skill-rules.json"
    valid_names = ["my-skill", "tool1", "a", "abc-def_123"]

    for name in valid_names:
        result = _run(
            [
                "--rules-path", str(rules_file),
                "--skill-name", name,
                "--entry", json.dumps(SAMPLE_ENTRY),
            ]
        )
        assert result.returncode == 0, (
            f"Expected exit 0 for name '{name}', got {result.returncode}. "
            f"stderr: {result.stderr}"
        )
        output = json.loads(result.stdout)
        assert output["status"] == "registered"
        assert output["skill"] == name


def test_name_validation_invalid(tmp_path):
    """CLI exits non-zero for names that violate the naming pattern."""
    rules_file = tmp_path / "skill-rules.json"
    invalid_names = [
        "Bad_Name!",   # uppercase + special char
        "A",           # uppercase single char
        "UPPER",       # all uppercase
        "-starts-dash",  # must start with [a-z0-9]
        "_starts-under", # must start with [a-z0-9]
        "",            # empty
    ]

    for name in invalid_names:
        result = _run(
            [
                "--rules-path", str(rules_file),
                "--skill-name", name,
                "--entry", json.dumps(SAMPLE_ENTRY),
            ]
        )
        assert result.returncode != 0, (
            f"Expected non-zero exit for name '{name}', got 0. "
            f"stdout: {result.stdout}"
        )


def test_overwrite_warning(tmp_path):
    """Registering the same skill name twice prints a Warning to stderr."""
    rules_file = tmp_path / "skill-rules.json"
    base_args = [
        "--rules-path", str(rules_file),
        "--skill-name", "my-skill",
        "--entry", json.dumps(SAMPLE_ENTRY),
    ]

    first = _run(base_args)
    assert first.returncode == 0

    second = _run(base_args)
    assert second.returncode == 0
    assert "Warning" in second.stderr, (
        f"Expected 'Warning' in stderr on overwrite, got: {second.stderr!r}"
    )


def test_stdin_input(tmp_path):
    """Entry JSON piped via stdin is accepted and registered correctly."""
    rules_file = tmp_path / "skill-rules.json"
    result = _run(
        [
            "--rules-path", str(rules_file),
            "--skill-name", "stdin-skill",
        ],
        stdin_data=json.dumps(SAMPLE_ENTRY),
    )

    assert result.returncode == 0, f"stderr: {result.stderr}"
    output = json.loads(result.stdout)
    assert output["status"] == "registered"
    assert output["skill"] == "stdin-skill"

    data = json.loads(rules_file.read_text(encoding="utf-8"))
    assert "stdin-skill" in data["skills"]


def test_entry_file_input(tmp_path):
    """Entry JSON provided via --entry-file is accepted and registered correctly."""
    rules_file = tmp_path / "skill-rules.json"
    entry_file = tmp_path / "entry.json"
    entry_file.write_text(json.dumps(SAMPLE_ENTRY), encoding="utf-8")

    result = _run(
        [
            "--rules-path", str(rules_file),
            "--skill-name", "file-skill",
            "--entry-file", str(entry_file),
        ]
    )

    assert result.returncode == 0, f"stderr: {result.stderr}"
    output = json.loads(result.stdout)
    assert output["status"] == "registered"
    assert output["skill"] == "file-skill"

    data = json.loads(rules_file.read_text(encoding="utf-8"))
    assert "file-skill" in data["skills"]


def test_entry_arg_input(tmp_path):
    """Entry JSON provided via --entry is registered and reflected in output."""
    rules_file = tmp_path / "skill-rules.json"
    entry = {"type": "domain", "description": "arg entry", "source": {"trustTier": "verified"}}

    result = _run(
        [
            "--rules-path", str(rules_file),
            "--skill-name", "arg-skill",
            "--entry", json.dumps(entry),
        ]
    )

    assert result.returncode == 0, f"stderr: {result.stderr}"
    output = json.loads(result.stdout)
    assert output["status"] == "registered"
    assert output["skill"] == "arg-skill"
    assert output["tier"] == "verified"

    data = json.loads(rules_file.read_text(encoding="utf-8"))
    assert data["skills"]["arg-skill"] == entry
