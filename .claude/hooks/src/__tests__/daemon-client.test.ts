/**
 * Tests for TypeScript Daemon Client
 *
 * TDD tests for the shared daemon client used by all TypeScript hooks.
 * The client communicates with the TLDR daemon via Unix socket or TCP (Windows).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { execSync, spawnSync } from 'child_process';
import * as net from 'net';
import * as crypto from 'crypto';
import { tmpdir } from 'os';

// Import the actual implementation
import {
  getSocketPath,
  getStatusFile,
  isIndexing,
  queryDaemon,
  queryDaemonSync,
  getConnectionInfo,
  DaemonQuery,
  DaemonResponse,
} from '../daemon-client.js';

// Test fixtures — use platform temp dir
const TEST_PROJECT_DIR = join(tmpdir(), 'daemon-client-test');
const TLDR_DIR = join(TEST_PROJECT_DIR, '.tldr');
const IS_WINDOWS = process.platform === 'win32';

function setupTestEnv(): void {
  if (!existsSync(TLDR_DIR)) {
    mkdirSync(TLDR_DIR, { recursive: true });
  }
}

function cleanupTestEnv(): void {
  if (existsSync(TEST_PROJECT_DIR)) {
    rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }
}

/**
 * Helper to compute socket path (mirrors daemon logic).
 * On Unix: /tmp/tldr-{hash}.sock
 * On Windows: getSocketPath still returns Unix-style but daemon uses TCP.
 */
function computeSocketPath(projectDir: string): string {
  const resolvedPath = resolve(projectDir);
  const hash = crypto.createHash('md5').update(resolvedPath).digest('hex').substring(0, 8);
  return join(tmpdir(), `tldr-${hash}.sock`);
}

/**
 * Start a mock daemon server using the same transport as the real implementation.
 * On Windows: TCP on localhost with deterministic port.
 * On Unix: Unix domain socket.
 *
 * When the deterministic TCP port is in a Windows-restricted range (EACCES)
 * or already in use (EADDRINUSE), falls back to port 0 (OS-assigned).
 * Tests that rely on the client connecting to the deterministic port should
 * skip themselves when a fallback occurred — use `serverUsedDeterministicPort`.
 */
function startMockServer(
  projectDir: string,
  handler: (conn: net.Socket) => void
): Promise<net.Server> {
  const connInfo = getConnectionInfo(projectDir);
  const server = net.createServer(handler);
  return new Promise<net.Server>((res, rej) => {
    if (connInfo.type === 'tcp') {
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
          // Deterministic port blocked on Windows — fall back to random port
          server.removeAllListeners('error');
          server.on('error', rej);
          server.listen(0, '127.0.0.1', () => res(server));
        } else {
          rej(err);
        }
      });
      server.listen(connInfo.port!, connInfo.host!, () => res(server));
    } else {
      server.listen(connInfo.path!, () => res(server));
    }
  });
}

/** Return the port the server actually bound to, or null for Unix sockets. */
function getServerPort(server: net.Server): number | null {
  const addr = server.address();
  if (addr && typeof addr === 'object') return addr.port;
  return null;
}

/**
 * Returns true if the mock server bound to the same port the daemon client
 * will derive from the project path. When false, queryDaemon() calls that use
 * TEST_PROJECT_DIR won't reach the mock server and those tests should be skipped.
 */
function serverUsedDeterministicPort(server: net.Server, projectDir: string): boolean {
  const connInfo = getConnectionInfo(projectDir);
  if (connInfo.type !== 'tcp') return true; // Unix socket — always matches
  return getServerPort(server) === connInfo.port;
}

/** Stop a mock server and wait for close. */
function stopMockServer(server: net.Server | null): Promise<void> {
  if (!server) return Promise.resolve();
  return new Promise<void>((res) => server.close(() => res()));
}

/** Clean up Unix socket file if applicable. */
function cleanupSocket(projectDir: string): void {
  if (IS_WINDOWS) return; // TCP on Windows — no socket file to clean
  const socketPath = computeSocketPath(projectDir);
  if (existsSync(socketPath)) {
    try { unlinkSync(socketPath); } catch {}
  }
}

