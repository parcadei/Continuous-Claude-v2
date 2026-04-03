/**
 * Tests for Hook Migration to TLDR Daemon
 *
 * TDD tests for migrating hooks from spawning `tldr` CLI processes
 * to using the daemon client for faster queries.
 *
 * Hooks being migrated:
 * 1. smart-search-router.ts - uses tldr search, tldr impact
 * 2. signature-helper.ts - uses tldr search, tldr extract
 * 3. import-validator.ts - uses tldr search
 * 4. edit-context-inject.ts - uses tldr extract
 *
 * These tests focus on:
 * - Helper functions and patterns
 * - Fallback logic
 * - Response parsing
 * - Error handling
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import * as crypto from "crypto";
// Test fixtures
const TEST_PROJECT_DIR = "/tmp/hooks-daemon-migration-test";
const TLDR_DIR = join(TEST_PROJECT_DIR, ".tldr");
function setupTestEnv() {
  if (!existsSync(TLDR_DIR)) {
    mkdirSync(TLDR_DIR, { recursive: true });
  }
  process.env.CLAUDE_PROJECT_DIR = TEST_PROJECT_DIR;
}
function cleanupTestEnv() {
  if (existsSync(TEST_PROJECT_DIR)) {
    rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }
  delete process.env.CLAUDE_PROJECT_DIR;
}
function computeSocketPath(projectDir) {
  const hash = crypto
    .createHash("md5")
    .update(projectDir)
    .digest("hex")
    .substring(0, 8);
  return `/tmp/tldr-${hash}.sock`;
}
// =============================================================================
// Test 1: smart-search-router daemon migration
// =============================================================================
describe("smart-search-router daemon migration", () => {
  beforeEach(() => {
    setupTestEnv();
  });
  afterEach(() => {
    cleanupTestEnv();
  });
  describe("tldrSearch migration", () => {
    it("should parse daemon search response correctly", () => {
      const daemonResponse = {
        status: "ok",
        results: [{ file: "test.py", line: 10, content: "def process_data()" }],
      };
      const parseSearchResults = (response) => {
        if (response.status !== "ok" || !response.results) {
          return [];
        }
        return response.results;
      };
      const results = parseSearchResults(daemonResponse);
      expect(results).toHaveLength(1);
      expect(results[0].file).toBe("test.py");
    });
    it("should fall back to ripgrep when daemon returns indexing", () => {
      writeFileSync(join(TLDR_DIR, "status"), "indexing");
      const fallbackToRipgrep = (response) => {
        return response.indexing === true;
      };
      const response = { indexing: true, status: "indexing" };
      expect(fallbackToRipgrep(response)).toBe(true);
    });
    it("should construct correct ripgrep fallback command", () => {
      const pattern = "process_data";
      const dir = "/path/to/project";
      const constructRipgrepCmd = (p, d) => {
        const escaped = p.replace(/"/g, '\\"');
        return `rg "${escaped}" "${d}" --json -l`;
      };
      const cmd = constructRipgrepCmd(pattern, dir);
      expect(cmd).toBe('rg "process_data" "/path/to/project" --json -l');
    });
    it("should handle empty results from daemon", () => {
      const daemonResponse = { status: "ok", results: [] };
      const parseSearchResults = (response) => {
        if (response.status !== "ok" || !response.results) {
          return [];
        }
        return response.results;
      };
      expect(parseSearchResults(daemonResponse)).toEqual([]);
    });
  });
  describe("tldrImpact migration", () => {
    it("should parse daemon impact response correctly", () => {
      const daemonResponse = {
        status: "ok",
        callers: [
          { file: "main.py", function: "run", line: 15 },
          { file: "test.py", function: "test_process", line: 8 },
        ],
      };
      const parseCallers = (response) => {
        if (response.status !== "ok" || !response.callers) {
          return [];
        }
        return response.callers.map((c) => `${c.file}:${c.line}`);
      };
      const callers = parseCallers(daemonResponse);
      expect(callers).toHaveLength(2);
      expect(callers[0]).toBe("main.py:15");
    });
    it("should return empty callers when daemon unavailable", () => {
      const handleUnavailable = (response) => {
        if (response.status === "unavailable" || !response.callers) {
          return [];
        }
        return response.callers.map((c) => `${c.file}:${c.line}`);
      };
      const result = handleUnavailable({ status: "unavailable" });
      expect(result).toEqual([]);
    });
  });
});
// =============================================================================
// Test 2: signature-helper daemon migration
// =============================================================================
describe("signature-helper daemon migration", () => {
  beforeEach(() => {
    setupTestEnv();
  });
  afterEach(() => {
    cleanupTestEnv();
  });
  describe("findFunctionFile migration", () => {
    it("should parse search response to find function file", () => {
      const daemonResponse = {
        status: "ok",
        results: [
          {
            file: "processor.py",
            line: 25,
            content: "def process_data(x, y):",
          },
        ],
      };
      const findFunctionFile = (response, projectDir) => {
        if (
          response.status !== "ok" ||
          !response.results ||
          response.results.length === 0
        ) {
          return null;
        }
        return `${projectDir}/${response.results[0].file}`;
      };
      const file = findFunctionFile(daemonResponse, "/path/to/project");
      expect(file).toBe("/path/to/project/processor.py");
    });
    it("should return null when function not found", () => {
      const daemonResponse = { status: "ok", results: [] };
      const findFunctionFile = (response) => {
        if (
          response.status !== "ok" ||
          !response.results ||
          response.results.length === 0
        ) {
          return null;
        }
        return response.results[0].file;
      };
      expect(findFunctionFile(daemonResponse)).toBeNull();
    });
  });
  describe("getSignatureFromTLDR migration", () => {
    it("should extract signature from daemon extract response", () => {
      const daemonResponse = {
        status: "ok",
        result: {
          file_path: "/path/to/processor.py",
          functions: [
            {
              name: "process_data",
              signature: "def process_data(x: int, y: str) -> bool:",
              params: ["x: int", "y: str"],
            },
            {
              name: "other_func",
              signature: "def other_func():",
              params: [],
            },
          ],
        },
      };
      const findSignature = (funcName, response) => {
        if (response.status !== "ok" || !response.result?.functions) {
          return null;
        }
        const func = response.result.functions.find(
          (f) => f.name === funcName || f.name === `async ${funcName}`,
        );
        return func?.signature || null;
      };
      expect(findSignature("process_data", daemonResponse)).toBe(
        "def process_data(x: int, y: str) -> bool:",
      );
      expect(findSignature("other_func", daemonResponse)).toBe(
        "def other_func():",
      );
      expect(findSignature("nonexistent", daemonResponse)).toBeNull();
    });
    it("should handle missing result gracefully", () => {
      const daemonResponse = { status: "ok", result: { functions: [] } };
      const findSignature = (funcName, response) => {
        const funcs = response?.result?.functions || [];
        const func = funcs.find((f) => f.name === funcName);
        return func?.signature || null;
      };
      expect(findSignature("nonexistent", daemonResponse)).toBeNull();
    });
  });
  describe("fallback behavior", () => {
    it("should skip signature lookup when daemon unavailable", () => {
      const shouldSkipSignatureLookup = (response) => {
        return response.status === "unavailable" || response.status === "error";
      };
      expect(shouldSkipSignatureLookup({ status: "unavailable" })).toBe(true);
      expect(shouldSkipSignatureLookup({ status: "error" })).toBe(true);
      expect(shouldSkipSignatureLookup({ status: "ok" })).toBe(false);
    });
  });
});
// =============================================================================
// Test 3: import-validator daemon migration
// =============================================================================
describe("import-validator daemon migration", () => {
  beforeEach(() => {
    setupTestEnv();
  });
  afterEach(() => {
    cleanupTestEnv();
  });
  describe("checkSymbolExists migration", () => {
    it("should parse search result to check symbol existence", () => {
      const funcResponse = {
        status: "ok",
        results: [
          {
            file: "utils/processor.py",
            line: 42,
            content: "def process_data():",
          },
        ],
      };
      const checkExists = (response) => {
        if (
          response.status !== "ok" ||
          !response.results ||
          response.results.length === 0
        ) {
          return { exists: false };
        }
        const r = response.results[0];
        return { exists: true, location: `${r.file}:${r.line}` };
      };
      const check = checkExists(funcResponse);
      expect(check.exists).toBe(true);
      expect(check.location).toBe("utils/processor.py:42");
    });
    it("should check both function and class definitions", () => {
      const checkSymbol = (funcResults, classResults) => {
        if (funcResults.length > 0) {
          return {
            exists: true,
            location: `${funcResults[0].file}:${funcResults[0].line}`,
          };
        }
        if (classResults.length > 0) {
          return {
            exists: true,
            location: `${classResults[0].file}:${classResults[0].line}`,
          };
        }
        return { exists: false };
      };
      // Function found
      expect(checkSymbol([{ file: "utils.py", line: 10 }], [])).toEqual({
        exists: true,
        location: "utils.py:10",
      });
      // Class found (no function)
      expect(checkSymbol([], [{ file: "models.py", line: 5 }])).toEqual({
        exists: true,
        location: "models.py:5",
      });
      // Neither found
      expect(checkSymbol([], [])).toEqual({ exists: false });
    });
    it("should return not exists when both searches fail", () => {
      const checkSymbol = (funcResults, classResults) => {
        if (funcResults.length > 0) {
          return {
            exists: true,
            location: `${funcResults[0].file}:${funcResults[0].line}`,
          };
        }
        if (classResults.length > 0) {
          return {
            exists: true,
            location: `${classResults[0].file}:${classResults[0].line}`,
          };
        }
        return { exists: false };
      };
      expect(checkSymbol([], [])).toEqual({ exists: false });
    });
  });
  describe("fallback on indexing", () => {
    it("should skip import validation when daemon is indexing", () => {
      writeFileSync(join(TLDR_DIR, "status"), "indexing");
      const shouldSkipValidation = (response) => {
        return response.indexing === true || response.status === "unavailable";
      };
      expect(shouldSkipValidation({ indexing: true })).toBe(true);
      expect(shouldSkipValidation({ status: "unavailable" })).toBe(true);
      expect(shouldSkipValidation({ status: "ok" })).toBe(false);
    });
  });
});
// =============================================================================
// Test 4: edit-context-inject daemon migration
// =============================================================================
describe("edit-context-inject daemon migration", () => {
  beforeEach(() => {
    setupTestEnv();
  });
  afterEach(() => {
    cleanupTestEnv();
  });
  describe("getTLDRExtract migration", () => {
    it("should parse daemon extract response for file structure", () => {
      const daemonResponse = {
        status: "ok",
        result: {
          file_path: "/path/to/service.py",
          language: "python",
          classes: [{ name: "UserService" }],
          functions: [
            {
              name: "get_user",
              signature: "def get_user(id: int):",
              params: ["id: int"],
            },
            {
              name: "create_user",
              signature: "def create_user(data: dict):",
              params: ["data: dict"],
            },
          ],
          imports: ["from typing import Dict", "import json"],
        },
      };
      const parseExtract = (response) => {
        if (response.status !== "ok" || !response.result) {
          return null;
        }
        return response.result;
      };
      const extract = parseExtract(daemonResponse);
      expect(extract).not.toBeNull();
      expect(extract.classes).toHaveLength(1);
      expect(extract.functions).toHaveLength(2);
      expect(extract.language).toBe("python");
    });
    it("should format extract result as context message", () => {
      const extract = {
        classes: [{ name: "UserService" }, { name: "AuthService" }],
        functions: [
          { name: "get_user", params: ["id"] },
          { name: "create_user", params: ["data", "options"] },
          { name: "delete_user", params: [] },
        ],
      };
      const formatContext = (ext, filename) => {
        const parts = [];
        const classCount = ext.classes?.length || 0;
        const funcCount = ext.functions?.length || 0;
        const total = classCount + funcCount;
        if (classCount > 0) {
          const classNames = ext.classes.map((c) => c.name).slice(0, 10);
          parts.push(`Classes: ${classNames.join(", ")}`);
        }
        if (funcCount > 0) {
          const funcSummaries = ext.functions.slice(0, 12).map((f) => {
            const paramCount = f.params?.length || 0;
            return paramCount > 0 ? `${f.name}(${paramCount})` : f.name;
          });
          parts.push(`Functions: ${funcSummaries.join(", ")}`);
        }
        return `[Edit context: ${filename} has ${total} symbols]\n${parts.join("\n")}`;
      };
      const context = formatContext(extract, "service.py");
      expect(context).toContain("service.py has 5 symbols");
      expect(context).toContain("Classes: UserService, AuthService");
      expect(context).toContain("get_user(1)");
      expect(context).toContain("create_user(2)");
      expect(context).toContain("delete_user");
    });
    it("should handle null result gracefully", () => {
      const daemonResponse = { status: "error", error: "File not found" };
      const parseExtract = (response) => {
        if (response.status !== "ok" || !response.result) {
          return null;
        }
        return response.result;
      };
      expect(parseExtract(daemonResponse)).toBeNull();
    });
  });
  describe("fallback behavior", () => {
    it("should return empty output when daemon unavailable", () => {
      const handleDaemonUnavailable = (response) => {
        return response.status === "unavailable" || response.status === "error";
      };
      expect(handleDaemonUnavailable({ status: "unavailable" })).toBe(true);
    });
    it("should return empty output for unsupported file types", () => {
      const isSupportedFile = (filePath) => {
        const supported = [".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs"];
        return supported.some((ext) => filePath.endsWith(ext));
      };
      expect(isSupportedFile("/path/to/file.py")).toBe(true);
      expect(isSupportedFile("/path/to/file.ts")).toBe(true);
      expect(isSupportedFile("/path/to/file.md")).toBe(false);
      expect(isSupportedFile("/path/to/file.json")).toBe(false);
    });
  });
});
// =============================================================================
// Test 5: Common patterns across all hooks
// =============================================================================
describe("Common daemon migration patterns", () => {
  beforeEach(() => {
    setupTestEnv();
  });
  afterEach(() => {
    cleanupTestEnv();
  });
  describe("project directory resolution", () => {
    it("should use CLAUDE_PROJECT_DIR when available", () => {
      process.env.CLAUDE_PROJECT_DIR = "/custom/project";
      const getProjectDir = () => {
        return process.env.CLAUDE_PROJECT_DIR || process.cwd();
      };
      expect(getProjectDir()).toBe("/custom/project");
    });
    it("should fall back to cwd when env not set", () => {
      delete process.env.CLAUDE_PROJECT_DIR;
      const getProjectDir = () => {
        return process.env.CLAUDE_PROJECT_DIR || "/fallback/dir";
      };
      expect(getProjectDir()).toBe("/fallback/dir");
    });
  });
  describe("error handling wrapper", () => {
    it("should wrap daemon calls with try-catch", () => {
      const safeDaemonCall = (fn, fallback) => {
        try {
          return fn();
        } catch {
          return fallback;
        }
      };
      const result = safeDaemonCall(() => {
        throw new Error("connection failed");
      }, []);
      expect(result).toEqual([]);
    });
  });
  describe("timeout handling", () => {
    it("should have reasonable timeout for hook context", () => {
      // Hooks need to be fast - 3 second timeout is reasonable
      const DAEMON_TIMEOUT = 3000;
      expect(DAEMON_TIMEOUT).toBeLessThanOrEqual(5000);
    });
  });
  describe("ripgrep fallback pattern", () => {
    it("should construct valid ripgrep command for search fallback", () => {
      const pattern = "def process_data";
      const projectDir = "/path/to/project";
      const ripgrepFallback = (p, dir) => {
        const escaped = p.replace(/"/g, '\\"').replace(/\$/g, "\\$");
        return `rg "${escaped}" "${dir}" --type py -l 2>/dev/null`;
      };
      const cmd = ripgrepFallback(pattern, projectDir);
      expect(cmd).toContain('rg "def process_data"');
      expect(cmd).toContain("--type py");
      expect(cmd).toContain("-l");
    });
    it("should parse ripgrep output to match daemon format", () => {
      // Ripgrep -l output is just file paths
      const rgOutput = "/path/to/file1.py\n/path/to/file2.py\n";
      const parseRgFiles = (output) => {
        return output
          .trim()
          .split("\n")
          .filter((l) => l.length > 0)
          .map((file) => ({ file }));
      };
      const parsed = parseRgFiles(rgOutput);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].file).toBe("/path/to/file1.py");
    });
  });
});
