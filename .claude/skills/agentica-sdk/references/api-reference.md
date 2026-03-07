# Agentica SDK API Reference (v0.3.1)

## Top-Level Exports

```python
from agentica import (
    # Core
    Agent,              # Synchronous agent class
    agentic,            # @agentic decorator
    spawn,              # Async agent creation

    # Configuration
    ModelStrings,       # Model string type hints
    AgenticFunction,    # Agentic function type
    MaxTokens,          # Token limit config

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

## Available Models

```python
# OpenAI
"openai:gpt-3.5-turbo"
"openai:gpt-4o"
"openai:gpt-4.1"          # Default
"openai:gpt-5"

# Anthropic
"anthropic:claude-sonnet-4"
"anthropic:claude-opus-4.1"
"anthropic:claude-sonnet-4.5"
"anthropic:claude-opus-4.5"

# Any OpenRouter slug (e.g., "google/gemini-2.5-flash")
```

## spawn() Parameters

```python
agent = await spawn(
    premise="Adds to default system prompt",   # str, optional
    system="Replaces default system prompt",    # str, optional
    model="openai:gpt-4.1",                    # str, optional
    scope={"tool_name": tool_fn},              # dict, optional
    mcp="path/to/mcp_config.json",             # str, optional
    max_tokens=500,                             # int or MaxTokens, optional
    persist=False,                              # bool, optional
    listener=StandardListener,                  # listener class, optional
)
```

## MaxTokens Configuration

```python
from agentica import MaxTokens

agent = await spawn(
    premise="Controlled output",
    max_tokens=MaxTokens(
        per_invocation=5000,  # Total across all rounds
        per_round=1000,       # Per inference round
        rounds=5              # Max inference rounds
    )
)
```

## agent.call() Signature

```python
# Return type variants
result: str = await agent.call("prompt")                      # default str
result: int = await agent.call(int, "prompt")                 # typed
result: dict = await agent.call(dict[str, int], "prompt")     # generic
await agent.call(None, "prompt")                              # side-effects only

# With per-call scope
result = await agent.call(
    dict[str, int],
    "Analyze the dataset",
    dataset=data,       # Available as 'dataset' in scope
    analyzer=custom_fn  # Available as 'analyzer' in scope
)
```

## Token Usage Tracking

```python
from agentica import spawn, last_usage, total_usage

agent = await spawn(premise="You are helpful.")
await agent.call(str, "Hello!")

usage = agent.last_usage()   # TokenUsage for last call
usage = agent.total_usage()  # TokenUsage cumulative

# Fields: usage.input_tokens, usage.output_tokens, usage.total_tokens

# For @agentic functions
from agentica import agentic, last_usage, total_usage

@agentic()
async def my_fn(x: str) -> str: ...

await my_fn("test")
print(last_usage(my_fn))
print(total_usage(my_fn))
```

## Error Types

```python
from agentica.errors import (
    AgenticaError,            # Base for all SDK errors
    RateLimitError,           # Rate limiting
    InferenceError,           # HTTP errors from inference
    MaxTokensError,           # Token limit exceeded
    MaxRoundsError,           # Max inference rounds exceeded
    ContentFilteringError,    # Content filtered by provider
    APIConnectionError,       # Network issues
    APITimeoutError,          # Request timeout
    InsufficientCreditsError, # Out of credits
    OverloadedError,          # Server overloaded
    ServerError,              # Generic server error
)
```

## Logging API

### Contextual Loggers (Context Managers)

```python
from agentica.logging.loggers import FileLogger, PrintLogger, StreamLogger
from agentica.logging.agent_logger import NoLogging

with FileLogger():    # File only
    agent = await spawn(...)

with NoLogging():     # Silent
    agent = await spawn(...)
```

### Per-Agent Listeners

```python
# Import from agent_listener submodule (NOT agentica.logging)
from agentica.logging.agent_listener import (
    PrintOnlyListener,  # Console output only
    FileOnlyListener,   # File logging only
    StandardListener,   # Both console + file (default)
    NoopListener,       # Silent
)

agent = await spawn(premise="...", listener=NoopListener)
```

### Global Listener Config

```python
from agentica.logging.agent_listener import (
    set_default_agent_listener,
    get_default_agent_listener,
)

set_default_agent_listener(PrintOnlyListener)
set_default_agent_listener(None)  # Disable all
```

### Default Logging Behavior
- Prints to stdout with colors
- Writes to `./logs/agent-<id>.log`

## OpenTelemetry Tracing

```python
from agentica import initialize_tracing

tracer = initialize_tracing(
    service_name="my-agent-app",
    environment="development",         # Optional
    tempo_endpoint="http://localhost:4317",  # Optional: Grafana Tempo
    organization_id="my-org",          # Optional
    log_level="INFO",                  # DEBUG, INFO, WARNING, ERROR
    instrument_httpx=False,            # Optional: trace HTTP calls
)
```

### SDK Debug Logging

```python
from agentica import enable_sdk_logging

disable_fn = enable_sdk_logging(log_tags="1")
# ... run agents ...
disable_fn()  # Disable when done
```

## MCP Config File Format

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

## Streaming

```python
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
    # chunk.role: 'user', 'agent', or 'system'

final = await result  # Then await result
```
