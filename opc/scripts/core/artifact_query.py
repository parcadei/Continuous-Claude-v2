#!/usr/bin/env python3
"""
USAGE: artifact_query.py <query> [--type TYPE] [--outcome OUTCOME] [--limit N] [--db PATH]

Search the Context Graph for relevant precedent.

Examples:
    # Search for authentication-related work
    uv run python scripts/artifact_query.py "authentication OAuth JWT"

    # Search only successful handoffs
    uv run python scripts/artifact_query.py "implement agent" --outcome SUCCEEDED

    # Search plans only
    uv run python scripts/artifact_query.py "API design" --type plans
"""

import argparse
import hashlib
import json
import sqlite3
from datetime import datetime
from pathlib import Path


def get_db_path(custom_path: str | None = None) -> Path:
    if custom_path:
        return Path(custom_path)
    return Path(".claude/cache/artifact-index/context.db")


def escape_fts5_query(query: str) -> str:
    """Escape FTS5 query to prevent syntax errors.

    Splits query into words and joins with OR for flexible matching.
    Each word is quoted to handle special characters.
    """
    # Split on whitespace and quote each word
    words = query.split()
    quoted_words = [f'"{w.replace(chr(34), chr(34) + chr(34))}"' for w in words]
    # Join with OR for flexible matching
    return " OR ".join(quoted_words)


def get_handoff_by_span_id(conn: sqlite3.Connection, root_span_id: str) -> dict | None:
    """Get a handoff by its Braintrust root_span_id."""
    sql = """
        SELECT id, session_name, task_number, task_summary,
               what_worked, what_failed, key_decisions,
               outcome, file_path, root_span_id, created_at
        FROM handoffs
        WHERE root_span_id = ?
        LIMIT 1
    """
    cursor = conn.execute(sql, [root_span_id])
    columns = [desc[0] for desc in cursor.description]
    row = cursor.fetchone()
    if row:
        return dict(zip(columns, row))
    return None


def get_ledger_for_session(conn: sqlite3.Connection, session_name: str) -> dict | None:
    """Get continuity ledger by session name."""
    sql = """
        SELECT id, session_name, goal, key_learnings, key_decisions,
               state_done, state_now, state_next, created_at
        FROM continuity
        WHERE session_name = ?
        ORDER BY created_at DESC
        LIMIT 1
    """
    cursor = conn.execute(sql, [session_name])
    columns = [desc[0] for desc in cursor.description]
    row = cursor.fetchone()
    if row:
        return dict(zip(columns, row))
    return None


def search_handoffs(
    conn: sqlite3.Connection, query: str, outcome: str | None = None, limit: int = 5
) -> list:
    """Search handoffs using FTS5 with BM25 ranking."""
    # Use rank column (faster than bm25() function for sorting)
    sql = """
        SELECT h.id, h.session_name, h.task_number, h.task_summary,
               h.what_worked, h.what_failed, h.key_decisions,
               h.outcome, h.file_path, h.created_at,
               handoffs_fts.rank as score
        FROM handoffs_fts
        JOIN handoffs h ON handoffs_fts.rowid = h.rowid
        WHERE handoffs_fts MATCH ?
    """
    params = [escape_fts5_query(query)]

    if outcome:
        sql += " AND h.outcome = ?"
        params.append(outcome)

    sql += " ORDER BY rank LIMIT ?"
    params.append(limit)

    cursor = conn.execute(sql, params)
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def search_plans(conn: sqlite3.Connection, query: str, limit: int = 3) -> list:
    """Search plans using FTS5 with BM25 ranking."""
    sql = """
        SELECT p.id, p.title, p.overview, p.approach, p.file_path, p.created_at,
               plans_fts.rank as score
        FROM plans_fts
        JOIN plans p ON plans_fts.rowid = p.rowid
        WHERE plans_fts MATCH ?
        ORDER BY rank
        LIMIT ?
    """
    cursor = conn.execute(sql, [escape_fts5_query(query), limit])
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def search_continuity(conn: sqlite3.Connection, query: str, limit: int = 3) -> list:
    """Search continuity ledgers using FTS5 with BM25 ranking."""
    sql = """
        SELECT c.id, c.session_name, c.goal, c.key_learnings, c.key_decisions,
               c.state_now, c.created_at,
               continuity_fts.rank as score
        FROM continuity_fts
        JOIN continuity c ON continuity_fts.rowid = c.rowid
        WHERE continuity_fts MATCH ?
        ORDER BY rank
        LIMIT ?
    """
    cursor = conn.execute(sql, [escape_fts5_query(query), limit])
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def search_past_queries(conn: sqlite3.Connection, query: str, limit: int = 2) -> list:
    """Check if similar questions have been asked before."""
    sql = """
        SELECT q.id, q.question, q.answer, q.was_helpful, q.created_at,
               queries_fts.rank as score
        FROM queries_fts
        JOIN queries q ON queries_fts.rowid = q.rowid
        WHERE queries_fts MATCH ?
        ORDER BY rank
        LIMIT ?
    """
    cursor = conn.execute(sql, [escape_fts5_query(query), limit])
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


