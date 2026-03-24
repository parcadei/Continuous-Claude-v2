---
name: railway-cli
description: Railway deployment management -- deploy, logs, environment variables, and service management via Railway CLI
---

# Railway CLI Skill

The Railway CLI (`railway`) deploys, manages, and monitors services on the Railway platform from the command line. Use `railway <command> --help` for full flag details on any command.

## Critical: Project Linking

Commands must be run from a directory linked to a Railway project. Linking creates a `.railway/` folder with project configuration.

```bash
railway link                              # interactive project/service selection
railway link -p <project-id>             # link to specific project
railway link -p <project-id> -s <svc>    # link to specific project and service
railway link -e production               # link to specific environment
```

**When something goes wrong, check linking first** -- run `railway status` to see what project, environment, and service you are linked to. Verify with `railway whoami` that you are on the correct account.

## Authentication

```bash
railway login                    # Browser OAuth (default)
railway login --browserless      # Token-based auth for headless/CI environments
railway logout                   # Clear saved credentials
```

If commands fail with auth errors, run `railway login` to re-authenticate.

## Quick Start

```bash
railway login
railway link                # link to existing project
railway up                  # deploy from current directory
railway logs                # stream live logs
railway status              # show project/service info
```

## Decision Tree

Use this to route to the correct reference file:

- **Deploy, rollback, redeploy, restart** -> `references/deployment.md`
- **Environment variables, secrets, local run** -> `references/environment.md`
- **Logs, status, dashboard** -> `references/monitoring.md`
- **Services, domains, databases, linking** -> `references/services.md`

## Anti-Patterns

- **Deploying without confirmation**: `railway up` immediately uploads and deploys the current directory. Always confirm with the user before running it.
- **Forgetting to link first**: Most commands require an active link. Run `railway status` to verify before operating.
- **Setting variables without `--skip-deploys`**: Each `variable set` triggers a redeploy by default. When setting multiple variables, use `--skip-deploys` on all but the last one.
- **Using `railway deploy` when you mean `railway up`**: `deploy` provisions a template; `up` deploys your local code.
- **Not specifying `--service` in multi-service projects**: Commands default to the linked service. In projects with multiple services, always pass `--service <name>` explicitly.
