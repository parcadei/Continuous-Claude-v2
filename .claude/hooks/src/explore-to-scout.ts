#!/usr/bin/env node
/**
 * Explore to Scout Redirect Hook - PreToolUse (Task)
 *
 * Intercepts Task tool calls with subagent_type="Explore" and
 * redirects to "scout" which uses Sonnet instead of Haiku.
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
  const subagentType = input.tool_input?.subagent_type;

  // Only intercept Agent/Task with subagent_type="Explore"
  if ((tool !== 'Agent' && tool !== 'Task') || subagentType?.toLowerCase() !== 'explore') {
    console.log('{}');
    return;
  }

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `🔄 REDIRECT: Explore → scout

Per ~/.claude/rules/use-scout-not-explore.md:
- Explore uses Haiku (inaccurate for codebase exploration)
- Scout uses Sonnet with detailed prompt (accurate results)

**Fix:** Change subagent_type from "Explore" to "scout"

Or use tools directly (Grep, Glob, Read) for high-accuracy exploration.`,
    },
  };

  console.log(JSON.stringify(output));
}

main().catch(() => {
  console.log('{}');
});
