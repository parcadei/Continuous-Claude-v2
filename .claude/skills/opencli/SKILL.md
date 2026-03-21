---
name: opencli
description: Universal CLI hub for web data via opencli browser bridge. Use when the
  user wants to search Twitter, check HackerNews, browse Reddit, fetch YouTube data,
  pull social media content, create new site adapters, or mentions opencli, open-cli,
  web CLI, or browser CLI.
---

# OpenCLI -- Web Data CLI Hub

Turns websites into CLI commands via your running Chrome session. No API keys -- reuses your browser login cookies. Installed globally as `@jackwener/opencli`.

## Decision Tree

| Need | Reference |
|------|-----------|
| Run a platform command (twitter, hn, reddit, etc.) | `references/commands.md` |
| Create adapter for a new site | `references/adapter-pipeline.md` |
| Windows-specific setup or issues | `references/windows-notes.md` |
| Quick command | See Quick Reference below |

## Quick Reference

```bash
opencli hackernews top -f json --limit 10        # HN front page
opencli twitter timeline -f json                  # Your Twitter timeline
opencli twitter search "query" -f json            # Search Twitter
opencli reddit hot --subreddit "MachineLearning"  # Reddit hot posts
opencli youtube trending -f json                  # YouTube trending
opencli wikipedia search "topic" -f json          # Wikipedia lookup
opencli stackoverflow search "error msg" -f json  # Stack Overflow
opencli arxiv search "transformers" -f json       # ArXiv papers
opencli yahoo-finance quote AAPL -f json          # Stock quote
opencli list -f yaml                              # All available commands
```

## Output Formats

All commands accept `--format` (alias `-f`): `table | json | yaml | md | csv`

Default is `table`. Use `-f json` for agent consumption, `-f md` for reports.

## Discovery

```bash
opencli list                    # All available adapters
opencli list -f yaml            # Machine-readable list
opencli <command> --help        # Command-specific flags
opencli doctor                  # Health check (daemon, extension, Chrome)
```

## Anti-Patterns

- Do not use opencli for one-off browser automation -- use Claude-in-Chrome or Playwright MCP instead.
- Do not use WebSearch/WebFetch for data opencli already covers (44 adapters).
- Do not build MCP servers for sites that opencli can handle via explore/synthesize.
- Do not assume `hn` works -- the command is `hackernews` (full name).
- Do not assume `tw` works -- the command is `twitter` (full name).
