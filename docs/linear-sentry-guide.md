# Linear + Sentry: Your Dev Workflow Guide

A practical guide for using Linear (issue tracking) and Sentry (error monitoring) in your daily development workflow. Written for someone new to both tools.

---

## The Big Picture

```
Linear (plan work)  -->  Claude Code (build)  -->  GitHub (push)  -->  Vercel/Railway (deploy)  -->  Sentry (monitor)
     ^                                                                                                    |
     |_____________ Sentry finds error --> auto-creates Linear issue --> you fix it _______________________|
```

**Linear** is where you track what needs to be done. Think of it as your engineering to-do list with superpowers.
**Sentry** watches your deployed apps and tells you when something breaks, what broke, and which code caused it.

---

## Part 1: Linear Basics

### Your Workspace

- **URL**: https://linear.app/minions-lab
- **Workspace**: The Lab (slug: `minions-lab`)
- **GitHub**: Connected -- branches and PRs auto-link to issues

### Key Concepts

| Concept | What it is | Think of it as... |
|---------|-----------|-------------------|
| **Issue** | A single task, bug, or feature | A to-do item |
| **Project** | A group of related issues | A feature epic |
| **Cycle** | A time-boxed sprint (usually 1-2 weeks) | A sprint |
| **Label** | Tags for categorizing issues | Like GitHub labels |
| **Priority** | Urgent / High / Medium / Low / None | How soon to do it |

### Issue Status Flow

```
Backlog --> Todo --> In Progress --> In Review --> Done
                                                  |
                                              Cancelled
```

Most of this transitions **automatically** when you follow the branch naming convention.

### Your First Workflow: "I need to build something"

**Step 1: Create an issue in Linear**

You can do this in the Linear app, or ask Claude Code:
```
"Create a Linear issue for fixing the auth redirect bug"
```
Claude will use the `linearis` CLI to create it and give you the issue ID (e.g., `LIN-42`).

**Step 2: Start a branch with the issue ID**
```bash
git checkout -b dave/LIN-42-fix-auth-redirect
```
Linear sees the `LIN-42` in the branch name and auto-moves the issue to **In Progress**.

**Step 3: Do your work, commit, push**
```bash
git add . && git commit -m "fix: auth redirect on OAuth callback (LIN-42)"
git push -u fork dave/LIN-42-fix-auth-redirect
```

**Step 4: Open a PR**

Include `LIN-42` anywhere in the PR title or description. Linear links it and moves the issue to **In Review**.

**Step 5: Merge the PR**

Linear auto-moves the issue to **Done**.

That's it. You touched Linear once (to create the issue), and the rest happened automatically through Git.

### Checking Your Issues

Ask Claude Code any of these:
```
"What Linear issues are assigned to me?"
"Show me open issues in The Lab"
"What's the status of LIN-42?"
```

Or use the CLIs directly:
```bash
# Quick list (JSON, good for scripts)
linearis issues list

# Interactive list (paged, human-friendly)
linear issue list

# Search
linearis issues search "auth" --team "The Lab"
```

### Pro Tips for Your First Few Projects

1. **Always create the issue first** -- even for small bugs. It builds a paper trail.
2. **Use the branch naming convention** -- `dave/LIN-<number>-<slug>`. This is the magic that makes auto-tracking work.
3. **One issue per branch** -- don't bundle multiple issues in one branch.
4. **Labels are your friend** -- use `bug`, `feature`, `chore` to categorize.
5. **Priority honestly** -- Urgent means "drop everything." Most things are Medium.

---

## Part 2: Sentry Basics

### What Sentry Does

When your deployed app crashes, Sentry:
1. Captures the error with the full stack trace
2. Shows you the exact line of code that failed
3. Shows what the user was doing right before the crash (breadcrumbs)
4. Groups duplicate errors so you're not buried in noise
5. Alerts you (email, Slack, Linear) when new errors appear

### One-Time Setup: Create Your Sentry Org

