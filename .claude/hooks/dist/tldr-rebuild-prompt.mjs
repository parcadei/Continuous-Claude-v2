// src/tldr-rebuild-prompt.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
var REBUILD_THRESHOLD = 10;
var PROMPT_COOLDOWN_MS = 30 * 60 * 1e3;
function readStdin() {
  return readFileSync(0, "utf-8");
}
function getCountPath(projectDir) {
  return join(projectDir, ".claude", "cache", "tldr", "edit-count.json");
}
function loadEditCount(countPath, sessionId) {
  if (!existsSync(countPath)) {
    return {
      session_id: sessionId,
      count: 0,
      last_prompt_at: 0,
      files_changed: [],
    };
  }
  try {
    const data = JSON.parse(readFileSync(countPath, "utf-8"));
    if (data.session_id !== sessionId) {
      return {
        session_id: sessionId,
        count: 0,
        last_prompt_at: 0,
        files_changed: [],
      };
    }
    return data;
  } catch {
    return {
      session_id: sessionId,
      count: 0,
      last_prompt_at: 0,
      files_changed: [],
    };
  }
}
function saveEditCount(countPath, data) {
  const dir = dirname(countPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(countPath, JSON.stringify(data, null, 2));
}
function isCodeFile(filePath) {
  const codeExtensions = [".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs"];
  return codeExtensions.some((ext) => filePath.endsWith(ext));
}
async function main() {
  const input = JSON.parse(readStdin());
  if (!["Edit", "Write"].includes(input.tool_name)) {
    console.log("{}");
    return;
  }
  if (input.tool_response?.success === false) {
    console.log("{}");
    return;
  }
  const filePath =
    input.tool_input?.file_path || input.tool_response?.filePath || "";
  if (!filePath || !isCodeFile(filePath)) {
    console.log("{}");
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const countPath = getCountPath(projectDir);
  const editCount = loadEditCount(countPath, input.session_id);
  editCount.count++;
  if (!editCount.files_changed.includes(filePath)) {
    editCount.files_changed.push(filePath);
  }
  const now = Date.now();
  const shouldPrompt =
    editCount.count >= REBUILD_THRESHOLD &&
    now - editCount.last_prompt_at > PROMPT_COOLDOWN_MS;
  if (shouldPrompt) {
    editCount.last_prompt_at = now;
    saveEditCount(countPath, editCount);
    const uniqueFiles = editCount.files_changed.length;
    const output = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `\u{1F4CA} **TLDR Index May Be Stale**

You've edited ${editCount.count} code files (${uniqueFiles} unique) this session.
The TLDR caches may be outdated.

To rebuild indexes:
\`\`\`bash
mkdir -p .claude/cache/tldr
tldr arch src/ > .claude/cache/tldr/arch.json
tldr calls src/ > .claude/cache/tldr/calls.json
tldr dead src/ > .claude/cache/tldr/dead.json
\`\`\`

Or say "rebuild TLDR index" and I'll run these commands.`,
      },
    };
    console.log(JSON.stringify(output));
    return;
  }
  saveEditCount(countPath, editCount);
  console.log("{}");
}
main().catch(() => {
  console.log("{}");
});
