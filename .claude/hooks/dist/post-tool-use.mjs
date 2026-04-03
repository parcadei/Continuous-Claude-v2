#!/usr/bin/env node

// src/post-tool-use.ts
import { readFileSync } from "fs";

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

// src/patterns/swarm.ts
import { existsSync } from "fs";

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
async function onPostToolUse(input) {
  if (input.tool_name !== "Task") {
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
    const response = input.tool_response;
    let agentId = "unknown";
    if (response && typeof response === "object" && "agent_id" in response) {
      const rawAgentId = response.agent_id;
      if (
        typeof rawAgentId === "string" &&
        rawAgentId.length > 0 &&
        isValidId(rawAgentId)
      ) {
        agentId = rawAgentId;
      }
    }
    const insert = `
import sqlite3
import json
import sys
from datetime import datetime
from uuid import uuid4

db_path = sys.argv[1]
swarm_id = sys.argv[2]
agent_id = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Insert "started" broadcast to track this agent in the swarm
broadcast_id = uuid4().hex[:12]
payload = json.dumps({"type": "task_spawned"})
conn.execute('''
    INSERT INTO broadcasts (id, swarm_id, sender_agent, broadcast_type, payload, created_at)
    VALUES (?, ?, ?, 'started', ?, ?)
''', (broadcast_id, swarm_id, agent_id, payload, datetime.now().isoformat()))
conn.commit()
conn.close()
`;
    const result = runPythonQuery(insert, [dbPath, swarmId, agentId]);
    if (!result.success) {
      console.error("Task completion tracking error:", result.stderr);
    }
    return { result: "continue" };
  } catch (err) {
    console.error("Task completion tracking error:", err);
    return { result: "continue" };
  }
}

// src/patterns/jury.ts
async function onPostToolUse2(input) {
  return { result: "continue" };
}

// src/patterns/pipeline.ts
async function onPostToolUse3(input) {
  return { result: "continue" };
}

// src/patterns/generator-critic.ts
async function onPostToolUse4(input) {
  return { result: "continue" };
}

