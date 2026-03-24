# Monitoring

## Logs

```bash
railway logs                                  # stream live deployment logs
railway logs --build                          # stream build logs
railway logs --deployment                     # stream deployment logs (explicit)
railway logs --http                           # stream HTTP request logs
railway logs -s backend                       # logs from specific service
railway logs -e production                    # logs from specific environment
railway logs --json                           # JSON formatted output
```

### Historical Logs (disables streaming)

```bash
railway logs -n 100                           # last 100 log lines
railway logs --since 1h                       # logs from last hour
railway logs --since 30m --until 10m          # logs in a time window
railway logs --since 2024-01-15T10:00:00Z     # logs since ISO timestamp
```

### Filtering

```bash
railway logs --filter "@level:error"                      # error-level logs
railway logs --filter "@level:warn AND rate limit"        # warnings containing text
railway logs --http --method GET --status ">=400"         # HTTP errors
railway logs --http --status 500..599 -n 50               # server errors, last 50
railway logs --http --path /api/users --method POST       # specific endpoint
railway logs --http --filter "@totalDuration:>=1000"      # slow requests (>1s)
```

### Log from Specific Deployment

```bash
railway logs <deployment-id>                  # logs from a specific deployment
railway logs --latest                         # logs from latest deployment (even if failed)
```

## List Deployments

```bash
railway deployment list -s <service>      # List deployments with IDs
railway deployment list -s backend -o json # JSON output for scripting
```

Note: needed to get deployment IDs for targeted `railway logs <deployment-id>`.

## Status

```bash
railway status                                # show linked project, environment, service
railway status --json                         # JSON output
```

## Dashboard

```bash
railway open                                  # open project dashboard in browser
railway open -p                               # print the dashboard URL instead
```
