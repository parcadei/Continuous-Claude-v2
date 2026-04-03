#!/usr/bin/env node

// src/import-error-detector.ts
import { readFileSync } from "fs";
var IMPORT_ERROR_PATTERNS = [
  /ModuleNotFoundError:\s*No module named\s*['"]?(\w+)['"]?/i,
  /ImportError:\s*cannot import name\s*['"]?(\w+)['"]?/i,
  /ImportError:\s*No module named\s*['"]?(\w+)['"]?/i,
  /No module named\s*['"]?(\w+)['"]?/i,
  /ModuleNotFoundError/i,
  /circular import/i,
];
function detectImportError(output) {
  for (const pattern of IMPORT_ERROR_PATTERNS) {
    const match = pattern.exec(output);
    if (match) {
      return {
        detected: true,
        module: match[1] || void 0,
      };
    }
  }
  return { detected: false };
}
async function main() {
  let input;
  try {
    const rawInput = readFileSync(0, "utf-8");
    input = JSON.parse(rawInput);
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (input.tool_name !== "Bash") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const textToCheck = [input.tool_output, input.error]
    .filter(Boolean)
    .join("\n");
  if (!textToCheck) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const result = detectImportError(textToCheck);
  if (result.detected) {
    const moduleName = result.module ? ` (module: ${result.module})` : "";
    const output = {
      result: "continue",
      message: `
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F527} IMPORT ERROR DETECTED${moduleName}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

Consider using /dependency-preflight skill to diagnose:

1. Check Python version: uv run python --version
2. Check if installed: uv pip show ${result.module || "<module>"}
3. Verify import: uv run python -c "import ${result.module || "<module>"}"

Or invoke the skill: /dependency-preflight
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`,
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(JSON.stringify({ result: "continue" }));
  }
}
main().catch(() => {
  console.log(JSON.stringify({ result: "continue" }));
});
