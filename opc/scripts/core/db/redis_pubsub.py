"""Redis pub/sub module for agent coordination.

Provides publish/subscribe for inter-agent messaging.
Uses channel patterns for agent inbox, swarm events, and heartbeats.

Usage:
    from scripts.core.db.redis_pubsub import pubsub, SWARM_EVENTS
    await pubsub.publish(SWARM_EVENTS.format(id="swarm1"), {"type": "checkpoint"})
"""

import asyncio
import json
import os
from typing import Any, Callable

import redis.asyncio as redis

# Channel patterns
AGENT_INBOX = "agent:{id}:inbox"
SWARM_EVENTS = "swarm:{id}:events"
SESSION_HEARTBEAT = "session:{id}:heartbeat"
BLACKBOARD_CHANNEL = "blackboard"


class RedisPubSub:
    """Redis pub/sub wrapper for agent coordination."""

    def __init__(self, client: redis.Redis | None = None):
        """Initialize pub/sub with optional client.

        Args:
            client: Redis client instance (created if None)
        """
        self._client = client
        self._pubsub: redis.client.PubSub | None = None
        self._listener_task: asyncio.Task | None = None
        self._running = False

    async def _get_client(self) -> redis.Redis:
        """Get Redis client."""
        if self._client is None:
            from scripts.core.db.redis_client import get_redis
            self._client = await get_redis()
        return self._client

    async def publish(self, channel: str, message: dict[str, Any]) -> int:
        """Publish message to channel.

        Args:
            channel: Channel name
            message: Message dict to serialize as JSON

        Returns:
            Number of subscribers that received the message
        """
        client = await self._get_client()
        return await client.publish(channel, json.dumps(message))

    async def subscribe(
        self, channel: str, callback: Callable[[str, dict], None]
    ) -> None:
        """Subscribe to channel with callback.

        Args:
            channel: Channel name
            callback: Async function(channel, message)
        """
        client = await self._get_client()
        self._pubsub = client.pubsub()
        await self._pubsub.subscribe(channel)
        self._running = True
        self._listener_task = asyncio.create_task(self._listen(channel, callback))

    async def _listen(
        self, channel: str, callback: Callable[[str, dict], None]
    ) -> None:
        """Listen for messages on channel."""
        if self._pubsub is None:
            return

        try:
            async for message in self._pubsub.listen():
                if not self._running:
                    break
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    await callback(channel, data)
        except asyncio.CancelledError:
            pass

    async def unsubscribe(self) -> None:
        """Unsubscribe and stop listening."""
        self._running = False
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
        if self._pubsub:
            await self._pubsub.unsubscribe()
            await self._pubsub.close()
            self._pubsub = None


# Global pubsub instance
pubsub = RedisPubSub()