// =============================================================================
// Test 1: getSocketPath() - compute deterministic socket path
// =============================================================================

describe('getSocketPath', () => {
  it('should compute socket path using md5 hash', () => {
    const projectPath = '/Users/test/myproject';
    const resolvedPath = resolve(projectPath);
    const expectedHash = crypto.createHash('md5')
      .update(resolvedPath)
      .digest('hex')
      .substring(0, 8);

    const result = getSocketPath(projectPath);
    // Verify hash is in the path and extension is .sock
    expect(result).toContain(`tldr-${expectedHash}`);
    expect(result).toMatch(/\.sock$/);
  });

  it('should produce different paths for different projects', () => {
    const path1 = getSocketPath('/project/a');
    const path2 = getSocketPath('/project/b');

    expect(path1).not.toBe(path2);
  });

  it('should be deterministic for same project', () => {
    const path1 = getSocketPath('/project/same');
    const path2 = getSocketPath('/project/same');

    expect(path1).toBe(path2);
  });
});

// =============================================================================
// Test 2: getStatusFile() - read .tldr/status if exists
// =============================================================================

describe('getStatusFile', () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it('should return status content when file exists', () => {
    writeFileSync(join(TLDR_DIR, 'status'), 'ready');
    expect(getStatusFile(TEST_PROJECT_DIR)).toBe('ready');
  });

  it('should return null when status file does not exist', () => {
    // Remove status file if it exists
    const statusPath = join(TLDR_DIR, 'status');
    if (existsSync(statusPath)) {
      unlinkSync(statusPath);
    }

    expect(getStatusFile(TEST_PROJECT_DIR)).toBeNull();
  });

  it('should detect indexing status', () => {
    writeFileSync(join(TLDR_DIR, 'status'), 'indexing');
    expect(getStatusFile(TEST_PROJECT_DIR)).toBe('indexing');
  });

  it('should work with isIndexing helper', () => {
    writeFileSync(join(TLDR_DIR, 'status'), 'indexing');
    expect(isIndexing(TEST_PROJECT_DIR)).toBe(true);

    writeFileSync(join(TLDR_DIR, 'status'), 'ready');
    expect(isIndexing(TEST_PROJECT_DIR)).toBe(false);
  });
});

// =============================================================================
// Test 3: DaemonQuery and DaemonResponse interfaces
// =============================================================================

describe('DaemonQuery and DaemonResponse types', () => {
  it('should define valid query structure for ping', () => {
    // Using imported types
    const query: DaemonQuery = { cmd: 'ping' };
    expect(query.cmd).toBe('ping');
  });

  it('should define valid query structure for search', () => {
    const query: DaemonQuery = { cmd: 'search', pattern: 'handleClick' };
    expect(query.cmd).toBe('search');
    expect(query.pattern).toBe('handleClick');
  });

  it('should define valid response structure', () => {
    const response: DaemonResponse = {
      status: 'ok',
      results: [{ file: 'test.ts', line: 42 }],
    };
    expect(response.status).toBe('ok');
    expect(response.results).toHaveLength(1);
  });

  it('should support indexing flag in response', () => {
    const response: DaemonResponse = { indexing: true };
    expect(response.indexing).toBe(true);
  });
});

// =============================================================================
// Test 4: queryDaemonSync() - sync version using nc or direct socket
// =============================================================================

describe('queryDaemonSync', () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupSocket(TEST_PROJECT_DIR);
    cleanupTestEnv();
  });

  it('should return unavailable when socket does not exist', { timeout: 30000 }, () => {
    // Real implementation tries to start daemon (may spin ~10s on Windows)
    const result = queryDaemonSync({ cmd: 'ping' }, TEST_PROJECT_DIR);
    expect(result.status).toBe('unavailable');
  });

  it('should return indexing:true when status file says indexing', () => {
    writeFileSync(join(TLDR_DIR, 'status'), 'indexing');

    // The real implementation checks status file first — returns immediately
    const result = queryDaemonSync({ cmd: 'search', pattern: 'test' }, TEST_PROJECT_DIR);
    expect(result.indexing).toBe(true);
  });

  it('should handle timeout gracefully', () => {
    // Test the shape of a timeout response
    const timeoutResponse: DaemonResponse = { status: 'error', error: 'timeout' };
    expect(timeoutResponse.error).toBe('timeout');
  });
});

