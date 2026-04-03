/**
 * Shared TypeScript client for TLDR daemon.
 *
 * Used by all TypeScript hooks to query the TLDR daemon instead of
 * spawning individual `tldr` processes. This provides:
 * - Faster queries (daemon holds indexes in memory)
 * - Reduced process overhead
 * - Consistent timeout handling
 * - Auto-start capability
 * - Graceful degradation when indexing
 */
import { existsSync, readFileSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { join } from "path";
import * as net from "net";
import * as crypto from "crypto";
/** Query timeout in milliseconds (3 seconds) */
const QUERY_TIMEOUT = 3000;
/**
 * Get connection info based on platform.
 * Mirrors the Python daemon's logic.
 *
 * @param projectDir - Absolute path to project directory
 * @returns Connection info for Unix socket or TCP
 */
export function getConnectionInfo(projectDir) {
  const hash = crypto
    .createHash("md5")
    .update(projectDir)
    .digest("hex")
    .substring(0, 8);
  if (process.platform === "win32") {
    // TCP on localhost with deterministic port
    const port = 49152 + (parseInt(hash, 16) % 10000);
    return { type: "tcp", host: "127.0.0.1", port };
  } else {
    // Unix socket
    return { type: "unix", path: `/tmp/tldr-${hash}.sock` };
  }
}
/**
 * Compute deterministic socket path from project path.
 * Mirrors the Python daemon's logic: /tmp/tldr-{md5(path)[:8]}.sock
 *
 * @param projectDir - Absolute path to project directory
 * @returns Socket path string (Unix only, use getConnectionInfo for cross-platform)
 */
export function getSocketPath(projectDir) {
  const hash = crypto
    .createHash("md5")
    .update(projectDir)
    .digest("hex")
    .substring(0, 8);
  return `/tmp/tldr-${hash}.sock`;
}
/**
 * Read daemon status from .tldr/status file.
 *
 * @param projectDir - Project directory path
 * @returns Status string ('ready', 'indexing', 'stopped') or null if no status file
 */
export function getStatusFile(projectDir) {
  const statusPath = join(projectDir, ".tldr", "status");
  if (existsSync(statusPath)) {
    try {
      return readFileSync(statusPath, "utf-8").trim();
    } catch {
      return null;
    }
  }
  return null;
}
/**
 * Check if daemon is currently indexing.
 *
 * @param projectDir - Project directory path
 * @returns true if daemon is indexing
 */
export function isIndexing(projectDir) {
  return getStatusFile(projectDir) === "indexing";
}
/**
 * Check if daemon is reachable (platform-aware).
 *
 * @param projectDir - Project directory path
 * @returns true if daemon is reachable
 */
function isDaemonReachable(projectDir) {
  const connInfo = getConnectionInfo(projectDir);
  if (connInfo.type === "tcp") {
    // On Windows, try to connect to TCP port
    try {
      const testSocket = new net.Socket();
      testSocket.setTimeout(100);
      let connected = false;
      testSocket.on("connect", () => {
        connected = true;
        testSocket.destroy();
      });
      testSocket.on("error", () => {
        testSocket.destroy();
      });
      testSocket.connect(connInfo.port, connInfo.host);
      // Give it a moment
      const end = Date.now() + 200;
      while (Date.now() < end && !connected) {
        // spin
      }
      return connected;
    } catch {
      return false;
    }
  } else {
    // Unix socket - check file exists
    return existsSync(connInfo.path);
  }
}
/**
 * Try to start the daemon for a project.
 *
 * @param projectDir - Project directory path
 * @returns true if start was attempted successfully
 */
export function tryStartDaemon(projectDir) {
  try {
    // Try using the tldr CLI to start the daemon
    spawnSync("tldr", ["daemon", "start", "--project", projectDir], {
      timeout: 5000,
      stdio: "ignore",
    });
    // Give daemon a moment to start
    const start = Date.now();
    while (Date.now() - start < 2000) {
      if (isDaemonReachable(projectDir)) {
        return true;
      }
      // Busy wait (small delay)
      const end = Date.now() + 50;
      while (Date.now() < end) {
        // spin
      }
    }
    return isDaemonReachable(projectDir);
  } catch {
    return false;
  }
}
/**
 * Query the daemon asynchronously using net.Socket.
 *
 * @param query - Query to send to daemon
 * @param projectDir - Project directory path
 * @returns Promise resolving to daemon response
 */
export function queryDaemon(query, projectDir) {
  return new Promise((resolve, reject) => {
    // Check if indexing - return early with indexing flag
    if (isIndexing(projectDir)) {
      resolve({
        indexing: true,
        status: "indexing",
        message: "Daemon is still indexing, results may be incomplete",
      });
      return;
    }
    const connInfo = getConnectionInfo(projectDir);
    // Check if daemon is reachable
    if (!isDaemonReachable(projectDir)) {
      // Try to start daemon
      if (!tryStartDaemon(projectDir)) {
        resolve({
          status: "unavailable",
          error: "Daemon not running and could not start",
        });
        return;
      }
    }
    const client = new net.Socket();
    let data = "";
    let resolved = false;
    // Timeout handling
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.destroy();
        resolve({ status: "error", error: "timeout" });
      }
    }, QUERY_TIMEOUT);
    // Connect based on platform
    if (connInfo.type === "tcp") {
      client.connect(connInfo.port, connInfo.host, () => {
        client.write(JSON.stringify(query) + "\n");
      });
    } else {
      client.connect(connInfo.path, () => {
        client.write(JSON.stringify(query) + "\n");
      });
    }
    client.on("data", (chunk) => {
      data += chunk.toString();
      if (data.includes("\n")) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          client.end();
          try {
            resolve(JSON.parse(data.trim()));
          } catch {
            resolve({
              status: "error",
              error: "Invalid JSON response from daemon",
            });
          }
        }
      }
    });
    client.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        if (
          err.message.includes("ECONNREFUSED") ||
          err.message.includes("ENOENT")
        ) {
          resolve({ status: "unavailable", error: "Daemon not running" });
        } else {
          resolve({ status: "error", error: err.message });
        }
      }
    });
    client.on("close", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        if (data) {
          try {
            resolve(JSON.parse(data.trim()));
          } catch {
            resolve({ status: "error", error: "Incomplete response" });
          }
        } else {
          resolve({
            status: "error",
            error: "Connection closed without response",
          });
        }
      }
    });
  });
}
/**
 * Query the daemon synchronously using nc (netcat) or PowerShell (Windows).
 * Fallback for contexts where async is not available.
 *
 * @param query - Query to send to daemon
 * @param projectDir - Project directory path
 * @returns Daemon response
 */
