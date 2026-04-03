#!/usr/bin/env python3
"""
Extract thinking blocks from session JSONL files.

Two-phase extraction:
1. Deterministic: Extract all thinking blocks (grep-like)
2. Filter: Keep only blocks with perception change signals

Usage:
    python extract_thinking_blocks.py --jsonl path/to/session.jsonl
    python extract_thinking_blocks.py --jsonl path/to/session.jsonl --filter  # only perception signals
    python extract_thinking_blocks.py --jsonl path/to/session.jsonl --output /tmp/blocks.txt
"""

import argparse
import json
import re
import sys
from pathlib import Path

# Perception change signal patterns (Alan Kay "point of view" moments)
PERCEPTION_SIGNALS = [
    r"\bactually\b",
    r"\brealized?\b",
    r"\bthe issue\b",
    r"\bthat'?s why\b",
    r"\bturns out\b",
    r"\bI was wrong\b",
    r"\bworks because\b",
    r"\bthe problem is\b",
    r"\bOh,",
    r"\bAha\b",
    r"\bnow I see\b",
    r"\bnow I understand\b",
    r"\bI see now\b",
    r"\bmisunderstood\b",
    r"\bwait,?\b",
    r"\bhmm\b",
    r"\binteresting\b",
    r"\bunexpected\b",
    r"\bsurpris",  # surprising, surprised
    r"\bdifferent than\b",
    r"\bdifferent from\b",
    r"\bnot what I\b",
    r"\bwasn'?t\b.*\bexpect",
]

PERCEPTION_PATTERN = re.compile("|".join(PERCEPTION_SIGNALS), re.IGNORECASE)


def extract_thinking_blocks(jsonl_path: Path, filter_perception: bool = False) -> list[dict]:
    """
    Stream through JSONL and extract thinking blocks.

    Args:
        jsonl_path: Path to session JSONL file
        filter_perception: If True, only return blocks with perception signals

    Yields:
        Dict with 'thinking', 'timestamp', 'line_num', 'has_perception_signal'
    """
    blocks = []

    with open(jsonl_path) as f:
        for line_num, line in enumerate(f, 1):
            try:
                data = json.loads(line.strip())
            except json.JSONDecodeError:
                continue

            # Skip non-message types
            if data.get('type') not in ('assistant', 'user'):
                continue

            message = data.get('message', {})
            content = message.get('content')

            # Content can be string or array
            if not isinstance(content, list):
                continue

            # Extract thinking blocks from content array
            for item in content:
                if isinstance(item, dict) and item.get('type') == 'thinking':
                    thinking_text = item.get('thinking', '')
                    if not thinking_text:
                        continue

                    has_signal = bool(PERCEPTION_PATTERN.search(thinking_text))

                    if filter_perception and not has_signal:
                        continue

                    blocks.append({
                        'thinking': thinking_text,
                        'timestamp': data.get('timestamp'),
                        'line_num': line_num,
                        'has_perception_signal': has_signal,
                    })

    return blocks


def main():
    parser = argparse.ArgumentParser(description='Extract thinking blocks from session JSONL')
    parser.add_argument('--jsonl', required=True, help='Path to session JSONL file')
    parser.add_argument('--filter', action='store_true', help='Only extract blocks with perception signals')
    parser.add_argument('--output', help='Output file (default: stdout)')
    parser.add_argument('--format', choices=['text', 'json'], default='text', help='Output format')
    parser.add_argument('--stats', action='store_true', help='Show statistics only')

    args = parser.parse_args()

    jsonl_path = Path(args.jsonl)
    if not jsonl_path.exists():
        print(f"Error: File not found: {jsonl_path}", file=sys.stderr)
        sys.exit(1)

    # Extract blocks
    blocks = extract_thinking_blocks(jsonl_path, filter_perception=args.filter)

    if args.stats:
        total = len(blocks)
        with_signal = sum(1 for b in blocks if b['has_perception_signal'])
        print(f"Total thinking blocks: {total}")
        print(f"With perception signals: {with_signal}")
        print(f"Ratio: {with_signal/total*100:.1f}%" if total > 0 else "Ratio: N/A")
        return

    # Format output
    if args.format == 'json':
        output = json.dumps(blocks, indent=2)
    else:
        output = '\n\n---\n\n'.join(
            f"[Line {b['line_num']}] {'*' if b['has_perception_signal'] else ''}\n{b['thinking']}"
            for b in blocks
        )

    # Write output
    if args.output:
        Path(args.output).write_text(output)
        print(f"Wrote {len(blocks)} blocks to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == '__main__':
    main()
