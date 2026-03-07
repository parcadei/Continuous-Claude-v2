# Explore Depth Procedures

Detailed commands and output structures for each exploration depth.

## Quick Depth

Fast structure overview using tldr commands. No agents spawned.

**Best for:** Initial orientation, quick questions about structure, finding where things are.

```bash
# 1. File tree
tldr tree ${PATH:-src/} --ext .py

# 2. Code structure (codemaps)
tldr structure ${PATH:-src/} --lang python

# 3. Focused search (if --focus provided)
tldr search "${FOCUS}" ${PATH:-src/}
```

**Implementation:**
```bash
depth=quick
tldr tree ${src_dir} --ext .py
tldr structure ${src_dir} --lang python
if [ -n "$focus" ]; then
    tldr search "$focus" ${src_dir}
fi
```

## Deep Depth

Comprehensive exploration with agent-assisted pattern research and documentation output.

**Best for:** First time in a codebase, preparing for major work, creating reference documentation.

**Steps:**
1. Check if onboarded (look for `.claude/cache/tldr/meta.json`), if not run onboard agent
2. Run tldr-explorer for structure and call graph
3. Spawn scout agent for pattern research
4. Write findings to doc or handoff

```bash
# 1. Onboard check
if [ ! -f .claude/cache/tldr/meta.json ]; then
    # Spawn onboard agent via Task tool
fi

# 2. Structure analysis
tldr structure src/ --lang python
tldr calls src/

# 3. Research patterns (via scout agent)
# Task: research-codebase -> "Document existing patterns in ${FOCUS:-codebase}"

# 4. Write output
# -> thoughts/shared/research/YYYY-MM-DD-explore-{focus}.md
# -> OR thoughts/shared/handoffs/{session}/explore-{focus}.yaml
```

**Implementation:**
```bash
# 1. Check/run onboard
if [ ! -f .claude/cache/tldr/meta.json ]; then
    # Spawn onboard agent via Task tool
fi

# 2. Structure
tldr structure src/ --lang python

# 3. Research (spawn scout agent)
# Task tool with subagent_type: "scout"
# Prompt: "Research patterns in ${focus:-codebase}"

# 4. Write output based on --output flag
```

## Architecture Depth

Architecture-focused analysis with layer detection. No agent spawned — pure tldr commands.

**Best for:** Understanding system boundaries, preparing for refactoring, identifying coupling issues.

**Steps:**
1. Run `tldr arch` for layer detection
2. Run `tldr calls` for cross-file call graph
3. Analyze entry/middle/leaf layers
4. Detect circular dependencies
5. Map architectural boundaries
6. Run `tldr impact` from entry point if `--entry` provided

```bash
# 1. Architecture detection
tldr arch ${PATH:-src/}
# Returns: entry_layer, middle_layer, leaf_layer, circular_deps

# 2. Call graph
tldr calls ${PATH:-src/}
# Returns: edges, nodes

# 3. Impact analysis from entry point (if --entry provided)
tldr impact ${ENTRY} ${PATH:-src/} --depth 3
```

**Implementation:**
```bash
arch_output=$(tldr arch ${src_dir})
calls_output=$(tldr calls ${src_dir})
if [ -n "$entry" ]; then
    impact_output=$(tldr impact $entry ${src_dir} --depth 3)
fi
# Synthesize and write output
```

**Output structure:**
```yaml
layers:
  entry: [routes.py, cli.py, main.py]   # Controllers/handlers
  middle: [services.py, auth.py]         # Business logic
  leaf: [utils.py, helpers.py]           # Utilities

call_graph:
  total_edges: 142
  hot_paths: [process_request -> validate -> authorize]

circular_deps:
  - [module_a, module_b]  # A imports B, B imports A

boundaries:
  - name: API layer
    files: [src/api/*]
    calls_to: [src/services/*]
```

## Output Formats

### --output doc

Creates: `thoughts/shared/research/YYYY-MM-DD-explore-{focus}.md`

```markdown
---
date: {ISO timestamp}
type: exploration
depth: {quick|deep|architecture}
focus: {focus area or "full"}
commit: {git hash}
---

# Codebase Exploration: {focus}

## Summary
{High-level findings}

## Structure
{File tree / codemaps}

## Architecture
{Layer analysis - for architecture depth}

## Key Components
{Important files and their roles}

## Patterns Found
{Existing patterns - for deep depth}

## References
- `path/to/file.py:line` - Description
```

### --output handoff

Creates: `thoughts/shared/handoffs/{session}/explore-{focus}.yaml`

```yaml
---
type: exploration
ts: {ISO timestamp}
depth: {quick|deep|architecture}
focus: {focus area}
commit: {git hash}
---

summary: {One-line summary of findings}

structure:
  entry_points: [{main.py}, {cli.py}]
  key_modules: [{auth.py}, {routes.py}]
  test_coverage: [{tests/}]

architecture:
  layers:
    entry: [{files}]
    middle: [{files}]
    leaf: [{files}]
  circular_deps: [{pairs}]

findings:
  - {key finding with file:line}

next_steps:
  - {Recommended action based on exploration}

refs:
  - path: {file.py}
    role: {what it does}
```

## Troubleshooting

**tldr not found:**
```bash
which tldr
uv tool install llm-tldr
# or: pip install llm-tldr
```

**No Python files found:**
```bash
# Adjust --lang flag
tldr structure src/ --lang typescript  # or go, rust
```

**Empty architecture output:**
```bash
# Specify src directory explicitly
tldr arch ./
tldr arch src/
```
