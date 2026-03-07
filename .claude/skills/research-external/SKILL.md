---
name: research-external
description: External research workflow for docs, web, APIs - NOT codebase exploration
allowed-tools: [Bash, Read, Write, Task]
metadata:
  model: sonnet
---

# External Research Workflow

Research external sources (documentation, web, APIs) for libraries, best practices, and general topics.

> **Note:** The current year is 2025. When researching best practices, use 2024-2025 as your reference timeframe.

## Invocation

```
/research-external <focus> [options]
```

## Question Flow (No Arguments)

If the user types just `/research-external` with no or partial arguments, guide them through this question flow.

### Phase 1: Research Type

```yaml
question: "What kind of information do you need?"
header: "Type"
options:
  - label: "How to use a library/package"
    description: "API docs, examples, patterns"
  - label: "Best practices for a task"
    description: "Recommended approaches, comparisons"
  - label: "General topic research"
    description: "Comprehensive multi-source search"
  - label: "Compare options/alternatives"
    description: "Which tool/library/approach is best"
```

**Mapping:** library / best-practices / general / best-practices with comparison framing

### Phase 2: Specific Topic

Free text input. Examples:
- "How to use Prisma ORM with TypeScript"
- "Best practices for error handling in Python"
- "React vs Vue vs Svelte for dashboards"

### Phase 3: Library Details (if library focus)

Ask for registry (npm / PyPI / crates.io / Go modules) and specific library name if not provided.

### Phase 4: Depth

- "Quick answer" → `--depth shallow`
- "Thorough research" → `--depth thorough`

### Phase 5: Output

- "Summary in chat" → default chat response
- "Research document" → `--output doc` → `thoughts/shared/research/`
- "Handoff for implementation" → `--output handoff`

### Summary Before Execution

```
Based on your answers, I'll research:

**Focus:** library
**Topic:** "Prisma ORM connection pooling"
**Library:** prisma (npm)
**Depth:** thorough
**Output:** doc

Proceed? [Yes / Adjust settings]
```

## Focus Modes

| Focus | Primary Tool | Purpose |
|-------|--------------|---------|
| `library` | nia-docs | API docs, usage patterns, code examples |
| `best-practices` | perplexity-search | Recommended approaches, patterns, comparisons |
| `general` | All MCP tools | Comprehensive multi-source research |

## Options

| Option | Values | Description |
|--------|--------|-------------|
| `--topic` | `"string"` | **Required.** The topic/library/concept to research |
| `--depth` | `shallow`, `thorough` | Search depth (default: shallow) |
| `--output` | `handoff`, `doc` | Output format (default: doc) |
| `--library` | `"name"` | For `library` focus: specific package name |
| `--registry` | `npm`, `py_pi`, `crates`, `go_modules` | For `library` focus: package registry |

## Workflow

### Step 1: Parse Arguments

```
FOCUS=$1           # library | best-practices | general
TOPIC="..."        # from --topic
DEPTH="shallow"    # from --depth (default: shallow)
OUTPUT="doc"       # from --output (default: doc)
LIBRARY="..."      # from --library (optional)
REGISTRY="npm"     # from --registry (default: npm)
```

### Step 2: Execute Research by Focus

#### Focus: `library`

Primary tool: **nia-docs** — API documentation, usage patterns, code examples.

```bash
# Semantic search in package
(cd $CLAUDE_OPC_DIR && uv run python -m runtime.harness scripts/mcp/nia_docs.py \
  --package "$LIBRARY" --registry "$REGISTRY" --query "$TOPIC" --limit 10)

# Thorough: also grep for specific patterns
(cd $CLAUDE_OPC_DIR && uv run python -m runtime.harness scripts/mcp/nia_docs.py \
  --package "$LIBRARY" --grep "$TOPIC")

# Supplement with official docs if URL known
(cd $CLAUDE_OPC_DIR && uv run python -m runtime.harness scripts/mcp/firecrawl_scrape.py \
  --url "https://docs.example.com/api/$TOPIC" --format markdown)
```

Thorough depth: multiple semantic queries with variations, grep for function/class names, scrape official docs pages.

#### Focus: `best-practices`

Primary tool: **perplexity-search** — recommended approaches, patterns, anti-patterns.

