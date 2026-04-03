// src/drift-detector.ts
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
var CHECKPOINT_INTERVAL = 5;
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
function incrementEditCount(projectDir, sessionId) {
  const context = loadSpecContext(projectDir);
  const session = context.sessions[sessionId];
  if (!session) {
    return { count: 0, needsCheckpoint: false };
  }
  session.edit_count++;
  const editsSinceCheckpoint = session.edit_count - session.last_checkpoint;
  const needsCheckpoint = editsSinceCheckpoint >= CHECKPOINT_INTERVAL;
  if (needsCheckpoint) {
    session.last_checkpoint = session.edit_count;
  }
  saveSpecContext(projectDir, context);
  return { count: session.edit_count, needsCheckpoint };
}
function extractSpecRequirements(specContent, section) {
  if (section) {
    const sectionRegex = new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`, "i");
    const match = specContent.match(sectionRegex);
    if (match) {
      return extractCriteria(match[0]);
    }
  }
  return extractCriteria(specContent);
}
function extractCriteria(content) {
  const sections = [
    "## Requirements",
    "## Functional Requirements",
    "## Must Have",
    "## Success Criteria",
    "## Acceptance Criteria",
    "### Success Criteria",
    "### Acceptance Criteria",
  ];
  const extracted = [];
  for (const section of sections) {
    const regex = new RegExp(
      `${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?(?=\\n## |\\n### |$)`,
      "i",
    );
    const match = content.match(regex);
    if (match) {
      extracted.push(match[0].slice(0, 600));
    }
  }
  const checkboxes = content.match(/- \[ \] .+/g) || [];
  if (checkboxes.length > 0) {
    extracted.push(
      "Acceptance Criteria:\n" + checkboxes.slice(0, 10).join("\n"),
    );
  }
  if (extracted.length > 0) {
    return extracted.join("\n\n").slice(0, 1500);
  }
  return content.slice(0, 800);
}

// src/drift-detector.ts
function readStdin() {
  return readFileSync2(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  if (!input.tool_response?.success) {
    console.log("{}");
    return;
  }
  const session = getSessionContext(projectDir, input.session_id);
  if (!session?.active_spec) {
    console.log("{}");
    return;
  }
  const { count, needsCheckpoint } = incrementEditCount(
    projectDir,
    input.session_id,
  );
  if (!needsCheckpoint) {
    console.log("{}");
    return;
  }
  if (!existsSync2(session.active_spec)) {
    console.log("{}");
    return;
  }
  const specContent = readFileSync2(session.active_spec, "utf-8");
  const requirements = extractSpecRequirements(
    specContent,
    session.current_phase ?? void 0,
  );
  const phase = session.current_phase ? ` (${session.current_phase})` : "";
  console.log(
    JSON.stringify({
      decision: "block",
      reason: `\u{1F50D} DRIFT CHECK - ${count} edits made${phase}

Before continuing, verify alignment with spec:

${requirements}

**Respond with:**
1. Are these changes aligned with the spec? (Yes/No + brief explanation)
2. Any unintended side effects or deviations?
3. Should anything be adjusted?

Then continue with your work.`,
    }),
  );
}
main().catch(() => console.log("{}"));
