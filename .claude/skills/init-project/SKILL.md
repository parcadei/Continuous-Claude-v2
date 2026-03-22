---
name: init-project
description: Initialize Continuous Claude v3 for a new project with full toolset activation. Creates project CLAUDE.md (interview-driven, 8 sections), ROADMAP.md, knowledge tree, Serena code intelligence, and project registry entry. Use when opening a new project folder for the first time, starting a new project, setting up CCv3 in an existing repo, or the user says "init project", "setup project", "new project", "initialize", "start new project".
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, Agent]
metadata:
  user-invocable: true
  triggers: ["/init-project", "init project", "new project", "setup project", "initialize project", "start new project", "new project setup"]
---

# Init Project -- Full CCv3 Toolset Activation

Set up a project with the complete Continuous Claude v3 infrastructure. This goes beyond knowledge tree and ROADMAP -- it creates a comprehensive project CLAUDE.md, activates code intelligence, registers the project, and optionally scaffolds dev server management.

## What Gets Created

| Artifact | Purpose | Phase |
|----------|---------|-------|
| `CLAUDE.md` | Project-specific instructions (stack, commands, conventions) | 1 (interview) |
| `ROADMAP.md` | Goal tracking, auto-synced by hooks | 2 (auto) |
| `.claude/knowledge-tree.json` | Project navigation map | 3 (auto) |
| `.serena/project.yml` | LSP code intelligence activation | 4 (conditional) |
| Registry entry | `~/.claude/project-registry.json` updated | 5 (auto) |
| Dev server scripts | `scripts/dev-start.mjs` + `dev-cleanup.mjs` | 6 (conditional, web only) |

## Execution Flow

Run through each phase in order. Skip phases where the artifact already exists (re-running is safe).

---

### Phase 1: Interview and CLAUDE.md Generation

This is the most important phase. A good project CLAUDE.md dramatically improves every future session.

**Step 1.1: Gather context automatically**

Before asking the user anything, scan the project:
- Read `package.json` (if present) for name, scripts, dependencies
- Read `README.md` (if present) for description
- Check for `tsconfig.json`, `next.config.*`, `vite.config.*`, `Cargo.toml`, `pyproject.toml`, `go.mod` to detect stack
- List top-level directories for project structure
- Check `.git/config` for remote names and URLs

**Step 1.2: Ask the user to confirm and fill gaps**

Present what you found and ask about what you couldn't detect:

