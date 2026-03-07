# Agentica SDK Patterns

## SDK Integration Pattern

```python
from slack_sdk import WebClient
from agentica import agentic

slack = WebClient(token=SLACK_TOKEN)

@agentic(scope={
    'list_users': slack.users_list,
    'send_message': slack.chat_postMessage
})
async def team_notifier(message: str) -> None:
    """Send team notifications."""
    ...
```

## Custom Agent Class (for encapsulation)

```python
from agentica.agent import Agent

class ResearchAgent:
    def __init__(self, web_search_fn):
        # Agent() is synchronous — use in __init__, not spawn()
        self._brain = Agent(
            premise="Research assistant.",
            scope={"web_search": web_search_fn}
        )

    async def research(self, topic: str) -> str:
        return await self._brain(str, f"Research: {topic}")

    async def summarize(self, text: str) -> str:
        return await self._brain(str, f"Summarize: {text}")
```

## Agent Orchestration

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

## Custom Exception Pattern

```python
class DataValidationError(Exception):
    """Invalid input data."""
    pass

@agentic(DataValidationError)  # Pass exception type to decorator
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

## Error Handling with Retry

```python
from agentica.errors import RateLimitError, MaxTokensError, ContentFilteringError, InferenceError, AgenticaError
import asyncio

async def call_with_retry(agent, prompt):
    try:
        return await agent.call(str, prompt)
    except RateLimitError:
        await asyncio.sleep(60)
        return await agent.call(str, prompt)
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

## Chatbot with Persistence

```python
from agentica import agentic

@agentic(persist=True)
async def chatbot(message: str) -> str:
    """Remembers conversation history."""
    ...

await chatbot("My name is Alice")
result = await chatbot("What's my name?")  # Returns: knows "Alice"
```

## Scoped Tool Access Patterns

```python
from agentica import agentic, spawn

# Via decorator
@agentic(scope={'web_search': web_search_fn})
async def researcher(query: str) -> str:
    """Research a topic."""
    ...

# Via spawn
agent = await spawn(
    premise="Data analyzer",
    scope={"analyze": custom_analyzer}
)

# Per-call scope (inline data/tools)
result = await agent.call(
    dict[str, int],
    "Analyze the dataset",
    dataset=data,
    analyzer=custom_fn
)
```

## MCP Integration

```python
from agentica import spawn, agentic

# Via spawn
agent = await spawn(
    premise="Tool-using agent",
    mcp="path/to/mcp_config.json"
)

# Via decorator
@agentic(mcp="path/to/mcp_config.json")
async def tool_user(query: str) -> str:
    """Uses MCP tools."""
    ...
```
