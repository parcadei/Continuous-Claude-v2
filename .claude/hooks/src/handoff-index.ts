import * as fs from "fs";
import * as path from "path";
import { spawn, execSync } from "child_process";
import Database from "better-sqlite3";

interface PostToolUseInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
  };
  tool_response: {
    success?: boolean;
    filePath?: string;
  };
  tool_use_id: string;
}

interface BraintrustState {
  root_span_id: string;
  project_id: string;
  current_turn_span_id: string;
  turn_count: string;
}

/**
 * Get parent PID using ps command (Unix only).
 */
function getPpid(pid: number): number | null {
  if (process.platform === "win32") {
    // Windows: use wmic
    try {
      const result = execSync(
        `wmic process where ProcessId=${pid} get ParentProcessId`,
        {
          encoding: "utf-8",
          timeout: 5000,
        },
      );
      for (const line of result.split("\n")) {
        const trimmed = line.trim();
        if (/^\d+$/.test(trimmed)) {
          return parseInt(trimmed, 10);
        }
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  // Unix: use ps
  try {
    const result = execSync(`ps -o ppid= -p ${pid}`, {
      encoding: "utf-8",
      timeout: 5000,
    });
    const ppid = parseInt(result.trim(), 10);
    return isNaN(ppid) ? null : ppid;
  } catch {
    return null;
  }
}

/**
 * Get terminal shell PID (great-grandparent).
 * Process chain: Hook shell -> Claude -> Terminal shell
 */
function getTerminalShellPid(): number | null {
  try {
    const parent = process.ppid; // Hook shell
    if (!parent) return null;
    const grandparent = getPpid(parent); // Claude
    if (!grandparent) return null;
    return getPpid(grandparent); // Terminal shell
  } catch {
    return null;
  }
}

/**
 * Store terminal_pid -> session_name mapping for session affinity.
 */
function storeSessionAffinity(
  projectDir: string,
  terminalPid: number,
  sessionName: string,
): void {
  const dbPath = path.join(
    projectDir,
    ".claude",
    "cache",
    "artifact-index",
    "context.db",
  );
  const dbDir = path.dirname(dbPath);

  try {
    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(dbPath);

    // Create table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS instance_sessions (
        terminal_pid TEXT PRIMARY KEY,
        session_name TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert or replace
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO instance_sessions (terminal_pid, session_name, updated_at)
      VALUES (?, ?, datetime('now'))
    `);
    stmt.run(terminalPid.toString(), sessionName);

    db.close();
  } catch {
    // Silently fail - don't block handoff creation
  }
}

/**
 * Extract session name from handoff file path.
 * Path format: .../handoffs/<session-name>/handoff-XXX.md
 */
function extractSessionName(filePath: string): string | null {
  const parts = filePath.split("/");
  const handoffsIdx = parts.findIndex((p) => p === "handoffs");
  if (handoffsIdx >= 0 && handoffsIdx < parts.length - 1) {
    return parts[handoffsIdx + 1];
  }
  return null;
}

async function main() {
  const input: PostToolUseInput = JSON.parse(await readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";

  // Only process Write tool calls
  if (input.tool_name !== "Write") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }

  const filePath = input.tool_input?.file_path || "";

  // Only process handoff files (.md or .yaml/.yml)
  const isHandoffFile =
    filePath.endsWith(".md") ||
    filePath.endsWith(".yaml") ||
    filePath.endsWith(".yml");
  if (!filePath.includes("handoffs") || !isHandoffFile) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }

  try {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(projectDir, filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }

    // Read current file content
    let content = fs.readFileSync(fullPath, "utf-8");
    let modified = false;

    // Check if frontmatter already has root_span_id
    const isYamlFile = fullPath.endsWith(".yaml") || fullPath.endsWith(".yml");
    const hasFrontmatter = content.startsWith("---");
    const hasRootSpanId = content.includes("root_span_id:");

    // If missing root_span_id, try to inject it
    if (!hasRootSpanId) {
      // Read Braintrust state file
      const stateFile = path.join(
        homeDir,
        ".claude",
        "state",
        "braintrust_sessions",
        `${input.session_id}.json`,
      );

      if (fs.existsSync(stateFile)) {
        try {
          const stateContent = fs.readFileSync(stateFile, "utf-8");
          const state: BraintrustState = JSON.parse(stateContent);

          const newFields = [
            `root_span_id: ${state.root_span_id}`,
            `turn_span_id: ${state.current_turn_span_id || ""}`,
            `session_id: ${input.session_id}`,
          ].join("\n");

          if (isYamlFile) {
            // For YAML files, prepend fields at the top (no frontmatter delimiters needed)
            content = `${newFields}\n${content}`;
          } else if (hasFrontmatter) {
            // Insert after opening ---
            content = content.replace(/^---\n/, `---\n${newFields}\n`);
          } else {
            // Add frontmatter at the start
            content = `---\n${newFields}\n---\n\n${content}`;
          }

          // Write updated content atomically (temp file + rename)
          const tempPath = fullPath + ".tmp";
          fs.writeFileSync(tempPath, content);
          fs.renameSync(tempPath, fullPath);
          modified = true;
        } catch (stateErr) {
          // State file missing or invalid - continue without IDs
        }
      }
    }

    // Store session affinity: terminal_pid -> session_name
    const terminalPid = getTerminalShellPid();
    const sessionName = extractSessionName(fullPath);
    if (terminalPid && sessionName) {
      storeSessionAffinity(projectDir, terminalPid, sessionName);
    }

    // Always trigger indexing (idempotent, will upsert)
    const indexScript = path.join(projectDir, "scripts", "artifact_index.py");

    if (fs.existsSync(indexScript)) {
      const child = spawn(
        "uv",
        ["run", "python", indexScript, "--file", fullPath],
        {
          cwd: projectDir,
          detached: true,
          stdio: "ignore",
        },
      );
      child.unref();
    }

    console.log(JSON.stringify({ result: "continue" }));
  } catch (err) {
    // Don't block on errors
    console.log(JSON.stringify({ result: "continue" }));
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

main().catch(console.error);
