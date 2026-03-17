# Project Registry

A centralized project registry exists at `.claude/project-registry.json`. Use it when you need project paths, ports, URLs, stack info, or dev commands.

## Quick Reference

| Project | Path | Port | URL | Status |
|---------|------|------|-----|--------|
| continuous-claude | C:/Users/david.hayes/continuous-claude | -- | -- | active |
| NorthStar Transformation | C:/Users/david.hayes/Projects/northstar-transformation | 3002 | https://northstar.localhost/ | active |
| Fourth Connect | C:/Users/david.hayes/Projects/fourth-connect | 3000 | https://fourth-connect.localhost/ | active |
| agent-factory | C:/Users/david.hayes/Projects/agent-factory | 3001 | -- | active |
| ECG Lead Reactivation Engine | C:/Users/david.hayes/Projects/ECG Lead Reactivation Engine | 3003 | https://ecg.localhost/ | active |
| LinkMap | C:/Users/david.hayes/Projects/linkmap | -- | -- | inactive |

## Usage

- Read `.claude/project-registry.json` for structured data
- Use the `project-registry` skill for interactive queries: "what port does NorthStar use?"
- Keep the registry updated when adding or archiving projects

## Keeping in Sync

When updating the registry, also check:
- `dev-server-cleanup.md` port registry table (ports and domains)
- `northstar-local-dev.md` (NorthStar-specific URL reference)
