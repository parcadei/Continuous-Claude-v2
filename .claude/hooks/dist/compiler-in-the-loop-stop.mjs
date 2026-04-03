// src/compiler-in-the-loop-stop.ts
import { readFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
var STATE_DIR = process.env.CLAUDE_PROJECT_DIR
  ? join(process.env.CLAUDE_PROJECT_DIR, ".claude", "cache", "lean")
  : join(tmpdir(), "claude-lean");
var STATE_FILE = join(STATE_DIR, "compiler-state.json");
var MAX_STATE_AGE_MS = 5 * 60 * 1e3;
function readStdin() {
  return readFileSync(0, "utf-8");
}
function loadState() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    if (Date.now() - state.timestamp > MAX_STATE_AGE_MS) {
      unlinkSync(STATE_FILE);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}
function clearState() {
  if (existsSync(STATE_FILE)) {
    unlinkSync(STATE_FILE);
  }
}
async function main() {
  const input = JSON.parse(readStdin());
  if (input.stop_hook_active) {
    console.log("{}");
    return;
  }
  const state = loadState();
  if (!state || !state.has_errors) {
    console.log("{}");
    return;
  }
  if (state.session_id !== input.session_id) {
    clearState();
    console.log("{}");
    return;
  }
  let repairPrompt;
  if (state.sorries.length > 0) {
    repairPrompt = `
\u{1F504} APOLLO REPAIR LOOP - Unresolved 'sorry' placeholders

File: ${state.file_path}

The proof has ${state.sorries.length} incomplete part(s):

${state.sorries.join("\n")}

**Your task:**
1. Pick ONE sorry to fix (start with the simplest)
2. Replace 'sorry' with a valid proof:
   - Try tactics: simp, ring, nlinarith, norm_num, exact, apply
   - Or provide explicit proof term
3. Re-run to check if it compiles

Continue fixing until all sorries are resolved.
`;
  } else {
    repairPrompt = `
\u{1F504} APOLLO REPAIR LOOP - Lean Compiler Errors

File: ${state.file_path}

Errors:
${state.errors.slice(0, 2e3)}

**Your task:**
1. Read the error messages carefully
2. If type error: check signatures match
3. If syntax error: check Lean 4 syntax
4. If unknown identifier: check imports
5. Consider using 'sorry' to isolate the failing part, then fix incrementally

Fix the errors and re-write the file.
`;
  }
  console.log(
    JSON.stringify({
      decision: "block",
      reason: repairPrompt,
    }),
  );
}
main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
