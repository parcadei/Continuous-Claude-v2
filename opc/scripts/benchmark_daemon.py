#!/usr/bin/env python3
"""
Benchmark: TLDR Daemon vs CLI

Compares latency of:
1. Spawning `tldr` CLI for each query
2. Querying daemon via Unix socket

Usage:
    cd opc && uv run python scripts/benchmark_daemon.py
"""

import hashlib
import json
import socket
import subprocess
import time
from pathlib import Path
from statistics import mean, stdev

# Config
PROJECT_DIR = Path(__file__).parent.parent / "packages" / "tldr-code"
ITERATIONS = 10
QUERIES = [
    ("search", {"pattern": "extract"}),
    ("extract", {"file": str(PROJECT_DIR / "tldr" / "api.py")}),
    ("impact", {"func": "extract_file"}),
    ("tree", {}),
    ("structure", {"language": "python"}),
]


def get_socket_path(project_dir: str) -> str:
    """Compute socket path like daemon-client.ts does."""
    h = hashlib.md5(project_dir.encode()).hexdigest()[:8]
    return f"/tmp/tldr-{h}.sock"


def query_daemon(cmd: str, params: dict, socket_path: str) -> tuple[dict, float]:
    """Query daemon via Unix socket, return (response, latency_ms)."""
    query = {"cmd": cmd, **params}

    start = time.perf_counter()
    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(5.0)
        sock.connect(socket_path)
        sock.sendall((json.dumps(query) + "\n").encode())

        data = b""
        while b"\n" not in data:
            chunk = sock.recv(4096)
            if not chunk:
                break
            data += chunk
        sock.close()

        elapsed = (time.perf_counter() - start) * 1000
        return json.loads(data.decode().strip()), elapsed
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        return {"error": str(e)}, elapsed


def query_cli(cmd: str, params: dict, project_dir: Path) -> tuple[str, float]:
    """Run tldr CLI command, return (output, latency_ms)."""
    args = ["tldr", cmd]

    if cmd == "search":
        args.append(params.get("pattern", ""))
        args.append(str(project_dir))
    elif cmd == "extract":
        args.append(params.get("file", ""))
    elif cmd == "impact":
        args.append(params.get("func", ""))
        args.append(str(project_dir))
    elif cmd == "tree":
        args.append(str(project_dir))
    elif cmd == "structure":
        args.append(str(project_dir))
        args.extend(["--lang", params.get("language", "python")])

    start = time.perf_counter()
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=10,
            cwd=str(project_dir),
        )
        elapsed = (time.perf_counter() - start) * 1000
        return result.stdout, elapsed
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        return str(e), elapsed


def check_daemon_running(socket_path: str) -> bool:
    """Check if daemon is running."""
    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(1.0)
        sock.connect(socket_path)
        sock.sendall(b'{"cmd":"ping"}\n')
        data = sock.recv(1024)
        sock.close()
        return b"ok" in data
    except:
        return False


def main():
    project_dir = PROJECT_DIR.resolve()
    socket_path = get_socket_path(str(project_dir))

    print("=" * 60)
    print("TLDR Benchmark: Daemon vs CLI")
    print("=" * 60)
    print(f"Project: {project_dir}")
    print(f"Socket:  {socket_path}")
    print(f"Iterations per query: {ITERATIONS}")
    print()

    # Check daemon
    if not check_daemon_running(socket_path):
        print("⚠️  Daemon not running. Starting...")
        subprocess.run(["tldr", "daemon", "start", "--project", str(project_dir)],
                      capture_output=True, timeout=10)
        time.sleep(2)
        if not check_daemon_running(socket_path):
            print("❌ Could not start daemon")
            return

    print("✅ Daemon running\n")

    # Warm up
    print("Warming up...")
    for cmd, params in QUERIES:
        query_daemon(cmd, params, socket_path)
        query_cli(cmd, params, project_dir)
    print()

    # Benchmark
    results = []

    for cmd, params in QUERIES:
        print(f"Benchmarking: {cmd}")

        daemon_times = []
        cli_times = []

        for i in range(ITERATIONS):
            _, d_time = query_daemon(cmd, params, socket_path)
            daemon_times.append(d_time)

            _, c_time = query_cli(cmd, params, project_dir)
            cli_times.append(c_time)

        d_mean = mean(daemon_times)
        c_mean = mean(cli_times)
        speedup = c_mean / d_mean if d_mean > 0 else 0

        results.append({
            "cmd": cmd,
            "daemon_ms": d_mean,
            "cli_ms": c_mean,
            "speedup": speedup,
            "daemon_std": stdev(daemon_times) if len(daemon_times) > 1 else 0,
            "cli_std": stdev(cli_times) if len(cli_times) > 1 else 0,
        })

        print(f"  Daemon: {d_mean:7.1f}ms ± {results[-1]['daemon_std']:.1f}")
        print(f"  CLI:    {c_mean:7.1f}ms ± {results[-1]['cli_std']:.1f}")
        print(f"  Speedup: {speedup:.1f}x")
        print()

    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print()
    print(f"{'Command':<12} {'Daemon':<12} {'CLI':<12} {'Speedup':<10}")
    print("-" * 46)

    total_daemon = 0
    total_cli = 0

    for r in results:
        print(f"{r['cmd']:<12} {r['daemon_ms']:>7.1f}ms   {r['cli_ms']:>7.1f}ms   {r['speedup']:>5.1f}x")
        total_daemon += r['daemon_ms']
        total_cli += r['cli_ms']

    print("-" * 46)
    avg_speedup = total_cli / total_daemon if total_daemon > 0 else 0
    print(f"{'TOTAL':<12} {total_daemon:>7.1f}ms   {total_cli:>7.1f}ms   {avg_speedup:>5.1f}x")
    print()

    # Tweet-ready stats
    print("=" * 60)
    print("📊 TWEET-READY STATS")
    print("=" * 60)
    print()
    print(f"🚀 TLDR daemon is {avg_speedup:.0f}x faster than spawning CLI")
    print()
    print(f"   Daemon: {total_daemon:.0f}ms total ({total_daemon/len(QUERIES):.0f}ms avg)")
    print(f"   CLI:    {total_cli:.0f}ms total ({total_cli/len(QUERIES):.0f}ms avg)")
    print()
    print("   Per-query breakdown:")
    for r in results:
        print(f"   • {r['cmd']}: {r['daemon_ms']:.0f}ms vs {r['cli_ms']:.0f}ms ({r['speedup']:.0f}x)")
    print()


if __name__ == "__main__":
    main()
