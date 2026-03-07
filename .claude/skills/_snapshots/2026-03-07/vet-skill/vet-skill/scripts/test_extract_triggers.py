"""Tests for extract_triggers.py."""

import sys
import os
import json
import subprocess
import pytest

sys.path.insert(0, os.path.dirname(__file__))
from extract_triggers import (
    parse_frontmatter,
    extract_body,
    extract_headings,
    extract_keywords,
    extract_verb_noun_pairs,
    generate_intent_patterns,
    tokenize,
)

SCRIPT_PATH = os.path.join(os.path.dirname(__file__), "extract_triggers.py")


def test_frontmatter_parsing():
    content = "---\nname: test-skill\ndescription: A test skill\n---\n"
    result = parse_frontmatter(content)
    assert result["name"] == "test-skill"
    assert result["description"] == "A test skill"
    assert len(result) == 2


def test_keyword_extraction():
    keywords = extract_keywords(
        name="web-scraper",
        description="Scrape websites for data",
        headings=[],
        section_text="",
    )
    # Name parts come first
    assert keywords[0] == "web"
    assert keywords[1] == "scraper"
    # Full hyphenated name follows the parts
    assert "web-scraper" in keywords
    # Description tokens appear after name parts
    desc_index = keywords.index("websites") if "websites" in keywords else None
    name_scraper_index = keywords.index("scraper")
    assert desc_index is not None
    assert desc_index > name_scraper_index
    assert len(keywords) <= 15


def test_intent_pattern_generation():
    patterns = generate_intent_patterns(
        name="web-scraper",
        description="Scrape websites for data extraction",
        when_to_use="Use when you need to fetch and parse HTML pages",
        trigger_text="",
    )
    assert len(patterns) > 0
    assert len(patterns) <= 5
    for pattern in patterns:
        assert isinstance(pattern, str)
        assert len(pattern) > 0


def test_empty_file():
    content = ""
    fm = parse_frontmatter(content)
    assert fm == {}
    body = extract_body(content)
    assert body == ""


def test_no_frontmatter():
    content = "## Overview\nThis skill does things.\n\n### When to Use\nUse it often."
    fm = parse_frontmatter(content)
    assert fm == {}
    body = extract_body(content)
    headings = extract_headings(body)
    assert "Overview" in headings
    assert "When to Use" in headings
    keywords = extract_keywords(
        name="my-skill",
        description="",
        headings=headings,
        section_text="",
    )
    assert len(keywords) > 0


def test_description_in_output(tmp_path):
    skill_md = tmp_path / "SKILL.md"
    skill_md.write_text(
        "---\nname: cli-test-skill\ndescription: CLI test description\n---\n\n"
        "## Overview\nDoes something useful.\n",
        encoding="utf-8",
    )
    result = subprocess.run(
        [sys.executable, SCRIPT_PATH, "--skill-path", str(skill_md)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"stderr: {result.stderr}"
    output = json.loads(result.stdout)
    assert "description" in output
    assert output["description"] == "CLI test description"
    assert "keywords" in output
    assert "intentPatterns" in output


def test_bounded_regex():
    pairs = extract_verb_noun_pairs(
        "Create a deployment pipeline to build and test the application"
    )
    assert len(pairs) > 0
    combined = " ".join(pairs)
    assert "[^.]{0,80}" in combined
    assert ".*?" not in combined
