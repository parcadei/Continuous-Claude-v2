---
name: explore
description: Meta-skill for internal codebase exploration at varying depths (quick/deep/architecture)
allowed-tools: [Bash, Task, Read, Glob, Grep, Write]
metadata:
  keywords: [explore, codebase, architecture, understand, analyze, layers, call graph, brownfield]
---

# Explore - Internal Codebase Exploration

Meta-skill for exploring an internal codebase at varying depths. READ-ONLY workflow — no code changes.

## Usage

```
/explore <depth> [options]
```

| Option | Description | Example |
|--------|-------------|---------|
| `--focus "area"` | Focus on specific area | `--focus "auth"` |
| `--output handoff` | Create handoff for next agent | `--output handoff` |
| `--output doc` | Create documentation file | `--output doc` |
| `--entry "func"` | Start from specific entry point | `--entry "main"` |

## Depths

| Depth | Time | What it does |
|-------|------|--------------|
| `quick` | ~1 min | tldr tree + structure — fast structure overview, no agents |
| `deep` | ~5 min | onboard + tldr + scout agent + write doc |
| `architecture` | ~3 min | tldr arch + call graph + layer mapping + circular dep detection |

Full commands for each depth: `references/depth-procedures.md`

## Examples

```bash
/explore quick
/explore deep --focus "auth" --output doc
/explore architecture --entry "cli" --output handoff
/explore quick --focus "hooks"
```

## Question Flow (No Arguments)

If the user types just `/explore` with no arguments, guide them:

### Phase 0: Workflow Selection

```yaml
question: "How would you like to explore?"
options:
  - "Help me choose (Recommended)" -> Continue to Phase 1-4
  - "Quick - fast overview"        -> depth=quick, skip to Phase 2
  - "Deep - comprehensive"         -> depth=deep, skip to Phase 2
  - "Architecture - layers"        -> depth=architecture, skip to Phase 2
```

### Phase 1: Goal

```yaml
question: "What are you trying to understand?"
options:
  - "Get oriented"          -> quick
  - "Understand how X works"-> deep
  - "Map the architecture"  -> architecture
  - "Find where something is"-> quick + --focus
```

### Phase 2: Scope

```yaml
question: "What area should I focus on?"
options:
  - "Entire codebase"
  - "Specific directory or module" -> ask for path
  - "Specific concept/feature"     -> ask for keyword
```

### Phase 3: Output Format

```yaml
question: "What should I produce?"
options:
  - "Just tell me what you find"     -> interactive summary
  - "Create a documentation file"    -> --output doc
  - "Create handoff for next agent"  -> --output handoff
```

### Phase 4: Entry Point (Architecture only)

```yaml
question: "Where should I start?"
options:
  - "Auto-detect (main, cli, app)"
  - "Specific function/file" -> ask for entry point
```

### Summary Before Execution

```
Based on your answers, I'll run:
Depth: deep | Focus: "authentication" | Output: handoff | Path: src/
Proceed? [Yes / Adjust settings]
```

## Integration with /build

Exploration feeds directly into brownfield builds:

```bash
/explore architecture --output handoff
/build brownfield --from-handoff thoughts/shared/handoffs/session/explore-full.yaml
```

## Key Principles

1. **READ-ONLY** — never modifies code
2. **Uses scout, not Explore** — scout (Sonnet) over Explore (Haiku) per project rules
3. **Token-efficient** — uses tldr commands (95% token savings over raw reads)
4. **Outputs to shared locations** — `thoughts/shared/research/` or handoff directory
5. **Entry point to /build** — handoffs feed into brownfield builds

## Related Skills

| Skill | When to Use |
|-------|-------------|
| **onboard** | First-time project setup (used by deep depth) |
| **research-codebase** | Pattern documentation (used by deep depth) |
| **create_handoff** | Handoff format (used by --output handoff) |