# --- Helper functions for reduced complexity ---

# Dispatch table for status icons
STATUS_ICONS = {
    "SUCCEEDED": "v",
    "PARTIAL_PLUS": "~+",
    "PARTIAL_MINUS": "~-",
    "FAILED": "x",
}


def format_result_section(section_type: str, items: list) -> str:
    """Format a single result section using dispatch table.

    Args:
        section_type: One of 'handoffs', 'plans', 'continuity', 'past_queries'
        items: List of result dicts

    Returns:
        Formatted markdown string
    """
    if not items:
        return ""

    formatters = {
        "past_queries": _format_past_queries,
        "handoffs": _format_handoffs,
        "plans": _format_plans,
        "continuity": _format_continuity,
    }

    formatter = formatters.get(section_type)
    if formatter:
        return formatter(items)
    return ""


def _format_past_queries(items: list) -> str:
    """Format past queries section."""
    output = ["## Previously Asked"]
    for q in items:
        question = q.get("question", "")[:100]
        answer = q.get("answer", "")[:200]
        output.append(f"- **Q:** {question}...")
        output.append(f"  **A:** {answer}...")
    output.append("")
    return "\n".join(output)


def _format_handoffs(items: list) -> str:
    """Format handoffs section."""
    output = ["## Relevant Handoffs"]
    for h in items:
        status_icon = STATUS_ICONS.get(h.get("outcome"), "?")
        session = h.get("session_name", "unknown")
        task = h.get("task_number", "?")
        output.append(f"### {status_icon} {session}/task-{task}")
        summary = h.get("task_summary", "")[:200]
        output.append(f"**Summary:** {summary}")
        what_worked = h.get("what_worked")
        if what_worked:
            output.append(f"**What worked:** {what_worked[:200]}")
        what_failed = h.get("what_failed")
        if what_failed:
            output.append(f"**What failed:** {what_failed[:200]}")
        output.append(f"**File:** `{h.get('file_path', '')}`")
        output.append("")
    return "\n".join(output)


def _format_plans(items: list) -> str:
    """Format plans section."""
    output = ["## Relevant Plans"]
    for p in items:
        title = p.get("title", "Untitled")
        output.append(f"### {title}")
        overview = p.get("overview", "")[:200]
        output.append(f"**Overview:** {overview}")
        output.append(f"**File:** `{p.get('file_path', '')}`")
        output.append("")
    return "\n".join(output)


def _format_continuity(items: list) -> str:
    """Format continuity section."""
    output = ["## Related Sessions"]
    for c in items:
        session = c.get("session_name", "unknown")
        output.append(f"### Session: {session}")
        goal = c.get("goal", "")[:200]
        output.append(f"**Goal:** {goal}")
        key_learnings = c.get("key_learnings")
        if key_learnings:
            output.append(f"**Key learnings:** {key_learnings[:200]}")
        output.append("")
    return "\n".join(output)