export function queryDaemonSync(query, projectDir) {
  // Check if indexing - return early with indexing flag
  if (isIndexing(projectDir)) {
    return {
      indexing: true,
      status: "indexing",
      message: "Daemon is still indexing, results may be incomplete",
    };
  }
  const connInfo = getConnectionInfo(projectDir);
  // Check if daemon is reachable
  if (!isDaemonReachable(projectDir)) {
    // Try to start daemon
    if (!tryStartDaemon(projectDir)) {
      return {
        status: "unavailable",
        error: "Daemon not running and could not start",
      };
    }
  }
  try {
    const input = JSON.stringify(query);
    let result;
    if (connInfo.type === "tcp") {
      // Windows: Use PowerShell to communicate with TCP socket
      const psCommand = `
        $client = New-Object System.Net.Sockets.TcpClient('${connInfo.host}', ${connInfo.port})
        $stream = $client.GetStream()
        $writer = New-Object System.IO.StreamWriter($stream)
        $reader = New-Object System.IO.StreamReader($stream)
        $writer.WriteLine('${input.replace(/'/g, "''")}')
        $writer.Flush()
        $response = $reader.ReadLine()
        $client.Close()
        Write-Output $response
      `.trim();
      result = execSync(
        `powershell -Command "${psCommand.replace(/"/g, '\\"')}"`,
        {
          encoding: "utf-8",
          timeout: QUERY_TIMEOUT,
        },
      );
    } else {
      // Unix: Use nc (netcat) to communicate with Unix socket
      // echo '{"cmd":"ping"}' | nc -U /tmp/tldr-xxx.sock
      result = execSync(`echo '${input}' | nc -U "${connInfo.path}"`, {
        encoding: "utf-8",
        timeout: QUERY_TIMEOUT,
      });
    }
    return JSON.parse(result.trim());
  } catch (err) {
    if (err.killed) {
      return { status: "error", error: "timeout" };
    }
    if (
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("ENOENT")
    ) {
      return { status: "unavailable", error: "Daemon not running" };
    }
    return { status: "error", error: err.message || "Unknown error" };
  }
}
/**
 * Convenience function to ping the daemon.
 *
 * @param projectDir - Project directory path
 * @returns true if daemon responds to ping
 */
export async function pingDaemon(projectDir) {
  const response = await queryDaemon({ cmd: "ping" }, projectDir);
  return response.status === "ok";
}
/**
 * Convenience function to search using the daemon.
 *
 * @param pattern - Search pattern
 * @param projectDir - Project directory path
 * @param maxResults - Maximum results to return
 * @returns Search results or empty array
 */
export async function searchDaemon(pattern, projectDir, maxResults = 100) {
  const response = await queryDaemon(
    { cmd: "search", pattern, max_results: maxResults },
    projectDir,
  );
  return response.results || [];
}
/**
 * Convenience function to get impact analysis (callers of a function).
 *
 * @param funcName - Function name to analyze
 * @param projectDir - Project directory path
 * @returns Array of callers or empty array
 */
