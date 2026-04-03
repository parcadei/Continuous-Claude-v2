/**
 * Unified Event-Driven Pattern Handlers
 *
 * Implements event-driven coordination logic for pub/sub messaging:
 * - onSubagentStart: Register subscriber with event types
 * - onSubagentStop: Unsubscribe and clean up event subscriptions
 * - onPreToolUse: Inject pending events for subscribers
 * - onPostToolUse: Capture published events from publishers
 * - onStop: Provide event bus summary
 *
 * Environment Variables:
 * - EVENT_BUS_ID: Event bus identifier (required for event-driven operations)
 * - AGENT_ROLE: Role of this agent ('publisher' or 'subscriber')
 * - SUBSCRIBER_EVENT_TYPES: JSON array of event types for subscribers
 * - CLAUDE_PROJECT_DIR: Project directory for DB path
 */

import { existsSync } from "fs";

// Import shared utilities
import { getDbPath, runPythonQuery, isValidId } from "../shared/db-utils.js";
import type {
  SubagentStartInput,
  SubagentStopInput,
  PreToolUseInput,
  PostToolUseInput,
  StopInput,
  HookOutput,
} from "../shared/types.js";

// Re-export types for convenience
export type {
  SubagentStartInput,
  SubagentStopInput,
  PreToolUseInput,
  PostToolUseInput,
  StopInput,
  HookOutput,
};

// =============================================================================
// onSubagentStart Handler
// =============================================================================

/**
 * Handles SubagentStart hook for event-driven pattern.
 * Registers subscriber with event types in database.
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(
  input: SubagentStartInput,
): Promise<HookOutput> {
  const busId = process.env.EVENT_BUS_ID;

  // If no EVENT_BUS_ID, continue silently (not in an event-driven pattern)
  if (!busId) {
    return { result: "continue" };
  }

  // Validate EVENT_BUS_ID format
  if (!isValidId(busId)) {
    return { result: "continue" };
  }

  const agentRole = process.env.AGENT_ROLE;
  const agentId = input.agent_id ?? "unknown";

  // Validate agent_id format
  if (!isValidId(agentId)) {
    return { result: "continue" };
  }

  // Only register subscriptions for subscriber agents
  if (agentRole !== "subscriber") {
    return { result: "continue" };
  }

  const eventTypesJson = process.env.SUBSCRIBER_EVENT_TYPES;
  if (!eventTypesJson) {
    return { result: "continue" };
  }

  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Register subscription in database
    const query = `
import sqlite3
import json
import sys
from datetime import datetime
from uuid import uuid4

db_path = sys.argv[1]
bus_id = sys.argv[2]
agent_id = sys.argv[3]
event_types_json = sys.argv[4]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS event_subscriptions (
        id TEXT PRIMARY KEY,
        bus_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        event_types TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
''')

# Insert subscription
subscription_id = str(uuid4())
conn.execute('''
    INSERT INTO event_subscriptions (id, bus_id, agent_id, event_types, created_at)
    VALUES (?, ?, ?, ?, ?)
''', (subscription_id, bus_id, agent_id, event_types_json, datetime.now().isoformat()))
conn.commit()
conn.close()

print(json.dumps({'subscription_id': subscription_id}))
`;

    const result = runPythonQuery(query, [
      dbPath,
      busId,
      agentId,
      eventTypesJson,
    ]);

    if (!result.success) {
      console.error("SubagentStart Python error:", result.stderr);
      return { result: "continue" };
    }

    // Parse event types for display
    let eventTypes: string[];
    try {
      eventTypes = JSON.parse(eventTypesJson);
    } catch {
      eventTypes = [];
    }

    console.error(
      `[event-driven] Subscribed agent ${agentId} to events: ${eventTypes.join(", ")}`,
    );

    return {
      result: "continue",
      message: `Subscribed to event types: ${eventTypes.join(", ")}`,
    };
  } catch (err) {
    console.error("SubagentStart hook error:", err);
    return { result: "continue" };
  }
}

// =============================================================================
// onSubagentStop Handler
// =============================================================================

/**
 * Handles SubagentStop hook for event-driven pattern.
 * Removes subscription from database.
 */