> "I detected: [stack], [structure], [git remotes]. Let me confirm a few things:
> 1. Project name and one-line description?
> 2. Is the stack detection correct? Anything to add?
> 3. Dev port and local URL? (e.g., 3004, https://project.localhost/)
> 4. Git remote convention? (origin = upstream never push, fork = always push?)
> 5. Any critical conventions or patterns I should know?"

Keep it conversational. If the user says "just use defaults" or "figure it out", infer from the codebase.

**Step 1.3: Generate CLAUDE.md**

Read the template at `references/claude-md-template.md` and fill in all placeholders with gathered information. Write to `CLAUDE.md` in the project root.

The template has 8 sections. Every section matters:
1. **Project Overview** -- name, description, status
2. **Tech Stack** -- table format, every layer
3. **Local Dev** -- port, URL, dev command (skippable for libraries)
4. **Directory Structure** -- tree with purpose annotations
5. **Conventions** -- coding standards the project follows
6. **Commands** -- every dev/test/build/deploy command
7. **Git Workflow** -- remote convention, branch strategy
8. **CCv3 Integration** -- pointers to global capabilities (memory, agents, hooks, Serena)

Section 8 is critical because it tells future sessions about the full toolset. Without it, Claude operates on generic defaults and misses 90% of the infrastructure.

---

### Phase 2: ROADMAP.md

If `ROADMAP.md` doesn't exist, create it:

```markdown
# Project Roadmap

## Current Focus
**[Ask the user for their immediate goal]**
- What you're working on
- Started: YYYY-MM-DD

## Completed
- [x] Initial CCv3 setup (YYYY-MM-DD)

## Planned
- [ ] [Ask user for first planned feature]

## Recent Planning Sessions
_Planning sessions will be recorded here automatically by hooks._
```

Ask the user for their current focus so the ROADMAP starts populated.

---

### Phase 3: Knowledge Tree

Generate the knowledge tree:

```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/knowledge_tree.py --project "$(pwd)" --verbose
```

If this fails (missing dependencies, wrong env), note it and continue. The session-start hook will auto-generate it on next session.

---

### Phase 4: Serena Code Intelligence (Conditional)

Check if the project has supported source files (`.ts`, `.tsx`, `.py`, `.go`, `.rs`). If yes, read `references/serena-setup.md` and follow the setup steps:

1. Create `.serena/project.yml` with detected languages
2. Try to activate via Serena MCP tools (fail gracefully if unavailable)
3. Report activation status

Skip entirely for HTML/CSS/Markdown-only projects.

---

### Phase 5: Project Registry

Update `~/.claude/project-registry.json` with the new project:

```javascript
// Read, add entry, write back
const registry = JSON.parse(fs.readFileSync(registryPath));
registry.projects.push({
  name: "Project Name",
  path: "C:/Users/.../Projects/project-name",
  port: 3004,
  url: "https://project.localhost/",
  stack: "Next.js + TypeScript + Drizzle",
  status: "active",
  devCommand: "npm run dev"
});
```

Check for port conflicts with existing entries before assigning.

---

### Phase 6: Dev Server Cleanup (Conditional, Web Only)

If the project has `package.json` with a `dev` script and serves on a port, offer to scaffold the dev server cleanup pattern. Read `references/dev-server-pattern.md` for templates.

Ask the user: "Want me to set up managed dev server scripts? This prevents zombie processes when restarting dev."

If yes:
1. Create `scripts/dev-start.mjs` and `scripts/dev-cleanup.mjs`
2. Set `DEV_PORT` in `.env.local`
3. Update `package.json` dev script to `node scripts/dev-start.mjs`
4. Add `.dev-server.pid` to `.gitignore`

---

### Phase 7: Summary

Present a completion summary:

```
CCv3 initialized for [Project Name]:
  CLAUDE.md        -- [X lines], 8 sections
  ROADMAP.md       -- Created with current focus: [goal]
  Knowledge tree   -- [Generated / Deferred to next session]
  Serena           -- [Activated / Skipped (no supported files)]
  Registry         -- Added (port [PORT])
  Dev server       -- [Scaffolded / Skipped (not a web project)]

Next steps:
  - Start working: just tell me what to build
  - Deep analysis: /onboard (for existing codebases)
  - Set up workflows: /build, /fix, /ralph
```

---

## Brownfield vs Greenfield

**Greenfield (empty/new project):** Interview will be shorter. Many fields will be "TBD". The CLAUDE.md is a living document -- it grows as the project develops.

**Brownfield (existing codebase):** Auto-detection fills most fields. After init-project, suggest `/onboard` for deep architecture analysis. The onboard agent creates a detailed handoff with component maps and patterns.

---

## Hooks That Activate Automatically

These hooks work in every project once CCv3 is installed globally. Init-project doesn't configure them -- they just work.

| Hook | Event | What It Does |
|------|-------|-------------|
| `post-plan-roadmap` | ExitPlanMode | Updates ROADMAP.md with planning session |
| `post-edit-diagnostics` | PostToolUse:Edit/Write | Runs `tsc --noEmit` on TS edits |
| `session-start-continuity` | SessionStart | Loads handoff context, resumes state |
| `tree-invalidate` | PostToolUse:Write | Marks knowledge tree for refresh |
| `memory-extraction` | PreCompact/SessionEnd | Captures learnings automatically |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Knowledge tree fails | Skip it -- hooks auto-generate on next session start |
| Serena activation fails | Create `.serena/project.yml` manually, it will activate when Serena is available |
| Can't detect stack | Ask the user directly. Auto-detection is a convenience, not required. |
| Port conflict | Check `~/.claude/project-registry.json` for used ports, pick next available |
| User says "skip the interview" | Use auto-detected values and reasonable defaults. Generate CLAUDE.md with placeholder markers for missing info. |
