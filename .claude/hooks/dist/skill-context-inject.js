/**
 * PreToolUse:Skill Hook - Inject context args for forked skills
 *
 * When a skill that uses context: fork is invoked without args,
 * this hook injects the active plan/spec path so the forked skill
 * has the context it needs.
 */
import { readFileSync } from "fs";
import {
  getActivePlanOrLatest,
  getActiveSpecOrLatest,
} from "./shared/project-state.js";
// Skills that need plan context when forked
const PLAN_CONTEXT_SKILLS = new Set([
  "implement_task",
  "implement_plan",
  "implement_plan_micro",
  "validate-agent",
]);
// Skills that need spec context when forked
const SPEC_CONTEXT_SKILLS = new Set(["test-driven-development"]);
// Skills that need either plan or spec
const PLAN_OR_SPEC_SKILLS = new Set(["debug"]);
function readStdin() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "{}";
  }
}
export function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Only process Skill tool calls
  if (input.tool_name !== "Skill") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const skillName = input.tool_input?.skill;
  const existingArgs = input.tool_input?.args?.trim();
  // If args already provided, don't override
  if (existingArgs) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let contextPath = null;
  // Determine what context to inject based on skill
  if (PLAN_CONTEXT_SKILLS.has(skillName)) {
    contextPath = getActivePlanOrLatest(projectDir);
  } else if (SPEC_CONTEXT_SKILLS.has(skillName)) {
    contextPath = getActiveSpecOrLatest(projectDir);
  } else if (PLAN_OR_SPEC_SKILLS.has(skillName)) {
    // Try plan first, then spec
    contextPath =
      getActivePlanOrLatest(projectDir) || getActiveSpecOrLatest(projectDir);
  }
  if (contextPath) {
    // Inject the context path as args
    const output = {
      updatedInput: {
        skill: skillName,
        args: contextPath,
      },
    };
    console.log(JSON.stringify(output));
  } else {
    // No context found, continue without injection
    console.log(JSON.stringify({ result: "continue" }));
  }
}
main();
