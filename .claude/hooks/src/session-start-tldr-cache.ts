/**
 * SessionStart Hook: TLDR Cache Awareness
 *
 * On session startup, checks if TLDR caches exist and emits a system reminder.
 * Does NOT load the full JSON - just notifies Claude that caches are available.
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { queryDaemonSync, trackHookActivitySync } from './daemon-client.js';

interface SessionStartInput {
  session_id: string;
  hook_event_name: string;
  source: 'startup' | 'resume' | 'clear' | 'compact';
  cwd: string;
}

interface TldrCacheMeta {
  cached_at: string;
  project: string;
}

interface CacheStatus {
  exists: boolean;
  age_hours?: number;
  files: {
    arch: boolean;
    calls: boolean;
    dead: boolean;
  };
}

interface SemanticIndexStatus {
  exists: boolean;
  path: string;
}

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

function getSemanticIndexStatus(projectDir: string): SemanticIndexStatus {
  // Check for FAISS index at .tldr/cache/semantic/index.faiss
  const indexPath = join(projectDir, '.tldr', 'cache', 'semantic', 'index.faiss');
  return {
    exists: existsSync(indexPath),
    path: indexPath
  };
}

function getCacheStatus(projectDir: string): CacheStatus {
  const cacheDir = join(projectDir, '.claude', 'cache', 'tldr');

  if (!existsSync(cacheDir)) {
    return { exists: false, files: { arch: false, calls: false, dead: false } };
  }

  const archPath = join(cacheDir, 'arch.json');
  const callsPath = join(cacheDir, 'call_graph.json');
  const deadPath = join(cacheDir, 'dead.json');
  const metaPath = join(cacheDir, 'meta.json');

  const files = {
    arch: existsSync(archPath) && statSync(archPath).size > 10,
    calls: existsSync(callsPath) && statSync(callsPath).size > 10,
    dead: existsSync(deadPath) && statSync(deadPath).size > 2,
  };

  let age_hours: number | undefined;
  if (existsSync(metaPath)) {
    try {
      const meta: TldrCacheMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      const cachedAt = new Date(meta.cached_at);
      age_hours = Math.round((Date.now() - cachedAt.getTime()) / (1000 * 60 * 60));
    } catch {
      // Ignore parse errors
    }
  }

  return {
    exists: files.arch || files.calls || files.dead,
    age_hours,
    files
  };
}

async function main() {
  const input: SessionStartInput = JSON.parse(readStdin());

  // Only run on startup/resume (not clear/compact)
  if (!['startup', 'resume'].includes(input.source)) {
    console.log('{}');
    return;
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const cache = getCacheStatus(projectDir);

  // Warm the cache if stale (> 24h) or missing
  const shouldWarm = !cache.exists || (cache.age_hours !== undefined && cache.age_hours > 24);
  let warmStatus = '';

  if (shouldWarm) {
    try {
      const warmResponse = queryDaemonSync({ cmd: 'warm' }, projectDir);
      if (warmResponse.status === 'ok') {
        warmStatus = ' 🔥 Cache warmed!';
      } else if (warmResponse.indexing) {
        warmStatus = ' ⏳ Warming in progress...';
      }
    } catch {
      // Warm failed silently - don't block
    }
  }

  if (!cache.exists && !warmStatus) {
    // No cache and warm failed - silent exit
    console.log('{}');
    return;
  }

  // Build status message
  const available: string[] = [];
  if (cache.files.arch) available.push('arch');
  if (cache.files.calls) available.push('calls');
  if (cache.files.dead) available.push('dead');

  const ageStr = cache.age_hours !== undefined
    ? ` (${cache.age_hours}h old)`
    : '';

  const freshness = cache.age_hours !== undefined && cache.age_hours > 168
    ? ' ⚠️ STALE'
    : '';

  // Check semantic index
  const semantic = getSemanticIndexStatus(projectDir);
  const semanticWarning = semantic.exists
    ? ''
    : '\n⚠️ No semantic index found. Run `tldr semantic index .` for AI-powered code search.';

  // Track hook activity for flush threshold
  trackHookActivitySync('session-start-tldr-cache', projectDir, true, {
    sessions_started: 1,
    cache_warmed: shouldWarm && warmStatus.includes('warmed') ? 1 : 0,
  });

  // Emit system message - don't load full JSON, just notify availability
  const cacheInfo = cache.exists ? `${available.join(', ')}` : 'building...';
  const message = `📊 TLDR cache${ageStr}${freshness}${warmStatus}: ${cacheInfo}${semanticWarning}`;

  // Output as system reminder (not full context injection)
  console.log(message);
}

main().catch(() => {
  // Silent fail - don't block session start
  console.log('{}');
});
