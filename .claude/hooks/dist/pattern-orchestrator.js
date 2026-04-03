/**
 * Pattern Orchestrator Hook
 *
 * Unified orchestrator for multi-agent patterns within a single session.
 * Fires on PostToolUse:Task to detect agent completion and inject context.
 *
 * Supported patterns:
 * - Pipeline: Sequential stage execution
 * - Jury: Independent voting with threshold
 * - Debate: Adversarial argumentation rounds
 * - GeneratorCritic (gencritic): Iterative refinement loop
 *
 * State Management:
 * - State files in: .claude/cache/patterns/{type}-{id}.json
 * - Pattern activation via state file creation
 * - TTL-based auto-expiration
 * - Session ID validation for cross-session safety
 *
 * Pattern Tag Format (in Task prompt):
 *   [PATTERN:type-id:stage]
 *   Example: [PATTERN:pipeline-abc123:research]
 *
 * Usage:
 *   1. Create state file: .claude/cache/patterns/pipeline-abc123.json
 *   2. Spawn Task with [PATTERN:pipeline-abc123:stage1] in prompt
 *   3. Hook detects completion, updates state, injects next step
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "fs";
import { join, dirname } from "path";
// Pattern tag regex: [PATTERN:type-id:stage]
const PATTERN_TAG_REGEX =
  /\[PATTERN:([a-z]+)-([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\]/;
// Safe ID validation
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
// =============================================================================
// Utility Functions
// =============================================================================
function getPatternDir() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return join(projectDir, ".claude", "cache", "patterns");
}
function getPatternPath(type, id) {
  return join(getPatternDir(), `${type}-${id}.json`);
}
function isValidId(id) {
  return SAFE_ID_PATTERN.test(id);
}
function isExpired(state) {
  const now = Date.now();
  const expiresAt = state.created + state.ttl_minutes * 60 * 1000;
  return now > expiresAt;
}
function loadPatternState(type, id) {
  const path = getPatternPath(type, id);
  if (!existsSync(path)) {
    return null;
  }
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error(`[pattern-orchestrator] Failed to load state: ${err}`);
    return null;
  }
}
function savePatternState(state) {
  const path = getPatternPath(state.type, state.id);
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, JSON.stringify(state, null, 2));
    return true;
  } catch (err) {
    console.error(`[pattern-orchestrator] Failed to save state: ${err}`);
    return false;
  }
}
function cleanupExpiredPatterns() {
  const dir = getPatternDir();
  if (!existsSync(dir)) return;
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const path = join(dir, file);
      try {
        const content = readFileSync(path, "utf-8");
        const state = JSON.parse(content);
        if (isExpired(state)) {
          unlinkSync(path);
          console.error(
            `[pattern-orchestrator] Cleaned up expired pattern: ${file}`,
          );
        }
      } catch {
        // Ignore parse errors
      }
    }
  } catch (err) {
    console.error(`[pattern-orchestrator] Cleanup error: ${err}`);
  }
}
function extractPatternTag(prompt) {
  const match = prompt.match(PATTERN_TAG_REGEX);
  if (!match) return null;
  return {
    type: match[1],
    id: match[2],
    stage: match[3],
  };
}
// =============================================================================
// Pattern Handlers
// =============================================================================
/**
 * Handle Pipeline pattern completion.
 * Advances to next stage and injects context.
 */
