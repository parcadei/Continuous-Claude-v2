#!/usr/bin/env python
"""
Extract trigger keywords and intent patterns from a SKILL.md file.

Usage:
  python extract_triggers.py --skill-path PATH_TO_SKILL_MD

Output: JSON with keywords and intentPatterns arrays.
"""

import argparse
import json
import re
import sys
from pathlib import Path


STOP_WORDS = frozenset({
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "this", "that", "these", "those", "it", "its",
    "when", "how", "what", "where", "which", "who", "whom", "why",
    "you", "your", "yours", "we", "our", "ours", "they", "their",
    "he", "she", "him", "her", "his", "hers", "me", "my", "mine",
    "i", "do", "does", "did", "done", "doing",
    "use", "used", "using", "uses",
    "can", "could", "will", "would", "shall", "should", "may", "might", "must",
    "have", "has", "had", "having",
    "with", "for", "from", "into", "onto", "upon",
    "and", "but", "or", "nor", "not", "no", "yes",
    "in", "on", "at", "to", "of", "by", "up", "out", "off", "over",
    "about", "after", "before", "between", "through", "during", "above", "below",
    "all", "each", "every", "both", "few", "more", "most", "other", "some", "any",
    "such", "than", "too", "very", "just", "also", "only", "then", "so",
    "if", "else", "as", "while", "until", "because", "since", "unless",
    "new", "get", "set", "make", "take", "let", "put",
})


def error_exit(message):
    """Print JSON error to stderr and exit."""
    print(json.dumps({"status": "error", "message": message}), file=sys.stderr)
    sys.exit(1)


def parse_frontmatter(content):
    """Extract YAML frontmatter between --- markers. Returns dict."""
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not match:
        return {}

    frontmatter = {}
    raw = match.group(1)

    # Simple YAML key: value parsing (avoids requiring pyyaml dependency)
    for line in raw.split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        colon_idx = line.find(":")
        if colon_idx > 0:
            key = line[:colon_idx].strip()
            value = line[colon_idx + 1:].strip()
            frontmatter[key] = value

    return frontmatter


def extract_body(content):
    """Extract the markdown body after frontmatter."""
    match = re.match(r"^---\s*\n.*?\n---\s*\n", content, re.DOTALL)
    if match:
        return content[match.end():]
    return content


def extract_headings(body):
    """Extract all ## and ### headings from markdown body."""
    return re.findall(r"^#{2,3}\s+(.+)$", body, re.MULTILINE)


def extract_section(body, heading_pattern):
    """Extract content of a section matching heading_pattern (case-insensitive).

    Returns the text between the matched heading and the next heading of same or higher level.
    """
    pattern = rf"^(#{2,3})\s+{heading_pattern}.*$"
    match = re.search(pattern, body, re.MULTILINE | re.IGNORECASE)
    if not match:
        return ""

    level = len(match.group(1))
    start = match.end()
    # Find next heading of same or higher level
    next_heading = re.search(
        rf"^#{{{1},{level}}}\s+",
        body[start:],
        re.MULTILINE,
    )
    if next_heading:
        return body[start:start + next_heading.start()].strip()
    return body[start:].strip()


def tokenize(text):
    """Split text into lowercase word tokens."""
    return re.findall(r"[a-z][a-z0-9]+", text.lower())


def extract_keywords(name, description, headings, section_text):
    """Extract up to 15 deduplicated keywords, ordered by relevance."""
    keywords = []
    seen = set()

    def add_keyword(word):
        if word not in seen:
            seen.add(word)
            keywords.append(word)

    # From name: split on hyphens (highest priority)
    name_parts = name.lower().replace("_", "-").split("-")
    for part in name_parts:
        if len(part) >= 3 and part not in STOP_WORDS:
            add_keyword(part)
    if len(name_parts) > 1:
        add_keyword(name.lower())

    # From description (second priority)
    if description:
        for word in tokenize(description):
            if len(word) >= 3 and word not in STOP_WORDS:
                add_keyword(word)

    # From headings (third priority)
    for heading in headings:
        for word in tokenize(heading):
            if len(word) >= 3 and word not in STOP_WORDS:
                add_keyword(word)

    # From section text (lowest priority)
    if section_text:
        for word in tokenize(section_text):
            if len(word) >= 4 and word not in STOP_WORDS:
                add_keyword(word)

    return keywords[:15]


