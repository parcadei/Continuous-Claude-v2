// src/skill-context-inject.ts
import { readFileSync as readFileSync2 } from "fs";

// src/shared/project-state.ts
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname } from "path";
var PROJECT_STATE_VERSION = "1.0";
function getProjectStatePath(projectDir) {
  return join(projectDir, ".claude", "cache", "project-state.json");
}
function loadProjectState(projectDir) {
  const path = getProjectStatePath(projectDir);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {}
  }
  return {
    version: PROJECT_STATE_VERSION,
    activePlan: null,
    activeSpec: null,
    updatedAt: /* @__PURE__ */ new Date().toISOString(),
  };
}
function findLatestFile(dir, pattern = /\.md$/) {
  if (!existsSync(dir)) return null;
  try {
    const files = readdirSync(dir)
      .filter((f) => pattern.test(f))
      .map((f) => {
        const fullPath = join(dir, f);
        const stat = statSync(fullPath);
        const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
        const fileDate = dateMatch
          ? new Date(dateMatch[1]).getTime()
          : stat.mtimeMs;
        return { path: fullPath, date: fileDate };
      })
      .sort((a, b) => b.date - a.date);
    return files.length > 0 ? files[0].path : null;
  } catch {
    return null;
  }
}
function getActivePlanOrLatest(projectDir) {
  const state = loadProjectState(projectDir);
  if (state.activePlan && existsSync(state.activePlan)) {
    return state.activePlan;
  }
  const planDirs = [
    join(projectDir, "thoughts", "shared", "plans"),
    join(projectDir, "plans"),
    join(projectDir, "specs"),
  ];
  for (const dir of planDirs) {
    const latest = findLatestFile(dir);
    if (latest) return latest;
  }
  return null;
}
function getActiveSpecOrLatest(projectDir) {
  const state = loadProjectState(projectDir);
  if (state.activeSpec && existsSync(state.activeSpec)) {
    return state.activeSpec;
  }
  const specDirs = [
    join(projectDir, "thoughts", "shared", "specs"),
    join(projectDir, "specs"),
  ];
  for (const dir of specDirs) {
    const latest = findLatestFile(dir);
    if (latest) return latest;
  }
  return null;
}

// src/skill-context-inject.ts
var PLAN_CONTEXT_SKILLS = /* @__PURE__ */ new Set([
  "implement_task",
  "implement_plan",
  "implement_plan_micro",
  "validate-agent",
]);
var SPEC_CONTEXT_SKILLS = /* @__PURE__ */ new Set(["test-driven-development"]);
var PLAN_OR_SPEC_SKILLS = /* @__PURE__ */ new Set(["debug"]);
function readStdin() {
  try {
    return readFileSync2(0, "utf-8");
  } catch {
    return "{}";
  }
}
function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (input.tool_name !== "Skill") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const skillName = input.tool_input?.skill;
  const existingArgs = input.tool_input?.args?.trim();
  if (existingArgs) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let contextPath = null;
  if (PLAN_CONTEXT_SKILLS.has(skillName)) {
    contextPath = getActivePlanOrLatest(projectDir);
  } else if (SPEC_CONTEXT_SKILLS.has(skillName)) {
    contextPath = getActiveSpecOrLatest(projectDir);
  } else if (PLAN_OR_SPEC_SKILLS.has(skillName)) {
    contextPath =
      getActivePlanOrLatest(projectDir) || getActiveSpecOrLatest(projectDir);
  }
  if (contextPath) {
    const output = {
      updatedInput: {
        skill: skillName,
        args: contextPath,
      },
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(JSON.stringify({ result: "continue" }));
  }
}
main();
export { main };