function handlePipeline(state, agentId, stage, toolResponse) {
  if (!state.stages || state.stages.length === 0) {
    return null;
  }
  // Mark current agent as complete
  state.agents[agentId] = {
    stage,
    status: "complete",
    result:
      typeof toolResponse === "string"
        ? toolResponse.slice(0, 2000)
        : JSON.stringify(toolResponse).slice(0, 2000),
    completed_at: Date.now(),
  };
  // Find current stage index
  const currentIndex = state.stages.indexOf(stage);
  if (currentIndex === -1) {
    return `[Pipeline] Unknown stage "${stage}". Valid stages: ${state.stages.join(", ")}`;
  }
  state.currentStage = currentIndex;
  // Check if this is the last stage
  if (currentIndex >= state.stages.length - 1) {
    state.active = false;
    savePatternState(state);
    // Gather all stage outputs
    const outputs = [];
    for (const [id, agent] of Object.entries(state.agents)) {
      if (agent.status === "complete" && agent.result) {
        outputs.push(`## Stage: ${agent.stage}\n${agent.result}`);
      }
    }
    return `[Pipeline Complete]
All ${state.stages.length} stages have finished.

${outputs.join("\n\n---\n\n")}

Review the outputs above and provide a final synthesis.`;
  }
  // Advance to next stage
  const nextStage = state.stages[currentIndex + 1];
  state.currentStage = currentIndex + 1;
  savePatternState(state);
  // Get previous stage output for context
  const prevOutput = state.agents[agentId]?.result || "(no output recorded)";
  return `[Pipeline] Stage "${stage}" complete. Next: "${nextStage}"

## Previous Stage Output
${prevOutput.slice(0, 4000)}

---

Now spawn a Task agent for stage "${nextStage}" with tag:
[PATTERN:${state.type}-${state.id}:${nextStage}]

The agent should process the above output and continue the pipeline.`;
}
/**
 * Handle Jury pattern completion.
 * Collects votes and announces verdict when threshold reached.
 */
function handleJury(state, agentId, stage, toolResponse) {
  const responseStr =
    typeof toolResponse === "string"
      ? toolResponse
      : JSON.stringify(toolResponse);
  // Parse vote from response (look for APPROVE/REJECT or yes/no)
  const lowerResponse = responseStr.toLowerCase();
  let vote;
  let reason;
  if (
    lowerResponse.includes("approve") ||
    lowerResponse.includes("yes") ||
    lowerResponse.includes("accept")
  ) {
    vote = true;
  } else if (
    lowerResponse.includes("reject") ||
    lowerResponse.includes("no") ||
    lowerResponse.includes("deny")
  ) {
    vote = false;
  } else {
    // Default to abstain (neutral)
    vote = false;
    reason = "Could not parse vote from response";
  }
  // Extract reason if present
  const reasonMatch = responseStr.match(/reason[:\s]+(.+?)(?:\n|$)/i);
  if (reasonMatch) {
    reason = reasonMatch[1].trim();
  }
  // Record vote
  if (!state.votes) {
    state.votes = [];
  }
  state.votes.push({ agent_id: agentId, vote, reason });
  // Mark agent as complete
  state.agents[agentId] = {
    stage,
    status: "complete",
    result: responseStr.slice(0, 500),
    completed_at: Date.now(),
  };
  // Count expected jurors from agents with 'pending' or 'running' status plus completed
  const totalExpected = Object.keys(state.agents).length;
  const totalVoted = state.votes.length;
  const threshold = state.threshold ?? 0.5;
  // Check if all jurors have voted
  if (totalVoted < totalExpected) {
    savePatternState(state);
    return `[Jury] Vote recorded (${totalVoted}/${totalExpected}). Waiting for remaining jurors.`;
  }
  // All votes in - calculate verdict
  const approveCount = state.votes.filter((v) => v.vote).length;
  const approveRatio = approveCount / totalVoted;
  const verdict = approveRatio >= threshold ? "APPROVED" : "REJECTED";
  state.active = false;
  savePatternState(state);
  const voteSummary = state.votes
    .map(
      (v) =>
        `- ${v.agent_id}: ${v.vote ? "APPROVE" : "REJECT"}${v.reason ? ` (${v.reason})` : ""}`,
    )
    .join("\n");
  return `[Jury Complete] Verdict: ${verdict}

## Vote Summary
${voteSummary}

## Result
- Approve: ${approveCount}/${totalVoted} (${(approveRatio * 100).toFixed(0)}%)
- Threshold: ${(threshold * 100).toFixed(0)}%
- Decision: ${verdict}

Take appropriate action based on the jury's verdict.`;
}
/**
 * Handle Debate pattern completion.
 * Alternates between sides and tracks rounds.
 */
