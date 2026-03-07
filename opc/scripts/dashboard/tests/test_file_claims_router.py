"""Tests for file claims router endpoints."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


def _make_mock_pool(rows):
    """Create a mock pool that returns rows from conn.fetch."""
    mock_conn = MagicMock()
    mock_conn.fetch = AsyncMock(return_value=rows)

    mock_ctx = MagicMock()
    mock_ctx.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_ctx.__aexit__ = AsyncMock(return_value=False)

    mock_pool = MagicMock()
    mock_pool.acquire.return_value = mock_ctx

    return mock_pool, mock_conn


@pytest.fixture
def client():
    """Create test client with mocked database pool."""
    with patch("dashboard.main.get_pool", new_callable=AsyncMock):
        with patch("dashboard.main.close_pool", new_callable=AsyncMock):
            from dashboard.main import app
            with TestClient(app) as c:
                yield c


class TestFileClaimsActiveEndpoint:
    """Tests for GET /api/file-claims/active endpoint."""

    def test_returns_active_claims(self, client):
        """Active claims endpoint returns claims with recent heartbeats."""
        now = datetime.now(timezone.utc)
        mock_rows = [
            {
                "file_path": "/c/Users/david.hayes/project/src/main.ts",
                "session_id": "sess-001",
                "project": "continuous-claude",
                "claimed_at": now - timedelta(minutes=2),
            },
            {
                "file_path": "/c/Users/david.hayes/project/src/utils.ts",
                "session_id": "sess-001",
                "project": "continuous-claude",
                "claimed_at": now - timedelta(minutes=1),
            },
        ]

        mock_pool, _ = _make_mock_pool(mock_rows)

        with patch("dashboard.routers.file_claims.get_pool", AsyncMock(return_value=mock_pool)):
            response = client.get("/api/file-claims/active")

        assert response.status_code == 200
        data = response.json()
        assert "claims" in data
        assert "total" in data
        assert len(data["claims"]) == 2
        assert data["total"] == 2

    def test_returns_claim_fields(self, client):
        """Each claim has file_path, session_id, project, claimed_at."""
        now = datetime.now(timezone.utc)
        mock_rows = [
            {
                "file_path": "/c/Users/david.hayes/project/src/main.ts",
                "session_id": "sess-abc",
                "project": "my-project",
                "claimed_at": now,
            },
        ]

        mock_pool, _ = _make_mock_pool(mock_rows)

        with patch("dashboard.routers.file_claims.get_pool", AsyncMock(return_value=mock_pool)):
            response = client.get("/api/file-claims/active")

        assert response.status_code == 200
        claim = response.json()["claims"][0]
        assert claim["file_path"] == "/c/Users/david.hayes/project/src/main.ts"
        assert claim["session_id"] == "sess-abc"
        assert claim["project"] == "my-project"
        assert "claimed_at" in claim

    def test_returns_empty_when_no_claims(self, client):
        """Returns empty list when no active file claims exist."""
        mock_pool, _ = _make_mock_pool([])

        with patch("dashboard.routers.file_claims.get_pool", AsyncMock(return_value=mock_pool)):
            response = client.get("/api/file-claims/active")

        assert response.status_code == 200
        data = response.json()
        assert data["claims"] == []
        assert data["total"] == 0

    def test_groups_by_project(self, client):
        """Response includes by_project grouping."""
        now = datetime.now(timezone.utc)
        mock_rows = [
            {
                "file_path": "src/a.ts",
                "session_id": "sess-1",
                "project": "project-alpha",
                "claimed_at": now,
            },
            {
                "file_path": "src/b.ts",
                "session_id": "sess-1",
                "project": "project-alpha",
                "claimed_at": now,
            },
            {
                "file_path": "src/c.py",
                "session_id": "sess-2",
                "project": "project-beta",
                "claimed_at": now,
            },
        ]

        mock_pool, _ = _make_mock_pool(mock_rows)

        with patch("dashboard.routers.file_claims.get_pool", AsyncMock(return_value=mock_pool)):
            response = client.get("/api/file-claims/active")

        assert response.status_code == 200
        data = response.json()
        assert "by_project" in data
        assert data["by_project"]["project-alpha"] == 2
        assert data["by_project"]["project-beta"] == 1

    def test_handles_db_error_gracefully(self, client):
        """Returns error response when database is unavailable."""
        with patch(
            "dashboard.routers.file_claims.get_pool",
            AsyncMock(side_effect=Exception("Connection refused")),
        ):
            response = client.get("/api/file-claims/active")

        assert response.status_code == 200
        data = response.json()
        assert data["claims"] == []
        assert data["total"] == 0
        assert "error" in data

    def test_sql_joins_sessions_for_project(self, client):
        """Verify the SQL query joins with sessions table."""
        mock_pool, mock_conn = _make_mock_pool([])

        with patch("dashboard.routers.file_claims.get_pool", AsyncMock(return_value=mock_pool)):
            client.get("/api/file-claims/active")

        # Verify the SQL was called and includes a JOIN
        call_args = mock_conn.fetch.call_args
        sql = call_args[0][0]
        assert "sessions" in sql.lower()
        assert "join" in sql.lower()
