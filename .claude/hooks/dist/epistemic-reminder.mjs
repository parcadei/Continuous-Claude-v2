// src/epistemic-reminder.ts
import { readFileSync } from "fs";
function main() {
  let input;
  try {
    const stdinContent = readFileSync(0, "utf-8");
    input = JSON.parse(stdinContent);
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (input.tool_name !== "Grep" && input.tool_name !== "Read") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  let reminder;
  if (input.tool_name === "Read") {
    const filePath = input.tool_input?.file_path || "file";
    const fileName = filePath.split("/").pop() || "file";
    reminder = `<system-reminder>
\u2713 Read ${fileName} - note findings. Update any prior ? INFERRED claims to \u2713 VERIFIED if confirmed.
</system-reminder>`;
  } else {
    const pattern = input.tool_input?.pattern || "";
    const outputMode = input.tool_input?.output_mode || "files_with_matches";
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
\u26A0\uFE0F GREP RESULTS ARE NOT PROOF

Before claiming "X exists" or "X doesn't exist":
1. READ the actual file(s) to verify
2. Grep may miss: different naming, regex mismatch, file not searched
3. Grep may false-match: substring matches, comments, strings

REQUIRED: Use Read tool on relevant files before making existence claims.
Mark claims as: \u2713 VERIFIED (read file) | ? INFERRED (grep only) | \u2717 UNCERTAIN
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
export { main };