def extract_verb_noun_pairs(text):
    """Extract verb-noun pairs from text for intent patterns."""
    pairs = []
    # Pattern: verb followed by optional words then noun-like word
    # Look for common verb forms followed by objects
    verbs = re.findall(
        r"\b(create|generate|build|make|write|design|deploy|test|run|analyze|check|"
        r"validate|review|debug|fix|search|find|install|configure|setup|set up|"
        r"optimize|improve|update|delete|remove|add|implement|develop|"
        r"monitor|track|manage|convert|transform|format|parse|extract|"
        r"scrape|crawl|fetch|render|compile|lint|refactor|migrate)\b",
        text.lower(),
    )

    # Get meaningful words from text (reuse tokenize + stop word filter)
    nouns = [w for w in tokenize(text) if w not in STOP_WORDS and len(w) >= 4]

    if verbs and nouns:
        # Create pattern from unique verbs and nouns
        unique_verbs = list(dict.fromkeys(verbs))[:4]
        unique_nouns = list(dict.fromkeys(nouns))[:4]
        pattern = f"({'|'.join(unique_verbs)})[^.]{{0,80}}({'|'.join(unique_nouns)})"
        pairs.append(pattern)

    return pairs


def generate_intent_patterns(name, description, when_to_use, trigger_text):
    """Generate up to 5 regex intent patterns."""
    patterns = []

    # From description: extract verb-noun pairs
    if description:
        patterns.extend(extract_verb_noun_pairs(description))

    # From "When to Use" section
    if when_to_use:
        patterns.extend(extract_verb_noun_pairs(when_to_use))

    # From trigger/activation section
    if trigger_text:
        patterns.extend(extract_verb_noun_pairs(trigger_text))

    # From name: create a basic pattern
    name_parts = name.lower().replace("_", "-").split("-")
    if len(name_parts) >= 2:
        name_pattern = ".*?".join(re.escape(p) for p in name_parts if len(p) >= 3)
        if name_pattern:
            patterns.append(name_pattern)

    # Deduplicate and limit
    seen = set()
    unique_patterns = []
    for p in patterns:
        if p not in seen:
            seen.add(p)
            unique_patterns.append(p)

    return unique_patterns[:5]


def main():
    parser = argparse.ArgumentParser(
        description="Extract trigger keywords and intent patterns from a SKILL.md file."
    )
    parser.add_argument(
        "--skill-path",
        required=True,
        help="Path to the SKILL.md file",
    )
    args = parser.parse_args()

    skill_path = Path(args.skill_path)
    if not skill_path.exists():
        error_exit(f"File not found: {skill_path}")

    try:
        content = skill_path.read_text(encoding="utf-8")
    except OSError as e:
        error_exit(f"Cannot read {skill_path}: {e}")

    # Parse frontmatter
    frontmatter = parse_frontmatter(content)
    name = frontmatter.get("name", skill_path.parent.name)
    description = frontmatter.get("description", "")

    # Parse body
    body = extract_body(content)
    headings = extract_headings(body)

    # Extract relevant sections
    when_to_use = extract_section(body, r"when\s+to\s+use")
    trigger_text = extract_section(body, r"trigger|activation")

    # Combine section text for keyword extraction
    section_text = " ".join(filter(None, [when_to_use, trigger_text]))

    # Extract keywords
    keywords = extract_keywords(name, description, headings, section_text)

    # Generate intent patterns
    intent_patterns = generate_intent_patterns(
        name, description, when_to_use, trigger_text
    )

    # Output
    result = {
        "keywords": keywords,
        "intentPatterns": intent_patterns,
        "description": description,
    }
    print(json.dumps(result, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
