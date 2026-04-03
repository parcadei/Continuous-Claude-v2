/**
 * Spec Intent Detector (UserPromptSubmit Hook)
 *
 * Detects when user wants to implement a spec/plan and:
 * 1. Finds the spec file
 * 2. Updates spec-context.json
 * 3. Injects confirmation into context
 */
import { readFileSync, existsSync } from "fs";
import {
  loadSpecContext,
  setSessionSpec,
  setSessionPhase,
  findSpecFile,
  getSessionContext,
  saveSpecContext,
} from "./shared/spec-context.js";
function readStdin() {
  return readFileSync(0, "utf-8");
}
// Action words that indicate implementation intent
const ACTION_WORDS = [
  "implement",
  "implementing",
  "build",
  "building",
  "create",
  "creating",
  "work on",
  "working on",
  "start",
  "starting",
  "begin",
  "beginning",
  "execute",
  "executing",
  "do",
  "doing",
  "follow",
  "following",
];
// Spec indicators
const SPEC_INDICATORS = ["spec", "plan", "feature", "requirement", "design"];
// Phase patterns
const PHASE_PATTERNS = [
  /(?:phase|step|part|section)\s*(\d+|[a-z]+)/i,
  /(?:start|begin|work on|do)\s+(?:phase|step|part)\s*(\d+|[a-z]+)/i,
  /(\d+)(?:st|nd|rd|th)?\s+phase/i,
];
function detectIntent(prompt, projectDir) {
  const lower = prompt.toLowerCase();
  // Check for clear/reset intent
  if (
    lower.includes("clear spec") ||
    lower.includes("reset spec") ||
    lower.includes("stop implementing") ||
    lower.includes("done with spec")
  ) {
    return { type: "clear" };
  }
  // Check for file reference (highest priority)
  const fileMatch = prompt.match(/(\S+\.md)/);
  if (fileMatch) {
    const hasAction = ACTION_WORDS.some((a) => lower.includes(a));
    if (hasAction) {
      const filePath = findSpecFile(projectDir, fileMatch[1]);
      if (filePath) {
        // Check for phase in same prompt
        const phaseMatch = detectPhase(prompt);
        return {
          type: "spec",
          specName: fileMatch[1],
          filePath,
          phaseName: phaseMatch,
        };
      }
    }
  }
  // Check for action + spec indicator
  const hasAction = ACTION_WORDS.some((a) => lower.includes(a));
  const hasSpecIndicator = SPEC_INDICATORS.some((s) => lower.includes(s));
  if (hasAction && hasSpecIndicator) {
    // Try to extract spec name
    const specName = extractSpecName(prompt);
    if (specName) {
      const filePath = findSpecFile(projectDir, specName);
      const phaseMatch = detectPhase(prompt);
      return {
        type: "spec",
        specName,
        filePath: filePath || undefined,
        phaseName: phaseMatch,
      };
    }
  }
  // Check for phase-only change (when already have active spec)
  const phaseMatch = detectPhase(prompt);
  if (phaseMatch && hasAction) {
    return { type: "phase", phaseName: phaseMatch };
  }
  return null;
}
function detectPhase(prompt) {
  for (const pattern of PHASE_PATTERNS) {
    const match = prompt.match(pattern);
    if (match) {
      return `Phase ${match[1]}`;
    }
  }
  // Look for "Phase X:" style
  const explicitPhase = prompt.match(/phase\s*(\d+|[a-z]+)/i);
  if (explicitPhase) {
    return `Phase ${explicitPhase[1]}`;
  }
  return null;
}
function extractSpecName(prompt) {
  // Pattern: "implement the X spec" or "work on X plan"
  const patterns = [
    /(?:implement|build|work on|start|execute)\s+(?:the\s+)?([a-z0-9_-]+)\s+(?:spec|plan|feature)/i,
    /(?:spec|plan|feature)\s+(?:for\s+)?([a-z0-9_-]+)/i,
    /([a-z0-9_-]+)\s+(?:spec|plan|feature)/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match && match[1].length > 2) {
      return match[1];
    }
  }
  return null;
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const intent = detectIntent(input.prompt, projectDir);
  if (!intent) {
    // No spec intent detected
    console.log("{}");
    return;
  }
  if (intent.type === "clear") {
    // Clear spec context
    const context = loadSpecContext(projectDir);
    delete context.sessions[input.session_id];
    saveSpecContext(projectDir, context);
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: "📋 Spec context cleared. No active spec.",
        },
      }),
    );
    return;
  }
  if (intent.type === "phase") {
    // Phase change only
    const current = getSessionContext(projectDir, input.session_id);
    if (current?.active_spec && intent.phaseName) {
      setSessionPhase(projectDir, input.session_id, intent.phaseName);
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: `📋 Phase updated: Now working on ${intent.phaseName}`,
          },
        }),
      );
      return;
    }
    // No active spec, can't change phase
    console.log("{}");
    return;
  }
  // Spec activation
  if (intent.filePath && existsSync(intent.filePath)) {
    setSessionSpec(
      projectDir,
      input.session_id,
      intent.filePath,
      intent.phaseName ?? undefined,
    );
    // Read spec to show summary
    const specContent = readFileSync(intent.filePath, "utf-8");
    const title = specContent.match(/^#\s+(.+)$/m)?.[1] || intent.specName;
    // Extract quick summary
    const overview =
      specContent
        .match(/## Overview[\s\S]*?(?=\n## |$)/i)?.[0]
        ?.slice(0, 300) || "";
    let message = `📋 Spec Activated: ${title}`;
    if (intent.phaseName) {
      message += `\n📍 Starting: ${intent.phaseName}`;
    }
    if (overview) {
      message += `\n\n${overview.slice(0, 200)}...`;
    }
    message += `\n\n✅ Drift detection enabled. I'll remind you of requirements during edits.`;
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: message,
        },
      }),
    );
  } else if (intent.specName) {
    // Couldn't find spec file
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: `⚠️ Could not find spec "${intent.specName}". Looked in:\n- thoughts/shared/specs/\n- thoughts/shared/plans/\n- specs/\n- plans/\n\nCreate the spec first or provide the full path.`,
        },
      }),
    );
  } else {
    console.log("{}");
  }
}
main().catch((err) => {
  console.error("[spec-intent-detector] Error:", err);
  console.log("{}");
});
