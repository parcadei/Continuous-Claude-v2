"""StreamMonitor - Real-time monitoring of Claude agent output streams.

Parses stream-json events from agent stdout and:
- Pushes events to Redis (hot cache, 24h TTL)
- Detects stuck agents (same tool 5+ times)
- Tracks turn usage for auto-continue decisions
- Supports background PostgreSQL persistence

See docs/cli-native-agent-architecture.md Section 8 for full spec.
"""

import asyncio
import json
import logging
import subprocess
import threading
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# Redis TTL for hot events
REDIS_EVENT_TTL = 24 * 60 * 60  # 24 hours

# Stuck detection thresholds
CONSECUTIVE_TOOL_THRESHOLD = 5
CONSECUTIVE_THINKING_THRESHOLD = 5


@dataclass
class StreamEvent:
    """Parsed event from Claude stream-json output."""

    event_type: str  # "thinking", "tool_use", "tool_result", "text", "error"
    timestamp: str
    data: dict[str, Any]
    turn_number: int = 0

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "event_type": self.event_type,
            "timestamp": self.timestamp,
            "data": self.data,
            "turn_number": self.turn_number,
        }


@dataclass
class MonitorState:
    """Internal state for a monitored agent."""

    agent_id: str
    events: list[StreamEvent] = field(default_factory=list)
    turn_count: int = 0
    consecutive_tool_calls: list[str] = field(default_factory=list)
    consecutive_thinking: int = 0
    is_stuck: bool = False
    stuck_reason: str | None = None
    started_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    completed_at: str | None = None
    exit_code: int | None = None


