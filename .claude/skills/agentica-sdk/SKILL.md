---
name: agentica-sdk
description: Build Python agents with Agentica SDK - @agentic decorator, spawn(), persistence, MCP integration
allowed-tools: [Bash, Read, Write, Edit]
---

# Agentica SDK (v0.3.1)

Build AI agents in Python using the Agentica framework. Agents can implement functions, maintain state, use tools, and coordinate with each other.

For full API signatures, model list, error types, logging internals, and streaming: see `references/api-reference.md`.
For multi-agent patterns, custom exception, retry, MCP, and SDK integration examples: see `references/patterns.md`.

## When to Use

- Building new Python agents
- Adding agentic capabilities to existing code
- Integrating MCP tools with agents
- Implementing multi-agent orchestration
- Debugging agent behavior

## Quick Start

### Agentic Function (simplest)

```python
from agentica import agentic

@agentic()
async def add(a: int, b: int) -> int:
    """Returns the sum of a and b"""
    ...

result = await add(1, 2)  # Agent computes: 3
```

### Spawned Agent (more control)

```python
from agentica import spawn

agent = await spawn(premise="You are a truth-teller.")
result: bool = await agent.call(bool, "The Earth is flat")
# Returns: False
```

## Core Patterns

### Return Types

```python
result = await agent.call("What is 2+2?")                     # str (default)
result: int = await agent.call(int, "What is 2+2?")           # typed
result: dict = await agent.call(dict[str, int], "Count items") # generic
await agent.call(None, "Send message to John")                 # side-effects only
```

### Premise vs System Prompt

```python
agent = await spawn(premise="Adds to default system prompt.")
agent = await spawn(system="Replaces default system prompt entirely.")
```

### Passing Tools (Scope)

```python
# In decorator
@agentic(scope={'web_search': web_search_fn})
async def researcher(query: str) -> str:
    """Research a topic."""
    ...

# In spawn
agent = await spawn(premise="Data analyzer", scope={"analyze": custom_analyzer})

# Per-call
result = await agent.call(dict[str, int], "Analyze", dataset=data, analyzer=fn)
```

## Agent Instantiation

```python
# Async — most cases
agent = await spawn(premise="Helpful assistant")

# Sync — use in __init__ methods only
from agentica.agent import Agent

class CustomAgent:
    def __init__(self):
        self._brain = Agent(premise="Specialized assistant", scope={"tool": fn})

    async def run(self, task: str) -> str:
        return await self._brain(str, task)
```

## Model Selection

```python
agent = await spawn(premise="...", model="openai:gpt-5")

@agentic(model="anthropic:claude-sonnet-4.5")
async def analyze(text: str) -> dict: ...
```

See `references/api-reference.md` for full model list.

## Persistence

```python
@agentic(persist=True)
async def chatbot(message: str) -> str:
    """Remembers conversation history."""
    ...
```

For `spawn()` agents, state is automatic across calls to the same instance.

## Token Limits

```python
from agentica import spawn, MaxTokens

agent = await spawn(premise="Brief", max_tokens=500)

agent = await spawn(
    premise="Controlled",
    max_tokens=MaxTokens(per_invocation=5000, per_round=1000, rounds=5)
)
```

## MCP Integration

```python
agent = await spawn(premise="Tool-using agent", mcp="path/to/mcp_config.json")
```

Config format and decorator usage: see `references/api-reference.md`.

## Logging (Quick Reference)

```python
from agentica.logging.agent_listener import NoopListener, PrintOnlyListener

agent = await spawn(premise="...", listener=NoopListener)    # Silent
agent = await spawn(premise="...", listener=PrintOnlyListener)  # Console only
```

Full logging API (FileLogger, StreamLogger, global config): see `references/api-reference.md`.

## Error Handling

```python
from agentica.errors import RateLimitError, MaxTokensError, AgenticaError

try:
    result = await agent.call(str, "Do something")
except RateLimitError:
    await asyncio.sleep(60); result = await agent.call(str, "Do something")
except MaxTokensError:
    pass  # Reduce scope or increase limits
except AgenticaError as e:
    logger.error(f"SDK error: {e}")
```

Full error type list: see `references/api-reference.md`.

## Checklist

- [ ] `@agentic()` functions MUST be `async`
- [ ] `spawn()` is awaitable — use `await spawn(...)`
- [ ] `agent.call()` is awaitable — use `await agent.call(...)`
- [ ] First arg to `call()` is return type, second is prompt string
- [ ] Use `persist=True` for conversation memory in `@agentic`
- [ ] Use `Agent()` (not `spawn()`) in synchronous `__init__`
- [ ] Document exceptions in docstrings for agent to raise them
- [ ] Import listeners from `agentica.logging.agent_listener` (NOT `agentica.logging`)
