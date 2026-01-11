/**
 * SessionStart Hook: Dead Code Detection
 *
 * On session startup/resume, runs `tldr dead` to detect unused functions
 * and emits a warning if dead code is found.
 *
 * This helps developers identify cleanup opportunities at the start of work.
 */

import { readFileSync, existsSync } from 'fs';
import { queryDaemonSync, trackHookActivitySync } from './daemon-client.js';

interface SessionStartInput {
  session_id: string;
  hook_event_name: string;
  source: 'startup' | 'resume' | 'clear' | 'compact';
  cwd: string;
}

interface DeadFunction {
  name: string;
  file: string;
  line?: number;
}

interface DeadCodeResult {
  dead_functions: DeadFunction[];
  count: number;
}

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

// Query daemon for dead code analysis (fast - uses in-memory indexes)
function getDeadCode(projectPath: string): DeadCodeResult | null {
  try {
    const response = queryDaemonSync({ cmd: 'dead', language: 'python' }, projectPath);

    // Handle daemon unavailable or errors
    if (response.status === 'unavailable' || response.status === 'error') {
      return null;
    }

    // Handle indexing state
    if (response.indexing) {
      return null;
    }

    // Parse result from daemon
    const result = response.result;
    if (!result) {
      return { dead_functions: [], count: 0 };
    }

    // Transform from daemon format to our format
    const deadFunctions: DeadFunction[] = [];
    if (result.dead_functions && Array.isArray(result.dead_functions)) {
      for (const f of result.dead_functions) {
        deadFunctions.push({
          name: f.function || f.name,
          file: f.file,
          line: f.line,
        });
      }
    }

    return {
      dead_functions: deadFunctions,
      count: result.total_dead || deadFunctions.length,
    };
  } catch {
    return null;
  }
}

// Format warning message
function formatWarning(result: DeadCodeResult): string {
  if (result.count === 0) {
    return '';
  }

  const lines: string[] = [
    `Dead code detected (${result.count} unused function${result.count === 1 ? '' : 's'}):`,
  ];

  // Show up to 5 functions
  const shown = result.dead_functions.slice(0, 5);
  for (const func of shown) {
    const location = func.line ? `${func.file}:${func.line}` : func.file;
    lines.push(`  - ${func.name} in ${location}`);
  }

  if (result.count > 5) {
    lines.push(`  ... and ${result.count - 5} more`);
  }

  lines.push('');
  lines.push('Consider removing or use `tldr dead .` for full list.');

  return lines.join('\n');
}

async function main() {
  const input: SessionStartInput = JSON.parse(readStdin());

  // Only run on startup/resume (not clear/compact)
  if (!['startup', 'resume'].includes(input.source)) {
    console.log('{}');
    return;
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;

  // Skip if no project directory
  if (!projectDir || !existsSync(projectDir)) {
    console.log('{}');
    return;
  }

  // Get dead code
  const result = getDeadCode(projectDir);

  if (!result || result.count === 0) {
    // No dead code or tldr not available - silent exit
    console.log('{}');
    return;
  }

  // Track hook activity for flush threshold
  trackHookActivitySync('session-start-dead-code', projectDir, true, {
    sessions_checked: 1,
    dead_found: result.count,
  });

  // Emit warning message
  const warning = formatWarning(result);
  console.log(warning);
}

main().catch(() => {
  // Silent fail - don't block session start
  console.log('{}');
});
