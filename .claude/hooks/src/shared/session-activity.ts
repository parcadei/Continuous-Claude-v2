/**
 * Session activity tracking for the claude-hud statusline plugin.
 *
 * Provides a shared interface for hooks and skills to log their activations
 * during a session. The HUD reads the activity file to display which hooks
 * and skills have fired.
 *
 * Storage: ~/.claude/cache/session-activity/{sessionId}.json
 *
 * Used by:
 * - session-register.ts (initializes activity file at session start)
 * - Any hook/skill that wants to log its activation
 * - claude-hud (reads activity for statusline display)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// =============================================================================
// Types
// =============================================================================

export interface ActivationEntry {
  name: string;        // e.g. "maestro", "memory-awareness"
  first_seen: string;  // ISO timestamp
  count: number;       // how many times activated
}

export interface SessionActivity {
  session_id: string;
  started_at: string;  // ISO timestamp
  skills: ActivationEntry[];
  hooks: ActivationEntry[];
  agents: ActivationEntry[];
  mcp_servers: ActivationEntry[];
}

// =============================================================================
// Path helpers
// =============================================================================

/**
 * Returns the home directory, handling Windows compatibility.
 */
function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || '/tmp';
}

/**
 * Returns the path to the activity file for a given session.
 * Creates the parent directory if it does not exist.
 *
 * @param sessionId - The session UUID
 * @returns Absolute path to ~/.claude/cache/session-activity/{sessionId}.json
 */
export function getActivityPath(sessionId: string): string {
  const dir = join(getHomeDir(), '.claude', 'cache', 'session-activity');

  try {
    mkdirSync(dir, { recursive: true });
  } catch { /* directory already exists */ }

  return join(dir, `${sessionId}.json`);
}

// =============================================================================
// Activity file operations
// =============================================================================

/**
 * Creates an empty activity file for a session.
 * Idempotent -- does not overwrite an existing file.
 *
 * @param sessionId - The session UUID
 */
export function initActivity(sessionId: string): void {
  const filePath = getActivityPath(sessionId);

  if (existsSync(filePath)) {
    return;
  }

  const activity: SessionActivity = {
    session_id: sessionId,
    started_at: new Date().toISOString(),
    skills: [],
    hooks: [],
    agents: [],
    mcp_servers: [],
  };

  writeFileSync(filePath, JSON.stringify(activity), { encoding: 'utf-8' });
}

/**
 * Reads and returns the activity data for a session.
 * Returns null if the file does not exist or contains invalid JSON.
 *
 * @param sessionId - The session UUID
 * @returns The parsed SessionActivity, or null
 */
export function readActivity(sessionId: string): SessionActivity | null {
  const filePath = getActivityPath(sessionId);

  try {
    if (!existsSync(filePath)) {
      return null;
    }

    const raw = readFileSync(filePath, 'utf-8');
    if (!raw.trim()) {
      return null;
    }

    return JSON.parse(raw) as SessionActivity;
  } catch {
    return null;
  }
}

// =============================================================================
// Logging helpers (atomic read-modify-write)
// =============================================================================

/**
 * Reads the activity file, or creates a fresh one if it doesn't exist.
 * Used internally by logSkill and logHook.
 */
function loadOrCreate(sessionId: string): SessionActivity {
  const existing = readActivity(sessionId);
  if (existing) {
    // Backfill for files created before agents/mcp_servers existed
    if (!existing.agents) existing.agents = [];
    if (!existing.mcp_servers) existing.mcp_servers = [];
    return existing;
  }

  return {
    session_id: sessionId,
    started_at: new Date().toISOString(),
    skills: [],
    hooks: [],
    agents: [],
    mcp_servers: [],
  };
}

/**
 * Adds or increments an entry in an activation array.
 * If the name already exists, increments count. Otherwise adds a new entry.
 */
function upsertEntry(entries: ActivationEntry[], name: string): void {
  const existing = entries.find(e => e.name === name);
  if (existing) {
    existing.count++;
  } else {
    entries.push({
      name,
      first_seen: new Date().toISOString(),
      count: 1,
    });
  }
}

/**
 * Logs a skill activation for the session.
 * Creates the activity file if it does not exist.
 *
 * @param sessionId - The session UUID
 * @param skillName - Name of the skill (e.g. "maestro", "systematic-debugging")
 */
export function logSkill(sessionId: string, skillName: string): void {
  const activity = loadOrCreate(sessionId);
  upsertEntry(activity.skills, skillName);

  const filePath = getActivityPath(sessionId);
  writeFileSync(filePath, JSON.stringify(activity), { encoding: 'utf-8' });
}

/**
 * Logs a hook activation for the session.
 * Creates the activity file if it does not exist.
 *
 * @param sessionId - The session UUID
 * @param hookName - Name of the hook (e.g. "session-register", "file-claims")
 */
export function logHook(sessionId: string, hookName: string): void {
  const activity = loadOrCreate(sessionId);
  upsertEntry(activity.hooks, hookName);

  const filePath = getActivityPath(sessionId);
  writeFileSync(filePath, JSON.stringify(activity), { encoding: 'utf-8' });
}

/**
 * Logs an agent spawn for the session.
 * Creates the activity file if it does not exist.
 *
 * @param sessionId - The session UUID
 * @param agentType - Type of the agent (e.g. "scout", "kraken", "oracle")
 */
export function logAgent(sessionId: string, agentType: string): void {
  const activity = loadOrCreate(sessionId);
  upsertEntry(activity.agents, agentType);

  const filePath = getActivityPath(sessionId);
  writeFileSync(filePath, JSON.stringify(activity), { encoding: 'utf-8' });
}

/**
 * Logs an MCP server usage for the session.
 * Creates the activity file if it does not exist.
 *
 * @param sessionId - The session UUID
 * @param serverName - Name of the MCP server (e.g. "nia", "github", "context7")
 */
export function logMcpServer(sessionId: string, serverName: string): void {
  const activity = loadOrCreate(sessionId);
  upsertEntry(activity.mcp_servers, serverName);

  const filePath = getActivityPath(sessionId);
  writeFileSync(filePath, JSON.stringify(activity), { encoding: 'utf-8' });
}
