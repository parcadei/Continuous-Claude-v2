/**
 * PostToolUse:Grep|Read Hook - Epistemic confidence reminder.
 *
 * For Grep: Injects a reminder that grep/search results are INFERRED evidence,
 * not VERIFIED facts. Prevents false claims by prompting verification.
 *
 * For Read: Light reminder to note findings and update claims accordingly.
 *
 * LESSON LEARNED: An 80% false claim rate occurred when grep results
 * were trusted without reading actual files. This hook enforces
 * "verify before claiming" discipline.
 */
import { readFileSync } from "fs";
export function main() {
  let input;
  try {
    const stdinContent = readFileSync(0, "utf-8");
    input = JSON.parse(stdinContent);
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Process Grep and Read tools
  if (input.tool_name !== "Grep" && input.tool_name !== "Read") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  let reminder;
  if (input.tool_name === "Read") {
    // Light reminder for Read - this IS verification
    const filePath = input.tool_input?.file_path || "file";
    const fileName = filePath.split("/").pop() || "file";
    reminder = `<system-reminder>
✓ Read ${fileName} - note findings. Update any prior ? INFERRED claims to ✓ VERIFIED if confirmed.
</system-reminder>`;
  } else {
    // Grep reminder - stronger for existence checks
    const pattern = input.tool_input?.pattern || "";
    const outputMode = input.tool_input?.output_mode || "files_with_matches";
    // Existence-check patterns that commonly lead to false claims
    const existencePatterns = [
      /try.*catch/i,
      /error.*handl/i,
      /exist/i,
      /missing/i,
      /lack/i,
      /without/i,
      /no.*found/i,
    ];
    const isExistenceCheck = existencePatterns.some((p) => p.test(pattern));
    const isFileListMode = outputMode === "files_with_matches";
    if (isExistenceCheck || isFileListMode) {
      reminder = `<epistemic-reminder>
⚠️ GREP RESULTS ARE NOT PROOF

Before claiming "X exists" or "X doesn't exist":
1. READ the actual file(s) to verify
2. Grep may miss: different naming, regex mismatch, file not searched
3. Grep may false-match: substring matches, comments, strings

REQUIRED: Use Read tool on relevant files before making existence claims.
Mark claims as: ✓ VERIFIED (read file) | ? INFERRED (grep only) | ✗ UNCERTAIN
</epistemic-reminder>`;
    } else {
      reminder = `<epistemic-reminder>
Grep results are evidence, not proof. Verify with Read before claiming.
</epistemic-reminder>`;
    }
  }
  const output = {
    result: "continue",
    additionalContext: reminder,
  };
  console.log(JSON.stringify(output));
}
main();
