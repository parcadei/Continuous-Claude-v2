#!/usr/bin/env python3
"""
Benchmark: Token savings with TLDR

Compares tokens required for:
1. Reading raw files
2. Using TLDR structured context

Usage:
    cd opc/packages/tldr-code && source .venv/bin/activate
    python /path/to/benchmark_tokens.py
"""

import subprocess
import sys
from pathlib import Path

# Try to import tiktoken
try:
    import tiktoken
    enc = tiktoken.get_encoding("cl100k_base")  # Claude's encoding
    def count_tokens(text: str) -> int:
        return len(enc.encode(text))
except ImportError:
    print("Installing tiktoken...")
    subprocess.run([sys.executable, "-m", "pip", "install", "tiktoken", "-q"])
    import tiktoken
    enc = tiktoken.get_encoding("cl100k_base")
    def count_tokens(text: str) -> int:
        return len(enc.encode(text))

# Project setup
PROJECT_DIR = Path(__file__).parent.parent / "packages" / "tldr-code"


def read_raw_files(files: list[Path]) -> tuple[str, int]:
    """Read files raw and count tokens."""
    content = ""
    for f in files:
        if f.exists():
            content += f"=== {f.name} ===\n"
            content += f.read_text()
            content += "\n\n"
    return content, count_tokens(content)


def get_tldr_context(entry: str, project: Path, depth: int = 2) -> tuple[str, int]:
    """Get TLDR context for an entry point."""
    try:
        result = subprocess.run(
            ["tldr", "context", entry, "--project", str(project), "--depth", str(depth)],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(project),
        )
        content = result.stdout
        return content, count_tokens(content)
    except Exception as e:
        return str(e), 0


def get_tldr_extract(file: Path) -> tuple[str, int]:
    """Get TLDR extract for a file."""
    try:
        result = subprocess.run(
            ["tldr", "extract", str(file)],
            capture_output=True,
            text=True,
            timeout=30,
        )
        content = result.stdout
        return content, count_tokens(content)
    except Exception as e:
        return str(e), 0


def get_tldr_structure(project: Path) -> tuple[str, int]:
    """Get TLDR structure (codemap) for project."""
    try:
        result = subprocess.run(
            ["tldr", "structure", str(project), "--lang", "python"],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(project),
        )
        content = result.stdout
        return content, count_tokens(content)
    except Exception as e:
        return str(e), 0


