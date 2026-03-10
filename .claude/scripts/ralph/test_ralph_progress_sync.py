#!/usr/bin/env python3
"""Tests for ralph-progress-sync.py -- bidirectional state/markdown sync."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from importlib import import_module

mod = import_module("ralph-progress-sync")

generate_markdown = mod.generate_markdown
parse_markdown = mod.parse_markdown
STATUS_TO_MARKER = mod.STATUS_TO_MARKER
MARKER_TO_STATUS = mod.MARKER_TO_STATUS
_sort_key = mod._sort_key


# ------------------------------------------------------------------ #
#  Fixtures                                                           #
# ------------------------------------------------------------------ #

@pytest.fixture
def sample_state():
    """A minimal state dict with mixed task statuses."""
    return {
        "version": "2.0",
        "story_id": "STORY-042",
        "tasks": [
            {"id": "1", "name": "Setup project", "status": "complete", "agent": "kraken"},
            {"id": "1.1", "name": "Init database", "status": "complete", "agent": "kraken", "depends_on": []},
            {"id": "1.2", "name": "Create schema", "status": "in_progress", "agent": "spark", "depends_on": ["1.1"]},
            {"id": "2", "name": "Implement API", "status": "pending", "agent": "kraken"},
            {"id": "2.1", "name": "Auth endpoint", "status": "pending", "agent": "kraken", "depends_on": ["1"]},
            {"id": "2.2", "name": "User endpoint", "status": "failed", "agent": "spark", "depends_on": ["2.1"]},
            {"id": "3", "name": "Testing", "status": "blocked", "agent": "arbiter"},
        ],
    }


@pytest.fixture
def tmp_project(tmp_path):
    """Create a temp project with .ralph/ dir."""
    ralph_dir = tmp_path / ".ralph"
    ralph_dir.mkdir()
    return tmp_path


def write_state(project: Path, state: dict):
    """Write state.json to project."""
    state_path = project / ".ralph" / "state.json"
    state_path.parent.mkdir(parents=True, exist_ok=True)
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def write_plan(project: Path, content: str):
    """Write IMPLEMENTATION_PLAN.md to project."""
    plan_path = project / ".ralph" / "IMPLEMENTATION_PLAN.md"
    plan_path.parent.mkdir(parents=True, exist_ok=True)
    with open(plan_path, "w", encoding="utf-8") as f:
        f.write(content)


# ------------------------------------------------------------------ #
#  Status mapping                                                     #
# ------------------------------------------------------------------ #

class TestStatusMapping:
    """Verify marker <-> status mappings are consistent."""

    def test_all_statuses_have_markers(self):
        for status in ["complete", "in_progress", "failed", "blocked", "pending", "skipped"]:
            assert status in STATUS_TO_MARKER, f"Missing marker for {status}"

    def test_all_markers_have_statuses(self):
        for marker in ["[x]", "[>]", "[!]", "[#]", "[ ]", "[-]"]:
            assert marker in MARKER_TO_STATUS, f"Missing status for {marker}"

    def test_roundtrip(self):
        """status -> marker -> status preserves the original."""
        for status, marker in STATUS_TO_MARKER.items():
            if status == "completed":
                continue  # alias
            recovered = MARKER_TO_STATUS[marker]
            assert recovered == status


# ------------------------------------------------------------------ #
#  Markdown generation                                                #
# ------------------------------------------------------------------ #

class TestGenerateMarkdown:
    """Tests for generate_markdown()."""

    def test_header_contains_story_id(self, sample_state):
        md = generate_markdown(sample_state)
        assert "STORY-042" in md

    def test_contains_progress_summary(self, sample_state):
        md = generate_markdown(sample_state)
        # 2 complete out of 7
        assert "2/7" in md

    def test_parent_tasks_rendered(self, sample_state):
        md = generate_markdown(sample_state)
        assert "[x] **1**" in md
        assert "[ ] **2**" in md
        assert "[#] **3**" in md

    def test_child_tasks_indented(self, sample_state):
        md = generate_markdown(sample_state)
        lines = md.splitlines()
        child_lines = [l for l in lines if "**1.1**" in l or "**1.2**" in l]
        for line in child_lines:
            assert line.startswith("  -"), f"Child not indented: {line}"

    def test_in_progress_marker(self, sample_state):
        md = generate_markdown(sample_state)
        assert "[>] **1.2**" in md

    def test_failed_marker(self, sample_state):
        md = generate_markdown(sample_state)
        assert "[!] **2.2**" in md

    def test_blocked_marker(self, sample_state):
        md = generate_markdown(sample_state)
        assert "[#] **3**" in md

    def test_agent_shown(self, sample_state):
        md = generate_markdown(sample_state)
        assert "(kraken)" in md
        assert "(spark)" in md

    def test_dependencies_shown(self, sample_state):
        md = generate_markdown(sample_state)
        assert "[deps: 1.1]" in md

    def test_empty_state(self):
        md = generate_markdown({"story_id": "EMPTY", "tasks": []})
        assert "EMPTY" in md
        assert "0/0" in md

    def test_sort_order(self):
        state = {
            "story_id": "SORT",
            "tasks": [
                {"id": "2.1", "name": "B", "status": "pending"},
                {"id": "1.1", "name": "A", "status": "pending"},
                {"id": "1.2", "name": "C", "status": "pending"},
            ],
        }
        md = generate_markdown(state)
        lines = md.splitlines()
        task_lines = [l for l in lines if "**" in l and "[ ]" in l]
        ids = []
        for l in task_lines:
            import re
            m = re.search(r"\*\*(\d+\.\d+)\*\*", l)
            if m:
                ids.append(m.group(1))
        assert ids == ["1.1", "1.2", "2.1"]


# ------------------------------------------------------------------ #
#  Markdown parsing                                                   #
# ------------------------------------------------------------------ #

class TestParseMarkdown:
    """Tests for parse_markdown()."""

    def test_parse_standard_format(self):
        content = """# Plan
