# Environment Variables

## Listing Variables

```bash
railway variable list                         # list all variables for linked service
railway variable list -s backend              # list for specific service
railway variable list -e production           # list for specific environment
railway variable list --json                  # JSON output
railway variable list --kv                    # KEY=VALUE format (useful for piping)
```

Shorthand aliases: `railway variables`, `railway vars`, `railway var`.

## Setting Variables

```bash
railway variable set KEY=value                        # set one variable
railway variable set KEY1=val1 KEY2=val2              # set multiple at once
railway variable set -s backend API_KEY=secret        # set for specific service
railway variable set -e production DB_URL=postgres    # set for specific environment
railway variable set --skip-deploys KEY=value         # set without triggering redeploy
echo "long-secret" | railway variable set TOKEN --stdin  # read value from stdin
```

When setting multiple variables, use `--skip-deploys` on all but the last call to avoid unnecessary redeploys.

## Deleting Variables

```bash
railway variable delete KEY                   # delete a variable
railway variable delete KEY -s backend        # delete from specific service
railway variable delete KEY -e production     # delete from specific environment
```

## Running with Variables Locally

```bash
railway run npm start                         # inject Railway vars into local command
railway run -s backend npm test               # use vars from specific service
railway run -e staging npm run seed           # use vars from specific environment
```

`railway run` pulls environment variables from the linked service and injects them into the command's environment. No files are written.

## Subshell with Variables

```bash
railway shell                                 # open subshell with Railway vars loaded
railway shell -s backend                      # subshell with specific service vars
railway shell --silent                        # open without the Railway banner
```

Inside the subshell, all Railway environment variables are available as regular env vars. Type `exit` to leave.