export async function onSubagentStop(
  input: SubagentStopInput,
): Promise<HookOutput> {
  const busId = process.env.EVENT_BUS_ID;

  // If no EVENT_BUS_ID, continue silently
  if (!busId) {
    return { result: "continue" };
  }

  // Validate EVENT_BUS_ID format
  if (!isValidId(busId)) {
    return { result: "continue" };
  }

  const agentRole = process.env.AGENT_ROLE;
  const agentId = input.agent_id ?? "unknown";

  // Validate agent_id format
  if (!isValidId(agentId)) {
    return { result: "continue" };
  }

  // Only remove subscriptions for subscriber agents
  if (agentRole !== "subscriber") {
    return { result: "continue" };
  }

  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Remove subscription from database
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
bus_id = sys.argv[2]
agent_id = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Delete subscription
conn.execute('''
    DELETE FROM event_subscriptions
    WHERE bus_id = ? AND agent_id = ?
''', (bus_id, agent_id))
conn.commit()

deleted = conn.total_changes
conn.close()

print(json.dumps({'deleted': deleted}))
`;

    const result = runPythonQuery(query, [dbPath, busId, agentId]);

    if (!result.success) {
      console.error("SubagentStop Python error:", result.stderr);
      return { result: "continue" };
    }

    console.error(`[event-driven] Unsubscribed agent ${agentId}`);

    return { result: "continue" };
  } catch (err) {
    console.error("SubagentStop hook error:", err);
    return { result: "continue" };
  }
}

// =============================================================================
// onPreToolUse Handler
// =============================================================================

/**
 * Handles PreToolUse hook for event-driven pattern.
 * Injects pending events that match subscriber's event types.
 */
export async function onPreToolUse(
  input: PreToolUseInput,
): Promise<HookOutput> {
  const busId = process.env.EVENT_BUS_ID;

  // If no EVENT_BUS_ID, continue silently
  if (!busId) {
    return { result: "continue" };
  }

  // Validate EVENT_BUS_ID format
  if (!isValidId(busId)) {
    return { result: "continue" };
  }

  const agentRole = process.env.AGENT_ROLE;

  // Only inject events for subscriber agents
  if (agentRole !== "subscriber") {
    return { result: "continue" };
  }

  const eventTypesJson = process.env.SUBSCRIBER_EVENT_TYPES;
  if (!eventTypesJson) {
    return { result: "continue" };
  }

  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Query pending events that match subscriber's types
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
bus_id = sys.argv[2]
event_types_json = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Parse event types
event_types = json.loads(event_types_json)

# Build query for matching events
if '*' in event_types:
    # Wildcard: get all events
    cursor = conn.execute('''
        SELECT event_type, payload, published_by, created_at
        FROM event_queue
        WHERE bus_id = ?
        ORDER BY created_at ASC
        LIMIT 10
    ''', (bus_id,))
else:
    # Specific types: filter by event_type
    placeholders = ','.join(['?'] * len(event_types))
    query = f'''
        SELECT event_type, payload, published_by, created_at
        FROM event_queue
        WHERE bus_id = ? AND event_type IN ({placeholders})
        ORDER BY created_at ASC
        LIMIT 10
    '''
    cursor = conn.execute(query, [bus_id] + event_types)

events = []
for row in cursor.fetchall():
    events.append({
        'type': row[0],
        'payload': json.loads(row[1]) if row[1] else {},
        'published_by': row[2],
        'created_at': row[3]
    })

conn.close()
print(json.dumps({'events': events, 'count': len(events)}))
`;

    const result = runPythonQuery(query, [dbPath, busId, eventTypesJson]);

    if (!result.success) {
      console.error("PreToolUse Python error:", result.stderr);
      return { result: "continue" };
    }

    // Parse Python output
    let data: {
      events: Array<{
        type: string;
        payload: any;
        published_by: string;
        created_at: string;
      }>;
      count: number;
    };
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }

    if (data.count === 0) {
      return { result: "continue" };
    }

    // Inject pending events as context
    let message = `PENDING EVENTS (${data.count} total):\n\n`;
    for (const evt of data.events) {
      message += `Event: ${evt.type}\n`;
      message += `Payload: ${JSON.stringify(evt.payload)}\n`;
      message += `Published by: ${evt.published_by}\n`;
      message += `Time: ${evt.created_at}\n\n`;
    }
    message += "Process these events according to your subscription.";

    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("PreToolUse hook error:", err);
    return { result: "continue" };
  }
}

// =============================================================================
// onPostToolUse Handler
// =============================================================================

/**
 * Handles PostToolUse hook for event-driven pattern.
 * Captures published events from publisher agents.
 *
 * NOTE: Currently a no-op. Event publishing should be done explicitly
 * by the pattern implementation, not inferred from tool usage.
 */
export async function onPostToolUse(
  input: PostToolUseInput,
): Promise<HookOutput> {
  // No automatic event capture - events should be published explicitly
  return { result: "continue" };
}

// =============================================================================
// onStop Handler
// =============================================================================

/**
 * Handles Stop hook for event-driven pattern.
 * Provides event bus summary with subscription and event counts.
 */
export async function onStop(input: StopInput): Promise<HookOutput> {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }

  const busId = process.env.EVENT_BUS_ID;

  if (!busId) {
    return { result: "continue" };
  }

  // Validate EVENT_BUS_ID format
  if (!isValidId(busId)) {
    return { result: "continue" };
  }

  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Query event bus statistics
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
bus_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Count subscriptions
cursor = conn.execute('''
    SELECT COUNT(*) FROM event_subscriptions WHERE bus_id = ?
''', (bus_id,))
subscription_count = cursor.fetchone()[0]

# Count pending events
cursor = conn.execute('''
    SELECT COUNT(*) FROM event_queue WHERE bus_id = ?
''', (bus_id,))
event_count = cursor.fetchone()[0]

# Get event type distribution
cursor = conn.execute('''
    SELECT event_type, COUNT(*) as count
    FROM event_queue
    WHERE bus_id = ?
    GROUP BY event_type
''', (bus_id,))
event_types = [{'type': row[0], 'count': row[1]} for row in cursor.fetchall()]

conn.close()
print(json.dumps({
    'subscriptions': subscription_count,
    'pending_events': event_count,
    'event_types': event_types
}))
`;

    const result = runPythonQuery(query, [dbPath, busId]);

    if (!result.success) {
      return { result: "continue" };
    }

    // Parse Python output
    let data: {
      subscriptions: number;
      pending_events: number;
      event_types: Array<{ type: string; count: number }>;
    };
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }

    // Provide event bus summary
    let message = `EVENT BUS SUMMARY:\n\n`;
    message += `Active Subscriptions: ${data.subscriptions}\n`;
    message += `Pending Events: ${data.pending_events}\n\n`;

    if (data.event_types.length > 0) {
      message += "Event Type Distribution:\n";
      for (const et of data.event_types) {
        message += `- ${et.type}: ${et.count} event(s)\n`;
      }
    }

    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}
