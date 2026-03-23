# Projects & Context

## Current User

```bash
neonctl me                                    # show authenticated user info
neonctl me -o json                            # structured output
```

## List Projects

```bash
neonctl projects list                         # all projects
neonctl projects list -o json                 # structured output
neonctl projects list --org-id <org>          # filter by organization
```

## Get Project Details

```bash
neonctl projects get <project-id>
neonctl projects get <project-id> -o json
```

## Create a Project

```bash
neonctl projects create --name my-app                        # basic
neonctl projects create --name my-app --region-id aws-us-east-1  # specific region
neonctl projects create --name my-app --set-context          # create and set as default
neonctl projects create --name my-app --database mydb        # custom database name
neonctl projects create --name my-app --psql                 # create and connect
```

Key flags: `--name`, `--region-id`, `--org-id`, `--database`, `--role`, `--set-context`, `--cu <size>`

Available regions: `aws-us-west-2`, `aws-us-east-1`, `aws-us-east-2`, `aws-eu-central-1`, `aws-ap-southeast-1`, `aws-ap-southeast-2`, `azure-eastus2`

## Update a Project

```bash
neonctl projects update <project-id> --name new-name
```

## Delete / Recover a Project

```bash
neonctl projects delete <project-id>
neonctl projects recover <project-id>         # within grace period only
```

## Set Context (Default Project)

Avoids passing `--project-id` on every command:

```bash
neonctl set-context --project-id <id>                # set default project
neonctl set-context --project-id <id> --org-id <org> # set project and org
```

Context is stored in `~/.config/neonctl/`. Override per-command with `--project-id`.

## Typical Setup Flow

```bash
# 1. Authenticate
neonctl auth

# 2. List projects or create one
neonctl projects list -o json
neonctl projects create --name my-app --set-context

# 3. Verify context
neonctl branches list                        # should show branches without --project-id
neonctl connection-string                    # should return connection string
```

All commands support `-o json` for structured output.
