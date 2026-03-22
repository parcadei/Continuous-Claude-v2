# Project CLAUDE.md Template

Use this template when generating a project-level CLAUDE.md. Replace all `{{PLACEHOLDER}}` values with project-specific information gathered during the interview phase. Delete sections that don't apply (e.g., Local Dev for a library with no server).

---

```markdown
# {{PROJECT_NAME}}

{{ONE_LINE_DESCRIPTION}}

## Status

| Field | Value |
|-------|-------|
| Status | {{active / planning / maintenance}} |
| Started | {{YYYY-MM-DD}} |
| Stack | {{PRIMARY_STACK}} |

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | {{e.g., Next.js 15, React 19}} | {{notes}} |
| Styling | {{e.g., Tailwind CSS v4, shadcn/ui}} | {{notes}} |
| Backend | {{e.g., Express, Hono, Next.js API routes}} | {{notes}} |
| Database | {{e.g., PostgreSQL via Neon + Drizzle ORM}} | {{notes}} |
| Auth | {{e.g., Clerk, NextAuth, custom JWT}} | {{notes}} |
| Deployment | {{e.g., Vercel, Azure SWA, Docker}} | {{notes}} |

## Local Dev

| Setting | Value |
|---------|-------|
| Port | {{DEV_PORT}} |
| URL | {{https://project.localhost/ or http://localhost:PORT}} |
| Dev command | `{{npm run dev}}` |
| Reverse proxy | {{Caddy / none}} |

## Project Structure

```
{{PROJECT_ROOT}}/
├── src/                # Source code
│   ├── app/            # {{Pages / routes}}
│   ├── components/     # {{UI components}}
│   ├── lib/            # {{Utilities, helpers}}
│   └── db/             # {{Database schema, client}}
├── scripts/            # {{Dev scripts, tooling}}
├── public/             # {{Static assets}}
└── {{OTHER_DIRS}}      # {{Description}}
```

## Conventions

- {{Coding conventions, naming patterns}}
- {{Import ordering, file organization}}
- {{Component patterns (server vs client, etc.)}}

## Commands

| Task | Command |
|------|---------|
| Dev server | `{{npm run dev}}` |
| Build | `{{npm run build}}` |
| Test | `{{npm test}}` |
| Lint | `{{npm run lint}}` |
| DB push | `{{npx drizzle-kit push}}` |
| DB studio | `{{npx drizzle-kit studio}}` |
| Deploy | `{{vercel --prod}}` |

## Git Workflow

| Remote | Repository | Push? |
|--------|-----------|-------|
| `origin` | {{upstream/repo}} | {{NEVER / YES}} |
| `fork` | {{your-fork/repo}} | {{ALWAYS}} |

Branch strategy: {{feature branches off main, PR to merge}}

## Key Files

| File | Purpose |
|------|---------|
| `{{path}}` | {{description}} |
| `{{path}}` | {{description}} |

## CCv3 Integration

This project is managed by Continuous Claude v3.

| Capability | How to Use |
|------------|-----------|
| Global config | `~/.claude/CLAUDE.md` and `~/.claude/rules/` |
| Memory | `/recall "<topic>"` to search past learnings |
| Agents | `/explore`, `/build`, `/fix`, `/ralph` for orchestrated workflows |
| Code intelligence | Serena MCP for go-to-definition, find-references |
| Research | Oracle agent with Nia, Exa, Context7, OpenCLI |

Hooks auto-run on every session: ROADMAP sync, post-edit diagnostics, knowledge tree updates, memory extraction.
```