```bash
# AI-synthesized research (sonar-pro)
(cd $CLAUDE_OPC_DIR && uv run python scripts/mcp/perplexity_search.py \
  --research "$TOPIC best practices 2024 2025")

# Comparing alternatives
(cd $CLAUDE_OPC_DIR && uv run python scripts/mcp/perplexity_search.py \
  --reason "$TOPIC vs alternatives - which to choose?")
```

Thorough depth additions:
```bash
# Chain-of-thought for complex decisions
(cd $CLAUDE_OPC_DIR && uv run python scripts/mcp/perplexity_search.py \
  --reason "$TOPIC tradeoffs and considerations 2025")

# Deep comprehensive research
(cd $CLAUDE_OPC_DIR && uv run python scripts/mcp/perplexity_search.py \
  --deep "$TOPIC comprehensive guide 2025")

# Recent developments
(cd $CLAUDE_OPC_DIR && uv run python scripts/mcp/perplexity_search.py \
  --search "$TOPIC latest developments" --recency month --max-results 5)
```

#### Focus: `general`

Use ALL available MCP tools — comprehensive multi-source research.

```bash
# 2a: Library documentation (nia-docs)
(cd $CLAUDE_OPC_DIR && uv run python -m runtime.harness scripts/mcp/nia_docs.py \
  --search "$TOPIC")

# 2b: Web research (perplexity)
(cd $CLAUDE_OPC_DIR && uv run python scripts/mcp/perplexity_search.py \
  --research "$TOPIC")

# 2c: Specific documentation pages found in step 2b (firecrawl)
(cd $CLAUDE_OPC_DIR && uv run python -m runtime.harness scripts/mcp/firecrawl_scrape.py \
  --url "$FOUND_DOC_URL" --format markdown)
```

Thorough depth: run all three with expanded queries, cross-reference findings, follow links for deeper context.

### Step 3: Synthesize Findings

Combine results from all sources:

1. **Key Concepts** — Core ideas and terminology
2. **Code Examples** — Working examples from documentation
3. **Best Practices** — Recommended approaches
4. **Pitfalls** — Common mistakes to avoid
5. **Alternatives** — Other options considered
6. **Sources** — URLs for all citations

### Step 4: Write Output

See `references/output-templates.md` for full doc and handoff templates.

**Doc path:** `thoughts/shared/research/YYYY-MM-DD-{topic-slug}.md`
**Handoff path:** `thoughts/shared/handoffs/{session}/research-{topic-slug}.yaml`

### Step 5: Return Summary

```
Research Complete

Topic: {topic}
Focus: {focus}
Output: {path to file}

Key findings:
- {Finding 1}
- {Finding 2}
- {Finding 3}

Sources: {N} sources cited
```

## Error Handling

If an MCP tool fails (API key missing, rate limited, etc.):

1. Log the failure in output under `tool_status:`
2. Continue with other sources — partial results are valuable
3. Set status: `complete` / `partial` / `failed`
4. Note gaps in findings under `## Gaps`

## Quick Examples

```bash
# Library lookup (shallow)
/research-external library --topic "dependency injection" --library fastapi --registry py_pi

# Best practices (thorough)
/research-external best-practices --topic "error handling in Python async" --depth thorough

# General research for handoff
/research-external general --topic "OAuth2 PKCE flow implementation" --depth thorough --output handoff

# Quick React hook lookup
/research-external library --topic "useEffect cleanup" --library react
```

## Integration with Other Skills

| After Research | Use Skill | For |
|----------------|-----------|-----|
| `--output handoff` | `plan-agent` | Create implementation plan |
| Code examples found | `implement_task` | Direct implementation |
| Architecture decision | `create_plan` | Detailed planning |
| Library comparison | Present to user | Decision making |

## Required Environment

- `NIA_API_KEY` or `nia` server in mcp_config.json
- `PERPLEXITY_API_KEY` in environment or `~/.claude/.env`
- `FIRECRAWL_API_KEY` and `firecrawl` server in mcp_config.json

## Notes

- **NOT for codebase exploration** — Use `research-codebase` or `scout` for that
- **Always cite sources** — Include URLs for all findings
- **2024-2025 timeframe** — Focus on current best practices
- **Graceful degradation** — Partial results better than no results
- Full output templates: `references/output-templates.md`
