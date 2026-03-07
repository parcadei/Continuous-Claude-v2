---
name: onboard
description: Analyze brownfield codebase and create initial continuity ledger
user-invocable: true
---

# Onboard - Project Discovery & Ledger Creation

Analyze a brownfield codebase and create an initial continuity ledger.

## When to Use

- First time working in an existing project
- User says "onboard", "analyze this project", "get familiar with codebase"

## How to Use

**Spawn the onboard agent:**

Use the Task tool with `subagent_type: "onboard"` and this prompt:

```
Onboard me to this project at $CLAUDE_PROJECT_DIR.

1. Create required directories if they don't exist:
   mkdir -p thoughts/shared/handoffs/<project-name> .claude

2. Explore the codebase using available tools:
   - Try: tldr tree . && tldr structure .
   - Fallback: find . -type f -name "*.py" -o -name "*.ts" -o -name "*.js" | head -50

3. Detect tech stack (look for package.json, requirements.txt, Cargo.toml, go.mod, etc.)

4. Ask the user about their goals using AskUserQuestion

5. Create a YAML handoff at thoughts/shared/handoffs/<project-name>/onboard-<date>.yaml:
   ---
   date: <ISO date>
   type: onboard
   status: active
   ---
   goal: <user's stated goal>
   now: Start working on <first priority>
   tech_stack: [list of detected technologies]
   key_files:
     - path: <important file>
       purpose: <what it does>
   architecture: <brief description>
   next:
     - <suggested first action>
```

## Why an Agent?

The onboard process:
- Requires multiple exploration steps
- Should not pollute main context with codebase dumps
- Returns a clean summary + creates the handoff

## Output

- Directories created: `thoughts/shared/handoffs/<project>/`, `.claude/`
- YAML handoff created (loaded automatically on session start)
- User has clear starting context
- Ready to begin work with full project awareness

## Notes

- This skill is for BROWNFIELD projects (existing code)
- For greenfield, use `/create_plan` instead
- Handoff can be updated anytime with `/create_handoff`
