// src/composition-gate-hook.ts
import { readFileSync } from "fs";

// src/shared/python-bridge.ts
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var PROJECT_DIR =
  process.env.CLAUDE_PROJECT_DIR || resolve(__dirname, "..", "..", "..", "..");
function callValidateComposition(patternA, patternB, scope, operator = ";") {
  const expr = `${patternA} ${operator}[${scope}] ${patternB}`;
  const cmd = `uv run python scripts/validate_composition.py --json "${expr}"`;
  try {
    const stdout = execSync(cmd, {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      timeout: 1e4,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const result = JSON.parse(stdout);
    return {
      valid: result.all_valid ?? false,
      composition: result.expression ?? expr,
      errors: result.compositions?.[0]?.errors ?? [],
      warnings: result.compositions?.[0]?.warnings ?? [],
      scopeTrace: result.compositions?.[0]?.scope_trace ?? [],
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      composition: expr,
      errors: [`Bridge error: ${errorMessage}`],
      warnings: [],
      scopeTrace: [],
    };
  }
}

// src/shared/pattern-selector.ts
function validateComposition(patterns, scope = "handoff", operator = ";") {
  if (patterns.length === 0) {
    return {
      valid: true,
      composition: "",
      errors: [],
      warnings: [],
      scopeTrace: [],
    };
  }
  if (patterns.length === 1) {
    return {
      valid: true,
      composition: patterns[0],
      errors: [],
      warnings: [],
      scopeTrace: [],
    };
  }
  const allWarnings = [];
  const allTraces = [];
  let compositionStr = patterns[0];
  for (let i = 0; i < patterns.length - 1; i++) {
    const result = callValidateComposition(
      patterns[i],
      patterns[i + 1],
      scope,
      operator,
    );
    if (!result.valid) {
      return {
        valid: false,
        composition: compositionStr,
        errors: result.errors,
        warnings: result.warnings,
        scopeTrace: result.scopeTrace,
      };
    }
    allWarnings.push(...result.warnings);
    allTraces.push(...result.scopeTrace);
    compositionStr = result.composition;
  }
  return {
    valid: true,
    composition: compositionStr,
    errors: [],
    warnings: allWarnings,
    scopeTrace: allTraces,
  };
}

// src/shared/composition-gate.ts
var CompositionInvalidError = class extends Error {
  constructor(errors) {
    super(`Invalid composition: ${errors.join("; ")}`);
    this.errors = errors;
    this.name = "CompositionInvalidError";
  }
};
function gate3Composition(
  patternA,
  patternB,
  scope = "handoff",
  operator = ";",
) {
  const result = validateComposition([patternA, patternB], scope, operator);
  if (!result.valid) {
    throw new CompositionInvalidError(result.errors);
  }
  return result;
}

// src/composition-gate-hook.ts
async function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const input = JSON.parse(await readStdin());
  if (input.tool_name !== "Task") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const pattern = input.tool_input?.subagent_type;
  if (!pattern) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  try {
    gate3Composition(pattern, pattern);
    console.log(
      JSON.stringify({
        result: "continue",
        message: `C:\u2713 ${pattern}`,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        result: "continue",
        message: "C:? (check failed, allowing)",
      }),
    );
  }
}
main().catch(() => {
  console.log(JSON.stringify({ result: "continue" }));
});
