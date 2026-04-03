// src/pre-edit-context.ts
import { readFileSync, existsSync } from "fs";
import { basename, join } from "path";
import { homedir } from "os";
var SYMBOL_INDEX_FILE = join(
  homedir(),
  ".claude",
  "cache",
  "symbol-index",
  "symbols.json",
);
var symbolIndex = null;
function loadSymbolIndex() {
  if (symbolIndex !== null) return symbolIndex;
  try {
    if (existsSync(SYMBOL_INDEX_FILE)) {
      symbolIndex = JSON.parse(readFileSync(SYMBOL_INDEX_FILE, "utf-8"));
      return symbolIndex;
    }
  } catch {}
  symbolIndex = {};
  return symbolIndex;
}
function getFileSymbols(filePath) {
  const index = loadSymbolIndex();
  const result = { functions: [], classes: [], variables: [] };
  for (const [name, entry] of Object.entries(index)) {
    if (
      entry.location.includes(filePath) ||
      entry.location.includes(basename(filePath))
    ) {
      if (entry.type === "function") result.functions.push(name);
      else if (entry.type === "class") result.classes.push(name);
      else if (entry.type === "variable") result.variables.push(name);
    }
  }
  return result;
}
var SKIP_KEYWORDS = /* @__PURE__ */ new Set([
  "if",
  "for",
  "while",
  "with",
  "except",
  "print",
  "len",
  "str",
  "int",
  "list",
  "dict",
  "set",
  "tuple",
  "range",
  "enumerate",
  "zip",
  "map",
  "filter",
  "sorted",
  "reversed",
  "type",
  "isinstance",
  "hasattr",
  "getattr",
  "setattr",
  "super",
  "open",
  "input",
  "return",
  "yield",
  "import",
  "from",
  "class",
  "def",
  "async",
  "await",
  "try",
  "raise",
]);
function extractFunctionCalls(code) {
  const callRe = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const calls = /* @__PURE__ */ new Set();
  let match;
  while ((match = callRe.exec(code)) !== null) {
    const name = match[1];
    if (!SKIP_KEYWORDS.has(name)) {
      calls.add(name);
    }
  }
  return Array.from(calls);
}
function getSignature(funcName, location) {
  try {
    const [filePath, lineNum] = location.split(":");
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const startLine = parseInt(lineNum, 10) - 1;
    let sig = "";
    let foundDef = false;
    for (
      let i = Math.max(0, startLine - 2);
      i < Math.min(startLine + 10, lines.length);
      i++
    ) {
      const line = lines[i];
      if (!foundDef && (line.includes("def ") || line.includes("async def "))) {
        foundDef = true;
      }
      if (foundDef) {
        sig += line + " ";
        if (sig.includes("):") || sig.includes(") ->")) break;
      }
    }
    if (!foundDef) return null;
    const match = sig.match(
      /((?:async\s+)?def\s+\w+\s*\([^)]*\)(?:\s*->\s*[^:]+)?)/s,
    );
    if (match) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  } catch {}
  return null;
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
  const contextParts = [];
  const index = loadSymbolIndex();
  const symbols = getFileSymbols(filePath);
  const totalSymbols =
    symbols.functions.length +
    symbols.classes.length +
    symbols.variables.length;
  if (totalSymbols > 0) {
    const symbolParts = [];
    if (symbols.classes.length > 0) {
      symbolParts.push(
        `Classes: ${symbols.classes.slice(0, 10).join(", ")}${symbols.classes.length > 10 ? "..." : ""}`,
      );
    }
    if (symbols.functions.length > 0) {
      symbolParts.push(
        `Functions: ${symbols.functions.slice(0, 15).join(", ")}${symbols.functions.length > 15 ? "..." : ""}`,
      );
    }
    if (symbols.variables.length > 0 && symbols.variables.length <= 10) {
      symbolParts.push(`Variables: ${symbols.variables.join(", ")}`);
    }
    contextParts.push(`[${basename(filePath)}: ${totalSymbols} symbols]
${symbolParts.join("\n")}`);
  }
  const newCode = input.tool_input.new_string || "";
  if (newCode.length >= 10) {
    const calls = extractFunctionCalls(newCode);
    const signatures = [];
    for (const call of calls.slice(0, 5)) {
      const entry = index[call];
      if (entry && entry.type === "function") {
        const sig = getSignature(call, entry.location);
        if (sig) {
          signatures.push(sig);
        }
      }
    }
    if (signatures.length > 0) {
      contextParts.push(`[Signatures]
${signatures.join("\n")}`);
    }
  }
  if (contextParts.length === 0) {
    console.log("{}");
    return;
  }
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: contextParts.join("\n\n"),
    },
  };
  console.log(JSON.stringify(output));
}
main().catch(() => console.log("{}"));
