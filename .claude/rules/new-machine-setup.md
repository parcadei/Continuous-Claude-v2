# New Machine Setup

For bootstrapping CCv3 on a fresh machine, use the self-contained setup process:

## Entry Point

```bash
cd ~/continuous-claude
cat BOOTSTRAP.md  # Machine-readable guide for Claude Code self-setup
```

## Components

| Component | Purpose |
|-----------|---------|
| `BOOTSTRAP.md` | Step-by-step guide Claude Code reads on fresh hardware |
| `wizard.py` | Auto-sets env vars, installs git hooks, generates configs |
| `settings.json.template` | Portable template with `{{CLAUDE_HOME}}` placeholders |
| `CLAUDE.md.template` | Machine-specific CLAUDE.md generation |
| `RULES.md.template` | Machine-specific RULES.md generation |
| `verify-setup.sh` | 20-check post-setup validation |

## Quick Start

1. Clone the repo: `git clone <repo-url> ~/continuous-claude`
2. Run the wizard: `cd ~/continuous-claude && python wizard.py`
3. Verify: `bash verify-setup.sh`
4. Start Claude Code in any project

The wizard handles Docker, PostgreSQL, env vars, git hooks, and file sync.