You have an account but no projects yet. Here's the setup:

**Step 1: Get your org slug**
1. Go to https://sentry.io
2. Your org URL will be `sentry.io/organizations/<your-slug>/`
3. Set the env var (one-time):
   ```
   # Windows: Settings > System > Environment Variables > User variables
   SENTRY_AUTH_TOKEN = <token from sentry.io/settings/auth-tokens/>
   SENTRY_ORG = <your-org-slug>
   ```

**Step 2: Verify**
```bash
sentry-cli info
```
Should show your org name and auth status.

### Adding Sentry to a Project (First Time)

For a **Next.js** project (your most common):
```bash
cd your-project
npx @sentry/wizard@latest -i nextjs
```

This wizard auto-generates everything:
- `instrumentation-client.ts` (catches browser errors)
- `sentry.server.config.ts` (catches server errors)
- `sentry.edge.config.ts` (catches edge function errors)
- Wraps `next.config.ts` with Sentry config

It'll ask for your DSN (a URL that tells the SDK where to send errors). Get it from:
**Sentry Dashboard > Your Project > Settings > Client Keys (DSN)**

For **Vercel projects**: Also install the Sentry integration in Vercel Dashboard > Integrations. This auto-sets env vars and uploads source maps on every deploy.

For **Railway projects**: Manually add these env vars in Railway:
```
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=<your token>
SENTRY_ORG=<your org>
SENTRY_PROJECT=<project name>
SENTRY_ENVIRONMENT=production
```

### Your First Workflow: "Something broke in production"

**Step 1: Check Sentry**

Ask Claude Code:
```
"Check Sentry for recent production errors"
```
Or manually:
```bash
sentry-cli issues list <ORG>/<PROJECT> --query "is:unresolved"
```

**Step 2: Investigate**

For deeper investigation, the Sentry MCP gives you AI-powered analysis:
```
"Use Sentry MCP to investigate the auth error"
```
Sentry's Seer AI will analyze the error, identify the root cause, and sometimes even suggest code fixes.

**Step 3: Fix, deploy, verify**

After deploying the fix, check that the error stops:
```bash
# See if new errors appeared after deploy
sentry-cli issues list <ORG>/<PROJECT> --query "firstSeen:>now-5m"
```

### After Every Deploy: Release Tracking

This is what makes Sentry powerful long-term. After deploying:

```bash
VERSION=$(git rev-parse HEAD)
sentry-cli releases new $VERSION
sentry-cli releases set-commits $VERSION --auto
sentry-cli deploys new -e production -r $VERSION
sentry-cli releases finalize $VERSION
```

**Why bother?** Now Sentry can:
- Tell you which deploy introduced an error
- Show you which commit caused it
- Suggest who should fix it (the commit author)
- Track whether your deploys are getting healthier or buggier

**For Vercel projects**, the Sentry integration does this automatically. You only need the manual flow for Railway.

Our `sentry-deploy-release` hook will remind you of these commands after every deploy.

### Pro Tips for Your First Few Projects

1. **Start with one project** -- instrument NorthStar first, then add others.
2. **Set `tracesSampleRate: 0.1` in production** -- 10% of transactions is enough. 100% is expensive.
3. **Always upload source maps** -- without them, you see minified code in stack traces.
4. **Set the `environment`** -- so you can filter dev errors from prod errors.
5. **Don't ignore errors** -- unresolved errors pile up. Triage weekly.

---

## Part 3: The Connected Workflow

### Linear + Sentry + GitHub: The Full Loop

Here's what a typical feature development cycle looks like with all three connected:

