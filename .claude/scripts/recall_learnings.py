#!/usr/bin/env python3
"""
Global Memory Recall Script (Bundled Version)

Self-contained script for ~/.claude/scripts/ that works from any project directory.
- PostgreSQL: If DATABASE_URL or OPC_POSTGRES_URL is set (requires asyncpg)
- SQLite: Default fallback at ~/.claude/memory.db (built-in, zero deps)

Usage:
    python recall_learnings.py --query "search terms" [--k 5] [--json] [--text-only]
"""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any


def get_sqlite_path() -> Path:
    """Global SQLite database location."""
    return Path.home() / ".claude" / "memory.db"


def get_postgres_url() -> str | None:
    """Check for PostgreSQL configuration."""
    return os.environ.get("DATABASE_URL") or os.environ.get("OPC_POSTGRES_URL")


def search_sqlite(query: str, k: int = 5) -> list[dict[str, Any]]:
    """Search using SQLite FTS5 (built-in, zero deps)."""
    db_path = get_sqlite_path()

    if not db_path.exists():
        return []

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    try:
        # Check if FTS table exists
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='learnings_fts'"
        )
        if not cursor.fetchone():
            # Fallback to LIKE search on regular table
            cursor = conn.execute(
                """
                SELECT id, session_id, content, learning_type, created_at
                FROM learnings
                WHERE content LIKE ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (f"%{query}%", k)
            )
        else:
            # Use FTS5 with BM25 ranking
            cursor = conn.execute(
                """
                SELECT l.id, l.session_id, l.content, l.learning_type, l.created_at,
                       bm25(learnings_fts) as score
                FROM learnings_fts fts
                JOIN learnings l ON fts.rowid = l.id
                WHERE learnings_fts MATCH ?
                ORDER BY score
                LIMIT ?
                """,
                (query, k)
            )

        results = []
        for row in cursor:
            results.append({
                "id": str(row["id"]),
                "session_id": row["session_id"],
                "content": row["content"],
                "type": row["learning_type"] if "learning_type" in row.keys() else "UNKNOWN",
                "score": abs(row["score"]) if "score" in row.keys() else 0.5,
            })
        return results
    finally:
        conn.close()


def search_postgres(query: str, k: int = 5) -> list[dict[str, Any]]:
    """Search using PostgreSQL FTS (requires asyncpg)."""
    try:
        import asyncio
        import asyncpg
    except ImportError:
        print("PostgreSQL requires asyncpg: pip install asyncpg", file=sys.stderr)
        return []

    async def _search():
        url = get_postgres_url()
        conn = await asyncpg.connect(url)

        try:
            # Strip meta-words and build OR query
            meta_words = {'help', 'want', 'need', 'show', 'tell', 'find', 'look', 'please', 'with', 'for'}
            clean_query = query.lower().replace('-', ' ')
            clean_query = ' '.join(w for w in clean_query.split() if w not in meta_words)
            if not clean_query.strip():
                clean_query = query

            # Build OR-based tsquery
            words = [w for w in clean_query.split() if len(w) > 2]
            if not words:
                words = clean_query.split()[:1] or [query.split()[0]]
            or_query = ' | '.join(words)

            rows = await conn.fetch(
                """
                SELECT
                    id,
                    session_id,
                    content,
                    metadata,
                    created_at,
                    ts_rank(to_tsvector('english', content), to_tsquery('english', $1)) as similarity
                FROM archival_memory
                WHERE metadata->>'type' = 'session_learning'
                    AND to_tsvector('english', content) @@ to_tsquery('english', $1)
                ORDER BY similarity DESC, created_at DESC
                LIMIT $2
                """,
                or_query,
                k,
            )

            # Fallback to ILIKE if no FTS results
            if not rows:
                first_word = query.split()[0] if query.split() else query
                search_pattern = f"%{first_word}%"
                rows = await conn.fetch(
                    """
                    SELECT id, session_id, content, metadata, created_at, 0.1 as similarity
                    FROM archival_memory
                    WHERE metadata->>'type' = 'session_learning'
                        AND content ILIKE $3
                    ORDER BY created_at DESC
                    LIMIT $2
                    """,
                    first_word,
                    k,
                    search_pattern,
                )

            results = []
            for row in rows:
                metadata = row["metadata"]
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)

                results.append({
                    "id": str(row["id"]),
                    "session_id": row["session_id"],
                    "content": row["content"],
                    "type": metadata.get("learning_type", "UNKNOWN") if metadata else "UNKNOWN",
                    "score": float(row["similarity"]),
                })
            return results
        finally:
            await conn.close()

    return asyncio.run(_search())


def search(query: str, k: int = 5) -> list[dict[str, Any]]:
    """Search learnings - auto-selects PostgreSQL or SQLite."""
    if get_postgres_url():
        return search_postgres(query, k)
    return search_sqlite(query, k)


def main():
    parser = argparse.ArgumentParser(description="Search memory for learnings")
    parser.add_argument("--query", "-q", required=True, help="Search query")
    parser.add_argument("--k", type=int, default=5, help="Number of results")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--text-only", action="store_true", help="Text search only (ignored, for compat)")
    args = parser.parse_args()

    results = search(args.query, args.k)

    if args.json:
        print(json.dumps({"results": results}))
    else:
        for i, r in enumerate(results, 1):
            print(f"\n--- Result {i} (score: {r['score']:.3f}) ---")
            print(f"Type: {r['type']}")
            print(f"Content: {r['content'][:200]}...")

    return 0


if __name__ == "__main__":
    sys.exit(main())
