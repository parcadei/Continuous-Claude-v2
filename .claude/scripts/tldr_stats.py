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
    config_dir = Path(os.environ.get('CLAUDE_CONFIG_DIR', str(Path.home() / '.claude')))
    projects_base = config_dir / 'projects'

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
    """Get TLDR daemon stats via socket (Unix socket or TCP on Windows)."""
    hash_val = hashlib.md5(project_dir.encode()).hexdigest()[:8]

    try:
        if sys.platform == 'win32':
            # Windows: use TCP socket on localhost
            # Port derived from hash to match daemon behavior
            port = 17000 + (int(hash_val, 16) % 1000)
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            sock.connect(('127.0.0.1', port))
        else:
            # Unix: use Unix domain socket
            sock_path = f'/tmp/tldr-{hash_val}.sock'
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.settimeout(2)
            sock.connect(sock_path)

        sock.sendall(json.dumps({'cmd': 'status', 'session': session_id}).encode() + b'\n')
        data = sock.recv(65536)
        sock.close()
        return json.loads(data)
    except (OSError, json.JSONDecodeError, socket.timeout, ConnectionRefusedError):
        return {}


def get_historical_stats() -> tuple[list[dict], dict]:
    """Get historical session stats and global totals."""
    stats_file = Path.home() / '.cache' / 'tldr' / 'session_stats.jsonl'

    if not stats_file.exists():
        return [], {}

    stats = []
    global_totals = {
        'total_sessions': 0,
        'total_raw_tokens': 0,
        'total_tldr_tokens': 0,
        'total_savings_tokens': 0,
    }

    try:
        with open(stats_file) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    stats.append(entry)
                    # Accumulate global totals
                    global_totals['total_sessions'] += 1
                    global_totals['total_raw_tokens'] += entry.get('raw_tokens', 0)
                    global_totals['total_tldr_tokens'] += entry.get('tldr_tokens', 0)
                    global_totals['total_savings_tokens'] += entry.get('savings_tokens', 0)
                except json.JSONDecodeError:
                    pass
    except OSError:
        pass

    return stats[-10:], global_totals  # Last 10 for sparkline, plus global totals


# ============================================================================
# Main Display
# ============================================================================

def main():
    session_id = os.environ.get('CLAUDE_SESSION_ID', 'unknown')[:8]

    # Collect data
    claude_stats = get_claude_stats(session_id)
    historical, global_totals = get_historical_stats()

    # Extract metrics - prefer claude_stats, fallback to JSONL parsing
    input_tokens = claude_stats.get('total_input_tokens', 0)
    output_tokens = claude_stats.get('total_output_tokens', 0)
    actual_cost = claude_stats.get('total_cost_usd', 0)
    model_id = claude_stats.get('model_id', 'unknown')

    # Fallback: if no stats file, parse JSONL directly
    if input_tokens == 0 and output_tokens == 0:
        model_breakdown = get_model_breakdown(session_id)
        if model_breakdown:
            for model, usage in model_breakdown.items():
                input_tokens += usage.get('input', 0) + usage.get('cache_read', 0)
                output_tokens += usage.get('output', 0)
                # Use first model found as model_id
                if model_id == 'unknown':
                    model_id = model
            # Estimate cost from JSONL data
            # Pricing: input $3/M (sonnet default), output $15/M, cache read $0.30/M
            cache_tokens = sum(u.get('cache_read', 0) for u in model_breakdown.values())
            non_cache_input = input_tokens - cache_tokens
            actual_cost = (non_cache_input / 1_000_000) * 3.0 + \
                          (cache_tokens / 1_000_000) * 0.30 + \
                          (output_tokens / 1_000_000) * 15.0

    # Price for savings estimate ($/M tokens as of Jan 2026)
    # Claude 4.5 pricing from anthropic.com/pricing:
    #   Haiku:  $1 input,  $5 output
    #   Sonnet: $3 input, $15 output
    #   Opus:   $5 input, $25 output
    # TLDR savings = reduced input tokens, so we use input prices
    model_key = 'opus' if 'opus' in model_id.lower() else 'sonnet' if 'sonnet' in model_id.lower() else 'haiku'
    input_prices = {'opus': 5.0, 'sonnet': 3.0, 'haiku': 1.0}
    price = input_prices.get(model_key, 3.0)

    # ========================================================================
    # Render Output - Don Norman style: clear, coherent narrative
    # ========================================================================

    w = 62  # Box width

    print()
    print(f"{C.BOLD}{C.BRIGHT_CYAN}╔{'═' * w}╗{C.RESET}")
    print(f"{C.BOLD}{C.BRIGHT_CYAN}║{C.RESET}{C.BOLD}  📊 Stats{' ' * (w - 10)}{C.BRIGHT_CYAN}║{C.RESET}")
    print(f"{C.BOLD}{C.BRIGHT_CYAN}╚{'═' * w}╝{C.RESET}")
    print()

    # Current run cost (this terminal process)
    print(f"  {C.BOLD}Current run:{C.RESET}  {format_cost(actual_cost)}")
    print(f"  {C.DIM}{format_tokens(input_tokens)} sent, {format_tokens(output_tokens)} received{C.RESET}")
    print()

    # TLDR savings - cumulative across all runs in this repo
    if global_totals.get('total_raw_tokens', 0) > 0:
        global_raw = global_totals['total_raw_tokens']
        global_tldr = global_totals['total_tldr_tokens']
        global_saved = global_totals['total_savings_tokens']
        total_sessions = global_totals['total_sessions']

        cost_without = (global_raw / 1_000_000) * price
        cost_with = (global_tldr / 1_000_000) * price
        cost_saved = cost_without - cost_with

        print(f"  {C.BOLD}TLDR Savings{C.RESET} {C.DIM}(all-time, {total_sessions} runs){C.RESET}")
        print(f"    Without TLDR:  {format_tokens(global_raw):>8}  →  ${cost_without:.2f}")
        print(f"    With TLDR:     {format_tokens(global_tldr):>8}  →  ${cost_with:.2f}")
        print(f"    {C.GREEN}{C.BOLD}Saved:         {format_tokens(global_saved):>8}  →  ${cost_saved:.2f}{C.RESET}")

        # Sparkline of recent compression rates
        if historical:
            savings_values = [h.get('savings_percent', 0) for h in historical]
            if any(v > 0 for v in savings_values):
                trend = sparkline(savings_values, width=10)
                avg_savings = sum(savings_values) / len(savings_values)
                print(f"    {C.DIM}Recent: {trend} avg {avg_savings:.0f}%{C.RESET}")
    print()


if __name__ == '__main__':
    main()
