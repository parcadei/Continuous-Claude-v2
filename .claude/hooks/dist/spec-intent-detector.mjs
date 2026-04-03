// src/spec-intent-detector.ts
import { readFileSync as readFileSync2, existsSync as existsSync2 } from "fs";

// src/shared/spec-context.ts
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { join, dirname } from "path";
var SPEC_CONTEXT_VERSION = "1.0";
function getSpecContextPath(projectDir) {
  return join(projectDir, ".claude", "cache", "spec-context.json");
}
function loadSpecContext(projectDir) {
  const path = getSpecContextPath(projectDir);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {}
  }
  return { version: SPEC_CONTEXT_VERSION, sessions: {} };
}
function saveSpecContext(projectDir, context) {
  const path = getSpecContextPath(projectDir);
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(context, null, 2));
}
function getSessionContext(projectDir, sessionId) {
  const context = loadSpecContext(projectDir);
  return context.sessions[sessionId] || null;
}
function createEmptySessionContext() {
  return {
    active_spec: null,
    current_phase: null,
    activated_at: /* @__PURE__ */ new Date().toISOString(),
    edit_count: 0,
    last_checkpoint: 0,
    agents: {},
  };
}
function setSessionSpec(projectDir, sessionId, specPath, phase) {
  const context = loadSpecContext(projectDir);
  const existing = context.sessions[sessionId] || createEmptySessionContext();
  context.sessions[sessionId] = {
    ...existing,
    active_spec: specPath,
    current_phase: phase || existing.current_phase,
    activated_at: /* @__PURE__ */ new Date().toISOString(),
    edit_count: 0,
    last_checkpoint: 0,
  };
  saveSpecContext(projectDir, context);
}
function setSessionPhase(projectDir, sessionId, phase) {
  const context = loadSpecContext(projectDir);
  if (context.sessions[sessionId]) {
    context.sessions[sessionId].current_phase = phase;
    saveSpecContext(projectDir, context);
  }
}
function findSpecFile(projectDir, specName) {
  const specDirs = [
    join(projectDir, "thoughts", "shared", "specs"),
    join(projectDir, "thoughts", "shared", "plans"),
    join(projectDir, "specs"),
    join(projectDir, "plans"),
  ];
  for (const dir of specDirs) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir);
    const exact = files.find((f) => f === specName || f === `${specName}.md`);
    if (exact) return join(dir, exact);
    const partial = files.find(
      (f) =>
        f.toLowerCase().includes(specName.toLowerCase()) && f.endsWith(".md"),
    );
    if (partial) return join(dir, partial);
  }
  if (specName.endsWith(".md") && existsSync(join(projectDir, specName))) {
    return join(projectDir, specName);
  }
  return null;
}

// src/spec-intent-detector.ts
function readStdin() {
  return readFileSync2(0, "utf-8");
}
var ACTION_WORDS = [
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
var SPEC_INDICATORS = ["spec", "plan", "feature", "requirement", "design"];
var PHASE_PATTERNS = [
  /(?:phase|step|part|section)\s*(\d+|[a-z]+)/i,
  /(?:start|begin|work on|do)\s+(?:phase|step|part)\s*(\d+|[a-z]+)/i,
  /(\d+)(?:st|nd|rd|th)?\s+phase/i,
];
function detectIntent(prompt, projectDir) {
  const lower = prompt.toLowerCase();
  if (
    lower.includes("clear spec") ||
    lower.includes("reset spec") ||
    lower.includes("stop implementing") ||
    lower.includes("done with spec")
  ) {
    return { type: "clear" };
  }
  const fileMatch = prompt.match(/(\S+\.md)/);
  if (fileMatch) {
    const hasAction2 = ACTION_WORDS.some((a) => lower.includes(a));
    if (hasAction2) {
      const filePath = findSpecFile(projectDir, fileMatch[1]);
      if (filePath) {
        const phaseMatch2 = detectPhase(prompt);
        return {
          type: "spec",
          specName: fileMatch[1],
          filePath,
          phaseName: phaseMatch2,
        };
      }
    }
  }
  const hasAction = ACTION_WORDS.some((a) => lower.includes(a));
  const hasSpecIndicator = SPEC_INDICATORS.some((s) => lower.includes(s));
  if (hasAction && hasSpecIndicator) {
    const specName = extractSpecName(prompt);
    if (specName) {
      const filePath = findSpecFile(projectDir, specName);
      const phaseMatch2 = detectPhase(prompt);
      return {
        type: "spec",
        specName,
        filePath: filePath || void 0,
        phaseName: phaseMatch2,
      };
    }
  }
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
  const explicitPhase = prompt.match(/phase\s*(\d+|[a-z]+)/i);
  if (explicitPhase) {
    return `Phase ${explicitPhase[1]}`;
  }
  return null;
}
function extractSpecName(prompt) {
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
    console.log("{}");
    return;
  }
  if (intent.type === "clear") {
    const context = loadSpecContext(projectDir);
    delete context.sessions[input.session_id];
    saveSpecContext(projectDir, context);
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: "\u{1F4CB} Spec context cleared. No active spec.",
        },
      }),
    );
    return;
  }
  if (intent.type === "phase") {
    const current = getSessionContext(projectDir, input.session_id);
    if (current?.active_spec && intent.phaseName) {
      setSessionPhase(projectDir, input.session_id, intent.phaseName);
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "UserPromptSubmit",
            additionalContext: `\u{1F4CB} Phase updated: Now working on ${intent.phaseName}`,
          },
        }),
      );
      return;
    }
    console.log("{}");
    return;
  }
  if (intent.filePath && existsSync2(intent.filePath)) {
    setSessionSpec(
      projectDir,
      input.session_id,
      intent.filePath,
      intent.phaseName ?? void 0,
    );
    const specContent = readFileSync2(intent.filePath, "utf-8");
    const title = specContent.match(/^#\s+(.+)$/m)?.[1] || intent.specName;
    const overview =
      specContent
        .match(/## Overview[\s\S]*?(?=\n## |$)/i)?.[0]
        ?.slice(0, 300) || "";
    let message = `\u{1F4CB} Spec Activated: ${title}`;
    if (intent.phaseName) {
      message += `
\u{1F4CD} Starting: ${intent.phaseName}`;
    }
    if (overview) {
      message += `

${overview.slice(0, 200)}...`;
    }
    message += `

\u2705 Drift detection enabled. I'll remind you of requirements during edits.`;
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: message,
        },
      }),
    );
  } else if (intent.specName) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: `\u26A0\uFE0F Could not find spec "${intent.specName}". Looked in:
- thoughts/shared/specs/
- thoughts/shared/plans/
- specs/
- plans/

Create the spec first or provide the full path.`,
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