function handleDebate(state, agentId, stage, toolResponse) {
  const responseStr =
    typeof toolResponse === "string"
      ? toolResponse
      : JSON.stringify(toolResponse);
  // Record argument
  if (!state.positions) {
    state.positions = [];
  }
  state.positions.push({
    side: stage,
    agent_id: agentId,
    argument: responseStr.slice(0, 3000),
  });
  // Mark agent as complete
  state.agents[agentId] = {
    stage,
    status: "complete",
    result: responseStr.slice(0, 1000),
    completed_at: Date.now(),
  };
  const round = state.round ?? 1;
  const maxRounds = state.maxRounds ?? 3;
  // Determine what comes next
  // Debate alternates: pro -> con -> pro -> con... for each round
  const positionsThisRound = state.positions.filter((_, i) => {
    const roundForPosition = Math.floor(i / 2) + 1;
    return roundForPosition === round;
  });
  // Check if both sides have argued this round
  if (positionsThisRound.length < 2) {
    // Other side needs to respond
    const nextSide = stage === "pro" ? "con" : "pro";
    const lastArgument =
      state.positions[state.positions.length - 1]?.argument || "";
    savePatternState(state);
    return `[Debate] Round ${round}/${maxRounds} - ${stage.toUpperCase()} has argued.

## ${stage.toUpperCase()} Argument
${lastArgument.slice(0, 2000)}

---

Now spawn a Task agent for the ${nextSide.toUpperCase()} side with tag:
[PATTERN:${state.type}-${state.id}:${nextSide}]

The ${nextSide.toUpperCase()} agent should counter the above argument.`;
  }
  // Both sides argued - check if more rounds
  if (round < maxRounds) {
    state.round = round + 1;
    savePatternState(state);
    const proArg =
      positionsThisRound.find((p) => p.side === "pro")?.argument || "";
    const conArg =
      positionsThisRound.find((p) => p.side === "con")?.argument || "";
    return `[Debate] Round ${round}/${maxRounds} complete. Starting round ${round + 1}.

## Round ${round} Summary
### PRO
${proArg.slice(0, 1500)}

### CON
${conArg.slice(0, 1500)}

---

Spawn a Task agent for PRO to continue with tag:
[PATTERN:${state.type}-${state.id}:pro]`;
  }
  // Debate complete
  state.active = false;
  savePatternState(state);
  // Compile full debate transcript
  const transcript = [];
  for (let r = 1; r <= maxRounds; r++) {
    const roundPositions = state.positions.slice((r - 1) * 2, r * 2);
    transcript.push(`## Round ${r}`);
    for (const pos of roundPositions) {
      transcript.push(
        `### ${pos.side.toUpperCase()}\n${pos.argument?.slice(0, 1000) || "(no argument)"}`,
      );
    }
  }
  return `[Debate Complete] ${maxRounds} rounds finished.

${transcript.join("\n\n")}

---

Evaluate the debate and declare a winner based on argument quality.`;
}
/**
 * Handle Generator-Critic pattern completion.
 * Manages iteration loop and approval detection.
 */
