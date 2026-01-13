/**
 * Memory Client for Skill Lookup
 *
 * TypeScript client that calls the Python memory service via subprocess.
 * Part of the self-improving skill system (Phase 5).
 *
 * Architecture:
 * - Uses spawnSync to call Python memory service
 * - Supports both SQLite and PostgreSQL backends
 * - Returns empty results on connection errors (graceful fallback)
 *
 * Usage:
 *   const client = new MemoryClient({ sessionId: 'abc123' });
 *   const results = client.searchSimilar('find TypeScript hooks');
 *   client.store('User prefers async/await', { type: 'preference' });
 */

import { spawnSync } from 'child_process';

/**
 * Result from a memory search operation.
 * Matches the structure returned by Python memory service.
 */
export interface MemorySearchResult {
  /** The stored content/fact */
  content: string;
  /** Similarity score (0-1) or BM25 rank for text search */
  similarity: number;
  /** Arbitrary metadata attached to the memory */
  metadata: Record<string, unknown>;
}

/**
 * Result from subprocess execution.
 */
interface SubprocessResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

/**
 * Configuration options for MemoryClient.
 */
export interface MemoryClientOptions {
  /** Session ID for memory isolation */
  sessionId?: string;
  /** Optional agent ID for agent-specific memory */
  agentId?: string | null;
  /** Subprocess timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
  /** Project directory (defaults to CLAUDE_PROJECT_DIR or cwd) */
  projectDir?: string;
}

/**
 * Memory client that calls Python memory service via subprocess.
 *
 * Provides a TypeScript interface to the 3-layer memory architecture:
 * - PostgreSQL + PGVector for persistence
 * - Embeddings for semantic search
 * - Re-ranking for relevance
 *
 * Falls back gracefully when database is unavailable.
 */
export class MemoryClient {
  private readonly sessionId: string;
  private readonly agentId: string | null;
  private readonly timeoutMs: number;
  private readonly projectDir: string;

  constructor(options: MemoryClientOptions = {}) {
    this.sessionId = options.sessionId || 'default';
    this.agentId = options.agentId || null;
    this.timeoutMs = options.timeoutMs || 5000;
    this.projectDir = options.projectDir ||
      process.env.CLAUDE_PROJECT_DIR ||
      process.cwd();
  }

  /**
   * Search for similar content in memory.
   *
   * Uses the Python memory service's search functionality.
   * Returns empty array on any error (graceful fallback).
   *
   * @param query - Natural language search query
   * @param limit - Maximum number of results (default: 5)
   * @returns Array of matching results sorted by relevance
   */
  searchSimilar(query: string, limit = 5): MemorySearchResult[] {
    if (!query || !query.trim()) {
      return [];
    }

    const pythonScript = this.buildSearchScript();
    const args = [query, String(limit), this.sessionId];

    if (this.agentId) {
      args.push(this.agentId);
    }

    const result = this.runPython(pythonScript, args);

    if (!result.success) {
      // Log error for debugging but don't crash
      if (process.env.DEBUG) {
        console.error('Memory search failed:', result.stderr);
      }
      return [];
    }

    try {
      const parsed = JSON.parse(result.stdout);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(this.normalizeResult);
    } catch {
      return [];
    }
  }

