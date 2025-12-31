# Scripts Directory - CLI-Based MCP Workflows

Agent-agnostic Python workflows that orchestrate MCP tools via CLI arguments.

## Available Scripts

### Web & Search
| Script | Purpose | Key Args |
|--------|---------|----------|
| `firecrawl_scrape.py` | Web scraping | `--url`, `--search`, `--format` |
| `perplexity_search.py` | AI search | `--ask`, `--search`, `--research` |
| `github_search.py` | GitHub search | `--type`, `--query`, `--owner` |

### Code Analysis
| Script | Purpose | Key Args |
|--------|---------|----------|
| `ast_grep_find.py` | AST code search | `--pattern`, `--language`, `--path` |
| `morph_search.py` | Fast codebase search | `--search`, `--path` |
| `morph_apply.py` | AI code edits | `--file`, `--instruction` |
| `qlty_check.py` | Code quality | `--check`, `--metrics`, `--smells` |
| `typescript_check.py` | TypeScript checks | `--file`, `--project-root` |

### Documentation
| Script | Purpose | Key Args |
|--------|---------|----------|
| `nia_docs.py` | Library docs | Subcommands: oracle, search, repos |
| `repoprompt_async.py` | Async RepoPrompt | `--action`, `--task` |

### Database & Context
| Script | Purpose | Key Args |
|--------|---------|----------|
| `artifact_index.py` | Index handoffs/plans | `--handoffs`, `--plans`, `--all` |
| `artifact_query.py` | Search context graph | `query`, `--type`, `--limit` |
| `artifact_mark.py` | Mark outcomes | `--handoff`, `--outcome` |

### Session Analysis
| Script | Purpose | Key Args |
|--------|---------|----------|
| `braintrust_analyze.py` | Session analysis | `--last-session`, `--agent-stats` |

### Multi-Tool
| Script | Purpose | Key Args |
|--------|---------|----------|
| `multi_tool_pipeline.py` | Tool chaining | `--repo-path`, `--max-commits` |

## Usage Pattern

```bash
# Execute via harness
uv run python -m runtime.harness scripts/{script}.py --args

# Examples
uv run python -m runtime.harness scripts/firecrawl_scrape.py --url "https://example.com"
uv run python -m runtime.harness scripts/github_search.py --type code --query "auth"
```

## Script Structure

```python
"""Script docstring with USAGE examples."""

import argparse, asyncio
from runtime.mcp_client import call_mcp_tool

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--param", required=True)
    # Filter script path added by harness
    args_to_parse = [arg for arg in sys.argv[1:] if not arg.endswith(".py")]
    return parser.parse_args(args_to_parse)

async def main():
    args = parse_args()
    result = await call_mcp_tool("server__tool", {"param": args.param})
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
```

## Key Conventions

- **Tool ID format**: `"serverName__toolName"` (double underscore)
- **Parameters via CLI**: Never edit script files for parameters
- **Return format**: JSON to stdout
- **Help support**: All scripts support `--help`

## Documentation

- `README.md` - Quick start
- `SCRIPTS.md` - Complete framework guide
