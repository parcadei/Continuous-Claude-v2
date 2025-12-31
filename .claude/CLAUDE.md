# Claude Code Configuration

Complete Claude Code configuration for the Continuous-Claude-v2 project.

## Quick Navigation

| Directory | Purpose | Count |
|-----------|---------|-------|
| [skills/](./skills/CLAUDE.md) | Reusable expert tools | 35+ |
| [agents/](./agents/CLAUDE.md) | Autonomous workers | 14 |
| [rules/](./rules/CLAUDE.md) | Operational guidelines | 11 |
| [hooks/](./hooks/CLAUDE.md) | Event-driven automation | 10+ |

## Key Concepts

### Skills
Self-contained tools Claude can activate automatically:
- Clear use cases and trigger patterns
- Step-by-step instructions
- Integration with MCP tools

### Agents
Specialized autonomous workers spawned from main context:
- Read their own methodology
- Execute complex workflows independently
- Return summaries (~200 tokens vs 2000+)

### Rules
Operational guidelines Claude follows automatically:
- When to use agents vs direct execution
- Git commit patterns
- Search tool preferences

### Hooks
Event-driven scripts at specific workflow points:
- UserPromptSubmit: Skill activation
- PostToolUse: File tracking
- SessionStart/End: Continuity management

## Getting Started

1. **Exploration**: Use `rp-explorer` or `research-agent` skills
2. **Planning**: Use `plan-agent` or `create_plan` skills
3. **Implementation**: Follow `implement_plan` with agents
4. **Debugging**: Use `debug` skill or `debug-agent`
5. **Continuity**: Use `continuity_ledger` and ledgers in `thoughts/ledgers/`

## Multi-Phase Implementation Pattern

1. Create/update continuity ledger with phases as checkboxes
2. Mark current phase with `[→]`, completed with `[x]`, pending with `[ ]`
3. Ledger persists across context clears/compactions
4. SessionStart hook auto-loads ledger on resume

## Agent Orchestration

- Spawn agents for multi-file implementations
- Don't read files in main chat to prepare agent instructions
- Agents preserve main context by handling complexity independently
- Agents return summaries (~200 tokens vs 2000+ for direct execution)

## Key Files

- `settings.json` - Hook registration
- `skills/skill-rules.json` - Skill activation rules
- Each skill in `skills/{skill-name}/SKILL.md`
- Each agent in `agents/{agent-name}.md`
- Each rule in `rules/{rule-name}.md`

## Extending

### Create a Skill
1. Create `.claude/skills/my-skill/SKILL.md`
2. Add triggers to `skill-rules.json`
3. Link to workflow scripts in `../../scripts/`

### Create an Agent
1. Create `.claude/agents/my-agent.md`
2. Specify model, methodology
3. Reference relevant skills

### Add a Rule
1. Create `.claude/rules/my-rule.md`
2. Define scope (globs if applicable)
3. Document the pattern

### Create a Hook
1. Write TypeScript in `.claude/hooks/src/my-hook.ts`
2. Build: `.claude/hooks/build.sh`
3. Create shell wrapper and register in `settings.json`
