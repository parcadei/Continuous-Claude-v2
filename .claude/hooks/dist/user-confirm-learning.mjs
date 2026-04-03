// src/user-confirm-learning.ts
import { readFileSync, existsSync } from "fs";
import { join as join2 } from "path";

// src/shared/learning-extractor.ts
import { spawnSync } from "child_process";
import { join } from "path";
async function storeLearning(learning, sessionId, projectDir) {
  const opcDir = join(projectDir, "opc");
  const args = [
    "run",
    "python",
    "scripts/store_learning.py",
    "--session-id",
    sessionId,
  ];
  if (learning.outcome === "success") {
    args.push("--worked", `${learning.what}. ${learning.how}`);
  } else if (learning.outcome === "failure") {
    args.push("--failed", `${learning.what}. ${learning.why}`);
  } else {
    args.push("--patterns", `${learning.what}: ${learning.how}`);
  }
  if (learning.why && learning.outcome !== "failure") {
    args.push("--decisions", learning.why);
  }
  const result = spawnSync("uv", args, {
    encoding: "utf-8",
    cwd: opcDir,
    env: {
      ...process.env,
      PYTHONPATH: opcDir,
    },
    timeout: 1e4,
  });
  return result.status === 0;
}
function extractConfirmationLearning(prompt, recentContext) {
  const confirmPatterns = [
    /\b(works?|working)\b/i,
    /\b(good|great|perfect|nice)\b/i,
    /\b(thanks?|thank you)\b/i,
    /\b(yes|yep|yeah)\b/i,
    /\bthat('s| is) (it|right|correct)\b/i,
  ];
  const isConfirmation = confirmPatterns.some((p) => p.test(prompt));
  if (!isConfirmation) return null;
  if (!recentContext || recentContext.length < 20) return null;
  return {
    what: `User confirmed: "${prompt.slice(0, 50)}"`,
    why: "Approach/solution worked for user",
    how: recentContext.slice(0, 300),
    outcome: "success",
    tags: ["user_confirmed", "solution", "auto_extracted"],
  };
}

// src/user-confirm-learning.ts
function getStateFilePath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    return join2(projectDir, ".claude", "cache", "auto-learning-state.json");
  }
  return join2(
    process.env.HOME || "/tmp",
    ".claude",
    "cache",
    "auto-learning-state.json",
  );
}
var RECENCY_THRESHOLD_MS = 10 * 60 * 1e3;
function readStdin() {
  return readFileSync(0, "utf-8");
}
function loadState() {
  const stateFile = getStateFilePath();
  if (existsSync(stateFile)) {
    try {
      const parsed = JSON.parse(readFileSync(stateFile, "utf-8"));
      return {
        edits: parsed.edits || [],
        turnCount: parsed.turnCount || 0,
        recentActions: parsed.recentActions || [],
      };
    } catch {}
  }
  return { edits: [], turnCount: 0, recentActions: [] };
}
function isConfirmationPrompt(prompt) {
  const normalizedPrompt = prompt.toLowerCase().trim();
  if (normalizedPrompt.length > 100) {
    return false;
  }
  const confirmPatterns = [
    /^(works?|working|worked)!*$/i,
    /^(good|great|perfect|nice|excellent|awesome)!*$/i,
    /^(thanks?|thank you|thx|ty)!*$/i,
    /^(yes|yep|yeah|yup)!*$/i,
    /^(ok|okay|k)!*$/i,
    /^(cool|sweet|neat)!*$/i,
    /^(lgtm|ship it)!*$/i,
    /\b(works?|working)\b/i,
    /\b(that('s| is) (it|right|correct|perfect|good))\b/i,
    /\b(looks? good)\b/i,
    /\b(nice work|good job|well done)\b/i,
    /\b(fixed|solved|resolved)\b/i,
    /^[^a-z]*$/i,
    // Just punctuation like "!" or emojis
  ];
  return confirmPatterns.some((p) => p.test(normalizedPrompt));
}
function buildRecentContext(state) {
  const now = Date.now();
  const recentEdits = state.edits.filter(
    (e) => now - e.timestamp < RECENCY_THRESHOLD_MS,
  );
  if (recentEdits.length === 0) {
    return "";
  }
  const contextParts = [];
  for (const edit of recentEdits.slice(-5)) {
    contextParts.push(`${edit.file}: ${edit.description}`);
  }
  return contextParts.join("; ");
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  if (!input.prompt || input.prompt.trim().length === 0) {
    console.log("{}");
    return;
  }
  if (!isConfirmationPrompt(input.prompt)) {
    console.log("{}");
    return;
  }
  const state = loadState();
  const recentContext = buildRecentContext(state);
  if (!recentContext || recentContext.length < 20) {
    console.log("{}");
    return;
  }
  const learning = extractConfirmationLearning(input.prompt, recentContext);
  if (!learning) {
    console.log("{}");
    return;
  }
  const stored = await storeLearning(learning, input.session_id, projectDir);
  if (stored) {
    const learningPreview = learning.what.slice(0, 50);
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: `AUTO-LEARNING: Captured user confirmation. Stored: "${learningPreview}..." Recent edits validated as successful approach.`,
        },
      }),
    );
  } else {
    console.log("{}");
  }
}
main().catch(() => {
  console.log("{}");
});