export async function impactDaemon(funcName, projectDir) {
  const response = await queryDaemon(
    { cmd: "impact", func: funcName },
    projectDir,
  );
  return response.callers || [];
}
/**
 * Convenience function to extract file info.
 *
 * @param filePath - Path to file to extract
 * @param projectDir - Project directory path
 * @returns Extraction result or null
 */
export async function extractDaemon(filePath, projectDir) {
  const response = await queryDaemon(
    { cmd: "extract", file: filePath },
    projectDir,
  );
  return response.result || null;
}
/**
 * Get daemon status.
 *
 * @param projectDir - Project directory path
 * @returns Status response
 */
export async function statusDaemon(projectDir) {
  return queryDaemon({ cmd: "status" }, projectDir);
}
/**
 * Convenience function for dead code analysis.
 *
 * @param projectDir - Project directory path
 * @param entryPoints - Optional list of entry point patterns to exclude
 * @param language - Language to analyze (default: python)
 * @returns Dead code analysis result
 */
export async function deadCodeDaemon(
  projectDir,
  entryPoints,
  language = "python",
) {
  const response = await queryDaemon(
    { cmd: "dead", entry_points: entryPoints, language },
    projectDir,
  );
  return response.result || response;
}
/**
 * Convenience function for architecture analysis.
 *
 * @param projectDir - Project directory path
 * @param language - Language to analyze (default: python)
 * @returns Architecture analysis result
 */
export async function archDaemon(projectDir, language = "python") {
  const response = await queryDaemon({ cmd: "arch", language }, projectDir);
  return response.result || response;
}
/**
 * Convenience function for CFG extraction.
 *
 * @param filePath - Path to source file
 * @param funcName - Function name to analyze
 * @param projectDir - Project directory path
 * @param language - Language (default: python)
 * @returns CFG result
 */
export async function cfgDaemon(
  filePath,
  funcName,
  projectDir,
  language = "python",
) {
  const response = await queryDaemon(
    { cmd: "cfg", file: filePath, function: funcName, language },
    projectDir,
  );
  return response.result || response;
}
/**
 * Convenience function for DFG extraction.
 *
 * @param filePath - Path to source file
 * @param funcName - Function name to analyze
 * @param projectDir - Project directory path
 * @param language - Language (default: python)
 * @returns DFG result
 */
export async function dfgDaemon(
  filePath,
  funcName,
  projectDir,
  language = "python",
) {
  const response = await queryDaemon(
    { cmd: "dfg", file: filePath, function: funcName, language },
    projectDir,
  );
  return response.result || response;
}
/**
 * Convenience function for program slicing.
 *
 * @param filePath - Path to source file
 * @param funcName - Function name
 * @param line - Line number to slice from
 * @param projectDir - Project directory path
 * @param direction - backward or forward (default: backward)
 * @param variable - Optional variable to track
 * @returns Slice result with lines array
 */
export async function sliceDaemon(
  filePath,
  funcName,
  line,
  projectDir,
  direction = "backward",
  variable,
) {
  const response = await queryDaemon(
    {
      cmd: "slice",
      file: filePath,
      function: funcName,
      line,
      direction,
      variable,
    },
    projectDir,
  );
  return response;
}
/**
 * Convenience function for building call graph.
 *
 * @param projectDir - Project directory path
 * @param language - Language (default: python)
 * @returns Call graph result
 */
export async function callsDaemon(projectDir, language = "python") {
  const response = await queryDaemon({ cmd: "calls", language }, projectDir);
  return response.result || response;
}
/**
 * Convenience function for cache warming.
 *
 * @param projectDir - Project directory path
 * @param language - Language (default: python)
 * @returns Warm result with file/edge counts
 */
export async function warmDaemon(projectDir, language = "python") {
  return queryDaemon({ cmd: "warm", language }, projectDir);
}
/**
 * Convenience function for semantic search.
 *
 * @param projectDir - Project directory path
 * @param query - Search query
 * @param k - Number of results (default: 10)
 * @returns Search results
 */
export async function semanticSearchDaemon(projectDir, query, k = 10) {
  const response = await queryDaemon(
    { cmd: "semantic", action: "search", query, k },
    projectDir,
  );
  return response.results || [];
}
/**
 * Convenience function for semantic indexing.
 *
 * @param projectDir - Project directory path
 * @param language - Language (default: python)
 * @returns Index result with count
 */
export async function semanticIndexDaemon(projectDir, language = "python") {
  return queryDaemon(
    { cmd: "semantic", action: "index", language },
    projectDir,
  );
}
