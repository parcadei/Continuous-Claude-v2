---
name: agentica-sdk
description: Build Python agents with Agentica SDK - @agentic decorator, spawn(), persistence, MCP integration
allowed-tools: [Bash, Read, Write, Edit]
---

# Agentica SDK Reference (v0.3.1)

Build AI agents in Python using the Agentica framework. Agents can implement functions, maintain state, use tools, and coordinate with each other.

## When to Use

Use this skill when:
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
# String (default)
result = await agent.call("What is 2+2?")

# Typed output
result: int = await agent.call(int, "What is 2+2?")
result: dict[str, int] = await agent.call(dict[str, int], "Count items")

# Side-effects only
await agent.call(None, "Send message to John")
```

### Premise vs System Prompt

```python
# Premise: adds to default system prompt
agent = await spawn(premise="You are a math expert.")

# System: full control (replaces default)
agent = await spawn(system="You are a JSON-only responder.")
```

### Passing Tools (Scope)

```python
from agentica import agentic, spawn

# In decorator
@agentic(scope={'web_search': web_search_fn})
async def researcher(query: str) -> str:
    """Research a topic."""
    ...

# In spawn
agent = await spawn(
    premise="Data analyzer",
    scope={"analyze": custom_analyzer}
)

# Per-call scope
result = await agent.call(
    dict[str, int],
    "Analyze the dataset",
    dataset=data,           # Available as 'dataset'
    analyzer=custom_fn      # Available as 'analyzer'
)
```

### SDK Integration Pattern

```python
from slack_sdk import WebClient

slack = WebClient(token=SLACK_TOKEN)

# Extract specific methods
@agentic(scope={
    'list_users': slack.users_list,
    'send_message': slack.chat_postMessage
})
async def team_notifier(message: str) -> None:
    """Send team notifications."""
    ...
```

## Agent Instantiation

### spawn() - Async (most cases)

```python
agent = await spawn(premise="Helpful assistant")
```

### Agent() - Sync (for `__init__`)

```python
from agentica.agent import Agent

class CustomAgent:
    def __init__(self):
        # Synchronous - use Agent() not spawn()
        self._brain = Agent(
            premise="Specialized assistant",
            scope={"tool": some_tool}
        )

    async def run(self, task: str) -> str:
        return await self._brain(str, task)
```

## Model Selection

```python
# In spawn
agent = await spawn(
    premise="Fast responses",
    model="openai:gpt-5"  # Default: openai:gpt-4.1
)

# In decorator
@agentic(model="anthropic:claude-sonnet-4.5")
async def analyze(text: str) -> dict:
    """Analyze text."""
    ...
```

**Available models:**
- `openai:gpt-3.5-turbo`, `openai:gpt-4o`, `openai:gpt-4.1`, `openai:gpt-5`
- `anthropic:claude-sonnet-4`, `anthropic:claude-opus-4.1`
- `anthropic:claude-sonnet-4.5`, `anthropic:claude-opus-4.5`
- Any OpenRouter slug (e.g., `google/gemini-2.5-flash`)

## Persistence (Stateful Agents)

```python
@agentic(persist=True)
async def chatbot(message: str) -> str:
    """Remembers conversation history."""
    ...

await chatbot("My name is Alice")
await chatbot("What's my name?")  # Knows: Alice
```

For `spawn()` agents, state is automatic across calls to the same instance.

## Token Limits

```python
from agentica import spawn, MaxTokens

# Simple limit
agent = await spawn(
    premise="Brief responses",
    max_tokens=500
)

# Fine-grained control
agent = await spawn(
    premise="Controlled output",
    max_tokens=MaxTokens(
        per_invocation=5000,  # Total across all rounds
        per_round=1000,       # Per inference round
        rounds=5              # Max inference rounds
    )
)
```

## Token Usage Tracking

```python
from agentica import spawn, last_usage, total_usage

agent = await spawn(premise="You are helpful.")
await agent.call(str, "Hello!")

# Agent method
usage = agent.last_usage()
print(f"Last: {usage.input_tokens} in, {usage.output_tokens} out")

usage = agent.total_usage()
print(f"Total: {usage.total_tokens} processed")

# For @agentic functions
@agentic()
async def my_fn(x: str) -> str: ...

await my_fn("test")
print(last_usage(my_fn))
print(total_usage(my_fn))
```

## Streaming

```python
from agentica import spawn
from agentica.logging.loggers import StreamLogger
import asyncio

agent = await spawn(premise="You are helpful.")

stream = StreamLogger()
with stream:
    result = asyncio.create_task(
        agent.call(bool, "Is Paris the capital of France?")
    )

# Consume stream FIRST for live output
async for chunk in stream:
    print(chunk.content, end="", flush=True)
# chunk.role is 'user', 'agent', or 'system'

# Then await result
final = await result
```

## MCP Integration

```python
from agentica import spawn, agentic

# Via config file
agent = await spawn(
    premise="Tool-using agent",
    mcp="path/to/mcp_config.json"
)

@agentic(mcp="path/to/mcp_config.json")
async def tool_user(query: str) -> str:
    """Uses MCP tools."""
    ...
```

**mcp_config.json format:**
```json
{
  "mcpServers": {
    "tavily-remote-mcp": {
      "command": "npx -y mcp-remote https://mcp.tavily.com/mcp/?tavilyApiKey=<key>",
      "env": {}
    }
  }
}
```

## Logging

### Default Behavior
- Prints to stdout with colors
- Writes to `./logs/agent-<id>.log`

### Contextual Logging

```python
from agentica.logging.loggers import FileLogger, PrintLogger
from agentica.logging.agent_logger import NoLogging

