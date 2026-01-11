/**
 * Post-Edit Notification Hook
 *
 * Notifies TLDR daemon after file edits for dirty-count tracking.
 * Triggers automatic semantic re-indexing when threshold is reached.
 */

import { readFileSync } from 'fs';
import { queryDaemonSync, trackHookActivitySync } from './daemon-client.js';

interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
  };
  tool_result?: {
    success?: boolean;
  };
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
  };
}

async function main() {
  const input: HookInput = JSON.parse(readFileSync(0, 'utf-8'));

  // Only notify on successful Edit operations
  if (input.tool_name !== 'Edit' && input.tool_name !== 'Write') {
    console.log('{}');
    return;
  }

  const filePath = input.tool_input?.file_path;
  if (!filePath) {
    console.log('{}');
    return;
  }

  // Notify daemon of file change
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const response = queryDaemonSync(
      { cmd: 'notify', file: filePath },
      projectDir
    );

    // Track hook activity for flush threshold
    trackHookActivitySync('post-edit-notify', projectDir, true, {
      edits_notified: 1,
      reindexes_triggered: response.reindex_triggered ? 1 : 0,
    });

    // If reindex was triggered, optionally inform user
    if (response.reindex_triggered) {
      const output: HookOutput = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `[Semantic reindex triggered: ${response.dirty_count}/${response.threshold} files changed]`
        }
      };
      console.log(JSON.stringify(output));
      return;
    }
  } catch {
    // Daemon not running - silently ignore
  }

  console.log('{}');
}

main().catch(() => console.log('{}'));
