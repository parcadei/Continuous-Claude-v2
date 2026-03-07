---
name: explore
description: Meta-skill for internal codebase exploration at varying depths (quick/deep/architecture)
allowed-tools: [Bash, Task, Read, Glob, Grep, Write]
keywords: [explore, codebase, architecture, understand, analyze, layers, call graph, brownfield]
---

# Explore - Internal Codebase Exploration

Meta-skill for exploring an internal codebase at varying depths. READ-ONLY workflow - no code changes.

## Usage

```
/explore <depth> [options]
```

## Question Flow (No Arguments)

If the user types just `/explore` with no or partial arguments, guide them through this question flow. Use AskUserQuestion for each phase.

### Phase 0: Workflow Selection

```yaml
question: "How would you like to explore?"
header: "Explore"
options:
  - label: "Help me choose (Recommended)"
    description: "I'll ask questions to pick the right exploration depth"
  - label: "Quick - fast overview"
    description: "Chain: tldr tree → tldr structure (~1 min)"
  - label: "Deep - comprehensive analysis"
    description: "Chain: onboard → tldr → research → document (~5 min)"
  - label: "Architecture - layers & dependencies"
    description: "Chain: tldr arch → call graph → layer mapping (~3 min)"
```

**Mapping:**
- "Help me choose" → Continue to Phase 1-4 questions
- "Quick" → Set depth=quick, skip to Phase 2 (scope)
- "Deep" → Set depth=deep, skip to Phase 2 (scope)
- "Architecture" → Set depth=architecture, skip to Phase 2 (scope)

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to understand how deep you want to explore. Did you mean..."
header: "Clarify"
options:
  - label: "Help me choose"
    description: "Not sure - guide me through questions"
  - label: "Quick - fast overview"
    description: "Just want to see what's here"
  - label: "Deep - comprehensive analysis"
    description: "Need thorough understanding"
  - label: "Neither - let me explain differently"
    description: "I'll describe what I need"
```

### Phase 1: Exploration Goal

```yaml
question: "What are you trying to understand?"
header: "Goal"
options:
  - label: "Get oriented in the codebase"
    description: "Quick overview of structure"
  - label: "Understand how something works"
    description: "Deep dive into specific area"
  - label: "Map the architecture"
    description: "Layers, dependencies, patterns"
  - label: "Find where something is"
    description: "Locate specific code/functionality"
```

**Mapping:**
- "Get oriented" → quick depth
- "Understand how" → deep depth
- "Map architecture" → architecture depth
- "Find where" → quick with --focus

### Phase 2: Scope

```yaml
question: "What area should I focus on?"
header: "Focus"
options:
  - label: "Entire codebase"
    description: "Explore everything"
  - label: "Specific directory or module"
    description: "I'll specify the path"
  - label: "Specific concept/feature"
    description: "e.g., 'authentication', 'API routes'"
```

If "Specific directory" or "Specific concept" → ask follow-up for the path/keyword.

### Phase 3: Output Format

```yaml
question: "What should I produce?"
header: "Output"
options:
  - label: "Just tell me what you find"
    description: "Interactive summary in chat"
  - label: "Create a documentation file"
    description: "Write to thoughts/shared/docs/"
  - label: "Create handoff for implementation"
    description: "Prepare context for coding agent"
```

**Mapping:**
- "Documentation file" → --output doc
- "Handoff for implementation" → --output handoff

### Phase 4: Entry Point (Architecture only)

If architecture depth selected:

```yaml
question: "Where should I start the analysis?"
header: "Entry point"
options:
  - label: "Auto-detect (main, cli, app)"
    description: "Find common entry points"
  - label: "Specific function/file"
    description: "I'll specify the entry point"
```

### Summary Before Execution

```
Based on your answers, I'll run:

**Depth:** deep
**Focus:** "authentication"
**Output:** handoff
**Path:** src/

Proceed? [Yes / Adjust settings]
```

### Depths

| Depth | Time | What it does |
|-------|------|--------------|
| `quick` | ~1 min | tldr-explorer only - fast structure overview |
| `deep` | ~5 min | onboard + tldr-explorer + research-codebase + write doc |
| `architecture` | ~3 min | tldr arch + call graph + layer mapping + circular dep detection |

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `--focus "area"` | Focus on specific area | `--focus "auth"`, `--focus "api"` |
| `--output handoff` | Create handoff for next agent | `--output handoff` |
| `--output doc` | Create documentation file | `--output doc` |
| `--entry "func"` | Start from specific entry point | `--entry "main"`, `--entry "process_request"` |

## Examples

```bash
# Quick structure overview
/explore quick

# Deep exploration focused on auth
/explore deep --focus "auth" --output doc

# Architecture analysis from specific entry
/explore architecture --entry "cli" --output handoff

