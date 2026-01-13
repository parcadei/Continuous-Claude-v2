-- Migration: Add Missing Indexes to Coordination Tables
-- Generated: 2026-01-12
-- Purpose: Optimize queries on sessions and file_claims tables
-- Prerequisite: Run after init-db.sql has created the base tables

-- ============================================================================
-- SESSIONS TABLE INDEXES
-- ============================================================================

-- Index for stale session detection (memory_daemon.py)
-- Query: SELECT id, project FROM sessions WHERE last_heartbeat < %s AND memory_extracted_at IS NULL
-- This is the PRIMARY performance bottleneck - runs every 60 seconds
CREATE INDEX IF NOT EXISTS idx_sessions_heartbeat_extracted
ON sessions(last_heartbeat, memory_extracted_at);

-- Index for project-filtered session queries
-- Query: SELECT * FROM sessions WHERE project = %s ORDER BY last_heartbeat DESC
-- Used by cross-terminal coordination to find sessions per project
CREATE INDEX IF NOT EXISTS idx_sessions_project_heartbeat
ON sessions(project, last_heartbeat DESC);

-- Index for listing recent sessions (braintrust_analyze.py)
-- Query: SELECT * FROM sessions ORDER BY last_heartbeat DESC LIMIT N
CREATE INDEX IF NOT EXISTS idx_sessions_last_heartbeat
ON sessions(last_heartbeat DESC);

-- ============================================================================
-- FILE_CLAIMS TABLE INDEXES
-- ============================================================================

-- Index for project-scoped file lookups
-- Query: SELECT * FROM file_claims WHERE project = %s
-- Used to find all files claimed in a project
CREATE INDEX IF NOT EXISTS idx_file_claims_project
ON file_claims(project);

-- Index for session-scoped cleanup
-- Query: DELETE FROM file_claims WHERE session_id = %s
-- Used to release file claims when a session ends
CREATE INDEX IF NOT EXISTS idx_file_claims_session
ON file_claims(session_id);

-- Note: file_claims already has PRIMARY KEY (file_path, project) which covers:
--   - SELECT * FROM file_claims WHERE file_path = %s AND project = %s
--   - INSERT ... ON CONFLICT DO UPDATE (file_path, project)

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all indexes on coordination tables
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('sessions', 'file_claims');