- [x] **1.1** Setup
- [ ] **1.2** Build
- [>] **2.1** In progress
"""
        result = parse_markdown(content)
        assert result == {"1.1": "complete", "1.2": "pending", "2.1": "in_progress"}

    def test_parse_without_bold(self):
        content = "- [x] 1.1 Setup\n- [ ] 1.2 Build\n"
        result = parse_markdown(content)
        assert result == {"1.1": "complete", "1.2": "pending"}

    def test_parse_indented_children(self):
        content = """- [x] **1** Parent
  - [x] **1.1** Child A
  - [ ] **1.2** Child B
"""
        result = parse_markdown(content)
        assert "1" in result
        assert "1.1" in result
        assert "1.2" in result

    def test_parse_failed_and_blocked(self):
        content = "- [!] **3.1** Failed task\n- [#] **3.2** Blocked task\n"
        result = parse_markdown(content)
        assert result["3.1"] == "failed"
        assert result["3.2"] == "blocked"

    def test_parse_skipped(self):
        content = "- [-] **4.1** Skipped task\n"
        result = parse_markdown(content)
        assert result["4.1"] == "skipped"

    def test_ignores_non_task_lines(self):
        content = """# Header
Some description text
**Progress:** 3/10 (30%)

- [x] **1.1** Real task
Not a task line
"""
        result = parse_markdown(content)
        assert len(result) == 1
        assert "1.1" in result


# ------------------------------------------------------------------ #
#  Roundtrip: generate -> parse                                       #
# ------------------------------------------------------------------ #

class TestRoundtrip:
    """Generate markdown from state, parse it back, verify consistency."""

    def test_roundtrip_preserves_statuses(self, sample_state):
        md = generate_markdown(sample_state)
        parsed = parse_markdown(md)

        for task in sample_state["tasks"]:
            tid = task["id"]
            expected = task["status"]
            if expected == "completed":
                expected = "complete"
            assert parsed.get(tid) == expected, f"Task {tid}: expected {expected}, got {parsed.get(tid)}"


# ------------------------------------------------------------------ #
#  Sync command (file I/O)                                            #
# ------------------------------------------------------------------ #

class TestSyncCommand:
    """Tests for cmd_sync via load_state_direct."""

    def test_sync_creates_plan(self, tmp_project, sample_state):
        write_state(tmp_project, sample_state)
        state = mod.load_state_direct(str(tmp_project))
        assert state is not None

        content = generate_markdown(state)
        plan_path = tmp_project / ".ralph" / "IMPLEMENTATION_PLAN.md"
        with open(plan_path, "w", encoding="utf-8") as f:
            f.write(content)

        assert plan_path.exists()
        text = plan_path.read_text(encoding="utf-8")
        assert "STORY-042" in text

    def test_load_state_returns_none_for_missing(self, tmp_project):
        # Remove state.json
        state_path = tmp_project / ".ralph" / "state.json"
        if state_path.exists():
            state_path.unlink()
        result = mod.load_state_direct(str(tmp_project))
        assert result is None


# ------------------------------------------------------------------ #
#  Diff command                                                       #
# ------------------------------------------------------------------ #

class TestDiffLogic:
    """Tests for discrepancy detection."""

    def test_in_sync(self, tmp_project, sample_state):
        write_state(tmp_project, sample_state)
        md = generate_markdown(sample_state)
        write_plan(tmp_project, md)

        md_statuses = parse_markdown(md)
        state_tasks = {t["id"]: t.get("status", "pending") for t in sample_state["tasks"]}

        # All should match
        for tid, s_status in state_tasks.items():
            m_status = md_statuses.get(tid)
            if s_status == "completed":
                s_status = "complete"
            assert m_status == s_status, f"Mismatch on {tid}: state={s_status}, md={m_status}"

    def test_detects_status_mismatch(self):
        state_tasks = {"1.1": "complete", "1.2": "pending"}
        md_statuses = {"1.1": "complete", "1.2": "complete"}  # drift

        mismatches = []
        for tid, s_status in state_tasks.items():
            m_status = md_statuses.get(tid)
            if m_status and m_status != s_status:
                mismatches.append(tid)

        assert "1.2" in mismatches

    def test_detects_missing_in_markdown(self):
        state_tasks = {"1.1": "pending", "1.2": "pending", "1.3": "pending"}
        md_statuses = {"1.1": "pending", "1.2": "pending"}

        missing = [tid for tid in state_tasks if tid not in md_statuses]
        assert "1.3" in missing


# ------------------------------------------------------------------ #
#  Sort key                                                           #
# ------------------------------------------------------------------ #

class TestSortKey:
    def test_single_digit(self):
        assert _sort_key("1") < _sort_key("2")

    def test_sub_tasks(self):
        assert _sort_key("1.1") < _sort_key("1.2")
        assert _sort_key("1.9") < _sort_key("2.1")

    def test_parent_before_child(self):
        assert _sort_key("1") < _sort_key("1.1")
