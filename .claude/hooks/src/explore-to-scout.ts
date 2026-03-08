#!/usr/bin/env node
/**
 * Explore to Scout Hook - PreToolUse (Agent)
 *
 * Blocks subagent_type="Explore" with permissionDecision: "deny".
 * Claude Code does NOT support modifiedInput — only deny/allow/continue.
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
    [key: string]: unknown;
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

  // Block Explore — Claude Code only supports permissionDecision, not modifiedInput
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny' as const,
      permissionDecisionReason: `BLOCKED: subagent_type='Explore' is not allowed.

Per ~/.claude/rules/use-scout-not-explore.md:
- Explore uses Haiku -- fast but inaccurate
- Scout uses Sonnet with a detailed prompt -- accurate results

REMOVE subagent_type="Explore" and use subagent_type="scout" instead.`,
    },
  };

  console.log(JSON.stringify(output));
}

main().catch(() => {
  console.log('{}');
});
