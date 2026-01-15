#!/usr/bin/env python3
"""
USAGE: artifact_mark.py --handoff ID --outcome OUTCOME [--notes NOTES]
       artifact_mark.py --latest --outcome OUTCOME [--notes NOTES]
       artifact_mark.py --get-latest-id

Mark a handoff with user outcome in the database (PostgreSQL or SQLite).

Supports PostgreSQL (via DATABASE_URL or CONTINUOUS_CLAUDE_DB_URL) with
automatic fallback to SQLite for installations without PostgreSQL.

Examples:
    # Mark a specific handoff as succeeded
    uv run python scripts/core/artifact_mark.py --handoff abc123 --outcome SUCCEEDED

    # Mark the most recent handoff
    uv run python scripts/core/artifact_mark.py --latest --outcome SUCCEEDED

    # Just get the latest handoff ID (for scripts)
    uv run python scripts/core/artifact_mark.py --get-latest-id

    # Mark with additional notes
    uv run python scripts/core/artifact_mark.py --latest --outcome PARTIAL_PLUS --notes "Almost done"
"""

import argparse
import sqlite3
from pathlib import Path

from scripts.core.db.config import get_postgres_url, load_env_files, use_postgres

# Load .env files (single source of truth)
load_env_files()


def get_sqlite_path() -> Path:
    """Get SQLite database path."""
    return Path(".claude/cache/artifact-index/context.db")


# PostgreSQL operations
def pg_connect():
    """Connect to PostgreSQL."""
    import psycopg2
    return psycopg2.connect(get_postgres_url())


