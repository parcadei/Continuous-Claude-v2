// src/sentry-error-context.ts
import { readFileSync } from "fs";
var ERROR_KEYWORDS = /\b(production error|prod bug|crash|exception|500 error|failing in prod|sentry issue|sentry error)\b/i;
function shouldSuggestSentry(message) {
  if (typeof message !== "string" || message.length === 0) return false;
  return ERROR_KEYWORDS.test(message);
}
function buildErrorContext() {
  return `[Sentry] Consider checking Sentry for recent production errors:
  sentry-cli issues list --query "is:unresolved" --json
Or use Sentry MCP for interactive investigation with Seer AI analysis.`;
}
function handleUserPrompt(input) {
  try {
    if (!input || typeof input !== "object") return null;
    const message = input.user_message;
    if (!shouldSuggestSentry(message)) return null;
    return {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: buildErrorContext()
      }
    };
  } catch {
    return null;
  }
}
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    console.log("{}");
    return;
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    console.log("{}");
    return;
  }
  const result = handleUserPrompt(input);
  if (result) {
    console.log(JSON.stringify(result));
  } else {
    console.log("{}");
  }
}
if (!process.env.VITEST) {
  main().catch(() => {
    console.log("{}");
  });
}
export {
  buildErrorContext,
  handleUserPrompt,
  shouldSuggestSentry
};
