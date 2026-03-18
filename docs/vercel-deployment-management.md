# Vercel Deployment Management from Claude Code

## Context

Managing Vercel deployments directly from Claude Code sessions — deploys, env vars, domains, logs, rollbacks — without leaving the terminal.

## Three Integration Paths

### 1. Vercel MCP Tools (Native Claude Code Integration)

18 MCP tools available via the Vercel MCP server (`https://mcp.vercel.com`):

| Tool | Capability |
|------|-----------|
| `deploy_to_vercel` | Deploy current project |
| `list_deployments` | List deployments for a project |
| `get_deployment` | Get deployment details by ID/URL |
| `get_deployment_build_logs` | Build logs (debug failed deploys) |
| `get_runtime_logs` | Runtime logs with filters (level, source, status, search) |
| `get_project` | Project metadata |
| `list_projects` | List all projects in team |
| `list_teams` | List teams (needed for IDs) |
| `search_vercel_documentation` | Search Vercel docs |
| `check_domain_availability_and_price` | Domain availability check |
| `web_fetch_vercel_url` | Fetch from Vercel URLs (bypasses deploy protection) |
| `get_access_to_vercel_url` | Access protected deployments |
| `list_toolbar_threads` | List feedback threads on preview deployments |
| `get_toolbar_thread` | Get thread details and comments |
| `reply_to_toolbar_thread` | Reply to a toolbar feedback thread |
| `edit_toolbar_message` | Edit a toolbar message |
| `change_toolbar_thread_resolve_status` | Resolve/unresolve feedback threads |
| `add_toolbar_reaction` | React to toolbar messages |

**Strengths:** Native integration, no CLI setup, conversational flow, works inside Claude Code directly.

**Gaps:** No env var management, no promote/rollback, no domain aliasing, no DNS management, no cache control. (But now includes toolbar/collaboration features.)

**Setup:**
```bash
# Add Vercel MCP (general access)
claude mcp add --transport http vercel https://mcp.vercel.com

# Add Vercel MCP (project-specific access)
claude mcp add --transport http vercel-project https://mcp.vercel.com/my-team/my-project

# Authenticate inside Claude Code
/mcp
```

### 2. Vercel CLI (via Bash Tool)

30+ commands covering the full Vercel API surface. Key capabilities NOT available in MCP:

| Command | What It Does |
|---------|-------------|
| `vercel env ls/add/rm/pull` | Manage environment variables |
| `vercel promote [deployment]` | Promote deployment to production |
| `vercel rollback [deployment]` | Rollback production |
| `vercel domains ls/add/rm/buy` | Full domain management |
| `vercel alias set/rm/ls` | Custom domain aliases |
| `vercel dns ls/add/rm` | DNS record management |
| `vercel cache purge` | CDN/data cache purge |
| `vercel dev` | Local dev environment |
| `vercel build` | Local build |
| `vercel deploy --prod` | Direct production deploy |
| `vercel deploy --prod --skip-domain` | Staged production (promote later) |
| `vercel link` | Link local dir to Vercel project |
| `vercel inspect [deployment]` | Deployment details |
| `vercel logs [deployment] --follow` | Live log streaming |

**Auth options:**
- Interactive: `vercel login` (one-time browser OAuth)
- Token-based: `vercel --token $VERCEL_TOKEN` (create at vercel.com/account/tokens)
- CI/CD: Set `VERCEL_TOKEN` environment variable

**Install:** `npm i -g vercel`

### 3. Git Integration (Push-to-Deploy)

Vercel's built-in git integration auto-deploys on push:

| Git Action | Vercel Result |
|------------|---------------|
| Push to `main` | Production deployment |
| Push to feature branch | Preview deployment |
| Open PR | Preview URL posted as PR comment |
| Merge PR | Production deployment |

**Strengths:** Zero-touch after setup, natural git workflow, preview-per-PR.

**Gaps:** No fine-grained control (promote, rollback, env vars, cache).

---

## Recommended Approach: Layered Hybrid

