#!/usr/bin/env python3
"""
TLDR Stats - Beautiful token usage dashboard.

Shows session costs, TLDR savings, cache efficiency, and hook activity
with colors, progress bars, and sparklines.
"""

import socket
import json
import hashlib
import os
import sys
import tempfile
from pathlib import Path

# ============================================================================
# ANSI Colors
# ============================================================================

class C:
    """ANSI color codes."""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

    # Colors
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'

    # Bright colors
    BRIGHT_RED = '\033[91m'
    BRIGHT_GREEN = '\033[92m'
    BRIGHT_YELLOW = '\033[93m'
    BRIGHT_BLUE = '\033[94m'
    BRIGHT_MAGENTA = '\033[95m'
    BRIGHT_CYAN = '\033[96m'

# Disable colors if not a TTY
if not sys.stdout.isatty():
    for attr in dir(C):
        if not attr.startswith('_'):
            setattr(C, attr, '')


# ============================================================================
# Visual Components
# ============================================================================

def progress_bar(value: float, width: int = 20, fill_char: str = '█', empty_char: str = '░') -> str:
    """Create a colored progress bar."""
    filled = int(value / 100 * width)
    empty = width - filled

    # Color based on value
    if value >= 70:
        color = C.BRIGHT_GREEN
    elif value >= 40:
        color = C.BRIGHT_YELLOW
    else:
        color = C.BRIGHT_RED

    return f"{color}{fill_char * filled}{C.DIM}{empty_char * empty}{C.RESET}"


def sparkline(values: list[float], width: int = 10) -> str:
    """Create a sparkline from values."""
    if not values:
        return ''

    chars = ' ▁▂▃▄▅▆▇█'
    min_val = min(values)
    max_val = max(values)

    if max_val == min_val:
        return chars[4] * min(len(values), width)

    # Take last `width` values
    values = values[-width:]

    result = []
    for v in values:
        idx = int((v - min_val) / (max_val - min_val) * (len(chars) - 1))
        result.append(chars[idx])

    return C.CYAN + ''.join(result) + C.RESET


def format_tokens(n: int) -> str:
    """Format token count with K/M suffix."""
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    elif n >= 1_000:
        return f"{n/1_000:.1f}K"
    return str(n)


def format_cost(amount: float) -> str:
    """Format cost with color based on amount."""
    if amount >= 10:
        color = C.BRIGHT_RED
    elif amount >= 1:
        color = C.BRIGHT_YELLOW
    else:
        color = C.BRIGHT_GREEN
    return f"{color}${amount:.2f}{C.RESET}"


def box_line(left: str, right: str, width: int = 60) -> str:
    """Create a line with left and right aligned text."""
    # Strip ANSI codes for width calculation
    import re
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    left_clean = ansi_escape.sub('', left)
    right_clean = ansi_escape.sub('', right)

    padding = width - len(left_clean) - len(right_clean)
    return f"  {left}{' ' * max(1, padding)}{right}"


# ============================================================================
# Data Collection
# ============================================================================

