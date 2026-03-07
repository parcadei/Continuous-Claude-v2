#!/usr/bin/env node
/**
 * Auto-Build Hook
 *
 * PostToolUse hook that detects when hook source files (~/.claude/hooks/src/*.ts)
 * are modified via Write or Edit, and automatically runs `npm run build` in the
 * background to keep dist/ in sync.
 *
 * Hook: PostToolUse (Write|Edit)
 * Debounce: 5 seconds via temp file timestamp
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface PostToolUseInput {
  session_id: string;
  tool_name: string;
  tool_input: {
    file_path?: string;
    [key: string]: unknown;
  };
  tool_output?: string;
}

const DEBOUNCE_MS = 5000;

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

function isHookSourceFile(filePath: string): boolean {
  if (!filePath) return false;
  // Normalize to forward slashes for consistent matching
  const normalized = filePath.replace(/\\/g, '/');

  // Don't trigger build for repo edits — build uses ~/.claude/ source, not repo
  const repoPath = (process.env.USERPROFILE || process.env.HOME || '') + '/continuous-claude';
  if (normalized.startsWith(repoPath.replace(/\\/g, '/'))) return false;

  return normalized.includes('.claude/hooks/src/') && normalized.endsWith('.ts');
}

function getStateFile(sessionId: string): string {
  return path.join(os.tmpdir(), `claude-auto-build-${sessionId}.json`);
}

function isDebouncePassed(sessionId: string): boolean {
  let lastBuild = 0;
  try {
    const state = JSON.parse(fs.readFileSync(getStateFile(sessionId), 'utf-8'));
    lastBuild = state.lastBuild || 0;
  } catch {
    // No state file or parse error -- treat as no recent build
  }
  return Date.now() - lastBuild >= DEBOUNCE_MS;
}

function updateDebounceState(sessionId: string): void {
  try {
    fs.writeFileSync(getStateFile(sessionId), JSON.stringify({ lastBuild: Date.now() }));
  } catch {
    // Non-critical -- if we can't write state, worst case we rebuild more often
  }
}

function triggerBuild(): void {
  const hooksDir = path.join(os.homedir(), '.claude', 'hooks');
  const logFile = fs.openSync(path.join(os.tmpdir(), 'claude-auto-build.log'), 'a');
  // Use shell with single command string to avoid DEP0190 deprecation warning
  const child = spawn('npm run build', {
    cwd: hooksDir,
    detached: true,
    stdio: ['ignore', 'ignore', logFile],
    shell: true,
  });
  child.unref();
}

async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    console.log(JSON.stringify({}));
    return;
  }

  let data: PostToolUseInput;
  try {
    data = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({}));
    return;
  }

  // Only trigger on Write or Edit
  if (data.tool_name !== 'Write' && data.tool_name !== 'Edit') {
    console.log(JSON.stringify({}));
    return;
  }

  // Check if the edited file is a hook source file
  const filePath = data.tool_input?.file_path || '';
  if (!isHookSourceFile(filePath)) {
    console.log(JSON.stringify({}));
    return;
  }

  // Check debounce (session-scoped)
  const sessionId = data.session_id || 'default';
  if (!isDebouncePassed(sessionId)) {
    console.log(JSON.stringify({}));
    return;
  }

  // Update debounce state and trigger background build
  updateDebounceState(sessionId);
  triggerBuild();

  const fileName = path.basename(filePath);
  console.error(`[auto-build] Triggered by ${fileName}`);
  console.log(JSON.stringify({}));
}

main().catch((err) => {
  console.error('[auto-build] Error:', err.message);
  console.log(JSON.stringify({}));
});