| Layer | Tool | Use For |
|-------|------|---------|
| **Deploy trigger** | Git push | Every deployment (push = deploy) |
| **Monitoring** | Vercel MCP | Check deployment status, read logs, debug failures — all in conversation |
| **Operations** | Vercel CLI | Env vars, promote/rollback, domains, DNS, cache — the gaps MCP doesn't cover |

### Why not CLI-only?

The MCP tools are wired into Claude Code natively. For observability tasks (checking deploy status, reading build/runtime logs, browsing project info), MCP is the more natural interface — results flow directly into the conversation without shell output parsing.

### Why not MCP-only?

The MCP tool surface is monitoring-heavy. It can deploy and read logs, but can't manage env vars, promote/rollback, handle domains, or purge cache. The CLI fills these critical operational gaps.

### Why not just git push?

Git push triggers deploys but offers no operational control. You can't rollback, promote a staging deploy, manage env vars, or debug build failures through git alone.

---

## Session Workflow

```
Development Cycle
=================

1. Code changes
   code changes -> git add -> git commit -> git push
                                              |
                                              v
                                    Vercel auto-deploys
                                    (preview or production)

2. Monitor via MCP (in conversation)
   list_deployments        -> check status
   get_deployment_build_logs -> debug failed builds
   get_runtime_logs        -> investigate runtime errors
   web_fetch_vercel_url    -> verify deployed content

3. Operate via CLI (when needed)
   vercel env add SECRET production  -> manage secrets
   vercel promote dpl_abc123         -> promote preview to prod
   vercel rollback                   -> emergency rollback
   vercel cache purge                -> clear stale cache
   vercel domains add example.com    -> add custom domain
```

---

## Setup Guide: New Next.js Project

### Step 1: Check Prerequisites

```bash
node --version    # Need Node 18.17+
npm --version     # Comes with Node
vercel --version  # Install if missing: npm i -g vercel
```

### Step 2: Create Next.js Project

```bash
npx create-next-app@latest <project-name> \
  --typescript --tailwind --eslint --app --src-dir --use-npm
```

This scaffolds with TypeScript, Tailwind CSS, ESLint, App Router, and src/ directory.

### Step 3: Install and Authenticate Vercel CLI

```bash
npm i -g vercel       # Install globally
vercel login          # Interactive browser auth (one-time)
vercel whoami         # Verify authentication
```

For CI/token-based auth:
```bash
# Create token at vercel.com/account/tokens
export VERCEL_TOKEN=your_token_here
vercel whoami --token $VERCEL_TOKEN
```

### Step 4: Link Project to Vercel

```bash
cd <project-name>
vercel link           # Interactive: select team + create/link project
```

Creates `.vercel/project.json`:
```json
{
  "orgId": "team_xxx",
  "projectId": "prj_xxx"
}
```

These IDs are used by MCP tools (`teamId` and `projectId` parameters).

### Step 5: Verify MCP Tools

Inside a Claude Code session:
1. `list_teams` — get your teamId
2. `list_projects` — confirm the project appears
3. `deploy_to_vercel` — trigger initial deployment
4. `get_deployment_build_logs` — read build output

### Step 6: Connect Git Integration

```bash
# Create GitHub repo
gh repo create <project-name> --public --source=. --push

# Vercel auto-detects GitHub repos linked via dashboard
# Or connect explicitly:
vercel git connect
```

Verify: push a commit, confirm preview deployment appears in Vercel dashboard.

### Step 7: Pull Environment Variables

```bash
vercel env pull .env.local    # Sync Vercel env vars locally
```

Next.js includes `.env.local` in `.gitignore` by default.

---

## Quick Reference: Common Operations

### Deployments

| Task | Tool | Command/Action |
|------|------|---------------|
| Deploy preview | Git | `git push origin feature-branch` |
| Deploy production | Git | `git push origin main` |
| Deploy manually | MCP | `deploy_to_vercel` |
| Deploy prod (CLI) | CLI | `vercel deploy --prod` |
| Check deploy status | MCP | `list_deployments` + `get_deployment` |
| Read build logs | MCP | `get_deployment_build_logs` |
| Read runtime logs | MCP | `get_runtime_logs` |
| Promote to prod | CLI | `vercel promote <deployment-id>` |
| Rollback | CLI | `vercel rollback` |

