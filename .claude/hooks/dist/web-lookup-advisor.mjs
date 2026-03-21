// src/web-lookup-advisor.ts
import { readFileSync } from "fs";
var WEB_TOOLS = ["WebFetch", "WebSearch"];
var FAILURE_PATTERNS = /\b(404|403|timeout|timed.out|failed|error|blocked|rate.limit|captcha|forbidden|not.found)\b/i;
var SITE_MAP = {
  "twitter.com": "opencli twitter",
  "x.com": "opencli twitter",
  "reddit.com": "opencli reddit",
  "news.ycombinator.com": "opencli hackernews",
  "youtube.com": "opencli youtube",
  "bilibili.com": "opencli bilibili",
  "zhihu.com": "opencli zhihu",
  "linkedin.com": "opencli linkedin",
  "bloomberg.com": "opencli bloomberg",
  "huggingface.co": "opencli hf",
  "wikipedia.org": "opencli wikipedia",
  "stackoverflow.com": "opencli stackoverflow",
  "arxiv.org": "opencli arxiv",
  "weibo.com": "opencli weibo",
  "v2ex.com": "opencli v2ex"
};
function detectWebFailure(input) {
  if (!WEB_TOOLS.includes(input.tool_name)) return false;
  const response = input.tool_response;
  if (response == null) return true;
  if (typeof response === "object" && response !== null) {
    const r = response;
    if (typeof r.status === "number" && r.status >= 400) return true;
    if (typeof r.error === "string" && r.error.length > 0) return true;
  }
  if (typeof response === "string" && FAILURE_PATTERNS.test(response) && response.length < 500) return true;
  return false;
}
function buildSuggestion(url) {
  let siteHint = "";
  if (url) {
    try {
      const hostname = new URL(url).hostname.replace("www.", "");
      const match = Object.entries(SITE_MAP).find(([domain]) => hostname.includes(domain));
      if (match) {
        siteHint = `
Try: \`${match[1]} <command> -f json\``;
      }
    } catch {
    }
  }
  return [
    "Web lookup failed. Consider using opencli if this is a supported platform.",
    siteHint,
    'Run `opencli list` to see available commands, or `opencli generate <url> --goal "<goal>"` to create a new adapter.'
  ].filter(Boolean).join("\n");
}
function handlePostToolUse(input) {
  if (!detectWebFailure(input)) return null;
  const url = input.tool_input?.url || input.tool_input?.query || "";
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: buildSuggestion(url)
    }
  };
}
if (!process.env.VITEST) {
  async function main() {
    let input;
    try {
      input = JSON.parse(readFileSync(0, "utf-8"));
    } catch {
      console.log("{}");
      return;
    }
    const result = handlePostToolUse(input);
    console.log(result ? JSON.stringify(result) : "{}");
  }
  main().catch(() => console.log("{}"));
}
export {
  buildSuggestion,
  detectWebFailure,
  handlePostToolUse
};
