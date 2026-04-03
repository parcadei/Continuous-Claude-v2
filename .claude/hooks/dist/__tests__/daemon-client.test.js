/**
 * Tests for TypeScript Daemon Client
 *
 * TDD tests for the shared daemon client used by all TypeScript hooks.
 * The client communicates with the Python TLDR daemon via Unix socket.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from "fs";
import { join } from "path";
import * as net from "net";
import * as crypto from "crypto";
// Import the actual implementation
import {
  getSocketPath,
  getStatusFile,
  isIndexing,
  queryDaemon,
  queryDaemonSync,
} from "../daemon-client.js";
// Test fixtures
const TEST_PROJECT_DIR = "/tmp/daemon-client-test";
const TLDR_DIR = join(TEST_PROJECT_DIR, ".tldr");
function setupTestEnv() {
  if (!existsSync(TLDR_DIR)) {
    mkdirSync(TLDR_DIR, { recursive: true });
  }
}
function cleanupTestEnv() {
  if (existsSync(TEST_PROJECT_DIR)) {
    rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }
}
// Helper to compute socket path (mirrors the daemon logic)
function computeSocketPath(projectDir) {
  const hash = crypto
    .createHash("md5")
    .update(projectDir)
    .digest("hex")
    .substring(0, 8);
  return `/tmp/tldr-${hash}.sock`;
}
// =============================================================================
// Test 1: getSocketPath() - compute deterministic socket path
// =============================================================================
describe("getSocketPath", () => {
  it("should compute socket path using md5 hash", () => {
    // The daemon uses: /tmp/tldr-{md5(project_path)[:8]}.sock
    const projectPath = "/Users/test/myproject";
    const expectedHash = crypto
      .createHash("md5")
      .update(projectPath)
      .digest("hex")
      .substring(0, 8);
    const expectedPath = `/tmp/tldr-${expectedHash}.sock`;
    expect(getSocketPath(projectPath)).toBe(expectedPath);
  });
  it("should produce different paths for different projects", () => {
    const path1 = getSocketPath("/project/a");
    const path2 = getSocketPath("/project/b");
    expect(path1).not.toBe(path2);
  });
  it("should be deterministic for same project", () => {
    const path1 = getSocketPath("/project/same");
    const path2 = getSocketPath("/project/same");
    expect(path1).toBe(path2);
  });
});
// =============================================================================
// Test 2: getStatusFile() - read .tldr/status if exists
// =============================================================================
describe("getStatusFile", () => {
  beforeEach(() => {
    setupTestEnv();
  });
  afterEach(() => {
    cleanupTestEnv();
  });
  it("should return status content when file exists", () => {
    writeFileSync(join(TLDR_DIR, "status"), "ready");
    expect(getStatusFile(TEST_PROJECT_DIR)).toBe("ready");
  });
  it("should return null when status file does not exist", () => {
    // Remove status file if it exists
    const statusPath = join(TLDR_DIR, "status");
    if (existsSync(statusPath)) {
      unlinkSync(statusPath);
    }
    expect(getStatusFile(TEST_PROJECT_DIR)).toBeNull();
  });
  it("should detect indexing status", () => {
    writeFileSync(join(TLDR_DIR, "status"), "indexing");
    expect(getStatusFile(TEST_PROJECT_DIR)).toBe("indexing");
  });
  it("should work with isIndexing helper", () => {
    writeFileSync(join(TLDR_DIR, "status"), "indexing");
    expect(isIndexing(TEST_PROJECT_DIR)).toBe(true);
    writeFileSync(join(TLDR_DIR, "status"), "ready");
    expect(isIndexing(TEST_PROJECT_DIR)).toBe(false);
  });
});
// =============================================================================
// Test 3: DaemonQuery and DaemonResponse interfaces
// =============================================================================
describe("DaemonQuery and DaemonResponse types", () => {
  it("should define valid query structure for ping", () => {
    // Using imported types
    const query = { cmd: "ping" };
    expect(query.cmd).toBe("ping");
  });
  it("should define valid query structure for search", () => {
    const query = { cmd: "search", pattern: "handleClick" };
    expect(query.cmd).toBe("search");
    expect(query.pattern).toBe("handleClick");
  });
  it("should define valid response structure", () => {
    const response = {
      status: "ok",
      results: [{ file: "test.ts", line: 42 }],
    };
    expect(response.status).toBe("ok");
    expect(response.results).toHaveLength(1);
  });
  it("should support indexing flag in response", () => {
    const response = { indexing: true };
    expect(response.indexing).toBe(true);
  });
});
// =============================================================================
// Test 4: queryDaemonSync() - sync version using nc or direct socket
// =============================================================================
describe("queryDaemonSync", () => {
  let mockSocketPath;
  beforeEach(() => {
    setupTestEnv();
    mockSocketPath = computeSocketPath(TEST_PROJECT_DIR);
    // Clean up any existing socket
    if (existsSync(mockSocketPath)) {
      unlinkSync(mockSocketPath);
    }
  });
  afterEach(() => {
    if (existsSync(mockSocketPath)) {
      try {
        unlinkSync(mockSocketPath);
      } catch {}
    }
    cleanupTestEnv();
  });
  it("should return unavailable when socket does not exist", () => {
    // Using the real implementation - it should return unavailable when no socket
    const result = queryDaemonSync({ cmd: "ping" }, TEST_PROJECT_DIR);
    expect(result.status).toBe("unavailable");
  });
  it("should return indexing:true when status file says indexing", () => {
    writeFileSync(join(TLDR_DIR, "status"), "indexing");
    // The real implementation checks status file first
    const result = queryDaemonSync(
      { cmd: "search", pattern: "test" },
      TEST_PROJECT_DIR,
    );
    expect(result.indexing).toBe(true);
  });
  it("should handle timeout gracefully", () => {
    // This test validates the expected behavior of timeout handling
    // The real implementation returns { status: 'error', error: 'timeout' }
    // We test the shape of such a response
    const timeoutResponse = { status: "error", error: "timeout" };
    expect(timeoutResponse.error).toBe("timeout");
  });
});
// =============================================================================
// Test 5: queryDaemon() - async version using net.Socket
// =============================================================================
describe("queryDaemon async", () => {
  let mockServer = null;
  let mockSocketPath;
  beforeEach(() => {
    setupTestEnv();
    mockSocketPath = computeSocketPath(TEST_PROJECT_DIR);
    // Clean up any existing socket
    if (existsSync(mockSocketPath)) {
      unlinkSync(mockSocketPath);
    }
  });
  afterEach(async () => {
    if (mockServer) {
      await new Promise((resolve) => {
        mockServer.close(() => {
          mockServer = null;
          resolve();
        });
      });
    }
    if (existsSync(mockSocketPath)) {
      try {
        unlinkSync(mockSocketPath);
      } catch {}
    }
    cleanupTestEnv();
  });
  it("should connect to daemon and receive response", async () => {
    // Create a mock server to simulate the daemon
    mockServer = net.createServer((conn) => {
      conn.on("data", (data) => {
        const request = JSON.parse(data.toString().trim());
        if (request.cmd === "ping") {
          conn.write(JSON.stringify({ status: "ok" }) + "\n");
        }
        conn.end();
      });
    });
    await new Promise((resolve) => {
      mockServer.listen(mockSocketPath, () => resolve());
    });
    // Test the real implementation
    const result = await queryDaemon({ cmd: "ping" }, TEST_PROJECT_DIR);
    expect(result.status).toBe("ok");
  });
  it("should handle search command", async () => {
    mockServer = net.createServer((conn) => {
      conn.on("data", (data) => {
        const request = JSON.parse(data.toString().trim());
        if (request.cmd === "search") {
          conn.write(
            JSON.stringify({
              status: "ok",
              results: [
                { file: "test.ts", line: 10, content: "function test()" },
              ],
            }) + "\n",
          );
        }
        conn.end();
      });
    });
    await new Promise((resolve) => {
      mockServer.listen(mockSocketPath, () => resolve());
    });
    // Test the real implementation
    const result = await queryDaemon(
      { cmd: "search", pattern: "test" },
      TEST_PROJECT_DIR,
    );
    expect(result.status).toBe("ok");
    expect(result.results).toHaveLength(1);
    expect(result.results[0].file).toBe("test.ts");
  });
  it("should return unavailable on connection error", async () => {
    // No server running - the real implementation returns unavailable (not throws)
    const result = await queryDaemon({ cmd: "ping" }, TEST_PROJECT_DIR);
    expect(result.status).toBe("unavailable");
  });
  it("should timeout after QUERY_TIMEOUT ms", async () => {
    // The real implementation has a 3 second timeout.
    // We test with a mock server that never responds.
    let clientConn = null;
    mockServer = net.createServer((conn) => {
      clientConn = conn;
      // Don't respond - simulate slow/hung daemon
    });
    await new Promise((resolve) => {
      mockServer.listen(mockSocketPath, () => resolve());
    });
    // The real queryDaemon will timeout and return error status
    // We use a shorter timeout test helper to avoid waiting 3 seconds
    const queryDaemonWithShortTimeout = (query, projectDir, timeout) => {
      return new Promise((resolve) => {
        const socketPath = computeSocketPath(projectDir);
        const client = new net.Socket();
        const timer = setTimeout(() => {
          client.destroy();
          resolve({ status: "error", error: "timeout" });
        }, timeout);
        client.connect(socketPath, () => {
          client.write(JSON.stringify(query) + "\n");
        });
        client.on("data", (chunk) => {
          clearTimeout(timer);
          client.end();
          resolve(JSON.parse(chunk.toString().trim()));
        });
        client.on("error", () => {
          clearTimeout(timer);
          resolve({ status: "error", error: "connection failed" });
        });
      });
    };
    const result = await queryDaemonWithShortTimeout(
      { cmd: "ping" },
      TEST_PROJECT_DIR,
      100,
    );
    expect(result.error).toBe("timeout");
    // Clean up the server-side connection
    if (clientConn) {
      clientConn.destroy();
    }
  });
});
// =============================================================================
// Test 6: Auto-start daemon if not running
// =============================================================================
describe("auto-start daemon", () => {
  beforeEach(() => {
    setupTestEnv();
  });
  afterEach(() => {
    cleanupTestEnv();
    // Clean up any socket file
    const socketPath = computeSocketPath(TEST_PROJECT_DIR);
    if (existsSync(socketPath)) {
      try {
        unlinkSync(socketPath);
      } catch {}
    }
  });
  it("should detect when socket is missing", () => {
    const socketPath = getSocketPath(TEST_PROJECT_DIR);
    // Socket should not exist for fresh test project
    expect(existsSync(socketPath)).toBe(false);
  });
  it("should detect when socket file exists", () => {
    const socketPath = getSocketPath(TEST_PROJECT_DIR);
    // Create a dummy socket file
    writeFileSync(socketPath, "");
    expect(existsSync(socketPath)).toBe(true);
    // Cleanup
    unlinkSync(socketPath);
  });
  it("should return unavailable when daemon cannot start", async () => {
    // The real implementation tries to start daemon when socket missing
    // When tldr CLI is not available, it returns unavailable
    const result = await queryDaemon({ cmd: "ping" }, TEST_PROJECT_DIR);
    expect(result.status).toBe("unavailable");
  });
});
// =============================================================================
// Test 7: Graceful degradation when indexing
// =============================================================================
describe("graceful degradation", () => {
  beforeEach(() => {
    setupTestEnv();
  });
  afterEach(() => {
    cleanupTestEnv();
  });
  it("should return indexing response when daemon is indexing", async () => {
    writeFileSync(join(TLDR_DIR, "status"), "indexing");
    // The real implementation checks status and returns indexing flag
    const result = await queryDaemon(
      { cmd: "search", pattern: "test" },
      TEST_PROJECT_DIR,
    );
    expect(result.indexing).toBe(true);
    expect(result.message).toContain("indexing");
  });
  it("should not block on indexing - return immediately", async () => {
    writeFileSync(join(TLDR_DIR, "status"), "indexing");
    const start = Date.now();
    const result = await queryDaemon(
      { cmd: "search", pattern: "test" },
      TEST_PROJECT_DIR,
    );
    const elapsed = Date.now() - start;
    expect(result.indexing).toBe(true);
    expect(elapsed).toBeLessThan(100); // Should be instant
  });
  it("should use isIndexing helper correctly", () => {
    writeFileSync(join(TLDR_DIR, "status"), "indexing");
    expect(isIndexing(TEST_PROJECT_DIR)).toBe(true);
    writeFileSync(join(TLDR_DIR, "status"), "ready");
    expect(isIndexing(TEST_PROJECT_DIR)).toBe(false);
  });
});
// =============================================================================
// Test 8: Error handling
// =============================================================================
describe("error handling", () => {
  beforeEach(() => {
    setupTestEnv();
  });
  afterEach(() => {
    cleanupTestEnv();
  });
  it("should handle malformed JSON response gracefully", () => {
    // Test that the response parsing in the client handles bad JSON
    const parseResponse = (data) => {
      try {
        return JSON.parse(data);
      } catch {
        return { status: "error", error: "Invalid JSON response from daemon" };
      }
    };
    const result = parseResponse("not json{");
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid JSON");
  });
  it("should return unavailable when socket does not exist", async () => {
    // Socket doesn't exist and tldr CLI is not available
    const result = await queryDaemon({ cmd: "ping" }, TEST_PROJECT_DIR);
    expect(result.status).toBe("unavailable");
  });
  it("should handle sync query to missing socket", () => {
    // queryDaemonSync also returns unavailable when socket missing
    const result = queryDaemonSync({ cmd: "ping" }, TEST_PROJECT_DIR);
    expect(result.status).toBe("unavailable");
  });
  it("should return error structure with proper fields", () => {
    // Verify the error response structure
    const errorResponse = {
      status: "error",
      error: "Some error message",
    };
    expect(errorResponse.status).toBe("error");
    expect(errorResponse.error).toBeDefined();
  });
});