class StreamMonitor:
    """Monitor Claude agent stream-json output in real-time.

    Usage:
        monitor = StreamMonitor(agent_id="abc123")
        monitor.start(process)  # Start monitoring in background

        # Check status
        if monitor.is_stuck:
            print(f"Stuck: {monitor.stuck_reason}")

        # Get events
        events = monitor.get_events()
    """

    def __init__(
        self,
        agent_id: str,
        redis_client: Any | None = None,
        on_event: Callable[[StreamEvent], None] | None = None,
        on_stuck: Callable[[str], None] | None = None,
    ):
        """Initialize StreamMonitor.

        Args:
            agent_id: Unique identifier for the agent being monitored.
            redis_client: Optional Redis client for hot event storage.
            on_event: Optional callback for each event.
            on_stuck: Optional callback when agent is detected as stuck.
        """
        self.agent_id = agent_id
        self.redis_client = redis_client
        self.on_event = on_event
        self.on_stuck = on_stuck

        self._state = MonitorState(agent_id=agent_id)
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

    @property
    def is_stuck(self) -> bool:
        """Check if agent is detected as stuck."""
        with self._lock:
            return self._state.is_stuck

    @property
    def stuck_reason(self) -> str | None:
        """Get reason for stuck detection."""
        with self._lock:
            return self._state.stuck_reason

    @property
    def turn_count(self) -> int:
        """Get current turn count."""
        with self._lock:
            return self._state.turn_count

    @property
    def event_count(self) -> int:
        """Get total event count."""
        with self._lock:
            return len(self._state.events)

    def get_events(self, limit: int | None = None) -> list[dict]:
        """Get events (most recent first if limit specified).

        Args:
            limit: Optional limit on number of events to return.

        Returns:
            List of event dictionaries.
        """
        with self._lock:
            events = [e.to_dict() for e in self._state.events]
            if limit:
                return events[-limit:]
            return events

    def start(self, process: subprocess.Popen) -> None:
        """Start monitoring a process's stdout in background thread.

        Args:
            process: Popen process with stream-json stdout.
        """
        if self._thread is not None:
            raise RuntimeError("Monitor already started")

        self._thread = threading.Thread(
            target=self._monitor_loop,
            args=(process,),
            daemon=True,
        )
        self._thread.start()

    def stop(self, timeout: float = 5.0) -> None:
        """Stop monitoring.

        Args:
            timeout: Seconds to wait for thread to finish.
        """
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=timeout)

    def _monitor_loop(self, process: subprocess.Popen) -> None:
        """Background thread loop for monitoring process output."""
        try:
            # Read from process stdout line by line
            for line in iter(process.stdout.readline, b""):
                if self._stop_event.is_set():
                    break

                if not line:
                    continue

                # Handle both bytes and str
                if isinstance(line, bytes):
                    line = line.decode("utf-8", errors="replace")

                line = line.strip()
                if not line:
                    continue

                try:
                    event = self._parse_event(line)
                    if event:
                        self._process_event(event)
                except json.JSONDecodeError:
                    logger.debug(f"Non-JSON line: {line[:100]}")
                except Exception as e:
                    logger.warning(f"Error processing event: {e}")

            # Process completed
            process.wait()
            with self._lock:
                self._state.exit_code = process.returncode
                self._state.completed_at = datetime.now(UTC).isoformat()

        except Exception as e:
            logger.error(f"Monitor loop error: {e}")

    def _parse_event(self, line: str) -> StreamEvent | None:
        """Parse a stream-json line into a StreamEvent.

        Args:
            line: JSON line from stream output.

        Returns:
            StreamEvent or None if not a valid event.
        """
        data = json.loads(line)

        # Determine event type from structure
        event_type = "unknown"
        if "thinking" in data or data.get("type") == "thinking":
            event_type = "thinking"
        elif "tool_use" in data or data.get("type") == "tool_use":
            event_type = "tool_use"
        elif "tool_result" in data or data.get("type") == "tool_result":
            event_type = "tool_result"
        elif "text" in data or data.get("type") == "text":
            event_type = "text"
        elif "error" in data or data.get("type") == "error":
            event_type = "error"
        elif data.get("type") == "result":
            event_type = "result"

        return StreamEvent(
            event_type=event_type,
            timestamp=datetime.now(UTC).isoformat(),
            data=data,
            turn_number=self._state.turn_count,
        )

    def _process_event(self, event: StreamEvent) -> None:
        """Process a parsed event - update state, detect stuck, push to Redis.

        Args:
            event: Parsed stream event.
        """
        with self._lock:
            # Add to event list
            self._state.events.append(event)

            # Update turn count on tool results (indicates turn completion)
            if event.event_type == "tool_result":
                self._state.turn_count += 1

            # Track consecutive tool calls for stuck detection
            if event.event_type == "tool_use":
                tool_name = event.data.get("tool", event.data.get("name", "unknown"))
                self._state.consecutive_tool_calls.append(tool_name)
                self._state.consecutive_thinking = 0

                # Check for stuck (same tool 5+ times)
                if len(self._state.consecutive_tool_calls) >= CONSECUTIVE_TOOL_THRESHOLD:
                    recent = self._state.consecutive_tool_calls[-CONSECUTIVE_TOOL_THRESHOLD:]
                    if len(set(recent)) == 1:
                        self._state.is_stuck = True
                        self._state.stuck_reason = (
                            f"Same tool '{recent[0]}' called {CONSECUTIVE_TOOL_THRESHOLD}+ times"
                        )
                        if self.on_stuck:
                            self.on_stuck(self._state.stuck_reason)

            elif event.event_type == "thinking":
                self._state.consecutive_thinking += 1

                # Check for stuck (thinking 5+ times in a row)
                if self._state.consecutive_thinking >= CONSECUTIVE_THINKING_THRESHOLD:
                    self._state.is_stuck = True
                    self._state.stuck_reason = (
                        f"Agent stuck in thinking ({CONSECUTIVE_THINKING_THRESHOLD}+ consecutive)"
                    )
                    if self.on_stuck:
                        self.on_stuck(self._state.stuck_reason)

            else:
                # Reset consecutive counters on other event types
                self._state.consecutive_tool_calls = []
                self._state.consecutive_thinking = 0

        # Push to Redis if available
        if self.redis_client:
            try:
                key = f"agent:{self.agent_id}:events"
                self.redis_client.lpush(key, json.dumps(event.to_dict()))
                self.redis_client.expire(key, REDIS_EVENT_TTL)
            except Exception as e:
                logger.warning(f"Redis push failed: {e}")

        # Call event callback
        if self.on_event:
            try:
                self.on_event(event)
            except Exception as e:
                logger.warning(f"Event callback error: {e}")

    def get_summary(self) -> dict:
        """Get summary of monitored agent.

        Returns:
            Dictionary with monitoring summary.
        """
        with self._lock:
            return {
                "agent_id": self.agent_id,
                "event_count": len(self._state.events),
                "turn_count": self._state.turn_count,
                "is_stuck": self._state.is_stuck,
                "stuck_reason": self._state.stuck_reason,
                "started_at": self._state.started_at,
                "completed_at": self._state.completed_at,
                "exit_code": self._state.exit_code,
            }


async def monitor_agent_async(
    agent_id: str,
    output_file: str,
    redis_client: Any | None = None,
) -> MonitorState:
    """Async version that monitors an agent's output file.

    Args:
        agent_id: Agent identifier.
        output_file: Path to agent's stream-json output file.
        redis_client: Optional Redis client.

    Returns:
        Final MonitorState after completion.
    """
    state = MonitorState(agent_id=agent_id)

    # Wait for file to exist
    path = Path(output_file)
    while not path.exists():
        await asyncio.sleep(0.1)

    # Tail the file
    with open(output_file) as f:
        while True:
            line = f.readline()
            if not line:
                # Check if process is still running
                await asyncio.sleep(0.1)
                continue

            line = line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)
                event_type = "unknown"
                if "thinking" in data or data.get("type") == "thinking":
                    event_type = "thinking"
                elif "tool_use" in data or data.get("type") == "tool_use":
                    event_type = "tool_use"
                elif "tool_result" in data or data.get("type") == "tool_result":
                    event_type = "tool_result"

                event = StreamEvent(
                    event_type=event_type,
                    timestamp=datetime.now(UTC).isoformat(),
                    data=data,
                    turn_number=state.turn_count,
                )
                state.events.append(event)

                if event_type == "tool_result":
                    state.turn_count += 1

            except json.JSONDecodeError:
                pass

            # Check for completion
            if data.get("type") == "result":
                break

    state.completed_at = datetime.now(UTC).isoformat()
    return state
