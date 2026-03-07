#!/usr/bin/env node
/**
 * Pre-Compact Memory Extract Hook
 *
 * L0 Defense Layer: Extracts thinking blocks BEFORE context compression.
 * This prevents early session insights from being lost to compaction.
 *
 * Hook: PreCompact
 * Trigger: Before Claude compacts context (manual or auto)
 *
 * Key Insight: PreCompact has JSONL transcript access, so we can extract
 * thinking blocks that are about to be "forgotten" before they're summarized away.
 *
 * State tracked in: .claude/extraction-state.json
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { writeStateWithLock } from './shared/atomic-write.js';

interface PreCompactInput {
  trigger: 'manual' | 'auto';
  session_id: string;
  transcript_path: string;
  custom_instructions?: string;
}

interface HookOutput {
  continue: boolean;
  systemMessage?: string;
}

interface ExtractionResult {
  learnings_stored: number;
  learnings_skipped: number;
  learnings_deduped: number;
  new_last_line: number;
  hashes: string[];
  errors: string[];
}

function getOpcDir(): string {
  return process.env.CLAUDE_OPC_DIR ||
    path.join(process.env.HOME || process.env.USERPROFILE || '', 'continuous-claude', 'opc');
}

function getStateFilePath(projectDir: string): string {
  return path.join(projectDir, '.claude', 'extraction-state.json');
}

function loadState(stateFile: string): { last_extracted_line: number; recent_hashes: string[] } {
  if (!fs.existsSync(stateFile)) {
    return { last_extracted_line: 0, recent_hashes: [] };
  }

  try {
    const data = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    return {
      last_extracted_line: data.last_extracted_line || 0,
      recent_hashes: data.recent_hashes || []
    };
  } catch {
    return { last_extracted_line: 0, recent_hashes: [] };
  }
}

function runBackgroundExtraction(
  transcriptPath: string,
  sessionId: string,
  startLine: number,
  stateFile: string,
  projectDir: string
): boolean {
  const opcDir = getOpcDir();
  const extractScript = path.join(opcDir, 'scripts', 'core', 'incremental_extract.py');

  if (!fs.existsSync(extractScript)) {
    console.error(`incremental_extract.py not found at ${extractScript}`);
    return false;
  }

  try {
    const child = spawn('uv', [
      'run', 'python', 'scripts/core/incremental_extract.py',
      '--transcript', transcriptPath,
      '--session-id', sessionId,
      '--start-line', startLine.toString(),
      '--state-file', stateFile,
      '--project-dir', projectDir,
      '--max-learnings', '5',
      '--json'
    ], {
      cwd: opcDir,
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, PYTHONPATH: opcDir },
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let data: PreCompactInput;
  try {
    data = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const sessionId = data.session_id;
  const transcriptPath = data.transcript_path;

  // Extraction fires on ALL compact events regardless of trigger type

  // Need transcript path for extraction
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    const output: HookOutput = {
      continue: true,
      systemMessage: '[PreCompact] No transcript available for extraction'
    };
    console.log(JSON.stringify(output));
    return;
  }

  // Load state to get start line
  const stateFile = getStateFilePath(projectDir);
  const state = loadState(stateFile);

  // Cooldown: skip if extraction ran recently (within 5 minutes)
  const COOLDOWN_MS = 5 * 60 * 1000;
  const stateWithMeta = state as { last_extracted_line: number; recent_hashes: string[]; last_launched?: number };
  if (stateWithMeta.last_launched && Date.now() - stateWithMeta.last_launched < COOLDOWN_MS) {
    console.log(JSON.stringify({ continue: true, systemMessage: '[PreCompact:L0] Cooldown active, skipping extraction' }));
    return;
  }

  // Update last_launched timestamp
  try {
    const stateData = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf-8')) : {};
    stateData.last_launched = Date.now();
    writeStateWithLock(stateFile, JSON.stringify(stateData, null, 2));
  } catch { /* fail open */ }

  // Run extraction in background (non-blocking)
  const launched = runBackgroundExtraction(
    transcriptPath,
    sessionId,
    state.last_extracted_line,
    stateFile,
    projectDir
  );

  const message = launched
    ? '[PreCompact:L0] Memory extraction launched (background)'
    : '[PreCompact:L0] Memory extraction unavailable';

  const output: HookOutput = {
    continue: true,
    systemMessage: message
  };
  console.log(JSON.stringify(output));
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
  });
}

main().catch(err => {
  console.error('pre-compact-extract error:', err);
  console.log(JSON.stringify({ continue: true }));
});
