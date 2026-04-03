// src/stop-coordinator.ts
import { readFileSync, existsSync as existsSync11 } from "fs";

// src/shared/pattern-router.ts
function detectPattern() {
  const pattern = process.env.PATTERN_TYPE;
  if (!pattern) return null;
  return pattern;
}
var SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
function isValidId(id) {
  return SAFE_ID_PATTERN.test(id);
}

// src/shared/db-utils.ts
import { spawnSync } from "child_process";
import { join } from "path";
function getDbPath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return join(
    projectDir,
    ".claude",
    "cache",
    "agentica-coordination",
    "coordination.db",
  );
}
function runPythonQuery(script, args) {
  try {
    const result = spawnSync("python3", ["-c", script, ...args], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
    return {
      success: result.status === 0,
      stdout: result.stdout?.trim() || "",
      stderr: result.stderr || "",
    };
  } catch (err) {
    return {
      success: false,
      stdout: "",
      stderr: String(err),
    };
  }
}

// src/patterns/swarm.ts
import { existsSync } from "fs";
async function onStop(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const swarmId = process.env.SWARM_ID;
  if (!swarmId) {
    return { result: "continue" };
  }
  if (!isValidId(swarmId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
swarm_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Count agents that have broadcast "done" - these have completed their work
cursor = conn.execute('''
    SELECT COUNT(DISTINCT sender_agent) as done_count
    FROM broadcasts
    WHERE swarm_id = ? AND broadcast_type = 'done'
''', (swarm_id,))
done_count = cursor.fetchone()[0]

# Count total agents - any agent that has ever broadcast anything in this swarm
cursor = conn.execute('''
    SELECT COUNT(DISTINCT sender_agent) as total_count
    FROM broadcasts
    WHERE swarm_id = ?
''', (swarm_id,))
total_count = cursor.fetchone()[0]

conn.close()
print(json.dumps({'done': done_count, 'total': total_count}))
`;
    const result = runPythonQuery(query, [dbPath, swarmId]);
    if (!result.success) {
      return { result: "continue" };
    }
    let counts;
    try {
      counts = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (counts.done < counts.total) {
      const waiting = counts.total - counts.done;
      return {
        result: "block",
        message: `Waiting for ${waiting} agent(s) to complete. Synthesize results when all agents broadcast 'done'.`,
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/jury.ts
import { existsSync as existsSync2 } from "fs";
async function onStop2(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const juryId = process.env.JURY_ID;
  if (!juryId) {
    return { result: "continue" };
  }
  if (!isValidId(juryId)) {
    return { result: "continue" };
  }
  const totalJurors = parseInt(process.env.TOTAL_JURORS || "0", 10);
  const dbPath = getDbPath();
  if (!existsSync2(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
jury_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Count completed jurors
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM jury_votes
    WHERE jury_id = ? AND completed = 1
''', (jury_id,))
completed_count = cursor.fetchone()[0]

# Get votes if all completed
votes = []
if completed_count > 0:
    cursor = conn.execute('''
        SELECT juror_id, vote
        FROM jury_votes
        WHERE jury_id = ? AND completed = 1
        ORDER BY created_at
    ''', (jury_id,))
    for row in cursor.fetchall():
        votes.append({'juror': row[0], 'vote': row[1]})

conn.close()
print(json.dumps({'completed': completed_count, 'votes': votes}))
`;
    const result = runPythonQuery(query, [dbPath, juryId]);
    if (!result.success) {
      return { result: "continue" };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (data.completed < totalJurors) {
      const waiting = totalJurors - data.completed;
      return {
        result: "block",
        message: `Waiting for ${waiting} juror(s) to complete their deliberations. All votes must be recorded before reaching a verdict.`,
      };
    }
    let message = `All ${totalJurors} jurors have completed their deliberations.

`;
    message += "JURY VOTES:\n";
    for (const v of data.votes) {
      message += `- ${v.juror}: ${v.vote || "(pending)"}
`;
    }
    message += "\nProvide your final verdict based on the consensus.";
    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/hierarchical.ts
import { existsSync as existsSync3 } from "fs";
async function onStop3(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const hierarchyId = process.env.HIERARCHY_ID;
  if (!hierarchyId) {
    return { result: "continue" };
  }
  if (!isValidId(hierarchyId)) {
    return { result: "continue" };
  }
  const agentRole = process.env.AGENT_ROLE || "specialist";
  if (agentRole !== "coordinator") {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync3(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
hierarchy_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Count completed specialists
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM hierarchy_agents
    WHERE hierarchy_id = ? AND role = 'specialist' AND status = 'completed'
''', (hierarchy_id,))
completed_count = cursor.fetchone()[0]

# Count total specialists
cursor = conn.execute('''
    SELECT COUNT(*) as total_count
    FROM hierarchy_agents
    WHERE hierarchy_id = ? AND role = 'specialist'
''', (hierarchy_id,))
total_count = cursor.fetchone()[0]

# Get specialist details if all completed
specialists = []
if completed_count == total_count and total_count > 0:
    cursor = conn.execute('''
        SELECT agent_id, level
        FROM hierarchy_agents
        WHERE hierarchy_id = ? AND role = 'specialist'
        ORDER BY created_at
    ''', (hierarchy_id,))
    for row in cursor.fetchall():
        specialists.append({'agent_id': row[0], 'level': row[1]})

conn.close()
print(json.dumps({'completed': completed_count, 'total': total_count, 'specialists': specialists}))
`;
    const result = runPythonQuery(query, [dbPath, hierarchyId]);
    if (!result.success) {
      return { result: "continue" };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (data.completed < data.total) {
      const waiting = data.total - data.completed;
      return {
        result: "block",
        message: `Waiting for ${waiting} specialist(s) to complete their subtasks. All specialists must finish before synthesis.`,
      };
    }
    let message = `All ${data.total} specialists have completed their subtasks.

`;
    message += "SPECIALIST RESULTS:\n";
    for (const spec of data.specialists) {
      message += `- Specialist ${spec.agent_id} (level ${spec.level}): completed
`;
    }
    message +=
      "\nSynthesize the specialist results into a comprehensive final answer.";
    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/generator-critic.ts
import { existsSync as existsSync4 } from "fs";
async function onStop4(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const gcId = process.env.GC_ID;
  if (!gcId) {
    return { result: "continue" };
  }
  if (!isValidId(gcId)) {
    return { result: "continue" };
  }
  const iteration = parseInt(process.env.GC_ITERATION || "1", 10);
  const maxRounds = parseInt(process.env.GC_MAX_ROUNDS || "3", 10);
  const dbPath = getDbPath();
  if (!existsSync4(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
gc_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Check for approved iteration
cursor = conn.execute('''
    SELECT iteration, approved, critic_feedback
    FROM gc_iterations
    WHERE gc_id = ? AND approved = 1
    ORDER BY iteration DESC
    LIMIT 1
''', (gc_id,))

row = cursor.fetchone()
approved_iter = row[0] if row else None

# Get latest feedback
cursor = conn.execute('''
    SELECT iteration, critic_feedback
    FROM gc_iterations
    WHERE gc_id = ?
    ORDER BY iteration DESC
    LIMIT 1
''', (gc_id,))

row = cursor.fetchone()
latest_feedback = row[1] if row else None

conn.close()
print(json.dumps({
    'approved': approved_iter is not None,
    'latest_feedback': latest_feedback
}))
`;
    const result = runPythonQuery(query, [dbPath, gcId]);
    if (!result.success) {
      return { result: "continue" };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (data.approved) {
      return {
        result: "continue",
        message:
          "Generator-Critic pattern complete: Output approved by critic.",
      };
    }
    if (iteration >= maxRounds) {
      return {
        result: "continue",
        message: `Generator-Critic pattern complete: Max rounds (${maxRounds}) reached.`,
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/blackboard.ts
import { existsSync as existsSync5 } from "fs";
async function onStop5(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const blackboardId = process.env.BLACKBOARD_ID;
  if (!blackboardId) {
    return { result: "continue" };
  }
  if (!isValidId(blackboardId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "specialist";
  if (role !== "controller") {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync5(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
blackboard_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Fetch all non-internal state keys
cursor = conn.execute('''
    SELECT key, value, updated_by
    FROM blackboard_state
    WHERE blackboard_id = ? AND key NOT LIKE '_completed_%'
    ORDER BY created_at
''', (blackboard_id,))

state = []
for row in cursor.fetchall():
    state.append({
        'key': row[0],
        'value': row[1],
        'updated_by': row[2]
    })

conn.close()
print(json.dumps(state))
`;
    const result = runPythonQuery(query, [dbPath, blackboardId]);
    if (!result.success) {
      return { result: "continue" };
    }
    let state;
    try {
      state = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    let message = "BLACKBOARD PATTERN COMPLETION:\n\n";
    message += "All specialists have completed their contributions.\n";
    message +=
      "Review the final blackboard state below and determine if the solution is complete and coherent.\n\n";
    if (state.length === 0) {
      message += "(No state contributed yet)\n";
    } else {
      message += "FINAL STATE:\n";
      for (const item of state) {
        message += `
${item.key}: ${item.value}`;
        message += `
  (contributed by: ${item.updated_by})
`;
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

// src/patterns/circuit-breaker.ts
import { existsSync as existsSync6 } from "fs";
async function onStop6(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const cbId = process.env.CB_ID;
  if (!cbId) {
    return { result: "continue" };
  }
  if (!isValidId(cbId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync6(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
cb_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get circuit state
cursor = conn.execute('''
    SELECT state, failure_count, last_failure_at
    FROM circuit_state
    WHERE cb_id = ?
''', (cb_id,))
row = cursor.fetchone()

if row:
    state, failure_count, last_failure_at = row
else:
    state = 'closed'
    failure_count = 0
    last_failure_at = None

conn.close()
print(json.dumps({'state': state, 'failure_count': failure_count, 'last_failure_at': last_failure_at}))
`;
    const result = runPythonQuery(query, [dbPath, cbId]);
    if (!result.success) {
      return { result: "continue" };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    let message = `Circuit Breaker Summary (ID: ${cbId}):
`;
    message += `- State: ${data.state.toUpperCase()}
`;
    message += `- Failure Count: ${data.failure_count}
`;
    if (data.state === "open") {
      message +=
        "\nWARNING: Circuit is OPEN due to repeated failures. Fallback agent is being used.";
      message +=
        "\nThe circuit will automatically test the primary agent after the reset timeout.";
    } else if (data.state === "half_open") {
      message +=
        "\nINFO: Circuit is in HALF-OPEN state, testing if primary agent has recovered.";
    } else {
      message +=
        "\nINFO: Circuit is CLOSED, primary agent is operating normally.";
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

// src/patterns/map-reduce.ts
import { existsSync as existsSync7 } from "fs";
async function onStop7(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const mrId = process.env.MR_ID;
  if (!mrId) {
    return { result: "continue" };
  }
  if (!isValidId(mrId)) {
    return { result: "continue" };
  }
  const agentRole = process.env.AGENT_ROLE || "mapper";
  if (agentRole !== "reducer") {
    return { result: "continue" };
  }
  const totalMappers = parseInt(process.env.TOTAL_MAPPERS || "0", 10);
  const dbPath = getDbPath();
  if (!existsSync7(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
mr_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Count completed mappers
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM mr_mappers
    WHERE mr_id = ? AND status = 'completed'
''', (mr_id,))
completed_count = cursor.fetchone()[0]

# Get mapper results if all completed
results = []
if completed_count > 0:
    cursor = conn.execute('''
        SELECT mapper_index, agent_id, output
        FROM mr_mappers
        WHERE mr_id = ? AND status = 'completed'
        ORDER BY mapper_index
    ''', (mr_id,))
    for row in cursor.fetchall():
        results.append({
            'index': row[0],
            'agent_id': row[1],
            'output': row[2]
        })

conn.close()
print(json.dumps({'completed': completed_count, 'results': results}))
`;
    const result = runPythonQuery(query, [dbPath, mrId]);
    if (!result.success) {
      return { result: "continue" };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (data.completed < totalMappers) {
      const waiting = totalMappers - data.completed;
      return {
        result: "block",
        message: `Waiting for ${waiting} mapper(s) to complete. All mappers must finish before the reduce phase can begin.`,
      };
    }
    let message = `All ${totalMappers} mappers have completed their work.

`;
    message += "MAPPER RESULTS:\n";
    for (const r of data.results) {
      const output = r.output ? r.output.substring(0, 100) : "(no output)";
      message += `- Mapper ${r.index}: ${output}${r.output && r.output.length > 100 ? "..." : ""}
`;
    }
    message += "\nProceed with the reduce phase to synthesize these results.";
    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/chain-of-responsibility.ts
import { existsSync as existsSync8 } from "fs";
async function onStop8(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const corId = process.env.COR_ID;
  if (!corId) {
    return { result: "continue" };
  }
  if (!isValidId(corId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync8(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
cor_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get all handlers for this chain
cursor = conn.execute('''
    SELECT priority, agent_id, handled, escalated
    FROM cor_handlers
    WHERE cor_id = ?
    ORDER BY priority
''', (cor_id,))

handlers = []
for row in cursor.fetchall():
    handlers.append({
        'priority': row[0],
        'agent_id': row[1],
        'handled': row[2],
        'escalated': row[3]
    })

conn.close()
print(json.dumps({'handlers': handlers}))
`;
    const result = runPythonQuery(query, [dbPath, corId]);
    if (!result.success) {
      return { result: "continue" };
    }
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (data.handlers.length === 0) {
      return { result: "continue" };
    }
    let message = "CHAIN OF RESPONSIBILITY RESOLUTION:\n\n";
    let resolvedBy = null;
    for (const handler of data.handlers) {
      const action = handler.handled
        ? "HANDLED"
        : handler.escalated
          ? "ESCALATED"
          : "PENDING";
      message += `- Handler ${handler.priority}: ${action}`;
      if (handler.agent_id && handler.agent_id !== "unknown") {
        message += ` (${handler.agent_id})`;
      }
      message += "\n";
      if (handler.handled) {
        resolvedBy = handler.priority;
      }
    }
    if (resolvedBy !== null) {
      message += `
Request was successfully handled by Handler ${resolvedBy}.`;
    } else {
      message += "\nNo handler has processed the request yet.";
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

// src/patterns/event-driven.ts
import { existsSync as existsSync9 } from "fs";
async function onStop9(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const busId = process.env.EVENT_BUS_ID;
  if (!busId) {
    return { result: "continue" };
  }
  if (!isValidId(busId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync9(dbPath)) {
    return { result: "continue" };
  }
  try {
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
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    let message = `EVENT BUS SUMMARY:

`;
    message += `Active Subscriptions: ${data.subscriptions}
`;
    message += `Pending Events: ${data.pending_events}

`;
    if (data.event_types.length > 0) {
      message += "Event Type Distribution:\n";
      for (const et of data.event_types) {
        message += `- ${et.type}: ${et.count} event(s)
`;
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

// src/patterns/adversarial.ts
import { existsSync as existsSync10 } from "fs";
async function onStop10(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const advId = process.env.ADV_ID;
  if (!advId) {
    return { result: "continue" };
  }
  if (!isValidId(advId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "unknown";
  const round = parseInt(process.env.ADVERSARIAL_ROUND || "1", 10);
  const maxRounds = parseInt(process.env.ADVERSARIAL_MAX_ROUNDS || "3", 10);
  const dbPath = getDbPath();
  if (!existsSync10(dbPath)) {
    return { result: "continue" };
  }
  try {
    if (role === "judge" && round === maxRounds) {
      const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
adv_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get all debate rounds
cursor = conn.execute('''
    SELECT round, advocate_argument, adversary_argument, judge_verdict
    FROM adversarial_rounds
    WHERE adv_id = ?
    ORDER BY round
''', (adv_id,))

rounds = []
for row in cursor.fetchall():
    rounds.append({
        'round': row[0],
        'advocate': row[1],
        'adversary': row[2],
        'verdict': row[3]
    })

conn.close()
print(json.dumps({'rounds': rounds}))
`;
      const result = runPythonQuery(query, [dbPath, advId]);
      if (!result.success) {
        return { result: "continue" };
      }
      let data;
      try {
        data = JSON.parse(result.stdout);
      } catch (parseErr) {
        return { result: "continue" };
      }
      let message = `DEBATE SUMMARY (${data.rounds.length} rounds):

`;
      for (const r of data.rounds) {
        message += `Round ${r.round}:
`;
        message += `- Advocate: ${r.advocate ? r.advocate.substring(0, 100) + "..." : "(pending)"}
`;
        message += `- Adversary: ${r.adversary ? r.adversary.substring(0, 100) + "..." : "(pending)"}
`;
      }
      message += "\nProvide your final verdict.";
      return {
        result: "continue",
        message,
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}

// src/stop-coordinator.ts
async function handlePipelineStop(input) {
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const pipelineId = process.env.PATTERN_ID;
  const totalStagesStr = process.env.PIPELINE_TOTAL_STAGES;
  if (!pipelineId) {
    return { result: "continue" };
  }
  if (!isValidId(pipelineId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync11(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
pipeline_id = sys.argv[2]

conn = sqlite3.connect(db_path)

# Check if pipeline_stages table exists
cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pipeline_stages'")
if not cursor.fetchone():
    print(json.dumps({'stages': [], 'completed': 0}))
    conn.close()
    exit(0)

# Get all stages for this pipeline
cursor = conn.execute('''
    SELECT stage_index, stage_name, status, output
    FROM pipeline_stages
    WHERE pipeline_id = ?
    ORDER BY stage_index
''', (pipeline_id,))

stages = []
completed = 0
for row in cursor.fetchall():
    stage = {
        'index': row[0],
        'name': row[1],
        'status': row[2],
        'output': json.loads(row[3]) if row[3] else None
    }
    stages.append(stage)
    if row[2] == 'completed':
        completed += 1

conn.close()
print(json.dumps({'stages': stages, 'completed': completed}))
`;
    const result = runPythonQuery(query, [dbPath, pipelineId]);
    if (!result.success) {
      console.error("Pipeline Stop Python error:", result.stderr);
      return { result: "continue" };
    }
    let pipelineData;
    try {
      pipelineData = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    const totalStages =
      parseInt(totalStagesStr || "0", 10) || pipelineData.stages.length;
    const stageNames = pipelineData.stages
      .map((s) => s.name || `stage-${s.index}`)
      .join(" -> ");
    const completedCount = pipelineData.completed;
    return {
      result: "continue",
      message: `Pipeline complete: ${completedCount}/${totalStages} stages. Stages: ${stageNames}`,
    };
  } catch (err) {
    console.error("Pipeline Stop hook error:", err);
    return { result: "continue" };
  }
}
async function main() {
  let input;
  try {
    const rawInput = readFileSync(0, "utf-8");
    if (!rawInput.trim()) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    input = JSON.parse(rawInput);
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const pattern = detectPattern();
  let output;
  switch (pattern) {
    case "swarm":
      output = await onStop(input);
      break;
    case "jury":
      output = await onStop2(input);
      break;
    case "pipeline":
      output = await handlePipelineStop(input);
      break;
    case "generator_critic":
      output = await onStop4(input);
      break;
    case "hierarchical":
      output = await onStop3(input);
      break;
    case "map_reduce":
      output = await onStop7(input);
      break;
    case "blackboard":
      output = await onStop5(input);
      break;
    case "circuit_breaker":
      output = await onStop6(input);
      break;
    case "chain_of_responsibility":
      output = await onStop8(input);
      break;
    case "adversarial":
      output = await onStop10(input);
      break;
    case "event_driven":
      output = await onStop9(input);
      break;
    default:
      output = { result: "continue" };
  }
  console.log(JSON.stringify(output));
}
main().catch((err) => {
  console.error("Uncaught error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
