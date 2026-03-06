#!/usr/bin/env node
/**
 * No Haiku Enforcer Hook - PreToolUse (Task)
 *
 * Blocks Task tool calls with model="haiku".
 * Per ~/.claude/rules/no-haiku.md - Haiku is unreliable for agent tasks.
 *
 * Fix: Remove model parameter (inherits Opus) or use model="sonnet"
 */

interface HookInput {
  tool?: string;
  tool_name?: string;
  tool_input?: {
    model?: string;
    [key: string]: unknown;
  };
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision?: string;
    permissionDecisionReason?: string;
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
  const model = input.tool_input?.model;

  // Only block Agent/Task with model="haiku"
  if ((tool !== 'Agent' && tool !== 'Task') || model?.toLowerCase() !== 'haiku') {
    console.log('{}');
    return;
  }

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `BLOCKED: model='haiku' not allowed.

Per ~/.claude/rules/no-haiku.md:
- Haiku is unreliable for agent tasks
- REMOVE the model parameter (inherits Opus from parent)
- Or use model='sonnet' if you need a specific model`,
    },
  };

  console.log(JSON.stringify(output));
}

main().catch(() => {
  console.log('{}');
});
