# Sync Known Gaps

What auto-syncs (and what does not) between `continuous-claude/` (repo) and `~/.claude/` (active).

| Item | Auto-Syncs? | Why | Manual Command |
|------|-------------|-----|----------------|
| `hooks/src/*.ts` | Yes | Post-commit hook copies | N/A |
| `hooks/dist/*.mjs` | Yes (NEW) | Enhanced sync script | `bash scripts/sync-to-active.sh` |
| `rules/*.md` | Yes | Post-commit hook copies | N/A |
| `skills/*/` | Yes | Post-commit hook copies | N/A |
| `agents/*.yml` | Yes | Post-commit hook copies | N/A |
| `scripts/ralph/*.py` | Yes (NEW) | Enhanced sync script | `bash scripts/sync-to-active.sh` |
| `templates/ralph/*` | Yes (NEW) | Enhanced sync script | `bash scripts/sync-to-active.sh` |
| `docs/**/*.md` | Yes (NEW) | Added to SYNC_DIRS | `bash scripts/sync-to-active.sh` |
| `settings.json` | NO | Intentional — local config | Manual copy (risky) |
| `settings.local.json` | NO | Intentional — machine-specific | Never sync |
| `CLAUDE.md` | NO | Intentional — may differ per machine | Manual review |
| `RULES.md` | NO | Intentional — may differ per machine | Manual review |
| `knowledge-tree.json` | NO | Generated per-project | `knowledge_tree.py --project` |
| `extraction-state.json` | NO | Runtime state | N/A (auto-managed) |

## Notes

- The enhanced sync script (Task 2.0) closed the `dist/` and `scripts/ralph/` gaps
- `settings.json` remains intentionally local because hook registrations may differ between machines
- Use `/sync-drift` skill to detect unexpected drift
- Manual sync: `bash ~/continuous-claude/scripts/sync-to-active.sh`
