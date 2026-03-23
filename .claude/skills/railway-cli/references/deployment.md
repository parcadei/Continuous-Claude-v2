# Deployment

Ensure the project is linked (`railway link`) before deploying.

## Deploy from Local Directory

```bash
railway up                                    # deploy current directory, stream logs
railway up -d                                 # deploy detached (no log streaming)
railway up -s backend                         # deploy to specific service
railway up -e production                      # deploy to specific environment
railway up -m "fix: auth bug"                 # attach a message to the deployment
railway up --json                             # output logs as JSON (CI mode)
railway up ./path/to/code                     # deploy from a specific path
```

`railway up` uploads the current directory contents and triggers a build + deploy. Respects `.gitignore` by default (skip with `--no-gitignore`).

## Provision a Template

```bash
railway deploy -t postgres                    # add Postgres from template
railway deploy -t <template-code>             # provision any Railway template
railway deploy -t mytemplate -v "PORT=3000"   # set template variables
```

`railway deploy` provisions a template into your project -- it does not deploy local code. Use `railway up` for that.

## Remove Latest Deployment

```bash
railway down                                  # remove most recent deployment (interactive)
railway down -s backend                       # remove from specific service
railway down -y                               # skip confirmation
```

## Redeploy and Restart

```bash
railway redeploy                              # rebuild and deploy latest (linked service)
railway redeploy -s backend                   # redeploy specific service
railway redeploy -y                           # skip confirmation
railway redeploy --json                       # JSON output

railway restart                               # restart without rebuilding
railway restart -s backend                    # restart specific service
railway restart -y                            # skip confirmation
```

## Safety

- **ALWAYS** confirm with the user before running `railway up` or `railway down`
- Use `railway status` to verify the linked project/service before deploying
- In CI, use `railway up --ci` or `railway up --json` to avoid interactive prompts
- Use `-y` flag on `railway down`, `railway redeploy`, and `railway restart` to skip confirmation in scripts
