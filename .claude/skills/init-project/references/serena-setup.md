# Serena Code Intelligence Setup

Serena provides LSP-quality code navigation (go-to-definition, find-references, symbol overview) via MCP. Projects with TypeScript, Python, or Go code benefit significantly.

## When to Activate

Activate Serena when the project contains any of these file types:
- `.ts`, `.tsx` (TypeScript)
- `.py` (Python)
- `.go` (Go)
- `.rs` (Rust)

Skip for pure HTML/CSS/Markdown-only projects.

## Setup Steps

### Step 1: Create .serena/project.yml

```yaml
project_name: "{{PROJECT_NAME}}"
languages:
  - {{typescript / python / go / rust}}
```

Write this to `.serena/project.yml` in the project root.

### Step 2: Activate via MCP (if available)

Try to activate the project with Serena MCP tools. These may fail if Serena isn't installed -- that's OK, fail gracefully.

```
mcp__serena__activate_project with path to project root
mcp__serena__check_onboarding_performed
mcp__serena__onboarding (if not already onboarded)
```

### Step 3: Verify

After activation, the `/serena` skill becomes available for this project. Users can:
- Find symbol definitions: `mcp__serena__find_symbol`
- Find references: `mcp__serena__find_referencing_symbols`
- Get symbol overview: `mcp__serena__get_symbols_overview`

## Graceful Failure

If Serena MCP tools are not available (not installed or not configured):
1. Still create `.serena/project.yml` -- it will be picked up when Serena is later installed
2. Note in the setup summary that Serena activation was skipped
3. Tell the user they can activate later with `/serena` skill

## What NOT to Do

- Don't fail the entire init-project if Serena isn't available
- Don't install Serena -- that's a system-level setup handled by the bootstrap wizard
- Don't modify `~/.mcp.json` -- Serena's MCP config is global, not per-project
