#!/usr/bin/env node

// src/task-router.ts
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
var CONFIDENCE_THRESHOLD = 0.7;
function extractPrompt(toolInput) {
  if (typeof toolInput.prompt === "string") {
    return toolInput.prompt;
  }
  if (typeof toolInput.description === "string") {
    return toolInput.description;
  }
  return null;
}
function callUnifiedGate(prompt, sessionId) {
  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  const escapedSessionId = sessionId.replace(/'/g, "'\\''");
  const pythonCode = `
import asyncio
import json
import sys

try:
    from scripts.agentica_patterns.unified_gate import (
        orchestrate_with_gates,
        ClarificationRequired,
        ResourcesInsufficient,
        CompositionInvalid,
    )

    async def main():
        try:
            result = await orchestrate_with_gates(
                prompt='''${escapedPrompt}''',
                session_id='${escapedSessionId}',
            )
            print(json.dumps({
                'success': result.get('success', False),
                'pattern_used': result.get('pattern_used'),
                'confidence': result.get('confidence', 0.5),
                'session_id': result.get('session_id'),
                'aggregated_output': result.get('aggregated_output'),
                'errors': result.get('errors', []),
                'total_duration_ms': result.get('total_duration_ms'),
            }))
        except ClarificationRequired as e:
            print(json.dumps({
                'success': False,
                'gate_failure': {
                    'type': 'ClarificationRequired',
                    'unknowns': e.unknowns,
                },
            }))
        except ResourcesInsufficient as e:
            print(json.dumps({
                'success': False,
                'gate_failure': {
                    'type': 'ResourcesInsufficient',
                    'bottleneck': e.bottleneck,
                    'suggestion': e.suggestion,
                },
            }))
        except CompositionInvalid as e:
            print(json.dumps({
                'success': False,
                'gate_failure': {
                    'type': 'CompositionInvalid',
                    'errors': e.errors,
                },
            }))
        except Exception as e:
            print(json.dumps({
                'success': False,
                'errors': [str(e)],
            }))

    asyncio.run(main())
except ImportError as e:
    # Module not available - return success to allow vanilla Task
    import json
    print(json.dumps({'success': True, 'pattern_used': None}))
except Exception as e:
    import json
    print(json.dumps({'success': False, 'errors': [str(e)]}))
`;
  try {
    const result = spawnSync("uv", ["run", "python", "-c", pythonCode], {
      cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      encoding: "utf-8",
      timeout: 3e4,
      // 30 second timeout
      env: {
        ...process.env,
        PYTHONPATH: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      },
    });
    if (result.error) {
      console.error("[task-router] Failed to spawn Python:", result.error);
      return null;
    }
    if (result.status !== 0) {
      console.error("[task-router] Python exited with status:", result.status);
      console.error("[task-router] stderr:", result.stderr);
      return null;
    }
    const stdout = result.stdout.trim();
    if (!stdout) {
      return null;
    }
    return JSON.parse(stdout);
  } catch (err) {
    console.error("[task-router] Error calling unified gate:", err);
    return null;
  }
}
function isSimpleTask(prompt) {
  if (prompt.length < 100) {
    return true;
  }
  const simpleKeywords = [
    "quick check",
    "simple task",
    "just do",
    "single file",
    "one liner",
  ];
  const lowerPrompt = prompt.toLowerCase();
  return simpleKeywords.some((keyword) => lowerPrompt.includes(keyword));
}
async function main() {
  let input;
  try {
    const rawInput = readFileSync(0, "utf-8");
    if (!rawInput.trim()) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    input = JSON.parse(rawInput);
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (input.tool_name !== "Task") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const prompt = extractPrompt(input.tool_input);
  if (!prompt) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (isSimpleTask(prompt)) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const sessionId =
    input.session_id || process.env.CLAUDE_SESSION_ID || "default";
  const gateResult = callUnifiedGate(prompt, sessionId);
  if (!gateResult) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (gateResult.gate_failure) {
    const failure = gateResult.gate_failure;
    let output;
    switch (failure.type) {
      case "ClarificationRequired":
        output = {
          result: "block",
          reason: `Task requires clarification before proceeding. Unknown items: ${failure.unknowns?.join(", ") || "unspecified"}. Please provide more details about these aspects.`,
        };
        break;
      case "ResourcesInsufficient":
        output = {
          result: "block",
          reason: `Insufficient resources: ${failure.bottleneck} is the bottleneck. Suggestion: ${failure.suggestion || "Reduce agent count or simplify the task."}`,
        };
        break;
      case "CompositionInvalid":
        output = {
          result: "block",
          reason: `Invalid pattern composition: ${failure.errors?.join("; ") || "composition rules violated"}. Please restructure the task.`,
        };
        break;
      default:
        output = { result: "continue" };
    }
    console.log(JSON.stringify(output));
    return;
  }
  const patternUsed = gateResult.pattern_used;
  const confidence = gateResult.confidence ?? 0;
  if (patternUsed && confidence >= CONFIDENCE_THRESHOLD) {
    const escapedPrompt = prompt.replace(/'/g, "'\\''").replace(/\n/g, " ");
    const patternArg = patternUsed.toLowerCase().replace(/[^a-z_]/g, "_");
    const output = {
      result: "block",
      reason: `\u{1F6AB} Task blocked - routing to Agentica ${patternUsed} pattern (${(confidence * 100).toFixed(0)}% confidence).

**Run this instead:**
\`\`\`bash
uv run python scripts/agentica_dispatch.py --prompt '${escapedPrompt}' --pattern ${patternArg}
\`\`\`

The unified gate validated this task for pattern-based orchestration.`,
    };
    console.log(JSON.stringify(output));
    return;
  }
  console.log(JSON.stringify({ result: "continue" }));
}
main().catch((err) => {
  console.error("[task-router] Uncaught error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
