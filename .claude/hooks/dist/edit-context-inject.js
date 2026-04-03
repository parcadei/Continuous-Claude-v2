/**
 * Pre-Edit Context Injection Hook
 *
 * Injects file structure from TLDR before Claude edits a file.
 * Uses TLDR daemon for fast code extraction (replaces CLI spawning).
 */
import { readFileSync } from "fs";
import { basename } from "path";
import { queryDaemonSync } from "./daemon-client.js";
/**
 * Get file structure using TLDR daemon extract command.
 */
function getTLDRExtract(filePath) {
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const response = queryDaemonSync(
      { cmd: "extract", file: filePath },
      projectDir,
    );
    // Skip if daemon is indexing or unavailable
    if (
      response.indexing ||
      response.status === "unavailable" ||
      response.status === "error"
    ) {
      return null;
    }
    if (response.result) {
      return response.result;
    }
    return null;
  } catch {
    return null;
  }
}
async function main() {
  const input = JSON.parse(readFileSync(0, "utf-8"));
  if (input.tool_name !== "Edit") {
    console.log("{}");
    return;
  }
  const filePath = input.tool_input.file_path;
  if (!filePath) {
    console.log("{}");
    return;
  }
  // Get file structure from TLDR
  const extract = getTLDRExtract(filePath);
  if (!extract) {
    console.log("{}");
    return;
  }
  const classCount = extract.classes?.length || 0;
  const funcCount = extract.functions?.length || 0;
  const total = classCount + funcCount;
  if (total === 0) {
    console.log("{}");
    return;
  }
  // Build compact context message
  const parts = [];
  if (classCount > 0) {
    const classNames = extract.classes.map((c) => c.name).slice(0, 10);
    parts.push(
      `Classes: ${classNames.join(", ")}${classCount > 10 ? "..." : ""}`,
    );
  }
  if (funcCount > 0) {
    // Show function names with param counts for quick reference
    const funcSummaries = extract.functions.slice(0, 12).map((f) => {
      const paramCount = f.params?.length || 0;
      return paramCount > 0 ? `${f.name}(${paramCount})` : f.name;
    });
    parts.push(
      `Functions: ${funcSummaries.join(", ")}${funcCount > 12 ? "..." : ""}`,
    );
  }
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: `[Edit context: ${basename(filePath)} has ${total} symbols]\n${parts.join("\n")}`,
    },
  };
  console.log(JSON.stringify(output));
}
main().catch(() => console.log("{}"));
