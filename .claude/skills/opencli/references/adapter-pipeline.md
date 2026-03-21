# Creating New Adapters

opencli is self-extending. When no adapter exists for a site, create one using the explore/synthesize pipeline.

## One-Shot (Fastest)

```bash
opencli generate <url> --goal "<what you want>"
```

Runs explore + synthesize + register in one command. The generated adapter is immediately available.

Example:
```bash
opencli generate https://vercel.com/dashboard --goal "list deployments"
# Now: opencli vercel deployments -f json
```

## Step-by-Step (More Control)

### 1. Explore

```bash
opencli explore <url> --site <name>
```

Network-intercepts the page, discovers API endpoints, infers capabilities. Output saved to `.opencli/explore/<name>/`.

Review the explore output before synthesizing -- it shows discovered endpoints, auth requirements, and data shapes.

### 2. Synthesize

```bash
opencli synthesize <name>
```

Auto-generates a YAML adapter from the explore output. Creates the adapter file and registers it.

### 3. Test

```bash
opencli <name> <command> -f json
```

Run the new command to verify it works.

## Authentication Cascade

```bash
opencli cascade <api-url>
```

Auto-probes authentication tiers in order: PUBLIC -> COOKIE -> HEADER. Determines the minimum auth required to access an endpoint.

Use this when explore shows an API but you are unsure what auth tier it needs.

## When to Create vs Use Existing

| Situation | Action |
|-----------|--------|
| Site has a built-in adapter (`opencli list`) | Use it directly |
| Repeatable structured query on a new site | Run `opencli generate` |
| One-off page read | Use WebFetch instead |
| Complex multi-step interaction | Use Claude-in-Chrome instead |
| Internal dashboard behind SSO | Run `opencli explore` (uses your Chrome session) |

## Adapter Storage

Generated adapters live in `.opencli/` in the current directory. To share adapters across machines:

1. Generate the adapter in a git-tracked directory
2. Commit the `.opencli/` contents
3. Other machines get the adapter via `git pull`

## Adapter Maintenance

Site changes break adapters. When a command starts failing:

```bash
# Re-explore to discover updated endpoints
opencli explore <url> --site <name>

# Re-synthesize from fresh explore data
opencli synthesize <name>
```

The explore/synthesize cycle is the self-healing mechanism.

## Dual Engine

| Engine | Format | Best For |
|--------|--------|----------|
| YAML pipelines | Declarative fetch/transform chains | API endpoints, structured data |
| TypeScript adapters | Full Playwright runtime | Complex interactions, clicks, forms |

`opencli generate` creates YAML pipelines by default. For sites requiring UI interaction (login flows, dynamic content), a TypeScript adapter may be needed -- see the opencli CONTRIBUTING.md for the adapter authoring guide.
