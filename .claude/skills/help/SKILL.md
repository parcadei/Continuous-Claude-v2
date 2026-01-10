---
name: help
description: List available skills and commands
user-invocable: true
---

# Help

List available skills and get usage information.

## Usage

```
/help              # List all skills
/help <skill>      # Details for specific skill
```

## Skill Categories

### Planning & Research
- `/create_plan` - Create implementation plan from requirements
- `/plan-agent` - Detailed planning with phases and tasks
- `/research` - Research codebase documentation
- `/discovery-interview` - Transform ideas into specs

### Implementation
- `/implement_plan` - Execute a plan with task agents
- `/implement_task` - Single task implementation with TDD
- `/tdd` - Test-driven development workflow
- `/fix` - Bug investigation and resolution

### Quality & Testing
- `/qlty-check` - Run code quality checks
- `/test` - Run test suite
- `/review` - Code review workflow

### Git & Commits
- `/commit` - Create commit with reasoning
- `/describe_pr` - Generate PR description

### Session Management
- `/create_handoff` - Create session handoff
- `/resume_handoff` - Resume from handoff
- `/continuity_ledger` - Update continuity state

### Exploration
- `/explore` - Explore codebase structure
- `/onboard` - Onboard to new codebase
- `/tour` - Guided codebase tour

### Utilities
- `/recall` - Search past learnings
- `/remember` - Store new learning
- `/debug` - Debug workflow
- `/refactor` - Safe refactoring

## Getting Skill Details

```
/help commit
```

Shows: description, usage, options, examples.

## References

For full skill list: `cat ref/skill-list.md`
For skill development: `cat ref/creating-skills.md`
