// src/spec-anchor.ts
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
function getSessionContext(projectDir, sessionId) {
  const context = loadSpecContext(projectDir);
  return context.sessions[sessionId] || null;
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

// src/spec-anchor.ts
function readStdin() {
  return readFileSync2(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const session = getSessionContext(projectDir, input.session_id);
  if (!session?.active_spec) {
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
  if (!requirements) {
    console.log("{}");
    return;
  }
  const filePath = input.tool_input.file_path || "unknown";
  const phase = session.current_phase ? ` (${session.current_phase})` : "";
  const contextMessage = `\u{1F4CB} SPEC ANCHOR${phase}

Editing: ${filePath}
Verify this change aligns with requirements:

${requirements}`;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: contextMessage,
      },
    }),
  );
}
main().catch(() => console.log("{}"));
