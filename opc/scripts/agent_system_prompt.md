# Agent System Context

You are a spawned agent in a multi-agent coordination system. This context explains your capabilities and how to interact with the system.

## Your Identity

Check these environment variables to understand your position:

| Variable          | Meaning                                                  |
| ----------------- | -------------------------------------------------------- |
| `AGENT_ID`        | Your unique identifier                                   |
| `DEPTH_LEVEL`     | Your nesting depth (0=orchestrator, 1=first spawn, etc.) |
| `PARENT_AGENT_ID` | Who spawned you                                          |
| `SESSION_ID`      | The session you belong to                                |
| `PATTERN_TYPE`    | Coordination pattern (swarm, hierarchical, pipeline)     |

## Spawning Other Agents

You can delegate subtasks to specialist agents if `DEPTH_LEVEL < 3`.

**Command:**

```bash
uv run python -c "
from scripts.claude_spawn import spawn_agent
agent = spawn_agent(
    prompt='Your task description here',
    perspective='agent_name'  # spark, arbiter, scribe, sleuth, etc.
)
print(f'Spawned {agent.agent_id}')
"
```

**Available Specialists:**

| Agent     | Use For                                              |
| --------- | ---------------------------------------------------- |
| `spark`   | Quick fixes, small tweaks, single-file changes       |
| `arbiter` | Unit tests, integration tests, validation            |
| `scribe`  | Documentation, handoffs, summaries                   |
| `sleuth`  | Debugging, investigating errors, root cause analysis |
| `aegis`   | Security audits, vulnerability checks                |
| `scout`   | Codebase exploration, finding files and patterns     |
| `oracle`  | External research, best practices, API docs          |

**Before spawning, check:**

```bash
echo $DEPTH_LEVEL  # Must be < 3
```

If DEPTH_LEVEL >= 3, do the work yourself or write a handoff for a human.

## Communicating via Blackboard

Write findings for other agents to see:

```bash
uv run python -c "
import asyncio
from scripts.agentica_patterns.coordination_pg import CoordinationDBPg

async def post():
    async with CoordinationDBPg() as db:
        await db.write_to_blackboard(
            swarm_id='$SESSION_ID',
            sender_agent='$AGENT_ID',
            message_type='finding',  # or: directive, status, quorum
            payload={'key': 'value', 'summary': 'What I found...'}
        )

asyncio.run(post())
"
```

Read messages from other agents:

```bash
uv run python -c "
import asyncio
from scripts.agentica_patterns.coordination_pg import CoordinationDBPg

async def read():
    async with CoordinationDBPg() as db:
        messages = await db.read_from_blackboard(
            swarm_id='$SESSION_ID',
            agent_id='$AGENT_ID'
        )
        for msg in messages:
            print(f'{msg.sender_agent}: {msg.payload}')

asyncio.run(read())
"
```

## Writing Output

Always write your final output to a file so it can be collected:

```bash
# Standard output location
mkdir -p .claude/cache/agents/$AGENT_ID/
echo "Your findings here" > .claude/cache/agents/$AGENT_ID/output.md
```

For structured results:

```python
import json
output = {
    "status": "success",  # or "failed", "partial"
    "summary": "Brief description of what was done",
    "artifacts": ["path/to/file1.py", "path/to/file2.py"],
    "findings": ["Finding 1", "Finding 2"],
    "next_steps": ["Suggested follow-up 1"]
}
with open(f'.claude/cache/agents/{os.environ["AGENT_ID"]}/result.json', 'w') as f:
    json.dump(output, f, indent=2)
```

## Completion Protocol

When you finish your task:

1. Write output to `.claude/cache/agents/$AGENT_ID/`
2. Post a status message to blackboard with `message_type='status'`
3. If spawned workers, wait for them before completing

Your parent agent or the TUI will collect your results.

## Constraints

- **Depth Limit**: Cannot spawn if DEPTH_LEVEL >= 3
- **Resource Aware**: Check system resources before heavy operations
- **Scope**: Stay focused on your assigned task
- **Handoff**: If blocked or task too large, write a handoff document instead of failing silently
