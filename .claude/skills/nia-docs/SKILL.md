---
name: nia-docs
description: Search library documentation and code examples via Nia API
allowed-tools: [Bash, Read]
metadata:
  user-invocable: true
---

# How to use Nia

Nia provides MCP tools for indexing and searching external repositories, research papers, documentation, packages, and performing AI-powered research. Its primary goal is to reduce hallucinations and provide up-to-date context.

## MCP Server

- **Transport**: HTTP (remote cloud)
- **URL**: `https://apigcp.trynia.ai/mcp`
- **Config**: `~/.claude/mcp.json` (key: `nia`)
- **Auth**: Bearer token via `NIA_API_KEY` env var

## Nia-First Workflow

**BEFORE using WebFetch or WebSearch, you MUST:**

1. **Check indexed sources first**: `manage_resource(action='list', query='relevant-keyword')` -- many sources may already be indexed
2. **If source exists**: Use `search`, `doc_grep`, `doc_read`, `code_grep` for targeted queries
3. **If source doesn't exist but URL known**: Index it with `index` tool, then search
4. **Only if source unknown**: Use `nia_deep_research_agent` or `nia_web_search` to discover URLs, then index

**Why**: Indexed sources provide more accurate, complete context than web fetches. WebFetch returns truncated/summarized content while Nia provides full source code and documentation.

## Deterministic Workflow

1. Check if source is already indexed: `manage_resource(action='list', query='...')`
2. If indexed, explore structure: `doc_tree` or `doc_ls`
3. Targeted search: `search`, `doc_grep`, `doc_read`, `code_grep`
4. Save findings with `context` tool for reuse across conversations
5. For new sources, index first (allow 1-5 min), check status with `manage_resource`

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `index` | Index repo/docs/paper. Auto-detects type from URL |
| `search` | Search repos/docs. Omit sources for universal hybrid search |
| `manage_resource` | Manage indexed resources (list/status/rename/delete/subscribe) |
| `doc_tree` | Get docs tree structure |
| `doc_ls` | List docs directory contents |
| `doc_read` | Read docs page by virtual path |
| `doc_grep` | Regex search in docs |
| `code_grep` | Regex search in repo code |
| `read_source_content` | Read full content of source file/document |
| `get_github_file_tree` | Get repo file tree from GitHub API (no indexing needed) |
| `nia_package_search_grep` | Regex search in public package source |
| `nia_package_search_hybrid` | Semantic search in package source with optional regex |
| `nia_package_search_read_file` | Read lines from package source file |
| `nia_web_search` | Web search for repos/docs/tech content |
| `nia_deep_research_agent` | AI-powered deep research on any topic |
| `context` | Cross-agent context sharing (save/list/retrieve/search/update/delete) |

## Indexing Notes

- For docs, always index the root link (e.g., `docs.stripe.com`) to scrape all pages
- Indexing takes 1-5 minutes. Check status with `manage_resource(action='status')`
- GitHub repos, npm packages, PyPI packages should ALWAYS be indexed, not fetched
- Use `manage_resource(action='subscribe')` to auto-update sources

## When to Use Nia vs Other Tools

| Need | Use |
|------|-----|
| Quick library API lookup | context7 (pre-indexed, fast) |
| Deep library source code search | Nia `nia_package_search_*` |
| Index custom docs/repos | Nia `index` |
| Research papers | Nia `index` + `search` |
| Web search for tech content | Nia `nia_web_search` |
| AI-powered deep research | Nia `nia_deep_research_agent` |
| Internal codebase search | Grep/TLDR/AST-grep (local tools) |