def pg_get_latest_id() -> str | None:
    """Get latest handoff ID from PostgreSQL."""
    conn = pg_connect()
    cur = conn.cursor()
    cur.execute("SELECT id::text FROM handoffs ORDER BY indexed_at DESC LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None


def pg_get_handoff(handoff_id: str) -> tuple | None:
    """Get handoff by ID from PostgreSQL."""
    conn = pg_connect()
    cur = conn.cursor()
    cur.execute(
        "SELECT id::text, session_name, goal FROM handoffs WHERE id::text LIKE %s",
        (f"{handoff_id}%",)
    )
    row = cur.fetchone()
    conn.close()
    return row


def pg_update_outcome(handoff_id: str, outcome: str, notes: str) -> bool:
    """Update handoff outcome in PostgreSQL."""
    conn = pg_connect()
    cur = conn.cursor()
    cur.execute(
        "UPDATE handoffs SET outcome = %s, outcome_notes = %s WHERE id::text LIKE %s",
        (outcome, notes, f"{handoff_id}%")
    )
    updated = cur.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def pg_list_recent() -> list:
    """List recent handoffs from PostgreSQL."""
    conn = pg_connect()
    cur = conn.cursor()
    cur.execute(
        "SELECT id::text, session_name, goal FROM handoffs ORDER BY indexed_at DESC LIMIT 10"
    )
    rows = cur.fetchall()
    conn.close()
    return rows


# SQLite operations
def sqlite_connect():
    """Connect to SQLite."""
    db_path = get_sqlite_path()
    if not db_path.exists():
        return None
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def sqlite_get_latest_id() -> str | None:
    """Get latest handoff ID from SQLite."""
    conn = sqlite_connect()
    if not conn:
        return None
    cursor = conn.execute("SELECT id FROM handoffs ORDER BY indexed_at DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


def sqlite_get_handoff(handoff_id: str) -> tuple | None:
    """Get handoff by ID from SQLite."""
    conn = sqlite_connect()
    if not conn:
        return None
    cursor = conn.execute(
        "SELECT id, session_name, task_summary FROM handoffs WHERE id = ? OR id LIKE ?",
        (handoff_id, f"{handoff_id}%")
    )
    row = cursor.fetchone()
    conn.close()
    return row


def sqlite_update_outcome(handoff_id: str, outcome: str, notes: str) -> bool:
    """Update handoff outcome in SQLite."""
    conn = sqlite_connect()
    if not conn:
        return False
    cursor = conn.execute(
        "UPDATE handoffs SET outcome = ?, outcome_notes = ?, confidence = 'HIGH' WHERE id = ? OR id LIKE ?",
        (outcome, notes, handoff_id, f"{handoff_id}%")
    )
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def sqlite_list_recent() -> list:
    """List recent handoffs from SQLite."""
    conn = sqlite_connect()
    if not conn:
        return []
    cursor = conn.execute(
        "SELECT id, session_name, task_summary FROM handoffs ORDER BY indexed_at DESC LIMIT 10"
    )
    rows = cursor.fetchall()
    conn.close()
    return rows


# Unified interface
def get_latest_id() -> str | None:
    """Get latest handoff ID from database."""
    if use_postgres():
        return pg_get_latest_id()
    return sqlite_get_latest_id()


def get_handoff(handoff_id: str) -> tuple | None:
    """Get handoff by ID."""
    if use_postgres():
        return pg_get_handoff(handoff_id)
    return sqlite_get_handoff(handoff_id)


def update_outcome(handoff_id: str, outcome: str, notes: str) -> bool:
    """Update handoff outcome."""
    if use_postgres():
        return pg_update_outcome(handoff_id, outcome, notes)
    return sqlite_update_outcome(handoff_id, outcome, notes)


def list_recent() -> list:
    """List recent handoffs."""
    if use_postgres():
        return pg_list_recent()
    return sqlite_list_recent()


def main():
    parser = argparse.ArgumentParser(
        description="Mark handoff outcome (PostgreSQL or SQLite)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Mark specific handoff
  %(prog)s --handoff abc123 --outcome SUCCEEDED

  # Mark latest handoff
  %(prog)s --latest --outcome SUCCEEDED

  # Get latest handoff ID (for scripts)
  %(prog)s --get-latest-id
""",
    )
    parser.add_argument("--handoff", help="Handoff ID to mark")
    parser.add_argument("--latest", action="store_true", help="Mark the most recent handoff")
    parser.add_argument("--get-latest-id", action="store_true", help="Print latest handoff ID and exit")
    parser.add_argument(
        "--outcome",
        choices=["SUCCEEDED", "PARTIAL_PLUS", "PARTIAL_MINUS", "FAILED"],
        help="Outcome of the handoff",
    )
    parser.add_argument("--notes", default="", help="Optional notes about the outcome")

    args = parser.parse_args()

    # Mode: get-latest-id
    if args.get_latest_id:
        latest = get_latest_id()
        if latest:
            print(latest)
            return 0
        print("No handoffs found", file=__import__("sys").stderr)
        return 1

    # Mode: mark handoff
    if not args.outcome:
        parser.error("--outcome is required unless using --get-latest-id")

    # Determine which handoff to mark
    if args.latest:
        handoff_id = get_latest_id()
        if not handoff_id:
            print("Error: No handoffs found in database")
            return 1
    elif args.handoff:
        handoff_id = args.handoff
    else:
        parser.error("Either --handoff ID or --latest is required")

    # Check database availability
    db_type = "PostgreSQL" if use_postgres() else "SQLite"

    # Check if handoff exists
    handoff = get_handoff(handoff_id)
    if not handoff:
        print(f"Error: Handoff not found: {handoff_id}")
        print(f"\nDatabase: {db_type}")
        print("\nAvailable handoffs:")
        for row in list_recent():
            summary = row[2][:50] + "..." if row[2] and len(row[2]) > 50 else (row[2] or "(no summary)")
            print(f"  {row[0][:12]}: {row[1]} - {summary}")
        return 1

    # Update the handoff
    if not update_outcome(handoff_id, args.outcome, args.notes):
        print(f"Error: Failed to update handoff: {handoff_id}")
        return 1

    # Show confirmation
    print(f"✓ Marked handoff as {args.outcome}")
    print(f"  Database: {db_type}")
    print(f"  ID: {handoff[0]}")
    print(f"  Session: {handoff[1]}")
    if handoff[2]:
        summary = handoff[2][:80] + "..." if len(handoff[2]) > 80 else handoff[2]
        print(f"  Summary: {summary}")
    if args.notes:
        print(f"  Notes: {args.notes}")

    return 0


if __name__ == "__main__":
    exit(main())