  /**
   * Store content in memory.
   *
   * @param content - The content to store
   * @param metadata - Optional metadata to attach
   * @returns Memory ID if successful, null on failure
   */
  store(content: string, metadata: Record<string, unknown> = {}): string | null {
    if (!content || !content.trim()) {
      return null;
    }

    const pythonScript = this.buildStoreScript();
    const args = [
      content,
      JSON.stringify(metadata),
      this.sessionId,
    ];

    if (this.agentId) {
      args.push(this.agentId);
    }

    const result = this.runPython(pythonScript, args);

    if (!result.success) {
      if (process.env.DEBUG) {
        console.error('Memory store failed:', result.stderr);
      }
      return null;
    }

    try {
      const parsed = JSON.parse(result.stdout);
      return parsed.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if memory service is available.
   *
   * @returns true if memory service is reachable
   */
  isAvailable(): boolean {
    const pythonScript = `
import json
import sys
try:
    from scripts.core.db.memory_factory import get_default_backend
    backend = get_default_backend()
    print(json.dumps({"available": True, "backend": backend}))
except Exception as e:
    print(json.dumps({"available": False, "error": str(e)}))
`;

    const result = this.runPython(pythonScript, []);

    if (!result.success) {
      return false;
    }

    try {
      const parsed = JSON.parse(result.stdout);
      return parsed.available === true;
    } catch {
      return false;
    }
  }

  /**
   * Build Python script for memory search.
   */
  private buildSearchScript(): string {
    return `
import json
import sys
import asyncio
import os

# Add project to path for imports
project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
sys.path.insert(0, project_dir)

async def search():
    query = sys.argv[1]
    limit = int(sys.argv[2])
    session_id = sys.argv[3]
    agent_id = sys.argv[4] if len(sys.argv) > 4 else None

    try:
        from scripts.core.db.memory_factory import create_default_memory_service
        memory = create_default_memory_service(session_id)

        await memory.connect()

        # Try vector search first, fall back to text search
        results = await memory.search(query, limit=limit)

        await memory.close()

        # Convert to JSON-safe format with normalized field names
        safe_results = []
        for r in results:
            safe_results.append({
                "content": r.get("content", ""),
                # Use similarity if available, otherwise rank (BM25)
                "similarity": float(r.get("similarity", r.get("rank", 0.0))),
                "metadata": r.get("metadata", {})
            })

        print(json.dumps(safe_results))
    except Exception as e:
        # Return empty array on error - graceful fallback
        print(json.dumps([]))
        sys.exit(0)  # Exit 0 to avoid breaking the hook

asyncio.run(search())
`;
  }

  /**
   * Build Python script for memory store.
   */
  private buildStoreScript(): string {
    return `
import json
import sys
import asyncio
import os

# Add project to path for imports
project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
sys.path.insert(0, project_dir)

async def store():
    content = sys.argv[1]
    metadata = json.loads(sys.argv[2])
    session_id = sys.argv[3]
    agent_id = sys.argv[4] if len(sys.argv) > 4 else None

    try:
        from scripts.core.db.memory_factory import create_default_memory_service
        memory = create_default_memory_service(session_id)

        await memory.connect()

        memory_id = await memory.store(content, metadata=metadata)

        await memory.close()

        print(json.dumps({"id": memory_id}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

asyncio.run(store())
`;
  }

  /**
   * Execute Python script via subprocess.
   */
  private runPython(script: string, args: string[]): SubprocessResult {
    try {
      const result = spawnSync('python3', ['-c', script, ...args], {
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
        timeout: this.timeoutMs,
        cwd: this.projectDir,
        env: {
          ...process.env,
          CLAUDE_PROJECT_DIR: this.projectDir,
        },
      });

      return {
        success: result.status === 0,
        stdout: result.stdout?.trim() || '',
        stderr: result.stderr || '',
      };
    } catch (err) {
      return {
        success: false,
        stdout: '',
        stderr: String(err),
      };
    }
  }

  /**
   * Normalize a search result to the standard interface.
   */
  private normalizeResult(raw: Record<string, unknown>): MemorySearchResult {
    return {
      content: String(raw.content || ''),
      similarity: typeof raw.similarity === 'number' ? raw.similarity : 0,
      metadata: (raw.metadata as Record<string, unknown>) || {},
    };
  }
}

/**
 * Convenience function to search memory.
 *
 * Creates a temporary client and performs a search.
 *
 * @param query - Search query
 * @param limit - Maximum results
 * @param options - Client options
 * @returns Array of matching results
 */
export function searchMemory(
  query: string,
  limit = 5,
  options: MemoryClientOptions = {}
): MemorySearchResult[] {
  const client = new MemoryClient(options);
  return client.searchSimilar(query, limit);
}

/**
 * Convenience function to store in memory.
 *
 * Creates a temporary client and stores content.
 *
 * @param content - Content to store
 * @param metadata - Metadata to attach
 * @param options - Client options
 * @returns Memory ID or null on failure
 */
export function storeMemory(
  content: string,
  metadata: Record<string, unknown> = {},
  options: MemoryClientOptions = {}
): string | null {
  const client = new MemoryClient(options);
  return client.store(content, metadata);
}

/**
 * Check if memory service is available.
 *
 * @param options - Client options
 * @returns true if available
 */
export function isMemoryAvailable(options: MemoryClientOptions = {}): boolean {
  const client = new MemoryClient(options);
  return client.isAvailable();
}

/**
 * Usage tracking record for memory adaptation (Phase 18).
 */
export interface UsageRecord {
  /** Type of usage event */
  type: 'skill_match' | 'memory_match' | 'jit_generation';
  /** Name of the skill used (if applicable) */
  skillName?: string;
  /** Source of the match */
  source: 'keyword' | 'intent' | 'memory' | 'jit';
  /** Confidence score */
  confidence: number;
  /** Timestamp of usage */
  timestamp: string;
  /** Session ID where usage occurred */
  sessionId: string;
}

/**
 * Track usage of a skill or memory match.
 *
 * Per plan Phase 18:
 * - Track that this pattern worked
 * - Boost its relevance for future searches
 * - Store decision trace
 *
 * Stores a usage record in memory for future learning.
 *
 * @param record - Usage record to store
 * @param options - Client options
 * @returns Memory ID if successful, null on failure
 */
export function trackUsage(
  record: UsageRecord,
  options: MemoryClientOptions = {}
): string | null {
  const content = `Skill usage: ${record.skillName || 'unknown'} via ${record.source} (confidence: ${record.confidence.toFixed(2)})`;
  const metadata = {
    type: 'skill_usage',
    usageType: record.type,
    skillName: record.skillName,
    source: record.source,
    confidence: record.confidence,
    timestamp: record.timestamp,
    sessionId: record.sessionId,
  };

  return storeMemory(content, metadata, options);
}

/**
 * Record that a skill match was used successfully.
 *
 * Convenience function that creates a usage record for a skill match.
 * This helps boost the skill's relevance for future searches.
 *
 * @param skillName - Name of the matched skill
 * @param source - How the skill was matched (keyword/intent/memory)
 * @param confidence - Confidence score of the match
 * @param sessionId - Current session ID
 * @param options - Client options
 * @returns Memory ID if successful, null on failure
 */
export function recordSkillUsage(
  skillName: string,
  source: 'keyword' | 'intent' | 'memory',
  confidence: number,
  sessionId: string,
  options: MemoryClientOptions = {}
): string | null {
  const record: UsageRecord = {
    type: 'skill_match',
    skillName,
    source,
    confidence,
    timestamp: new Date().toISOString(),
    sessionId,
  };
  return trackUsage(record, options);
}
