/**
 * hook-health-monitor.ts — SessionStart hook
 *
 * Validates all registered hooks are healthy at session start.
 * Checks that dist files exist and are not stale (src newer than dist).
 * Reports broken/stale hooks with specific fix commands.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Types
// ============================================

export interface HookFileInfo {
  distPath: string;
  srcPath: string;
  hookEvent: string;
  hookName: string;
  matcher?: string;
}

export interface HookHealthResult {
  hookName: string;
  status: 'healthy' | 'missing' | 'stale';
  hookEvent: string;
}

interface HookEntry {
  type?: string;
  command?: string;
  timeout?: number;
}

interface HookGroup {
  matcher?: string;
  hooks: HookEntry[];
}

interface SettingsJson {
  hooks?: Record<string, HookGroup[]>;
  [key: string]: unknown;
}

interface SessionStartInput {
  type?: string;
  source?: string;
  session_id?: string;
}

// ============================================
// Core Logic (exported for testing)
// ============================================

/**
 * Parse settings.json to extract all hook dist file references.
 * Only extracts commands that reference .mjs files inside a hooks/dist/ directory.
 * Deduplicates by dist path.
 */
export function parseHookCommands(settings: SettingsJson): HookFileInfo[] {
  const hooks = settings.hooks;
  if (!hooks || typeof hooks !== 'object') {
    return [];
  }

  const seen = new Set<string>();
  const results: HookFileInfo[] = [];

  for (const [eventName, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;

    for (const group of groups) {
      if (!group.hooks || !Array.isArray(group.hooks)) continue;

      for (const hook of group.hooks) {
        if (hook.type !== 'command' || !hook.command) continue;

        // Extract file path from "node <path>" commands
        const distPath = extractDistPath(hook.command);
        if (!distPath) continue;

        // Deduplicate
        if (seen.has(distPath)) continue;
        seen.add(distPath);

        const hookName = path.basename(distPath, '.mjs');
        const srcPath = deriveSrcPath(distPath);

        results.push({
          distPath,
          srcPath,
          hookEvent: eventName,
          hookName,
          matcher: group.matcher,
        });
      }
    }
  }

  return results;
}

/**
 * Extract the dist file path from a hook command string.
 * Only matches "node <path>" where path ends in .mjs and is inside a hooks/dist/ directory.
 * Returns null for non-file commands (python, inline scripts, plugins, etc.)
 */
function extractDistPath(command: string): string | null {
  // Match: node <path-to-hooks/dist/something.mjs>
  // The path must contain hooks/dist/ to distinguish from plugin commands
  const match = command.match(/^node\s+(.+\.mjs)\s*$/);
  if (!match) return null;

  const filePath = match[1].trim();

  // Must be in a hooks/dist/ directory
  const normalized = filePath.replace(/\\/g, '/');
  if (!normalized.includes('hooks/dist/')) return null;

  return filePath;
}

/**
 * Derive the corresponding .ts source path from a .mjs dist path.
 * Converts hooks/dist/name.mjs -> hooks/src/name.ts
 */
function deriveSrcPath(distPath: string): string {
  const normalized = distPath.replace(/\\/g, '/');
  const srcPath = normalized
    .replace('/hooks/dist/', '/hooks/src/')
    .replace(/\.mjs$/, '.ts');
  return srcPath;
}

/**
 * Check the health of a single hook by examining its dist and src files.
 *
 * Returns:
 * - 'healthy': dist exists and is not stale (or no src to compare)
 * - 'missing': dist file does not exist
 * - 'stale': dist exists but src is newer (needs rebuild)
 */
export function checkHookHealth(hookInfo: HookFileInfo): HookHealthResult {
  const { distPath, srcPath, hookEvent, hookName } = hookInfo;

  // Check if dist file exists
  if (!fs.existsSync(distPath)) {
    return { hookName, status: 'missing', hookEvent };
  }

  // Check if src file exists for staleness comparison
  if (!fs.existsSync(srcPath)) {
    // Dist exists but no src (plugin or external) - consider healthy
    return { hookName, status: 'healthy', hookEvent };
  }

  // Compare mtimes: if src is newer than dist, build is stale
  const distMtime = fs.statSync(distPath).mtime.getTime();
  const srcMtime = fs.statSync(srcPath).mtime.getTime();

  if (srcMtime > distMtime) {
    return { hookName, status: 'stale', hookEvent };
  }

  return { hookName, status: 'healthy', hookEvent };
}

/**
 * Format the health check results into a human-readable report.
 */
export function formatHealthReport(results: HookHealthResult[]): string {
  if (results.length === 0) {
    return 'Hook Health: No hooks registered';
  }

  const healthy = results.filter(r => r.status === 'healthy');
  const issues = results.filter(r => r.status !== 'healthy');

  if (issues.length === 0) {
    return `Hook Health: All ${results.length} hooks healthy`;
  }

  const lines: string[] = [];
  const issueWord = issues.length === 1 ? 'issue' : 'issues';
  lines.push(`Hook Health: ${healthy.length}/${results.length} healthy, ${issues.length} ${issueWord} found`);

  for (const issue of issues) {
    if (issue.status === 'missing') {
      lines.push(`- MISSING: ${issue.hookName}.mjs (fix: npm run build)`);
    } else if (issue.status === 'stale') {
      lines.push(`- STALE: ${issue.hookName}.mjs (src newer than dist, fix: npm run build)`);
    }
  }

  return lines.join('\n');
}

// ============================================
// Main entry point (SessionStart hook)
// ============================================

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  let input: SessionStartInput;
  try {
    const stdin = await readStdin();
    input = stdin ? JSON.parse(stdin) : { session_id: 'unknown' };
  } catch {
    input = { session_id: 'unknown' };
  }

  try {
    // Determine settings.json path
    const userProfile = process.env.USERPROFILE || process.env.HOME || '';
    const settingsPath = path.join(userProfile, '.claude', 'settings.json');

    if (!fs.existsSync(settingsPath)) {
      // No settings.json - nothing to check
      console.log(JSON.stringify({ result: 'continue' }));
      return;
    }

    let settings: SettingsJson;
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    } catch {
      // Malformed settings.json - skip health check
      console.error('hook-health-monitor: Could not parse settings.json');
      console.log(JSON.stringify({ result: 'continue' }));
      return;
    }

    // Parse all hook commands from settings
    const hookFiles = parseHookCommands(settings);

    if (hookFiles.length === 0) {
      console.log(JSON.stringify({ result: 'continue' }));
      return;
    }

    // Check health of each hook
    const results = hookFiles.map(hf => checkHookHealth(hf));

    // Format the report
    const report = formatHealthReport(results);

    // Only inject context if there are issues (keep startup quiet when healthy)
    const hasIssues = results.some(r => r.status !== 'healthy');

    const output: Record<string, unknown> = { result: 'continue' };

    if (hasIssues) {
      output.hookSpecificOutput = {
        hookEventName: 'SessionStart',
        additionalContext: report,
      };
      // Also log to stderr for visibility
      console.error(report);
    } else {
      // Healthy - brief stderr note, no context injection
      console.error(`Hook Health: All ${results.length} hooks healthy`);
    }

    console.log(JSON.stringify(output));
  } catch (err) {
    console.error(`hook-health-monitor error: ${err}`);
    console.log(JSON.stringify({ result: 'continue' }));
  }
}

main().catch((err) => {
  console.error(err);
  console.log(JSON.stringify({ result: 'continue' }));
});