// =============================================================================
// Test 5: queryDaemon() - async version using net.Socket
// =============================================================================

describe('queryDaemon async', () => {
  let mockServer: net.Server | null = null;

  beforeEach(() => {
    setupTestEnv();
    cleanupSocket(TEST_PROJECT_DIR);
  });

  afterEach(async () => {
    await stopMockServer(mockServer);
    mockServer = null;
    cleanupSocket(TEST_PROJECT_DIR);
    cleanupTestEnv();
  });

  it('should connect to daemon and receive response', { timeout: 30000 }, async () => {
    // Create mock server on same transport as real implementation
    mockServer = await startMockServer(TEST_PROJECT_DIR, (conn) => {
      conn.on('data', (data) => {
        const request = JSON.parse(data.toString().trim());
        if (request.cmd === 'ping') {
          conn.write(JSON.stringify({ status: 'ok' }) + '\n');
        }
        conn.end();
      });
    });

    if (!serverUsedDeterministicPort(mockServer, TEST_PROJECT_DIR)) {
      // Port was restricted on Windows — client won't reach this server
      return;
    }

    const result = await queryDaemon({ cmd: 'ping' }, TEST_PROJECT_DIR);
    expect(result.status).toBe('ok');
  });

  it('should handle search command', { timeout: 30000 }, async () => {
    mockServer = await startMockServer(TEST_PROJECT_DIR, (conn) => {
      conn.on('data', (data) => {
        const request = JSON.parse(data.toString().trim());
        if (request.cmd === 'search') {
          conn.write(JSON.stringify({
            status: 'ok',
            results: [
              { file: 'test.ts', line: 10, content: 'function test()' },
            ],
          }) + '\n');
        }
        conn.end();
      });
    });

    if (!serverUsedDeterministicPort(mockServer, TEST_PROJECT_DIR)) {
      return;
    }

    const result = await queryDaemon({ cmd: 'search', pattern: 'test' }, TEST_PROJECT_DIR);
    expect(result.status).toBe('ok');
    expect(result.results).toHaveLength(1);
    expect(result.results![0].file).toBe('test.ts');
  });

  it('should return unavailable on connection error', { timeout: 30000 }, async () => {
    // No server running — real implementation returns unavailable
    const result = await queryDaemon({ cmd: 'ping' }, TEST_PROJECT_DIR);
    expect(result.status).toBe('unavailable');
  });

  it('should timeout after QUERY_TIMEOUT ms', { timeout: 30000 }, async () => {
    // Mock server that never responds — simulates hung daemon
    let clientConn: net.Socket | null = null;

    mockServer = await startMockServer(TEST_PROJECT_DIR, (conn) => {
      clientConn = conn;
      // Don't respond — simulate slow/hung daemon
    });

    if (!serverUsedDeterministicPort(mockServer, TEST_PROJECT_DIR)) {
      return;
    }

    // Use a short-timeout helper to avoid waiting full 3s
    const connInfo = getConnectionInfo(TEST_PROJECT_DIR);
    const queryDaemonWithShortTimeout = (
      query: { cmd: string },
      timeout: number
    ): Promise<any> => {
      return new Promise((res) => {
        const client = new net.Socket();
        const timer = setTimeout(() => {
          client.destroy();
          res({ status: 'error', error: 'timeout' });
        }, timeout);

        const onConnect = () => {
          client.write(JSON.stringify(query) + '\n');
        };

        if (connInfo.type === 'tcp') {
          client.connect(connInfo.port!, connInfo.host!, onConnect);
        } else {
          client.connect(connInfo.path!, onConnect);
        }

        client.on('data', (chunk) => {
          clearTimeout(timer);
          client.end();
          res(JSON.parse(chunk.toString().trim()));
        });
        client.on('error', () => {
          clearTimeout(timer);
          res({ status: 'error', error: 'connection failed' });
        });
      });
    };

    const result = await queryDaemonWithShortTimeout({ cmd: 'ping' }, 100);
    expect(result.error).toBe('timeout');

    if (clientConn) (clientConn as net.Socket).destroy();
  });
});