def handle_span_id_lookup(
    conn: sqlite3.Connection, span_id: str, with_content: bool = False
) -> dict | None:
    """Handle --by-span-id lookup mode.

    Args:
        conn: Database connection
        span_id: Braintrust root_span_id to look up
        with_content: Whether to include full file content

    Returns:
        Handoff dict or None if not found
    """
    handoff = get_handoff_by_span_id(conn, span_id)

    if not handoff:
        return None

    if with_content and handoff.get("file_path"):
        # Read full file content
        file_path = Path(handoff["file_path"])
        if file_path.exists():
            handoff["content"] = file_path.read_text()

        # Also get the ledger for this session
        session_name = handoff.get("session_name")
        if not session_name and handoff.get("file_path"):
            # Extract from path: thoughts/shared/handoffs/{session_name}/...
            parts = Path(handoff["file_path"]).parts
            if "handoffs" in parts:
                idx = parts.index("handoffs")
                if idx + 1 < len(parts):
                    session_name = parts[idx + 1]

        if session_name:
            # Try to find ledger file directly first
            ledger_path = Path(f"CONTINUITY_CLAUDE-{session_name}.md")
            if ledger_path.exists():
                ledger = {
                    "session_name": session_name,
                    "file_path": str(ledger_path),
                    "content": ledger_path.read_text(),
                }
                handoff["ledger"] = ledger
            else:
                # Fall back to DB lookup
                ledger = get_ledger_for_session(conn, session_name)
                if ledger:
                    handoff["ledger"] = ledger

    return handoff


def search_dispatch(
    conn: sqlite3.Connection,
    query: str,
    search_type: str = "all",
    outcome: str | None = None,
    limit: int = 5,
) -> dict:
    """Dispatch search to appropriate handlers based on type.

    Uses dispatch table pattern to reduce if/elif chains.

    Args:
        conn: Database connection
        query: Search query string
        search_type: One of 'handoffs', 'plans', 'continuity', 'all'
        outcome: Optional outcome filter for handoffs
        limit: Max results per type

    Returns:
        Dict with results keyed by type
    """
    results = {}

    # Always check past queries
    results["past_queries"] = search_past_queries(conn, query)

    # Dispatch table for search types
    search_handlers = {
        "handoffs": lambda: search_handoffs(conn, query, outcome, limit),
        "plans": lambda: search_plans(conn, query, limit),
        "continuity": lambda: search_continuity(conn, query, limit),
    }

    if search_type == "all":
        # Execute all handlers
        for key, handler in search_handlers.items():
            results[key] = handler()
    elif search_type in search_handlers:
        # Execute only the requested type
        results[search_type] = search_handlers[search_type]()

    return results


# --- End helper functions ---


def format_results(results: dict, verbose: bool = False) -> str:
    """Format search results for display."""
    output = []

    # Past queries (compound learning)
    if results.get("past_queries"):
        output.append("## Previously Asked")
        for q in results["past_queries"]:
            question = q.get("question", "")[:100]
            answer = q.get("answer", "")[:200]
            output.append(f"- **Q:** {question}...")
            output.append(f"  **A:** {answer}...")
        output.append("")

    # Handoffs
    if results.get("handoffs"):
        output.append("## Relevant Handoffs")
        for h in results["handoffs"]:
            status_icon = {
                "SUCCEEDED": "✓",
                "PARTIAL_PLUS": "◐",
                "PARTIAL_MINUS": "◑",
                "FAILED": "✗",
            }.get(h.get("outcome"), "?")
            session = h.get("session_name", "unknown")
            task = h.get("task_number", "?")
            output.append(f"### {status_icon} {session}/task-{task}")
            summary = h.get("task_summary", "")[:200]
            output.append(f"**Summary:** {summary}")
            what_worked = h.get("what_worked")
            if what_worked:
                output.append(f"**What worked:** {what_worked[:200]}")
            what_failed = h.get("what_failed")
            if what_failed:
                output.append(f"**What failed:** {what_failed[:200]}")
            output.append(f"**File:** `{h.get('file_path', '')}`")
            output.append("")

    # Plans
    if results.get("plans"):
        output.append("## Relevant Plans")
        for p in results["plans"]:
            title = p.get("title", "Untitled")
            output.append(f"### {title}")
            overview = p.get("overview", "")[:200]
            output.append(f"**Overview:** {overview}")
            output.append(f"**File:** `{p.get('file_path', '')}`")
            output.append("")

    # Continuity
    if results.get("continuity"):
        output.append("## Related Sessions")
        for c in results["continuity"]:
            session = c.get("session_name", "unknown")
            output.append(f"### Session: {session}")
            goal = c.get("goal", "")[:200]
            output.append(f"**Goal:** {goal}")
            key_learnings = c.get("key_learnings")
            if key_learnings:
                output.append(f"**Key learnings:** {key_learnings[:200]}")
            output.append("")

    if not any(results.values()):
        output.append("No relevant precedent found.")

    return "\n".join(output)


