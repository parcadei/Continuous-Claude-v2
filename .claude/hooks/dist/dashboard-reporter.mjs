// src/dashboard-reporter.ts
var DASHBOARD_URL = "http://127.0.0.1:3434/api/hook-events";
var TIMEOUT_MS = 2e3;
function parseInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
function buildPayload(input) {
  return {
    hook_name: "dashboard-reporter",
    event_type: "tool_use",
    skill_matched: null,
    details: {
      tool_name: input.tool_name || "unknown",
      session_id: input.session_id || "unknown",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      blocked: "false"
    }
  };
}
async function postEvent(payload, url, timeoutMs) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch {
  }
}
async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const input = parseInput(raw);
  if (!input) {
    console.log("{}");
    return;
  }
  const payload = buildPayload(input);
  await postEvent(payload, DASHBOARD_URL, TIMEOUT_MS);
  console.log("{}");
}
if (!process.env.VITEST) {
  main().catch(() => {
    console.log("{}");
  });
}
export {
  DASHBOARD_URL,
  TIMEOUT_MS,
  buildPayload,
  parseInput,
  postEvent
};
