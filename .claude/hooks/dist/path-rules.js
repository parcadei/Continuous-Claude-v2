/**
 * Path-based rule injection hook
 *
 * Fires on PreToolUse for Read/Edit/Write
 * Matches file paths against patterns and injects relevant skill content
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
// Path patterns → skill mappings
const PATH_RULES = [
  // Hook development
  {
    pattern: /\.claude\/hooks\//,
    skillName: "hooks",
    description: "Hook development",
  },
  // Skill development
  {
    pattern: /\.claude\/skills\//,
    skillName: "skill-development",
    description: "Skill development",
  },
  // Agent cache
  {
    pattern: /\.claude\/cache\/agents\//,
    skillName: "agent-context-isolation",
    description: "Agent context isolation",
  },
  // Continuity ledgers
  {
    pattern: /thoughts\/ledgers\/CONTINUITY_CLAUDE-/,
    skillName: "continuity",
    description: "Continuity ledger",
  },
  // Agentica
  {
    pattern: /opc\/scripts\/agentica/,
    skillName: "async-repl-protocol",
    description: "Agentica REPL protocol",
  },
  // MCP scripts
  {
    pattern: /scripts\/.*\.py$/,
    skillName: "mcp-scripts",
    description: "MCP scripts",
  },
  // Lean files
  {
    pattern: /\.lean$/,
    skillName: "llm-tuning-patterns",
    description: "LLM tuning for proofs",
  },
  // Skill rules config
  {
    pattern: /skill-rules\.json$/,
    skillName: "router-first-architecture",
    description: "Router-first architecture",
  },
  // Wiring/hooks infrastructure
  {
    pattern: /\.claude\/settings\.json$/,
    skillName: "wiring",
    description: "Wiring verification",
  },
];
function readStdin() {
  return readFileSync(0, "utf-8");
}
function getProjectDir() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}
function loadSkillContent(skillName) {
  const projectDir = getProjectDir();
  const skillPath = join(
    projectDir,
    ".claude",
    "skills",
    skillName,
    "SKILL.md",
  );
  if (!existsSync(skillPath)) return null;
  try {
    let content = readFileSync(skillPath, "utf-8");
    // Strip frontmatter
    if (content.startsWith("---")) {
      const end = content.indexOf("---", 3);
      if (end !== -1) content = content.slice(end + 3).trim();
    }
    return content;
  } catch {
    return null;
  }
}
function getMatchingSkills(filePath) {
  const matched = [];
  for (const rule of PATH_RULES) {
    if (rule.pattern.test(filePath)) {
      matched.push(rule.skillName);
    }
  }
  return matched;
}
async function main() {
  const input = JSON.parse(readStdin());
  const filePath = input.tool_input?.file_path;
  if (!filePath) {
    console.log("{}");
    return;
  }
  const skills = getMatchingSkills(filePath);
  if (skills.length === 0) {
    console.log("{}");
    return;
  }
  const contents = [];
  for (const skill of skills) {
    const content = loadSkillContent(skill);
    if (content) contents.push(content);
  }
  if (contents.length === 0) {
    console.log("{}");
    return;
  }
  console.log(
    JSON.stringify({
      continue: true,
      systemMessage: contents.join("\n\n---\n\n"),
    }),
  );
}
main().catch(() => process.exit(1));
