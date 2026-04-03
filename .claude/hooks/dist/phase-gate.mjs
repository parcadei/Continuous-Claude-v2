// src/phase-gate.ts
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
function extractAcceptanceCriteria(specContent, section) {
  const content = section
    ? extractSpecRequirements(specContent, section)
    : specContent;
  const criteria = [];
  const checkboxes = content.match(/- \[ \] .+/g) || [];
  criteria.push(...checkboxes);
  const numbered = content.match(/^\d+\.\s+.+$/gm) || [];
  criteria.push(...numbered);
  return [...new Set(criteria)].slice(0, 15);
}

// src/phase-gate.ts
function readStdin() {
  return readFileSync2(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  if (input.stop_hook_active) {
    console.log("{}");
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const session = getSessionContext(projectDir, input.session_id);
  if (!session?.active_spec) {
    console.log("{}");
    return;
  }
  if (session.edit_count < 3) {
    console.log("{}");
    return;
  }
  if (!existsSync2(session.active_spec)) {
    console.log("{}");
    return;
  }
  const specContent = readFileSync2(session.active_spec, "utf-8");
  const criteria = extractAcceptanceCriteria(
    specContent,
    session.current_phase ?? void 0,
  );
  if (criteria.length === 0) {
    console.log("{}");
    return;
  }
  const phase = session.current_phase ? ` (${session.current_phase})` : "";
  console.log(
    JSON.stringify({
      decision: "block",
      reason: `\u{1F6A6} PHASE GATE - Implementation validation required${phase}

You've made ${session.edit_count} edits. Before finishing, verify against acceptance criteria:

${criteria.join("\n")}

**For each criterion:**
- \u2705 Met: Explain how
- \u23F3 Partial: What's done, what's left
- \u274C Not addressed: Why, and should it be?

After verification, you may continue or finish.`,
    }),
  );
}
main().catch(() => console.log("{}"));
