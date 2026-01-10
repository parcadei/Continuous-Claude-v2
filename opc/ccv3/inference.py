"""Fireworks AI + NVIDIA Nemotron Inference.

Multi-provider inference with intelligent routing:
- planning/cheap tasks → nemotron-nano (fast, cheap)
- patching/strong tasks → qwen or llama (more capable)
- Default: Fireworks AI OpenAI-compatible API

Sponsors: Fireworks AI, NVIDIA Nemotron
Docs:
    - https://docs.fireworks.ai/
    - https://fireworks.ai/models/nemotron

Usage:
    llm = InferenceLLM()

    # Auto-select model based on task
    response = await llm.chat("Plan this feature", task="planning")
    response = await llm.chat("Write the code", task="coding")

    # With function calling
    response = await llm.chat(
        "What's the weather?",
        tools=[weather_tool],
    )
"""

import os
import json
from typing import Any, Literal

import httpx


# Task → Model mapping (PRD Section 3.2)
# OPTIMIZED FOR COST - using minimax-m2p1 as default cheap model
TaskType = Literal["planning", "analysis", "coding", "patching", "cheap", "strong"]

TASK_MODEL_MAP: dict[TaskType, str] = {
    "planning": "accounts/fireworks/models/minimax-m2p1",         # CHEAPEST - use for planning
    "analysis": "accounts/fireworks/models/minimax-m2p1",         # CHEAPEST - use for analysis
    "coding": "accounts/fireworks/models/minimax-m2p1",           # CHEAPEST - for hackathon demo
    "patching": "accounts/fireworks/models/minimax-m2p1",         # CHEAPEST - for hackathon demo
    "cheap": "accounts/fireworks/models/minimax-m2p1",            # CHEAPEST - explicit cheap
    "strong": "accounts/fireworks/models/llama-v3p1-70b-instruct",  # Only use when really needed
}

# Default model - CHEAPEST for hackathon
DEFAULT_MODEL = "accounts/fireworks/models/minimax-m2p1"


class InferenceLLM:
    """Fireworks AI inference with NVIDIA Nemotron routing.

    Features:
    - OpenAI-compatible API
    - Function calling support
    - Task-based model routing
    - Streaming support
    """

    API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"

    def __init__(
        self,
        api_key: str | None = None,
        default_model: str | None = None,
    ):
        self.api_key = api_key or os.environ.get("FIREWORKS_API_KEY")
        self.default_model = default_model or DEFAULT_MODEL
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=120.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    def _select_model(self, task: TaskType | None = None, model: str | None = None) -> str:
        """Select model based on task or explicit override."""
        if model:
            return model
        if task and task in TASK_MODEL_MAP:
            return TASK_MODEL_MAP[task]
        return self.default_model

    async def chat(
        self,
        message: str,
        *,
        system: str | None = None,
        task: TaskType | None = None,
        model: str | None = None,
        tools: list[dict] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Chat completion with optional tool calling.

        Args:
            message: User message
            system: System prompt
            task: Task type for model routing
            model: Override model selection
            tools: List of tools for function calling
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response

        Returns:
            Assistant response text
        """
        if not self.api_key:
            raise ValueError("Set FIREWORKS_API_KEY environment variable")

        selected_model = self._select_model(task, model)
        client = await self._get_client()

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": message})

        payload: dict[str, Any] = {
            "model": selected_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        response = await client.post(
            self.API_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()

        data = response.json()
        choice = data["choices"][0]

        # Handle tool calls
        if choice.get("message", {}).get("tool_calls"):
            return json.dumps(choice["message"]["tool_calls"])

        return choice["message"]["content"]

    async def chat_with_history(
        self,
        messages: list[dict],
        *,
        task: TaskType | None = None,
        model: str | None = None,
        tools: list[dict] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> dict:
        """Chat with full message history.

        Returns the complete response dict including tool calls.
        """
        if not self.api_key:
            raise ValueError("Set FIREWORKS_API_KEY environment variable")

        selected_model = self._select_model(task, model)
        client = await self._get_client()

        payload: dict[str, Any] = {
            "model": selected_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        response = await client.post(
            self.API_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["message"]

    async def complete(
        self,
        prompt: str,
        *,
        task: TaskType | None = None,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stop: list[str] | None = None,
    ) -> str:
        """Simple completion without chat format."""
        if not self.api_key:
            raise ValueError("Set FIREWORKS_API_KEY environment variable")

        selected_model = self._select_model(task, model)
        client = await self._get_client()

        # Use completions endpoint for raw prompts
        response = await client.post(
            "https://api.fireworks.ai/inference/v1/completions",
            json={
                "model": selected_model,
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stop": stop,
            },
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()

        data = response.json()
        return data["choices"][0]["text"]


class NemotronLLM:
    """Direct NVIDIA Nemotron access via Fireworks.

    Nemotron models are optimized for:
    - Fast inference (planning, cheap tasks)
    - Instruction following
    - Cost efficiency
    """

    # Nemotron models on Fireworks
    MODELS = {
        "nano": "accounts/nvidia/models/nemotron-3-8b-chat-v1",      # 8B, fast
        "mini": "accounts/nvidia/models/nemotron-3-8b-chat-v1",      # Same as nano currently
    }

    def __init__(self, model: str = "nano"):
        self._llm = InferenceLLM(default_model=self.MODELS.get(model, self.MODELS["nano"]))

    async def chat(self, message: str, **kwargs) -> str:
        return await self._llm.chat(message, **kwargs)

    async def close(self):
        await self._llm.close()


class InferenceRouter:
    """Routes to the best model based on task type.

    Usage:
        router = InferenceRouter()
        response = await router.route("plan feature", task="planning")
        response = await router.route("fix bug", task="patching")
    """

    def __init__(self):
        self._llm = InferenceLLM()

    async def route(
        self,
        message: str,
        *,
        task: TaskType = "strong",
        system: str | None = None,
        **kwargs,
    ) -> str:
        """Route message to appropriate model based on task."""
        return await self._llm.chat(message, task=task, system=system, **kwargs)

    async def plan(self, message: str, **kwargs) -> str:
        """Use cheap/fast model for planning."""
        return await self.route(message, task="planning", **kwargs)

    async def code(self, message: str, **kwargs) -> str:
        """Use strong model for coding."""
        return await self.route(message, task="coding", **kwargs)

    async def patch(self, message: str, **kwargs) -> str:
        """Use strong model for patching."""
        return await self.route(message, task="patching", **kwargs)

    async def analyze(self, message: str, **kwargs) -> str:
        """Use strong model for analysis."""
        return await self.route(message, task="analysis", **kwargs)

    async def close(self):
        await self._llm.close()


# Function calling helpers
def create_tool(
    name: str,
    description: str,
    parameters: dict,
) -> dict:
    """Create a tool definition for function calling."""
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": parameters,
        },
    }


# Example tool definitions (from PRD)
EXAMPLE_TOOLS = [
    create_tool(
        "read_file",
        "Read the contents of a file",
        {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the file"},
            },
            "required": ["path"],
        },
    ),
    create_tool(
        "write_file",
        "Write content to a file",
        {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path to the file"},
                "content": {"type": "string", "description": "Content to write"},
            },
            "required": ["path", "content"],
        },
    ),
    create_tool(
        "search_code",
        "Search for code in the repository",
        {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "file_pattern": {"type": "string", "description": "Glob pattern for files"},
            },
            "required": ["query"],
        },
    ),
]