function handleGenCritic(state, agentId, stage, toolResponse) {
  const responseStr =
    typeof toolResponse === "string"
      ? toolResponse
      : JSON.stringify(toolResponse);
  // Mark agent as complete
  state.agents[agentId] = {
    stage,
    status: "complete",
    result: responseStr.slice(0, 2000),
    completed_at: Date.now(),
  };
  const iteration = state.iteration ?? 1;
  const maxIterations = state.maxIterations ?? 5;
  if (stage === "generator") {
    // Generator completed - spawn critic
    savePatternState(state);
    return `[GenCritic] Iteration ${iteration}/${maxIterations} - Generator complete.

## Generated Output
${responseStr.slice(0, 3000)}

---

Now spawn a Task agent as CRITIC with tag:
[PATTERN:${state.type}-${state.id}:critic]

The critic should review the output and either:
- Include "APPROVED" if it meets requirements
- Provide specific feedback for improvement`;
  }
  if (stage === "critic") {
    // Check for approval
    const lowerResponse = responseStr.toLowerCase();
    const isApproved =
      lowerResponse.includes("approved") ||
      lowerResponse.includes("lgtm") ||
      lowerResponse.includes("looks good");
    if (isApproved) {
      state.approved = true;
      state.active = false;
      savePatternState(state);
      return `[GenCritic Complete] Output APPROVED after ${iteration} iteration(s).

## Final Output
${Object.values(state.agents).find((a) => a.stage === "generator")?.result || "(see above)"}

## Critic Approval
${responseStr.slice(0, 1000)}

The generator-critic loop has concluded with approval.`;
    }
    // Not approved - check if more iterations allowed
    if (iteration >= maxIterations) {
      state.active = false;
      savePatternState(state);
      return `[GenCritic Complete] Max iterations (${maxIterations}) reached without approval.

## Last Generator Output
${Object.values(state.agents).find((a) => a.stage === "generator")?.result || "(not available)"}

## Last Critic Feedback
${responseStr.slice(0, 1500)}

Consider manual review or different approach.`;
    }
    // More iterations - spawn next generator
    state.iteration = iteration + 1;
    state.lastFeedback = responseStr.slice(0, 2000);
    savePatternState(state);
    return `[GenCritic] Iteration ${iteration}/${maxIterations} - Critic requests changes.

## Critic Feedback
${responseStr.slice(0, 2000)}

---

Now spawn a Task agent as GENERATOR with tag:
[PATTERN:${state.type}-${state.id}:generator]

The generator should refine the output based on the feedback above.`;
  }
  return null;
}
// =============================================================================
// Main Hook Logic
// =============================================================================
async function main() {
  let input;
  try {
    const stdin = readFileSync(0, "utf-8");
    input = JSON.parse(stdin);
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Only handle Task tool completions
  if (input.tool_name !== "Task") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Cleanup expired patterns periodically
  cleanupExpiredPatterns();
  // Extract prompt from tool_input
  const toolInput = input.tool_input;
  const prompt = toolInput.prompt || toolInput.description || "";
  // Look for pattern tag
  const patternTag = extractPatternTag(prompt);
  if (!patternTag) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const { type, id, stage } = patternTag;
  // Validate IDs
  if (!isValidId(id) || !isValidId(stage)) {
    console.error(`[pattern-orchestrator] Invalid ID format: ${id} / ${stage}`);
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Load pattern state
  const state = loadPatternState(type, id);
  if (!state) {
    console.error(`[pattern-orchestrator] No state found for ${type}-${id}`);
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Validate state
  if (!state.active) {
    console.error(`[pattern-orchestrator] Pattern ${type}-${id} is not active`);
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (state.session_id !== input.session_id) {
    console.error(`[pattern-orchestrator] Session mismatch for ${type}-${id}`);
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (isExpired(state)) {
    console.error(`[pattern-orchestrator] Pattern ${type}-${id} has expired`);
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Handle based on pattern type
  let context = null;
  const agentId = input.tool_use_id;
  switch (state.type) {
    case "pipeline":
      context = handlePipeline(state, agentId, stage, input.tool_response);
      break;
    case "jury":
      context = handleJury(state, agentId, stage, input.tool_response);
      break;
    case "debate":
      context = handleDebate(state, agentId, stage, input.tool_response);
      break;
    case "gencritic":
      context = handleGenCritic(state, agentId, stage, input.tool_response);
      break;
    default:
      console.error(
        `[pattern-orchestrator] Unknown pattern type: ${state.type}`,
      );
  }
  // Return output with context injection
  if (context) {
    const output = {
      result: "continue",
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: context,
      },
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(JSON.stringify({ result: "continue" }));
  }
}
main().catch((err) => {
  console.error(`[pattern-orchestrator] Uncaught error: ${err}`);
  console.log(JSON.stringify({ result: "continue" }));
});