def save_query(conn: sqlite3.Connection, question: str, answer: str, matches: dict):
    """Save query for compound learning."""
    query_id = hashlib.md5(f"{question}{datetime.now().isoformat()}".encode()).hexdigest()[:12]

    conn.execute(
        """
        INSERT INTO queries (id, question, answer, handoffs_matched, plans_matched, continuity_matched)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
        (
            query_id,
            question,
            answer,
            json.dumps([h["id"] for h in matches.get("handoffs", [])]),
            json.dumps([p["id"] for p in matches.get("plans", [])]),
            json.dumps([c["id"] for c in matches.get("continuity", [])]),
        ),
    )
    conn.commit()


def main():
    """Main entry point for artifact query CLI.

    Uses helper functions for reduced complexity:
    - handle_span_id_lookup(): Handle --by-span-id mode
    - search_dispatch(): Dispatch search by type
    """
    parser = argparse.ArgumentParser(description="Search the Context Graph for relevant precedent")
    parser.add_argument("query", nargs="*", help="Search query")
    parser.add_argument("--type", choices=["handoffs", "plans", "continuity", "all"], default="all")
    parser.add_argument(
        "--outcome", choices=["SUCCEEDED", "PARTIAL_PLUS", "PARTIAL_MINUS", "FAILED"]
    )
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--db", type=str, help="Custom database path")
    parser.add_argument("--save", action="store_true", help="Save query for compound learning")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--by-span-id", type=str, help="Get handoff by Braintrust root_span_id")
    parser.add_argument("--with-content", action="store_true", help="Include full file content")

    args = parser.parse_args()

    # Handle --by-span-id mode (direct lookup, no search)
    if args.by_span_id:
        db_path = get_db_path(args.db)
        if not db_path.exists():
            print(f"Database not found: {db_path}")
            return

        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA busy_timeout = 5000")

        # Use helper function for span ID lookup
        handoff = handle_span_id_lookup(conn, args.by_span_id, with_content=args.with_content)
        conn.close()

        if args.json:
            print(json.dumps(handoff, indent=2, default=str))
        elif handoff:
            print(f"## Handoff: {handoff.get('session_name')}/task-{handoff.get('task_number')}")
            print(f"**Outcome:** {handoff.get('outcome', 'UNKNOWN')}")
            print(f"**File:** {handoff.get('file_path')}")
            if handoff.get("content"):
                print(f"\n{handoff['content']}")
        else:
            print(f"No handoff found for root_span_id: {args.by_span_id}")
        return

    # Regular search mode
    if not args.query:
        parser.print_help()
        return

    query = " ".join(args.query)

    db_path = get_db_path(args.db)
    if not db_path.exists():
        print(f"Database not found: {db_path}")
        print("Run: uv run python scripts/artifact_index.py --all")
        return

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA busy_timeout = 5000")

    # Use dispatch helper for search
    results = search_dispatch(conn, query, args.type, args.outcome, args.limit)

    if args.json:
        print(json.dumps(results, indent=2, default=str))
    else:
        formatted = format_results(results)
        print(formatted)

        if args.save:
            save_query(conn, query, formatted, results)
            print("\n[Query saved for compound learning]")

    conn.close()


if __name__ == "__main__":
    main()
