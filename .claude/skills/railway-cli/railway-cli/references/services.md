# Services

## Linking

```bash
railway link                                  # interactive project/service selection
railway link -p <project-id>                 # link to specific project
railway link -p <project-id> -s backend      # link to specific project and service
railway link -e production                   # link to specific environment
railway link -w my-team                      # link to specific workspace

railway unlink                                # disassociate project from directory
```

## Managing Services

```bash
railway service link                          # link to a service in current project (bare `railway service` is deprecated)
railway service status                        # show deployment status for services
railway service logs                          # view logs from a service
railway service redeploy                      # redeploy a service
railway service restart                       # restart a service
railway service scale                         # scale a service across regions
```

## Adding Services

```bash
railway add -d postgres                       # add a database (postgres, mysql, redis, mongo)
railway add -s my-api                         # add an empty service with a name
railway add -s my-api -r owner/repo           # add a service linked to a GitHub repo
railway add -s my-api -i docker/image         # add a service from a Docker image
railway add --json                            # JSON output
```

## Domains

```bash
railway domain                                # generate a railway.app subdomain
railway domain custom.example.com             # add a custom domain (returns DNS records)
railway domain -s backend                     # domain for specific service
railway domain -p 8080                        # specify the port to route to
railway domain --json                         # JSON output
```

## Database Shell

```bash
railway connect                               # connect to linked database shell
railway connect postgres                      # connect to specific database by name
railway connect -e production                 # connect to database in specific environment
```

Launches the appropriate client: `psql` for Postgres, `mongosh` for MongoDB, etc.

## Project Management

```bash
railway list                                  # list all projects
railway init                                  # create a new project
railway delete                                # delete a project
railway whoami                                # show current logged-in user
```

## MCP Server

```bash
railway mcp                                   # start a local MCP server for AI-agent access
```

Provides AI agents with structured access to Railway project management.

## Environments

```bash
railway environment list              # List all environments
railway environment create <name>     # Create new environment (e.g. staging)
railway environment delete <name>     # Delete environment
```

## SSH Access

```bash
railway ssh                                   # SSH into a running service
```