def get_claude_stats(session_id: str) -> dict:
    """Get Claude Code session stats from temp file."""
    tmp_dir = Path(tempfile.gettempdir())
    stats_file = tmp_dir / f'claude-session-stats-{session_id}.json'

    if stats_file.exists():
        try:
            return json.loads(stats_file.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    # Fallback to most recent
    stats_files = list(tmp_dir.glob('claude-session-stats-*.json'))
    if stats_files:
        most_recent = max(stats_files, key=lambda f: f.stat().st_mtime)
        try:
            return json.loads(most_recent.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    return {}


def get_model_breakdown(session_id: str) -> dict:
    """Get per-model token breakdown from session JSONL."""
    model_breakdown = {}
    projects_base = Path.home() / '.opc-dev' / 'projects'

    if not projects_base.exists():
        return {}

    session_jsonl = None

    # Search for session-specific file
    for proj_dir in projects_base.iterdir():
        if proj_dir.is_dir():
            matches = list(proj_dir.glob(f'{session_id}*.jsonl'))
            if matches:
                session_jsonl = matches[0]
                break

    # Fallback to most recent
    if not session_jsonl:
        all_jsonls = []
        for proj_dir in projects_base.iterdir():
            if proj_dir.is_dir():
                all_jsonls.extend([f for f in proj_dir.glob('*.jsonl')
                                   if not f.name.startswith('agent-')])
        if all_jsonls:
            session_jsonl = max(all_jsonls, key=lambda f: f.stat().st_mtime)

    if session_jsonl:
        try:
            with open(session_jsonl) as f:
                for line in f:
                    try:
                        entry = json.loads(line)
                        if entry.get('type') == 'assistant':
                            msg = entry.get('message', {})
                            model = msg.get('model', 'unknown')
                            usage = msg.get('usage', {})
                            if model not in model_breakdown:
                                model_breakdown[model] = {
                                    'input': 0, 'output': 0,
                                    'cache_read': 0, 'cache_create': 0
                                }
                            model_breakdown[model]['input'] += usage.get('input_tokens', 0)
                            model_breakdown[model]['output'] += usage.get('output_tokens', 0)
                            model_breakdown[model]['cache_read'] += usage.get('cache_read_input_tokens', 0)
                            model_breakdown[model]['cache_create'] += usage.get('cache_creation_input_tokens', 0)
                    except (json.JSONDecodeError, KeyError):
                        pass
        except OSError:
            pass

    return model_breakdown


def get_tldr_stats(project_dir: str, session_id: str) -> dict:
    """Get TLDR daemon stats via Unix socket."""
    hash_val = hashlib.md5(project_dir.encode()).hexdigest()[:8]
    sock_path = f'/tmp/tldr-{hash_val}.sock'

    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(2)
        sock.connect(sock_path)
        sock.sendall(json.dumps({'cmd': 'status', 'session': session_id}).encode() + b'\n')
        data = sock.recv(65536)
        sock.close()
        return json.loads(data)
    except (OSError, json.JSONDecodeError, socket.timeout):
        return {}


def get_historical_stats() -> list[dict]:
    """Get historical session stats."""
    stats_file = Path.home() / '.cache' / 'tldr' / 'session_stats.jsonl'

    if not stats_file.exists():
        return []

    stats = []
    try:
        with open(stats_file) as f:
            for line in f:
                try:
                    stats.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    pass
    except OSError:
        pass

    return stats[-10:]  # Last 10 sessions


# ============================================================================
# Main Display
# ============================================================================

def main():
    project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
    session_id = os.environ.get('CLAUDE_SESSION_ID', 'unknown')[:8]

    # Collect all data
    claude_stats = get_claude_stats(session_id)
    model_breakdown = get_model_breakdown(session_id)
    tldr_stats = get_tldr_stats(project_dir, session_id)
    historical = get_historical_stats()

    # Extract metrics
    input_tokens = claude_stats.get('total_input_tokens', 0)
    output_tokens = claude_stats.get('total_output_tokens', 0)
    cache_read = claude_stats.get('cache_read_tokens', 0)
    actual_cost = claude_stats.get('total_cost_usd', 0)
    model_id = claude_stats.get('model_id', 'unknown')

    all_stats = tldr_stats.get('all_sessions', {})
    raw_tokens = all_stats.get('total_raw_tokens', 0)
    tldr_tokens = all_stats.get('total_tldr_tokens', 0)
    tldr_saved = raw_tokens - tldr_tokens
    tldr_pct = (tldr_saved / raw_tokens * 100) if raw_tokens > 0 else 0

    salsa = tldr_stats.get('salsa_stats', {})
    cache_hits = salsa.get('cache_hits', 0)
    cache_misses = salsa.get('cache_misses', 0)
    hit_rate = (cache_hits / (cache_hits + cache_misses) * 100) if (cache_hits + cache_misses) > 0 else 0

    uptime_sec = tldr_stats.get('uptime', 0)
    uptime_min = int(uptime_sec // 60)

    # Price calculation
    model_key = 'opus' if 'opus' in model_id.lower() else 'sonnet' if 'sonnet' in model_id.lower() else 'haiku'
    prices = {'opus': 15.0, 'sonnet': 3.0, 'haiku': 0.25}
    price = prices.get(model_key, 3.0)
    estimated_savings = (tldr_saved / 1_000_000) * price

    # ========================================================================
    # Render Output - Don Norman style: clear, coherent narrative
    # ========================================================================

    w = 62  # Box width

    print()
    print(f"{C.BOLD}{C.BRIGHT_CYAN}╔{'═' * w}╗{C.RESET}")
    print(f"{C.BOLD}{C.BRIGHT_CYAN}║{C.RESET}{C.BOLD}  📊 Session Stats{' ' * (w - 18)}{C.BRIGHT_CYAN}║{C.RESET}")
    print(f"{C.BOLD}{C.BRIGHT_CYAN}╚{'═' * w}╝{C.RESET}")
    print()

    # Hero: One clear cost number
    print(f"  {C.BOLD}You've spent{C.RESET}  {format_cost(actual_cost)}  {C.DIM}this session{C.RESET}")
    print()

    # Token breakdown - simple
    total_tokens = input_tokens + output_tokens
    print(f"  {C.BOLD}{C.CYAN}Tokens Used{C.RESET}")
    print(f"    {format_tokens(input_tokens):>8} sent to Claude")
    print(f"    {format_tokens(output_tokens):>8} received back")
    if cache_read > 0:
        cache_pct = (cache_read / input_tokens * 100) if input_tokens > 0 else 0
        print(f"    {C.GREEN}{format_tokens(cache_read):>8} from prompt cache{C.RESET} {C.DIM}({cache_pct:.0f}% reused){C.RESET}")
    print()

    # TLDR Section - explain the story clearly
    if raw_tokens > 0:
        print(f"  {C.BOLD}{C.MAGENTA}TLDR File Compression{C.RESET}")
        print(f"    When you read files, TLDR summarizes them instead of")
        print(f"    sending raw code. This session:")
        print()
        print(f"    {C.DIM}Raw file content:{C.RESET}  {format_tokens(raw_tokens):>8}")
        print(f"    {C.GREEN}After TLDR:{C.RESET}        {format_tokens(tldr_tokens):>8}  {progress_bar(tldr_pct, width=10)} {C.BOLD}{tldr_pct:.0f}%{C.RESET} smaller")
        print()
        # Explain cost breakdown clearly
        total_if_no_tldr = input_tokens + tldr_saved
        real_savings_pct = (tldr_saved / total_if_no_tldr * 100) if total_if_no_tldr > 0 else 0
        other_tokens = input_tokens - tldr_tokens
        other_pct = (other_tokens / input_tokens * 100) if input_tokens > 0 else 0
        print(f"    {C.DIM}Your input breakdown:{C.RESET}")
        print(f"    {C.DIM}  {format_tokens(tldr_tokens)} file content ({100-other_pct:.0f}%){C.RESET}")
        print(f"    {C.DIM}  {format_tokens(other_tokens)} prompts/history ({other_pct:.0f}%){C.RESET}")
        print(f"    {C.DIM}TLDR saved {format_tokens(tldr_saved)} = ~${estimated_savings:.2f}{C.RESET}")
        print()

    # Cache efficiency - only if meaningful
    if cache_hits + cache_misses > 10:
        print(f"  {C.BOLD}{C.YELLOW}TLDR Cache{C.RESET}")
        print(f"    Re-reading the same file? TLDR remembers it.")
        print(f"    {progress_bar(hit_rate, width=15)} {hit_rate:.0f}% cache hits")
        print(f"    {C.DIM}({cache_hits} reused / {cache_misses} parsed fresh){C.RESET}")
        print()

    # Model breakdown - only show if multiple models
    if model_breakdown and len(model_breakdown) > 1:
        print(f"  {C.BOLD}{C.BLUE}Models Used{C.RESET}")
        for model, usage in sorted(model_breakdown.items()):
            if 'opus' in model.lower():
                emoji, name = '🎭', 'Opus'
            elif 'haiku' in model.lower():
                emoji, name = '🍃', 'Haiku'
            else:
                emoji, name = '🎵', 'Sonnet'
            total_in = usage['input'] + usage['cache_read'] + usage['cache_create']
            print(f"    {emoji} {name:8} {format_tokens(total_in):>7} tokens")
        print()

    # Hooks - simplified, just show count
    hook_stats = tldr_stats.get('hook_stats', {})
    if hook_stats:
        total_hooks = sum(s.get('invocations', 0) for s in hook_stats.values())
        all_ok = all(s.get('success_rate', 100) == 100 for s in hook_stats.values())
        status = f"{C.GREEN}✓ all ok{C.RESET}" if all_ok else f"{C.YELLOW}some issues{C.RESET}"
        print(f"  {C.DIM}Hooks: {total_hooks} calls ({status}){C.RESET}")

    # Historical - simple one-liner
    if historical:
        savings_values = [h.get('savings_percent', 0) for h in historical]
        if any(v > 0 for v in savings_values):
            trend = sparkline(savings_values, width=8)
            avg_savings = sum(savings_values) / len(savings_values)
            print(f"  {C.DIM}History: {trend} avg {avg_savings:.0f}% compression{C.RESET}")

    # Footer
    active_sessions = all_stats.get('active_sessions', 0)
    print(f"  {C.DIM}Daemon: {uptime_min}m up │ {active_sessions} sessions{C.RESET}")
    print()


if __name__ == '__main__':
    main()
