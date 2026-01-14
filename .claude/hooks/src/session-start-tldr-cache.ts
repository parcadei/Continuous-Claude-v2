/**
 * SessionStart Hook: TLDR Cache Warming (Async)
 *
 * On session startup, triggers cache warming in a detached background process.
 * Returns immediately to avoid blocking startup.
 *
 * The daemon will warm the cache asynchronously. First TLDR command
 * will use the warmed cache or trigger on-demand indexing.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

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

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

function getCacheAge(projectDir: string): number | undefined {
  const metaPath = join(projectDir, '.claude', 'cache', 'tldr', 'meta.json');
  if (!existsSync(metaPath)) return undefined;

  try {
    const meta: TldrCacheMeta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    const cachedAt = new Date(meta.cached_at);
    return Math.round((Date.now() - cachedAt.getTime()) / (1000 * 60 * 60));
  } catch {
    return undefined;
  }
}

function isCacheStale(projectDir: string): boolean {
  const cacheDir = join(projectDir, '.claude', 'cache', 'tldr');
  if (!existsSync(cacheDir)) return true;

  const age = getCacheAge(projectDir);
  return age === undefined || age > 24; // Stale if >24h old or missing
}

function main() {
  let input: SessionStartInput;
  try {
    input = JSON.parse(readStdin());
  } catch {
    console.log('{}');
    return;
  }

  // Only run on startup/resume (not clear/compact)
  if (!['startup', 'resume'].includes(input.source)) {
    console.log('{}');
    return;
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;

  // Warm cache in detached background process if stale
  // Uses spawn with detached:true so process exits immediately
  if (isCacheStale(projectDir)) {
    // Cross-platform: use tldr daemon warm command
    const child = spawn('tldr', ['daemon', 'warm', '--project', projectDir], {
      detached: true,
      stdio: 'ignore',
      shell: process.platform === 'win32', // Shell needed on Windows
    });
    child.unref(); // Allow parent to exit immediately
  }

  // Return immediately - don't block startup
  console.log('{}');
}

main();
