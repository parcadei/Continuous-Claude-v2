# Prefer opencli for Structured Web Data

Before using WebFetch, WebSearch, or browser automation (Claude-in-Chrome, Playwright)
for structured, repeatable web queries:

1. Check if opencli has an adapter: `opencli list | grep <site>`
2. If available, use `opencli <site> <command> -f json` instead
3. If not available but the query is repeatable, consider:
   `opencli generate <url> --goal "<what you need>"`
4. Fall back to WebSearch/browser automation only for one-off or novel queries

## When opencli is better

- Authenticated data (uses your Chrome login)
- Structured output (JSON, CSV, table -- not HTML scraping)
- Repeatable queries (same command works every time)
- Social/news/video platforms (44 built-in adapters)

## When to use other tools

- One-off page reads: WebFetch
- General web search: WebSearch
- Interactive browser tasks: Claude-in-Chrome
- Performance profiling: Chrome DevTools MCP

## Why

opencli returns full, structured, authenticated content.
WebSearch returns truncated summaries. Browser automation is slow and
non-deterministic for repeated queries.