```
1. Create Linear issue: "Add user avatar upload"                    [Linear]
2. Branch: git checkout -b dave/LIN-55-avatar-upload                [Git]
   --> Linear auto-moves LIN-55 to "In Progress"
3. Build the feature with Claude Code                               [Claude Code]
4. Push + open PR with "LIN-55" in title                            [GitHub]
   --> Linear auto-moves LIN-55 to "In Review"
5. Merge PR                                                         [GitHub]
   --> Linear auto-moves LIN-55 to "Done"
6. Deploy (Vercel auto-deploys on merge)                            [Vercel]
   --> Sentry auto-creates release + uploads source maps
7. Sentry monitors for errors in the new release                    [Sentry]
   --> If error: Sentry Agent posts root cause in Linear
```

### When Sentry Finds an Error

With the Sentry Agent connected to Linear:
1. Sentry detects the error
2. You (or automation) create a Linear issue from Sentry
3. Mention `@sentry` in the Linear issue comment
4. Sentry Agent runs Seer AI analysis and posts results back to Linear
5. You now have root cause + suggested fix right in your issue tracker

### What Claude Code Does Automatically

Three hooks fire automatically during your workflow:

| Hook | When | What it does |
|------|------|-------------|
| `linear-branch-context` | You create a `LIN-XXX` branch | Shows issue link, suggests status update |
| `sentry-deploy-release` | You deploy to Vercel/Railway | Reminds you to create a Sentry release |
| `sentry-error-context` | You mention "production error" | Suggests checking Sentry |

You don't need to remember these -- they just appear as helpful context when relevant.

---

## Part 4: Quick Reference

### Linear Commands (ask Claude Code or run directly)

| Task | Command |
|------|---------|
| List my issues | `linearis issues list` |
| Search issues | `linearis issues search "keyword" --team "The Lab"` |
| Create issue | `linearis issues create "Title" --team "The Lab" --priority 2` |
| View issue | `linearis issues read LIN-42` |
| Update status | `linearis issues update LIN-42 --status "In Progress"` |
| Start work (interactive) | `linear issue start` (lets you pick, creates branch) |

### Sentry Commands

| Task | Command |
|------|---------|
| Check auth | `sentry-cli info` |
| List projects | `sentry-cli projects list` |
| List errors | `sentry-cli issues list <ORG>/<PROJECT>` |
| Recent errors | `sentry-cli issues list <ORG>/<PROJECT> --query "firstSeen:>now-1h"` |
| Create release | `sentry-cli releases new $(git rev-parse HEAD)` |
| Upload source maps | `sentry-cli sourcemaps upload --release=<VERSION> .next/` |

### Branch Naming

```
dave/LIN-<number>-<short-description>

Examples:
dave/LIN-42-fix-auth-redirect
dave/LIN-55-add-avatar-upload
dave/LIN-100-refactor-api-routes
```

### Environment Variables (already set on your machine)

| Var | Purpose | Where |
|-----|---------|-------|
| `LINEAR_API_TOKEN` | linearis CLI auth | Windows user env |
| `SENTRY_AUTH_TOKEN` | sentry-cli auth | Windows user env |
| `SENTRY_ORG` | Sentry org slug | Windows user env |
| `SENTRY_DSN` | Per-project error ingestion | Project `.env.local` or deploy platform |

---

## Part 5: First-Project Checklist

When you're ready to instrument your first project:

- [ ] Verify env vars: `sentry-cli info` and `linearis issues list`
- [ ] Create a Sentry project: `sentry-cli projects create --platform javascript-nextjs <name>`
- [ ] Get the DSN from Sentry dashboard
- [ ] Run the Next.js wizard: `npx @sentry/wizard@latest -i nextjs`
- [ ] Add `SENTRY_DSN` to `.env.local` and deploy platform env vars
- [ ] For Vercel: install Sentry integration in Vercel Dashboard
- [ ] Trigger a test error to verify Sentry receives it
- [ ] Create a Linear project for this repo
- [ ] Enable GitHub integration in Linear settings
- [ ] Create your first issue and branch using the naming convention
- [ ] Deploy and verify release tracking works

After this checklist, the full loop is live. Errors flow to Sentry, issues flow to Linear, and your branches auto-track everything.