def main():
    project = PROJECT_DIR.resolve()
    tldr_dir = project / "tldr"

    print("=" * 70)
    print("TOKEN SAVINGS BENCHMARK: Raw Files vs TLDR")
    print("=" * 70)
    print(f"Project: {project}")
    print("Encoder: cl100k_base (Claude)")
    print()

    results = []

    # =========================================================================
    # Scenario 1: Understanding a single file
    # =========================================================================
    print("─" * 70)
    print("SCENARIO 1: Single File Analysis (api.py)")
    print("─" * 70)

    api_file = tldr_dir / "api.py"

    # Raw
    raw_content, raw_tokens = read_raw_files([api_file])

    # TLDR extract
    tldr_content, tldr_tokens = get_tldr_extract(api_file)

    savings = (1 - tldr_tokens / raw_tokens) * 100 if raw_tokens > 0 else 0

    print(f"  Raw file:     {raw_tokens:,} tokens")
    print(f"  TLDR extract: {tldr_tokens:,} tokens")
    print(f"  Savings:      {savings:.0f}%")
    print()

    results.append(("Single file", raw_tokens, tldr_tokens, savings))

    # =========================================================================
    # Scenario 2: Understanding a function + its callees
    # =========================================================================
    print("─" * 70)
    print("SCENARIO 2: Function Context (extract_file + callees)")
    print("─" * 70)

    # Raw: Would need to read multiple files
    raw_files = [
        tldr_dir / "api.py",
        tldr_dir / "ast_extractor.py",
        tldr_dir / "hybrid_extractor.py",
    ]
    raw_content, raw_tokens = read_raw_files(raw_files)

    # TLDR context
    tldr_content, tldr_tokens = get_tldr_context("extract_file", project, depth=2)

    savings = (1 - tldr_tokens / raw_tokens) * 100 if raw_tokens > 0 else 0

    print(f"  Raw files (3): {raw_tokens:,} tokens")
    print(f"  TLDR context:  {tldr_tokens:,} tokens")
    print(f"  Savings:       {savings:.0f}%")
    print()

    results.append(("Function context", raw_tokens, tldr_tokens, savings))

    # =========================================================================
    # Scenario 3: Codebase overview
    # =========================================================================
    print("─" * 70)
    print("SCENARIO 3: Codebase Overview (all Python files)")
    print("─" * 70)

    # Raw: All Python files in tldr/
    py_files = list(tldr_dir.glob("*.py"))
    raw_content, raw_tokens = read_raw_files(py_files)

    # TLDR structure
    tldr_content, tldr_tokens = get_tldr_structure(project)

    savings = (1 - tldr_tokens / raw_tokens) * 100 if raw_tokens > 0 else 0

    print(f"  Raw files ({len(py_files)}): {raw_tokens:,} tokens")
    print(f"  TLDR structure:  {tldr_tokens:,} tokens")
    print(f"  Savings:         {savings:.0f}%")
    print()

    results.append(("Codebase overview", raw_tokens, tldr_tokens, savings))

    # =========================================================================
    # Scenario 4: Deep call chain analysis
    # =========================================================================
    print("─" * 70)
    print("SCENARIO 4: Deep Call Chain (get_relevant_context, depth=3)")
    print("─" * 70)

    # Raw: Would need ALL files that could be in the call chain
    raw_files = [
        tldr_dir / "api.py",
        tldr_dir / "ast_extractor.py",
        tldr_dir / "hybrid_extractor.py",
        tldr_dir / "cross_file_calls.py",
        tldr_dir / "cfg_extractor.py",
        tldr_dir / "dfg_extractor.py",
        tldr_dir / "pdg_extractor.py",
    ]
    raw_content, raw_tokens = read_raw_files(raw_files)

    # TLDR context depth 3
    tldr_content, tldr_tokens = get_tldr_context("get_relevant_context", project, depth=3)

    savings = (1 - tldr_tokens / raw_tokens) * 100 if raw_tokens > 0 else 0

    print(f"  Raw files (7): {raw_tokens:,} tokens")
    print(f"  TLDR context:  {tldr_tokens:,} tokens")
    print(f"  Savings:       {savings:.0f}%")
    print()

    results.append(("Deep call chain", raw_tokens, tldr_tokens, savings))

    # =========================================================================
    # Summary
    # =========================================================================
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print()
    print(f"{'Scenario':<22} {'Raw':>10} {'TLDR':>10} {'Savings':>10}")
    print("-" * 52)

    total_raw = 0
    total_tldr = 0

    for name, raw, tldr, sav in results:
        print(f"{name:<22} {raw:>10,} {tldr:>10,} {sav:>9.0f}%")
        total_raw += raw
        total_tldr += tldr

    print("-" * 52)
    total_savings = (1 - total_tldr / total_raw) * 100 if total_raw > 0 else 0
    print(f"{'TOTAL':<22} {total_raw:>10,} {total_tldr:>10,} {total_savings:>9.0f}%")
    print()

    # =========================================================================
    # Tweet-ready
    # =========================================================================
    print("=" * 70)
    print("📊 TWEET-READY STATS")
    print("=" * 70)
    print()
    print(f"🎯 TLDR saves {total_savings:.0f}% of tokens vs reading raw files")
    print()
    print(f"   Raw files:    {total_raw:,} tokens")
    print(f"   TLDR context: {total_tldr:,} tokens")
    print(f"   Saved:        {total_raw - total_tldr:,} tokens")
    print()
    print("   Per-scenario:")
    for name, raw, tldr, sav in results:
        print(f"   • {name}: {raw:,} → {tldr:,} ({sav:.0f}% savings)")
    print()

    # Cost savings estimate
    # Claude pricing: ~$3/M input tokens for Sonnet, ~$15/M for Opus
    saved_tokens = total_raw - total_tldr
    sonnet_saved = (saved_tokens / 1_000_000) * 3
    opus_saved = (saved_tokens / 1_000_000) * 15

    print("   💰 Cost savings per 1000 queries:")
    print(f"   • Sonnet: ${sonnet_saved * 1000:.2f}")
    print(f"   • Opus:   ${opus_saved * 1000:.2f}")
    print()


if __name__ == "__main__":
    main()
