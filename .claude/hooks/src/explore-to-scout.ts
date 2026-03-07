#!/usr/bin/env node
/**
 * Explore to Scout Rewrite Hook - PreToolUse (Agent)
 *
 * Silently rewrites subagent_type="Explore" to "scout" using modifiedInput.
 * Eliminates the deny+retry round-trip that wasted tokens and latency.
 *
 * Per ~/.claude/rules/use-scout-not-explore.md:
 * - Explore uses Haiku - fast but inaccurate
 * - Scout uses Sonnet with detailed prompt - accurate results
 */

interface HookInput {
  tool?: string;
  tool_name?: string;
  tool_input?: {
    subagent_type?: string;
    prompt?: string;
    [key: string]: unknown;
  };
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    modifiedInput?: Record<string, unknown>;
    additionalContext?: string;
  };
}

async function main(): Promise<void> {
  let input: HookInput = {};

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  try {
    const rawInput = Buffer.concat(chunks).toString('utf-8').trim();
    if (rawInput) {
      input = JSON.parse(rawInput);
    }
  } catch {
    console.log('{}');
    return;
  }

  const tool = input.tool || input.tool_name;
  const subagentType = input.tool_input?.subagent_type;

  // Only intercept Agent/Task with subagent_type="Explore"
  if ((tool !== 'Agent' && tool !== 'Task') || subagentType?.toLowerCase() !== 'explore') {
    console.log('{}');
    return;
  }

  // Silently rewrite Explore -> scout (no deny/retry needed)
  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      modifiedInput: { subagent_type: 'scout' },
      additionalContext: 'Explore -> scout: upgraded for accuracy (Sonnet vs Haiku)',
    },
  };

  console.log(JSON.stringify(output));
}

main().catch(() => {
  console.log('{}');
});
