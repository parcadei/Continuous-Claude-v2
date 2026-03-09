---
name: project-registry
description: Query and manage the centralized project registry for port assignments, stack info, dev commands, and project status
allowed-tools: [Read, Write, Bash]
metadata:
  triggers: ["project registry", "what port", "project info", "which project", "project list"]
---

# Project Registry

Centralized registry of all managed projects with stack, port, URL, and status information.

## Registry Location

`.claude/project-registry.json` in the continuous-claude repo.

## When to Use

- User asks "what port does X use?" or "what's the URL for Y?"
- User asks "which projects use Next.js?" or similar stack queries
- User asks "list all projects" or "show active projects"
- User wants to add a new project or update project info
- Session needs to resolve project paths, dev commands, or ports

## Query Operations

### Lookup by Name

Read `.claude/project-registry.json` and find the entry where `name` matches (case-insensitive partial match).

Example user asks: "What port does NorthStar use?"
1. Read `.claude/project-registry.json`
2. Find entry with name containing "northstar"
3. Return: port 3002, URL https://northstar.localhost/, dev command `npm run dev`

### List All Active Projects

Read the registry and filter where `status === "active"`.

Present as a table:

| Project | Port | URL | Stack |
|---------|------|-----|-------|
| continuous-claude | -- | -- | TypeScript, Node.js, PostgreSQL, esbuild |
| NorthStar Transformation | 3002 | https://northstar.localhost/ | Next.js, TypeScript, Tailwind, Drizzle, Neon |
| Fourth Connect | 3000 | https://fourth-connect.localhost/ | Next.js, TypeScript, Tailwind |
| agent-factory | 3001 | -- | Next.js, AI SDK v6, OpenRouter, Docker |

### Filter by Stack

Read the registry and filter where `stack` array includes the queried technology.

Example: "Which projects use TypeScript?" returns all projects with "TypeScript" in their stack array.

### Find by Port

Read the registry and find the entry where `port` matches the queried number.

Example: "What's on port 3000?" returns Fourth Connect.

## Update Operations

### Add a New Project

Append a new entry to the `projects` array in `.claude/project-registry.json`:

```json
{
  "name": "new-project",
  "path": "C:/Users/david.hayes/Projects/new-project",
  "stack": ["React", "TypeScript"],
  "description": "What this project does",
  "port": null,
  "url": null,
  "devCommand": null,
  "status": "active"
}
```

Required fields: `name`, `path`, `stack`, `description`, `status`.
Optional fields (nullable): `port`, `url`, `devCommand`.

### Update Project Info

Read the registry, modify the target entry, write the full file back.

Common updates:
- Change `status` to `"inactive"` when archiving a project
- Update `port` or `url` when dev setup changes
- Add stack entries when new dependencies are adopted

### Mark Inactive

Set `status` to `"inactive"`. Do not remove the entry -- inactive projects remain in the registry for reference.

## Schema

```json
{
  "version": "1.0",
  "projects": [
    {
      "name": "string (required, unique)",
      "path": "string (absolute Windows path with forward slashes)",
      "stack": ["string array of technologies"],
      "description": "string (short description)",
      "port": "number | null",
      "url": "string | null (local dev URL)",
      "devCommand": "string | null (e.g. 'npm run dev')",
      "status": "'active' | 'inactive'"
    }
  ]
}
```

## Notes

- Paths use forward slashes for cross-platform compatibility
- The registry is the single source of truth for project metadata
- The `dev-server-cleanup.md` rule has a port registry table that should stay in sync
- When adding projects with dev servers, also update the port registry in that rule