### Environment Variables

| Task | Tool | Command |
|------|------|---------|
| List env vars | CLI | `vercel env ls` |
| Add env var | CLI | `vercel env add VAR_NAME production` |
| Remove env var | CLI | `vercel env rm VAR_NAME production` |
| Pull to local | CLI | `vercel env pull .env.local` |

### Domains

| Task | Tool | Command |
|------|------|---------|
| Check availability | MCP | `check_domain_availability_and_price` |
| List domains | CLI | `vercel domains ls` |
| Add domain | CLI | `vercel domains add example.com` |
| Set alias | CLI | `vercel alias set <deployment-url> example.com` |
| Manage DNS | CLI | `vercel dns ls example.com` |

### Debugging

| Task | Tool | Command/Action |
|------|------|---------------|
| Build failed | MCP | `get_deployment_build_logs` with deployment ID |
| Runtime errors | MCP | `get_runtime_logs` with `level: ["error"]` |
| Check deployed page | MCP | `web_fetch_vercel_url` |
| Live log stream | CLI | `vercel logs <deployment> --follow` |
| Inspect deployment | CLI | `vercel inspect <deployment>` |

### Toolbar Feedback

| Task | Tool | Command/Action |
|------|------|---------------|
| List feedback threads | MCP | `list_toolbar_threads` |
| Read thread details | MCP | `get_toolbar_thread` |
| Reply to feedback | MCP | `reply_to_toolbar_thread` |
| Resolve thread | MCP | `change_toolbar_thread_resolve_status` |

---

## MCP vs CLI Decision Matrix

| Need | Use MCP | Use CLI |
|------|---------|---------|
| Deploy | Yes (`deploy_to_vercel`) | Yes (`vercel deploy`) |
| Check deploy status | Yes (`get_deployment`) | Yes (`vercel inspect`) |
| Build logs | Yes (`get_deployment_build_logs`) | Yes (`vercel inspect`) |
| Runtime logs | Yes (`get_runtime_logs`) | Yes (`vercel logs`) |
| Env vars | No | Yes (`vercel env`) |
| Promote/Rollback | No | Yes (`vercel promote/rollback`) |
| Domains | Check only | Full CRUD (`vercel domains`) |
| DNS | No | Yes (`vercel dns`) |
| Cache | No | Yes (`vercel cache purge`) |
| Local dev | No | Yes (`vercel dev`) |
| Search docs | Yes (`search_vercel_documentation`) | No |
| Fetch deployed pages | Yes (`web_fetch_vercel_url`) | No |
| Toolbar feedback | Yes (6 toolbar tools) | No |

**Rule of thumb:** MCP for reading/monitoring, CLI for writing/operations.

---

## Verification Checklist

- [ ] `vercel whoami` returns your account
- [ ] `.vercel/project.json` exists with valid `orgId` and `projectId`
- [ ] MCP `list_projects` shows the project
- [ ] MCP `deploy_to_vercel` succeeds
- [ ] Git push triggers auto-deploy on Vercel
- [ ] MCP `get_deployment_build_logs` returns build output
- [ ] MCP `get_runtime_logs` returns application logs

---

## Notes for Claude Code Sessions

- **Interactive commands:** `vercel login` and `vercel link` require browser interaction. Run these once manually before expecting Claude Code to use the CLI.
- **Token auth:** For fully non-interactive CLI use, set `VERCEL_TOKEN` as an environment variable.
- **Project context:** After `vercel link`, the `.vercel/project.json` file provides `orgId` and `projectId` needed by MCP tools.
- **MCP auth:** Run `/mcp` inside Claude Code to authenticate MCP tools on first use.
- **Cost:** MCP tools are free API calls through the MCP server. CLI commands are free. Vercel billing is based on usage (builds, bandwidth, functions).
