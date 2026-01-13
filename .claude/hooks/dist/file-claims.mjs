// src/file-claims.ts
import { readFileSync } from "fs";

// src/shared/db-utils-pg.ts
import { spawnSync } from "child_process";

// src/shared/opc-path.ts
import { existsSync } from "fs";
import { join } from "path";
function getOpcDir() {
  const envOpcDir = process.env.CLAUDE_OPC_DIR;
  if (envOpcDir && existsSync(envOpcDir)) {
    return envOpcDir;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const localOpc = join(projectDir, "opc");
  if (existsSync(localOpc)) {
    return localOpc;
  }
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  if (homeDir) {
    const globalClaude = join(homeDir, ".claude");
    const globalScripts = join(globalClaude, "scripts", "core");
    if (existsSync(globalScripts)) {
      return globalClaude;
    }
  }
  return null;
}
function requireOpcDir() {
  const opcDir = getOpcDir();
  if (!opcDir) {
    console.log(JSON.stringify({ result: "continue" }));
    process.exit(0);
  }
  return opcDir;
}

// src/shared/db-utils-pg.ts
function getPgConnectionString() {
  return process.env.OPC_POSTGRES_URL || process.env.DATABASE_URL || "postgresql://claude:claude_dev@localhost:5432/continuous_claude";
}
function runPgQuery(pythonCode, args = []) {
  const opcDir = requireOpcDir();
  const wrappedCode = `
import sys
import os
import asyncio
import json

# Add opc to path for imports
sys.path.insert(0, '${opcDir}')
os.chdir('${opcDir}')

${pythonCode}
`;
  try {
    const result = spawnSync("uv", ["run", "python", "-c", wrappedCode, ...args], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      cwd: opcDir,
      env: {
        ...process.env,
        OPC_POSTGRES_URL: getPgConnectionString()
      }
    });
    return {
      success: result.status === 0,
      stdout: result.stdout?.trim() || "",
      stderr: result.stderr || ""
    };
  } catch (err) {
    return {
      success: false,
      stdout: "",
      stderr: String(err)
    };
  }
}
function claimFileAtomic(filePath, project, sessionId) {
  const pythonCode = `
import asyncpg
import os

file_path = sys.argv[1]
project = sys.argv[2]
session_id = sys.argv[3]
pg_url = os.environ.get('OPC_POSTGRES_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')

async def main():
    conn = await asyncpg.connect(pg_url)
    try:
        # Atomically insert or update, returning the session_id that was written
        result = await conn.fetchrow('''
            INSERT INTO file_claims (file_path, project, session_id, claimed_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (file_path, project) DO UPDATE SET
                session_id = EXCLUDED.session_id,
                claimed_at = NOW()
            RETURNING session_id
        ''', file_path, project, session_id)

        # If the returned session_id matches our session_id, we own the claim
        if result['session_id'] == session_id:
            print('claimed:true')
        else:
            # Someone else claimed it - return their session_id
            print(f'claimed:false:claimed_by:{result["session_id"]}')
    finally:
        await conn.close()

asyncio.run(main())
`;
  const result = runPgQuery(pythonCode, [filePath, project, sessionId]);
  if (!result.success) {
    return { claimed: false };
  }
  const output = result.stdout.trim();
  if (output === "claimed:true") {
    return { claimed: true };
  } else if (output.startsWith("claimed:false:claimed_by:")) {
    const claimedBy = output.split(":claimed_by:")[1];
    return { claimed: false, claimedBy };
  }
  return { claimed: false };
}

// src/file-claims.ts
function getSessionId() {
  return process.env.COORDINATION_SESSION_ID || process.env.BRAINTRUST_SPAN_ID?.slice(0, 8) || `s-${Date.now().toString(36)}`;
}
function getProject() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}
function main() {
  let input;
  try {
    const stdinContent = readFileSync(0, "utf-8");
    input = JSON.parse(stdinContent);
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (input.tool_name !== "Edit") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const filePath = input.tool_input?.file_path;
  if (!filePath) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const sessionId = getSessionId();
  const project = getProject();
  const claimResult = claimFileAtomic(filePath, project, sessionId);
  let output;
  if (claimResult.claimed) {
    output = { result: "continue" };
  } else if (claimResult.claimedBy) {
    const fileName = filePath.split("/").pop() || filePath;
    output = {
      result: "continue",
      // Allow edit, just warn
      message: `\u26A0\uFE0F **File Conflict Warning**
\`${fileName}\` is being edited by Session ${claimResult.claimedBy}
Consider coordinating with the other session to avoid conflicts.`
    };
  } else {
    output = { result: "continue" };
  }
  console.log(JSON.stringify(output));
}
main();
export {
  main
};
