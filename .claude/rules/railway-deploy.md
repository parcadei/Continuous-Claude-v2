# Railway Deployment Safety

## Safe Commands (no confirmation needed)

- `railway status`
- `railway logs` (all variants)
- `railway list`
- `railway whoami`
- `railway variable list`
- `railway open`
- `railway service status`

## Dangerous Commands (ALWAYS confirm first)

Before running ANY of these, explain what it does and wait for explicit user approval:

- `railway up` (uploads and deploys local code)
- `railway down` (removes most recent deployment)
- `railway deploy` (provisions a template)
- `railway delete` (deletes a project)
- `railway redeploy` (rebuilds and deploys)
- `railway restart` (restarts without rebuild)
- `railway variable set` (changes environment variables, triggers redeploy)
- `railway variable delete` (removes environment variables)
- `railway domain` (modifies domain configuration)

## Pre-Flight Checks

Before any Railway operation:

1. Run `railway status` to verify the linked project, environment, and service
2. Confirm you are operating on the intended service (especially in multi-service projects)
3. For deploy operations, verify the working directory contains the correct code

## Multi-Variable Safety

When setting multiple variables, use `--skip-deploys` on all but the last call to avoid unnecessary redeploys:

```bash
railway variable set KEY1=val1 --skip-deploys
railway variable set KEY2=val2 --skip-deploys
railway variable set KEY3=val3              # only this one triggers redeploy
```
