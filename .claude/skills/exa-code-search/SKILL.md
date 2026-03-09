---
name: exa-code-search
description: Find real-world code examples via Exa. Searches GitHub, StackOverflow, and technical docs for copy-paste-ready snippets.
allowed-tools: [Task]
metadata:
  model: sonnet
  version: "1.0.0"
---

# Exa Code Search

Search for real-world code examples, API usage patterns, and implementation snippets via Exa MCP.

## MCP Server

- **Server:** `exa` (cloud HTTP transport)
- **URL:** `https://mcp.exa.ai/mcp?tools=get_code_context_exa`
- **Tool:** `get_code_context_exa`
- **Free tier:** 1,000 requests/month (no API key needed)

## Tool Restriction

ONLY use `get_code_context_exa`. Do NOT use other Exa tools if available.

## Token Isolation

Never run Exa in main context. Always spawn Task agents:
1. Agent calls `get_code_context_exa`
2. Agent extracts the minimum viable snippet(s) + constraints
3. Agent deduplicates near-identical results (mirrors, forks, repeated StackOverflow answers)
4. Agent returns copyable snippets + brief explanation
5. Main context stays clean regardless of search volume

## When to Use

Use Exa when you need **code examples** -- actual working implementations, not documentation:
- "How to use X with Y" (implementation patterns)
- SDK/library usage examples
- Config and setup patterns
- Framework "how to" questions
- Debugging when you need authoritative fix code

## When NOT to Use (Use Other Tools Instead)

| Need | Use Instead |
|------|-------------|
| API reference docs | context7 (fast, pre-indexed) or Nia (deep, custom) |
| Library source code | Nia (`nia_search_github_repo`) |
| Best practices / comparisons | Perplexity |
| GitHub issues / PRs | GitHub MCP |
| Internal codebase search | TLDR / Grep / AST-grep |

## Inputs

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | -- | Search query |
| `tokensNum` | number | No | ~5000 | Token budget for results |

## Query Writing Patterns

To reduce irrelevant results and cross-language noise:
- **Always include the programming language** in the query
- Include **framework + version** when applicable (e.g., "Next.js 15", "React 19")
- Include exact identifiers (function names, config keys, error messages)

**Good:** `"Drizzle ORM insert with returning TypeScript Neon"`
**Bad:** `"how to insert into database"`

## Token Strategy

| Scenario | tokensNum |
|----------|-----------|
| Focused snippet | 1000-3000 |
| Most tasks | 5000 (default) |
| Complex integration | 10000-20000 |

Only go larger when necessary -- smaller token counts return faster, more focused results.

## Output Format

Return to user:
1. Best minimal working snippet(s) -- copy/paste friendly
2. Notes on version / constraints / gotchas
3. Sources (URLs if present in returned context)

Before presenting: deduplicate similar results and keep only the best representative snippet per approach.

## Position in Search Hierarchy

```
External search need?
|-- Quick popular library API         -> context7
|-- Deep library source / custom docs -> Nia
|-- Code examples / "how to" snippets -> Exa  <-- this skill
|-- Web search / best practices       -> Perplexity
|-- GitHub repos / issues / PRs       -> GitHub MCP
|-- Raw web content                   -> WebFetch (last resort)
```

## Example Usage

```
# In a Task agent:
get_code_context_exa({
  query: "Next.js 15 server actions form submission TypeScript",
  tokensNum: 5000
})
```