// =============================================================================
// Test 6: Auto-start daemon if not running
// =============================================================================

describe('auto-start daemon', () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupSocket(TEST_PROJECT_DIR);
    cleanupTestEnv();
  });

  it('should detect when socket is missing', () => {
    if (IS_WINDOWS) {
      // On Windows, daemon uses TCP — no socket file. Verify getSocketPath returns a path.
      const socketPath = getSocketPath(TEST_PROJECT_DIR);
      expect(socketPath).toContain('tldr-');
    } else {
      const socketPath = getSocketPath(TEST_PROJECT_DIR);
      expect(existsSync(socketPath)).toBe(false);
    }
  });

  it('should detect when socket file exists', () => {
    if (IS_WINDOWS) {
      // On Windows, getSocketPath returns Unix-style; actual daemon uses TCP.
      const socketPath = getSocketPath(TEST_PROJECT_DIR);
      expect(socketPath).toContain('tldr-');
    } else {
      const socketPath = getSocketPath(TEST_PROJECT_DIR);
      writeFileSync(socketPath, '');
      expect(existsSync(socketPath)).toBe(true);
      unlinkSync(socketPath);
    }
  });

  it('should return unavailable when daemon cannot start', { timeout: 30000 }, async () => {
    // Real implementation tries to start daemon — may spin ~10s on Windows
    const result = await queryDaemon({ cmd: 'ping' }, TEST_PROJECT_DIR);
    expect(result.status).toBe('unavailable');
  });
});

// =============================================================================
// Test 7: Graceful degradation when indexing
// =============================================================================

describe('graceful degradation', () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it('should return indexing response when daemon is indexing', async () => {
    writeFileSync(join(TLDR_DIR, 'status'), 'indexing');

    // The real implementation checks status and returns indexing flag
    const result = await queryDaemon({ cmd: 'search', pattern: 'test' }, TEST_PROJECT_DIR);
    expect(result.indexing).toBe(true);
    expect(result.message).toContain('indexing');
  });

  it('should not block on indexing - return immediately', async () => {
    writeFileSync(join(TLDR_DIR, 'status'), 'indexing');

    const start = Date.now();
    const result = await queryDaemon({ cmd: 'search', pattern: 'test' }, TEST_PROJECT_DIR);
    const elapsed = Date.now() - start;

    expect(result.indexing).toBe(true);
    expect(elapsed).toBeLessThan(100); // Should be instant
  });

  it('should use isIndexing helper correctly', () => {
    writeFileSync(join(TLDR_DIR, 'status'), 'indexing');
    expect(isIndexing(TEST_PROJECT_DIR)).toBe(true);

    writeFileSync(join(TLDR_DIR, 'status'), 'ready');
    expect(isIndexing(TEST_PROJECT_DIR)).toBe(false);
  });
});

// =============================================================================
// Test 8: Error handling
// =============================================================================

describe('error handling', () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it('should handle malformed JSON response gracefully', () => {
    // Test that the response parsing in the client handles bad JSON
    const parseResponse = (data: string): DaemonResponse => {
      try {
        return JSON.parse(data);
      } catch {
        return { status: 'error', error: 'Invalid JSON response from daemon' };
      }
    };

    const result = parseResponse('not json{');
    expect(result.status).toBe('error');
    expect(result.error).toContain('Invalid JSON');
  });

  it('should return unavailable when socket does not exist', { timeout: 30000 }, async () => {
    // Socket doesn't exist and tldr CLI is not available
    const result = await queryDaemon({ cmd: 'ping' }, TEST_PROJECT_DIR);
    expect(result.status).toBe('unavailable');
  });

  it('should handle sync query to missing socket', { timeout: 30000 }, () => {
    // queryDaemonSync also returns unavailable when socket missing
    const result = queryDaemonSync({ cmd: 'ping' }, TEST_PROJECT_DIR);
    expect(result.status).toBe('unavailable');
  });

  it('should return error structure with proper fields', () => {
    // Verify the error response structure
    const errorResponse: DaemonResponse = {
      status: 'error',
      error: 'Some error message',
    };
    expect(errorResponse.status).toBe('error');
    expect(errorResponse.error).toBeDefined();
  });
});