# File only
with FileLogger():
    agent = await spawn(premise="Debug agent")
    await agent.call(int, "Calculate")

# Silent
with NoLogging():
    agent = await spawn(premise="Silent agent")
```

### Per-Agent Logging

```python
# Listeners are in agent_listener submodule (NOT exported from agentica.logging)
from agentica.logging.agent_listener import (
    PrintOnlyListener,  # Console output only
    FileOnlyListener,   # File logging only
    StandardListener,   # Both console + file (default)
    NoopListener,       # Silent - no logging
)

agent = await spawn(
    premise="Custom logging",
    listener=PrintOnlyListener
)

# Silent agent
agent = await spawn(
    premise="Silent agent",
    listener=NoopListener
)
```

### Global Config

```python
from agentica.logging.agent_listener import (
    set_default_agent_listener,
    get_default_agent_listener,
    PrintOnlyListener,
)

set_default_agent_listener(PrintOnlyListener)
set_default_agent_listener(None)  # Disable all
```

## Error Handling

```python
from agentica.errors import (
    AgenticaError,           # Base for all SDK errors
    RateLimitError,          # Rate limiting
    InferenceError,          # HTTP errors from inference
    MaxTokensError,          # Token limit exceeded
    MaxRoundsError,          # Max inference rounds exceeded
    ContentFilteringError,   # Content filtered
    APIConnectionError,      # Network issues
    APITimeoutError,         # Request timeout
    InsufficientCreditsError,# Out of credits
    OverloadedError,         # Server overloaded
    ServerError,             # Generic server error
)

try:
    result = await agent.call(str, "Do something")
except RateLimitError:
    await asyncio.sleep(60)
    result = await agent.call(str, "Do something")
except MaxTokensError:
    # Reduce scope or increase limits
    pass
except ContentFilteringError:
    # Content was filtered
    pass
except InferenceError as e:
    logger.error(f"Inference failed: {e}")
except AgenticaError as e:
    logger.error(f"SDK error: {e}")
```

### Custom Exceptions

```python
class DataValidationError(Exception):
    """Invalid input data."""
    pass

@agentic(DataValidationError)  # Pass exception type
async def analyze(data: str) -> dict:
    """
    Analyze data.

    Raises:
        DataValidationError: If data is malformed
    """
    ...

try:
    result = await analyze(raw_data)
except DataValidationError as e:
    logger.warning(f"Invalid: {e}")
```

## Multi-Agent Patterns

### Custom Agent Class

```python
from agentica.agent import Agent

class ResearchAgent:
    def __init__(self, web_search_fn):
        self._brain = Agent(
            premise="Research assistant.",
            scope={"web_search": web_search_fn}
        )

    async def research(self, topic: str) -> str:
        return await self._brain(str, f"Research: {topic}")

    async def summarize(self, text: str) -> str:
        return await self._brain(str, f"Summarize: {text}")
```

### Agent Orchestration

```python
class LeadResearcher:
    def __init__(self):
        self._brain = Agent(
            premise="Coordinate research across subagents.",
            scope={"SubAgent": ResearchAgent}
        )

    async def __call__(self, query: str) -> str:
        return await self._brain(str, query)

lead = LeadResearcher()
report = await lead("Research AI agent frameworks 2025")
```

## Tracing & Debugging

### OpenTelemetry Tracing

```python
from agentica import initialize_tracing

# Initialize tracing (returns TracerProvider)
tracer = initialize_tracing(
    service_name="my-agent-app",
    environment="development",  # Optional
    tempo_endpoint="http://localhost:4317",  # Optional: Grafana Tempo
    organization_id="my-org",  # Optional
    log_level="INFO",  # DEBUG, INFO, WARNING, ERROR
    instrument_httpx=False,  # Optional: trace HTTP calls
)
```

### SDK Debug Logging

```python
from agentica import enable_sdk_logging

# Enable internal SDK logs (for debugging the SDK itself)
disable_fn = enable_sdk_logging(log_tags="1")

# ... run agents ...

disable_fn()  # Disable when done
```

## Top-Level Exports

```python
# Main imports from agentica
from agentica import (
    # Core
    Agent,              # Synchronous agent class
    agentic,            # @agentic decorator
    spawn,              # Async agent creation

    # Configuration
    ModelStrings,       # Model string type hints
    AgenticFunction,    # Agentic function type

    # Token tracking
    last_usage,         # Get last call's token usage
    total_usage,        # Get cumulative token usage

    # Tracing/Logging
    initialize_tracing, # OpenTelemetry setup
    enable_sdk_logging, # SDK debug logs

    # Version
    __version__,        # "0.3.1"
)
```

## Checklist

Before using Agentica:
- [ ] Functions with `@agentic()` MUST be `async`
- [ ] `spawn()` returns awaitable - use `await spawn(...)`
- [ ] `agent.call()` is awaitable - use `await agent.call(...)`
- [ ] First arg to `call()` is return type, second is prompt string
- [ ] Use `persist=True` for conversation memory in `@agentic`
- [ ] Use `Agent()` (not `spawn()`) in synchronous `__init__`
- [ ] Document exceptions in docstrings for agent to raise them
- [ ] Import listeners from `agentica.logging.agent_listener` (NOT `agentica.logging`)
