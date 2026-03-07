/**
 * Skill Usage Tracking
 *
 * Tracks skill and memory match usage for the self-improving skill system (Phase 18).
 * Extracted from memory-client.ts to separate concerns.
 *
 * Records which skills were matched, how they were found, and confidence levels.
 * This data feeds back into skill relevance ranking for future searches.
 */

import { storeMemory, type MemoryClientOptions } from './memory-client.js';

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