# Quick focused exploration
/explore quick --focus "hooks"
```

## Workflow Details

### Quick Depth

Fast structure overview using tldr-explorer. Best for:
- Initial orientation
- Quick questions about structure
- Finding where things are

**Steps:**
1. Run `tldr tree` for file structure
2. Run `tldr structure` for codemaps
3. If `--focus` provided, run `tldr search` for targeted results
4. Return summary

**Commands:**
```bash
# 1. File tree
tldr tree ${PATH:-src/} --ext .py

# 2. Code structure
tldr structure ${PATH:-src/} --lang python

# 3. Focused search (if --focus provided)
tldr search "${FOCUS}" ${PATH:-src/}
```

### Deep Depth

Comprehensive exploration with documentation output. Best for:
- First time in a codebase
- Preparing for major work
- Creating reference documentation

**Steps:**
1. Check if onboarded (look for `.claude/cache/tldr/`), if not run onboard
2. Run tldr-explorer for structure
3. Spawn research-codebase agent for patterns
4. Write findings to doc or handoff

**Subprocess:**
```
# 1. Onboard check
if [ ! -f .claude/cache/tldr/arch.json ]; then
    # Spawn onboard agent
fi

# 2. Structure analysis
tldr structure src/ --lang python
tldr calls src/

# 3. Research patterns (via scout agent)
Task: research-codebase → "Document existing patterns in ${FOCUS:-codebase}"

# 4. Write output
→ thoughts/shared/research/YYYY-MM-DD-explore-{focus}.md
→ OR thoughts/shared/handoffs/{session}/explore-{focus}.yaml
```

### Architecture Depth

Architecture-focused analysis with layer detection. Best for:
- Understanding system boundaries
- Preparing for refactoring
- Identifying coupling issues

**Steps:**
1. Run `tldr arch` for layer detection
2. Run `tldr calls` for cross-file call graph
3. Analyze entry/middle/leaf layers
4. Detect circular dependencies
5. Map architectural boundaries

**Commands:**
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

**Output Structure:**
```yaml
layers:
  entry: [routes.py, cli.py, main.py]  # Controllers/handlers
  middle: [services.py, auth.py]        # Business logic
  leaf: [utils.py, helpers.py]          # Utilities

call_graph:
  total_edges: 142
  hot_paths: [process_request → validate → authorize]

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

## Integration with /build

The explore skill is designed to feed into `/build brownfield`:

```bash
# Step 1: Explore to understand
/explore architecture --output handoff

# Step 2: Build with context from exploration
/build brownfield --from-handoff thoughts/shared/handoffs/session/explore-full.yaml
```

## Implementation

When user invokes `/explore <depth> [options]`:

### Parse Arguments
```python
depth = args[0]  # quick | deep | architecture
focus = extract_option(args, "--focus")
output = extract_option(args, "--output")  # handoff | doc
entry = extract_option(args, "--entry")
```

### Execute Based on Depth

**Quick:**
```bash
# Just tldr commands, no agents
tldr tree ${src_dir} --ext .py
tldr structure ${src_dir} --lang python
if [ -n "$focus" ]; then
    tldr search "$focus" ${src_dir}
fi
```

**Deep:**
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

# 4. Write output
# → doc or handoff based on --output
```

**Architecture:**
```bash
# 1. Arch detection
arch_output=$(tldr arch ${src_dir})

# 2. Call graph
calls_output=$(tldr calls ${src_dir})

# 3. Impact from entry (if provided)
if [ -n "$entry" ]; then
    impact_output=$(tldr impact $entry ${src_dir} --depth 3)
fi

# 4. Synthesize and write output
```

## Key Principles

1. **READ-ONLY** - This skill never modifies code
2. **Uses scout, not Explore** - Per project rules, scout (Sonnet) over Explore (Haiku)
3. **Token-efficient** - Uses tldr commands (95% savings over raw reads)
4. **Outputs to shared locations** - `thoughts/shared/research/` or handoff directory
5. **Entry point to /build** - Exploration handoffs feed into brownfield builds

## Related Skills

| Skill | When to Use |
|-------|-------------|
| **tldr-explorer** | Direct tldr commands (used internally by explore) |
| **tldr-code** | Specific analysis commands (cfg, dfg, slice) |
| **onboard** | First-time project setup (used by deep depth) |
| **research-codebase** | Pattern documentation (used by deep depth) |
| **create_handoff** | Handoff format (used by --output handoff) |

## Troubleshooting

**tldr not found:**
```bash
# Check if installed
which tldr
# Install if missing
uv tool install llm-tldr
# or: pip install llm-tldr
```

**No Python files found:**
```bash
# Check language, adjust --lang
tldr structure src/ --lang typescript  # or go, rust
```

**Empty architecture output:**
```bash
# May need to specify src directory
tldr arch ./  # Current directory
tldr arch src/  # Explicit src
```