// src/patterns/hierarchical.ts
import { existsSync as existsSync2 } from "fs";
async function onPostToolUse5(input) {
  const hierarchyId = process.env.HIERARCHY_ID;
  const agentRole = process.env.AGENT_ROLE;
  const coordinatorId = process.env.AGENT_ID || process.env.COORDINATOR_ID;
  const hierarchyLevel = parseInt(process.env.HIERARCHY_LEVEL || "0", 10);
  if (
    !hierarchyId ||
    agentRole !== "coordinator" ||
    input.tool_name !== "Task"
  ) {
    return { result: "continue" };
  }
  if (!isValidId(hierarchyId)) {
    return { result: "continue" };
  }
  const response = input.tool_response;
  const spawnedAgentId = response?.agent_id ?? response?.task_id;
  if (!spawnedAgentId || typeof spawnedAgentId !== "string") {
    return { result: "continue" };
  }
  if (!isValidId(spawnedAgentId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync2(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import sys
from datetime import datetime

db_path = sys.argv[1]
hierarchy_id = sys.argv[2]
agent_id = sys.argv[3]
coordinator_id = sys.argv[4]
level = int(sys.argv[5])

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS hierarchy_agents (
        id TEXT PRIMARY KEY,
        hierarchy_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        role TEXT NOT NULL,
        coordinator_id TEXT,
        level INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_hierarchy_agents
        ON hierarchy_agents(hierarchy_id, status)
''')

# Insert specialist record (use agent_id as primary key for PostToolUse)
conn.execute('''
    INSERT OR REPLACE INTO hierarchy_agents
        (id, hierarchy_id, agent_id, role, coordinator_id, level, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
''', (agent_id, hierarchy_id, agent_id, 'specialist', coordinator_id, level, 'active'))
conn.commit()
conn.close()
print('ok')
`;
    const result = runPythonQuery(query, [
      dbPath,
      hierarchyId,
      spawnedAgentId,
      coordinatorId || "",
      (hierarchyLevel + 1).toString(),
      // Specialist is one level below coordinator
    ]);
    if (!result.success) {
      console.error("PostToolUse Python error:", result.stderr);
    }
    return { result: "continue" };
  } catch (err) {
    console.error("PostToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/map-reduce.ts
import { existsSync as existsSync3 } from "fs";
async function onPostToolUse6(input) {
  const mrId = process.env.MR_ID;
  if (!mrId) {
    return { result: "continue" };
  }
  if (!isValidId(mrId)) {
    return { result: "continue" };
  }
  const agentRole = process.env.AGENT_ROLE || "mapper";
  if (agentRole !== "mapper") {
    return { result: "continue" };
  }
  if (input.tool_name !== "Write") {
    return { result: "continue" };
  }
  if (!input.tool_input || typeof input.tool_input !== "object") {
    return { result: "continue" };
  }
  const toolInput = input.tool_input;
  const outputContent = toolInput.content;
  if (!outputContent || typeof outputContent !== "string") {
    return { result: "continue" };
  }
  const mapperIndex = parseInt(process.env.MAPPER_INDEX || "0", 10);
  const totalMappers = parseInt(process.env.TOTAL_MAPPERS || "1", 10);
  const agentId = process.env.AGENT_ID || "unknown";
  const dbPath = getDbPath();
  if (!existsSync3(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
mr_id = sys.argv[2]
mapper_index = int(sys.argv[3])
agent_id = sys.argv[4]
output_content = sys.argv[5]
total_mappers = int(sys.argv[6])

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS mr_mappers (
        id TEXT PRIMARY KEY,
        mr_id TEXT NOT NULL,
        mapper_index INTEGER NOT NULL,
        agent_id TEXT,
        status TEXT DEFAULT 'pending',
        output TEXT,
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_mr_mappers
        ON mr_mappers(mr_id, status)
''')

# Insert or update mapper output
record_id = f"{mr_id}_{mapper_index}"
conn.execute('''
    INSERT OR REPLACE INTO mr_mappers (id, mr_id, mapper_index, agent_id, status, output, created_at)
    VALUES (?, ?, ?, ?, 'completed', ?, ?)
''', (record_id, mr_id, mapper_index, agent_id, output_content, datetime.now().isoformat()))
conn.commit()

# Count completed mappers (those with output)
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM mr_mappers
    WHERE mr_id = ? AND status = 'completed' AND output IS NOT NULL
''', (mr_id,))
completed_count = cursor.fetchone()[0]

conn.close()
print(json.dumps({'completed': completed_count, 'total': total_mappers}))
`;
    const result = runPythonQuery(query, [
      dbPath,
      mrId,
      mapperIndex.toString(),
      agentId,
      outputContent,
      totalMappers.toString(),
    ]);
    if (!result.success) {
      console.error("PostToolUse Python error:", result.stderr);
      return { result: "continue" };
    }
    let counts;
    try {
      counts = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    console.error(
      `[map-reduce] Mapper ${mapperIndex} output recorded. Progress: ${counts.completed}/${counts.total}`,
    );
    if (counts.completed >= counts.total && counts.total > 0) {
      return {
        result: "continue",
        message:
          "All mappers have completed their outputs. Proceeding to reduce phase.",
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("PostToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/blackboard.ts
import { existsSync as existsSync4 } from "fs";
var VALID_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;
function extractBlackboardKey(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return null;
  }
  const blackboardMatch = filePath.match(
    /\/blackboard\/([^\/]+?)(?:\.[^\/]*)?$/,
  );
  if (!blackboardMatch) {
    return null;
  }
  const key = blackboardMatch[1];
  if (!VALID_KEY_PATTERN.test(key)) {
    return null;
  }
  return key;
}
async function onPostToolUse7(input) {
  const blackboardId = process.env.BLACKBOARD_ID;
  if (!blackboardId) {
    return { result: "continue" };
  }
  if (!isValidId(blackboardId)) {
    return { result: "continue" };
  }
  if (input.tool_name !== "Write") {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "specialist";
  if (role === "controller") {
    return { result: "continue" };
  }
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput.file_path !== "string") {
    return { result: "continue" };
  }
  const key = extractBlackboardKey(toolInput.file_path);
  if (!key) {
    return { result: "continue" };
  }
  const writesTo = process.env.BLACKBOARD_WRITES_TO || "";
  const allowedKeys = writesTo
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k);
  if (allowedKeys.length > 0 && !allowedKeys.includes(key)) {
    console.error(
      `[blackboard] Write to key '${key}' not allowed. Allowed: ${allowedKeys.join(", ")}`,
    );
    return { result: "continue" };
  }
  const agentId = process.env.AGENT_ID || "unknown";
  if (!isValidId(agentId)) {
    return { result: "continue" };
  }
  const value = typeof toolInput.content === "string" ? toolInput.content : "";
  const dbPath = getDbPath();
  if (!existsSync4(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import sys
from datetime import datetime

db_path = sys.argv[1]
blackboard_id = sys.argv[2]
key = sys.argv[3]
value = sys.argv[4]
agent_id = sys.argv[5]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS blackboard_state (
        id TEXT PRIMARY KEY,
        blackboard_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(blackboard_id, key)
    )
''')

# Record the write
state_id = f"{blackboard_id}_{key}"
conn.execute('''
    INSERT OR REPLACE INTO blackboard_state (id, blackboard_id, key, value, updated_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
''', (state_id, blackboard_id, key, value, agent_id, datetime.now().isoformat()))
conn.commit()
conn.close()
`;
    const result = runPythonQuery(query, [
      dbPath,
      blackboardId,
      key,
      value,
      agentId,
    ]);
    if (!result.success) {
      console.error("[blackboard] PostToolUse Python error:", result.stderr);
      return { result: "continue" };
    }
    console.error(`[blackboard] Recorded write to key '${key}' by ${agentId}`);
    return { result: "continue" };
  } catch (err) {
    console.error("[blackboard] PostToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/circuit-breaker.ts
import { existsSync as existsSync5 } from "fs";
async function onPostToolUse8(input) {
  const cbId = process.env.CB_ID;
  if (!cbId) {
    return { result: "continue" };
  }
  if (!isValidId(cbId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "primary";
  if (role !== "primary") {
    return { result: "continue" };
  }
  const toolName = input.tool_name;
  const toolResponse = input.tool_response || {};
  let hasFailure = false;
  if (toolName === "Bash" && typeof toolResponse === "object") {
    const exitCode = toolResponse.exit_code;
    if (typeof exitCode === "number" && exitCode !== 0) {
      hasFailure = true;
    }
  }
  if (toolName === "Read" && typeof toolResponse === "object") {
    const error = toolResponse.error;
    if (error) {
      hasFailure = true;
    }
  }
  if (typeof toolResponse === "object" && toolResponse.error) {
    hasFailure = true;
  }
  const dbPath = getDbPath();
  if (!existsSync5(dbPath)) {
    return { result: "continue" };
  }
  try {
    if (hasFailure) {
      const failureQuery = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
cb_id = sys.argv[2]
tool_name = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS circuit_state (
        id TEXT PRIMARY KEY,
        cb_id TEXT NOT NULL,
        state TEXT DEFAULT 'closed',
        failure_count INTEGER DEFAULT 0,
        last_failure_at TEXT,
        created_at TEXT NOT NULL
    )
''')

# Get current state
cursor = conn.execute('''
    SELECT state, failure_count
    FROM circuit_state
    WHERE cb_id = ?
''', (cb_id,))
row = cursor.fetchone()

if row:
    current_state, failure_count = row
else:
    current_state = 'closed'
    failure_count = 0

# Increment failure count
new_failure_count = failure_count + 1
new_last_failure_at = datetime.now().isoformat()

# Open circuit after 3 failures
if new_failure_count >= 3:
    new_state = 'open'
elif current_state == 'half_open':
    # Failed during half-open test, reopen
    new_state = 'open'
else:
    new_state = current_state

# Upsert circuit state
conn.execute('''
    INSERT OR REPLACE INTO circuit_state (id, cb_id, state, failure_count, last_failure_at, created_at)
    VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM circuit_state WHERE cb_id = ?), ?))
''', (cb_id, cb_id, new_state, new_failure_count, new_last_failure_at, cb_id, datetime.now().isoformat()))
conn.commit()

conn.close()
print(json.dumps({'state': new_state, 'failure_count': new_failure_count}))
`;
      const result = runPythonQuery(failureQuery, [dbPath, cbId, toolName]);
      if (!result.success) {
        console.error("PostToolUse Python error:", result.stderr);
        return { result: "continue" };
      }
      console.error(
        `[circuit-breaker] Detected ${toolName} failure for cb_id=${cbId}`,
      );
    } else {
      const successQuery = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
cb_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS circuit_state (
        id TEXT PRIMARY KEY,
        cb_id TEXT NOT NULL,
        state TEXT DEFAULT 'closed',
        failure_count INTEGER DEFAULT 0,
        last_failure_at TEXT,
        created_at TEXT NOT NULL
    )
''')

# Get current state
cursor = conn.execute('''
    SELECT state, failure_count
    FROM circuit_state
    WHERE cb_id = ?
''', (cb_id,))
row = cursor.fetchone()

if row:
    current_state, failure_count = row
    # Only update if there are failures to reset
    if failure_count > 0:
        # Reset failure count on success
        conn.execute('''
            UPDATE circuit_state
            SET failure_count = 0, state = 'closed'
            WHERE cb_id = ?
        ''', (cb_id,))
        conn.commit()
        print(json.dumps({'state': 'closed', 'failure_count': 0, 'reset': True}))
    else:
        print(json.dumps({'state': current_state, 'failure_count': 0, 'reset': False}))
else:
    # No existing state, nothing to reset
    print(json.dumps({'state': 'closed', 'failure_count': 0, 'reset': False}))

conn.close()
`;
      const result = runPythonQuery(successQuery, [dbPath, cbId]);
      if (!result.success) {
        console.error("PostToolUse Python error:", result.stderr);
        return { result: "continue" };
      }
      try {
        const data = JSON.parse(result.stdout);
        if (data.reset) {
          console.error(
            `[circuit-breaker] Reset failure count for cb_id=${cbId} after successful ${toolName}`,
          );
        }
      } catch {}
    }
    return { result: "continue" };
  } catch (err) {
    console.error("PostToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/chain-of-responsibility.ts
import { existsSync as existsSync6 } from "fs";
async function onPostToolUse9(input) {
  const corId = process.env.COR_ID;
  if (!corId) {
    return { result: "continue" };
  }
  if (!isValidId(corId)) {
    return { result: "continue" };
  }
  const handlerPriority = parseInt(process.env.HANDLER_PRIORITY || "0", 10);
  const dbPath = getDbPath();
  if (!existsSync6(dbPath)) {
    return { result: "continue" };
  }
  const corResolved = process.env.COR_RESOLVED === "true";
  const corEscalate = process.env.COR_ESCALATE === "true";
  let toolResponse = {};
  if (input.tool_response && typeof input.tool_response === "object") {
    toolResponse = input.tool_response;
  }
  const toolName = input.tool_name || "";
  const responseStatus =
    typeof toolResponse.status === "string" ? toolResponse.status : "";
  const escalationReason =
    typeof toolResponse.reason === "string" ? toolResponse.reason : "";
  const resolutionTools = ["Task", "Write", "Edit", "Bash"];
  const isResolutionTool = resolutionTools.includes(toolName);
  const isEscalation = corEscalate || responseStatus === "escalate";
  const isResolution =
    corResolved || (toolName === "Task" && responseStatus === "success");
  if (!isResolutionTool && !corResolved && !corEscalate) {
    return { result: "continue" };
  }
  if (!isResolution && !isEscalation) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
cor_id = sys.argv[2]
priority = int(sys.argv[3])
is_resolution = sys.argv[4] == 'true'
is_escalation = sys.argv[5] == 'true'
tool_name = sys.argv[6]
escalation_reason = sys.argv[7] if len(sys.argv) > 7 else ''

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists (with new columns)
conn.execute('''
    CREATE TABLE IF NOT EXISTS cor_handlers (
        id TEXT PRIMARY KEY,
        cor_id TEXT NOT NULL,
        priority INTEGER NOT NULL,
        agent_id TEXT,
        handled BOOLEAN DEFAULT 0,
        escalated BOOLEAN DEFAULT 0,
        resolution_tool TEXT,
        escalation_reason TEXT,
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_cor_handlers
        ON cor_handlers(cor_id, priority)
''')

# Add columns if they don't exist (for backwards compatibility)
try:
    conn.execute('ALTER TABLE cor_handlers ADD COLUMN resolution_tool TEXT')
except:
    pass
try:
    conn.execute('ALTER TABLE cor_handlers ADD COLUMN escalation_reason TEXT')
except:
    pass

# Insert or update handler record
handler_record_id = f"{cor_id}_{priority}"
handled = 1 if is_resolution else 0
escalated = 1 if is_escalation else 0
resolution_tool = tool_name if is_resolution else None
esc_reason = escalation_reason if is_escalation and escalation_reason else None

conn.execute('''
    INSERT OR REPLACE INTO cor_handlers
    (id, cor_id, priority, agent_id, handled, escalated, resolution_tool, escalation_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (handler_record_id, cor_id, priority, None, handled, escalated, resolution_tool, esc_reason, datetime.now().isoformat()))
conn.commit()

conn.close()
print(json.dumps({'success': True, 'handled': handled, 'escalated': escalated}))
`;
    const result = runPythonQuery(query, [
      dbPath,
      corId,
      handlerPriority.toString(),
      isResolution ? "true" : "false",
      isEscalation ? "true" : "false",
      toolName,
      escalationReason,
    ]);
    if (!result.success) {
      console.error("PostToolUse Python error:", result.stderr);
      return { result: "continue" };
    }
    const action = isResolution
      ? "resolved"
      : isEscalation
        ? "escalated"
        : "processed";
    console.error(
      `[chain-of-responsibility] Handler ${handlerPriority} ${action} via ${toolName}`,
    );
    return { result: "continue" };
  } catch (err) {
    console.error("PostToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/adversarial.ts
import { existsSync as existsSync7 } from "fs";
async function onPostToolUse10(input) {
  const advId = process.env.ADV_ID;
  if (!advId) {
    return { result: "continue" };
  }
  if (!isValidId(advId)) {
    return { result: "continue" };
  }
  if (input.tool_name !== "Write") {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "unknown";
  const round = parseInt(process.env.ADVERSARIAL_ROUND || "1", 10);
  const dbPath = getDbPath();
  if (!existsSync7(dbPath)) {
    return { result: "continue" };
  }
  try {
    const toolInput = input.tool_input;
    const argument = toolInput.content || "";
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
adv_id = sys.argv[2]
round_num = int(sys.argv[3])
role = sys.argv[4]
argument = sys.argv[5]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS adversarial_rounds (
        id TEXT PRIMARY KEY,
        adv_id TEXT NOT NULL,
        round INTEGER NOT NULL,
        advocate_argument TEXT,
        adversary_argument TEXT,
        judge_verdict TEXT,
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_adversarial_rounds
        ON adversarial_rounds(adv_id, round)
''')

# Insert or update round record
round_id = f"{adv_id}_round_{round_num}"
column = 'advocate_argument' if role == 'advocate' else 'adversary_argument' if role == 'adversary' else 'judge_verdict'

# Try to get existing record
cursor = conn.execute('SELECT id FROM adversarial_rounds WHERE id = ?', (round_id,))
existing = cursor.fetchone()

if existing:
    # Update existing record
    conn.execute(f'''
        UPDATE adversarial_rounds
        SET {column} = ?
        WHERE id = ?
    ''', (argument, round_id))
else:
    # Insert new record
    conn.execute('''
        INSERT INTO adversarial_rounds (id, adv_id, round, advocate_argument, adversary_argument, judge_verdict, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        round_id,
        adv_id,
        round_num,
        argument if role == 'advocate' else None,
        argument if role == 'adversary' else None,
        argument if role == 'judge' else None,
        datetime.now().isoformat()
    ))

conn.commit()
conn.close()
print(json.dumps({'success': True}))
`;
    runPythonQuery(query, [dbPath, advId, round.toString(), role, argument]);
    return { result: "continue" };
  } catch (err) {
    console.error("PostToolUse hook error:", err);
    return { result: "continue" };
  }
}

// src/patterns/event-driven.ts
async function onPostToolUse11(input) {
  return { result: "continue" };
}

// src/post-tool-use.ts
async function main() {
  let input;
  try {
    const rawInput = readFileSync(0, "utf-8");
    input = JSON.parse(rawInput);
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const patternType = detectPattern();
  if (!patternType) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  let output;
  try {
    switch (patternType) {
      case "swarm":
        output = await onPostToolUse(input);
        break;
      case "jury":
        output = await onPostToolUse2(input);
        break;
      case "pipeline":
        output = await onPostToolUse3(input);
        break;
      case "generator_critic":
        output = await onPostToolUse4(input);
        break;
      case "hierarchical":
        output = await onPostToolUse5(input);
        break;
      case "map_reduce":
        output = await onPostToolUse6(input);
        break;
      case "blackboard":
        output = await onPostToolUse7(input);
        break;
      case "circuit_breaker":
        output = await onPostToolUse8(input);
        break;
      case "chain_of_responsibility":
        output = await onPostToolUse9(input);
        break;
      case "adversarial":
        output = await onPostToolUse10(input);
        break;
      case "event_driven":
        output = await onPostToolUse11(input);
        break;
      default:
        output = { result: "continue" };
    }
  } catch (err) {
    output = { result: "continue" };
  }
  console.log(JSON.stringify(output));
}
main().catch((err) => {
  console.error("Uncaught error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
