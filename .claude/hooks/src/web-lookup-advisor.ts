import { readFileSync } from 'fs';

interface HookInput {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response?: unknown;
}

const WEB_TOOLS = ['WebFetch', 'WebSearch'];

const FAILURE_PATTERNS = /\b(404|403|timeout|timed.out|failed|error|blocked|rate.limit|captcha|forbidden|not.found)\b/i;

const SITE_MAP: Record<string, string> = {
  'twitter.com': 'opencli twitter',
  'x.com': 'opencli twitter',
  'reddit.com': 'opencli reddit',
  'news.ycombinator.com': 'opencli hackernews',
  'youtube.com': 'opencli youtube',
  'bilibili.com': 'opencli bilibili',
  'zhihu.com': 'opencli zhihu',
  'linkedin.com': 'opencli linkedin',
  'bloomberg.com': 'opencli bloomberg',
  'huggingface.co': 'opencli hf',
  'wikipedia.org': 'opencli wikipedia',
  'stackoverflow.com': 'opencli stackoverflow',
  'arxiv.org': 'opencli arxiv',
  'weibo.com': 'opencli weibo',
  'v2ex.com': 'opencli v2ex',
};

export function detectWebFailure(input: HookInput): boolean {
  if (!WEB_TOOLS.includes(input.tool_name)) return false;

  const response = input.tool_response;

  // Null/undefined response is a failure
  if (response == null) return true;

  // Check for error status codes in object responses
  if (typeof response === 'object' && response !== null) {
    const r = response as Record<string, unknown>;
    if (typeof r.status === 'number' && r.status >= 400) return true;
    if (typeof r.error === 'string' && r.error.length > 0) return true;
  }

  // Check for failure patterns in string responses only (avoid false positives from JSON key names)
  if (typeof response === 'string' && FAILURE_PATTERNS.test(response) && response.length < 500) return true;

  return false;
}

export function buildSuggestion(url?: string): string {
  let siteHint = '';

  if (url) {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const match = Object.entries(SITE_MAP).find(([domain]) => hostname.includes(domain));
      if (match) {
        siteHint = `\nTry: \`${match[1]} <command> -f json\``;
      }
    } catch {
      // Invalid URL -- skip site hint
    }
  }

  return [
    'Web lookup failed. Consider using opencli if this is a supported platform.',
    siteHint,
    'Run `opencli list` to see available commands, or `opencli generate <url> --goal "<goal>"` to create a new adapter.',
  ].filter(Boolean).join('\n');
}

export function handlePostToolUse(input: HookInput): object | null {
  if (!detectWebFailure(input)) return null;

  const url = (input.tool_input?.url as string) || (input.tool_input?.query as string) || '';

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: buildSuggestion(url),
    },
  };
}

// Main entry -- only runs outside vitest
if (!process.env.VITEST) {
  async function main(): Promise<void> {
    let input: HookInput;
    try {
      input = JSON.parse(readFileSync(0, 'utf-8'));
    } catch {
      console.log('{}');
      return;
    }

    const result = handlePostToolUse(input);
    console.log(result ? JSON.stringify(result) : '{}');
  }

  main().catch(() => console.log('{}'));
}
