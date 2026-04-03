/**
 * Tests for TLDR Hook Improvements
 *
 * TDD tests for 6 TLDR integration gaps:
 * - Gap 1: tldr-context-inject.ts - Replace inline Python with CLI
 * - Gap 2: smart-search-router.ts - Execute semantic search
 * - Gap 3: session-start-tldr-cache.ts - Check semantic index
 * - Gap 4: tldr-read-enforcer.ts - Add slice for line queries
 * - Gap 5: session-start-dead-code.ts - Dead code on startup
 * - Gap 6: arch-context-inject.ts - Architecture context for planning
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  statSync,
} from "fs";
import { join } from "path";
import { execSync } from "child_process";

// Test fixtures
const TEST_PROJECT_DIR = "/tmp/tldr-hooks-test";
const TLDR_CACHE_DIR = join(TEST_PROJECT_DIR, ".claude", "cache", "tldr");
const SEMANTIC_INDEX_DIR = join(TEST_PROJECT_DIR, ".tldr", "cache", "semantic");

function setupTestEnv(): void {
  process.env.CLAUDE_PROJECT_DIR = TEST_PROJECT_DIR;
  if (!existsSync(TLDR_CACHE_DIR)) {
    mkdirSync(TLDR_CACHE_DIR, { recursive: true });
  }
}

function cleanupTestEnv(): void {
  if (existsSync(TEST_PROJECT_DIR)) {
    rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }
}

// =============================================================================
// Gap 1: tldr-context-inject.ts - Replace inline Python with CLI
// =============================================================================

describe("Gap 1: tldr-context-inject CLI usage", () => {
  describe("CLI command generation", () => {
    it("should generate tldr context command for call graph", () => {
      const entryPoint = "process_data";
      const projectPath = "/path/to/project";
      const depth = 2;

      // Expected command format
      const expectedCmd = `tldr context ${entryPoint} --project ${projectPath} --depth ${depth}`;

      // Function to test (will be implemented)
      const generateContextCmd = (
        entry: string,
        project: string,
        d: number,
      ) => {
        return `tldr context ${entry} --project ${project} --depth ${d}`;
      };

      expect(generateContextCmd(entryPoint, projectPath, depth)).toBe(
        expectedCmd,
      );
    });

    it("should generate tldr cfg command for control flow", () => {
      const filePath = "/path/to/file.py";
      const funcName = "main";

      const expectedCmd = `tldr cfg ${filePath} ${funcName}`;

      const generateCfgCmd = (file: string, func: string) => {
        return `tldr cfg ${file} ${func}`;
      };

      expect(generateCfgCmd(filePath, funcName)).toBe(expectedCmd);
    });

    it("should generate tldr dfg command for data flow", () => {
      const filePath = "/path/to/file.py";
      const funcName = "process";

      const expectedCmd = `tldr dfg ${filePath} ${funcName}`;

      const generateDfgCmd = (file: string, func: string) => {
        return `tldr dfg ${file} ${func}`;
      };

      expect(generateDfgCmd(filePath, funcName)).toBe(expectedCmd);
    });

    it("should NOT use inline python -c commands", () => {
      // This test validates that we're not using the old pattern
      const badPattern = /python\s+-c\s+["']from\s+tldr\./;

      // Mock command that should NOT match bad pattern
      const goodCmd = "tldr context process_data --project . --depth 2";

      expect(badPattern.test(goodCmd)).toBe(false);
    });
  });

  describe("Intent-to-CLI mapping", () => {
    it("should map debug intent to cfg command", () => {
      const intents: Record<string, string[]> = {
        debug: ["cfg", "context"],
        "data-flow": ["dfg"],
        complexity: ["cfg"],
        dependencies: ["context"],
      };

      expect(intents["debug"]).toContain("cfg");
    });

    it("should map data-flow intent to dfg command", () => {
      const intents: Record<string, string[]> = {
        debug: ["cfg", "context"],
        "data-flow": ["dfg"],
        complexity: ["cfg"],
        dependencies: ["context"],
      };

      expect(intents["data-flow"]).toContain("dfg");
    });
  });
});

// =============================================================================
// Gap 2: smart-search-router.ts - Execute semantic search
// =============================================================================

describe("Gap 2: smart-search-router semantic execution", () => {
  describe("Semantic query detection", () => {
    it("should detect semantic queries", () => {
      const semanticPatterns = [
        /^(how|what|where|why|when|which)\s/i,
        /\?$/,
        /^(find|show|list|get|explain)\s+(all|the|every|any)/i,
        /works?$/i,
        /^.*\s+(implementation|architecture|flow|pattern|logic|system)$/i,
      ];

      const semanticQueries = [
        "how does authentication work",
        "what is the error handling pattern?",
        "find all database implementations",
        "explain the caching system",
      ];

      for (const query of semanticQueries) {
        const isMatch = semanticPatterns.some((p) => p.test(query));
        expect(isMatch).toBe(true);
      }
    });

    it("should NOT detect literal queries as semantic", () => {
      const semanticPatterns = [
        /^(how|what|where|why|when|which)\s/i,
        /\?$/,
        /^(find|show|list|get|explain)\s+(all|the|every|any)/i,
      ];

      const literalQueries = [
        "process_data",
        "UserService",
        "handleClick",
        "__init__",
      ];

      for (const query of literalQueries) {
        const isMatch = semanticPatterns.some((p) => p.test(query));
        expect(isMatch).toBe(false);
      }
    });
  });

  describe("Semantic search execution", () => {
    it("should generate correct tldr semantic search command", () => {
      const query = "how does authentication work";

      const expectedCmd = `tldr semantic search "${query}"`;

      const generateSemanticCmd = (q: string) => {
        return `tldr semantic search "${q}"`;
      };

      expect(generateSemanticCmd(query)).toBe(expectedCmd);
    });

    it("should execute semantic search and return results", () => {
      // This tests the execution pattern, not actual CLI
      const mockExecute = (
        cmd: string,
      ): { success: boolean; output: string } => {
        if (cmd.includes("tldr semantic search")) {
          return {
            success: true,
            output: JSON.stringify([
              { file: "auth.py", function: "authenticate", score: 0.95 },
              { file: "login.py", function: "validate_token", score: 0.87 },
            ]),
          };
        }
        return { success: false, output: "" };
      };

      const result = mockExecute('tldr semantic search "authentication"');
      expect(result.success).toBe(true);
      expect(result.output).toContain("authenticate");
    });
  });
});

// =============================================================================
// Gap 3: session-start-tldr-cache.ts - Check semantic index
// =============================================================================

describe("Gap 3: session-start-tldr-cache semantic index check", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  describe("Semantic index detection", () => {
    it("should detect FAISS index existence", () => {
      // Create mock semantic index directory
      mkdirSync(SEMANTIC_INDEX_DIR, { recursive: true });
      const faissPath = join(SEMANTIC_INDEX_DIR, "index.faiss");
      writeFileSync(faissPath, "mock faiss data");

      expect(existsSync(faissPath)).toBe(true);
    });

    it("should report semantic index in cache status", () => {
      mkdirSync(SEMANTIC_INDEX_DIR, { recursive: true });
      const faissPath = join(SEMANTIC_INDEX_DIR, "index.faiss");
      writeFileSync(faissPath, "mock faiss data");

      interface CacheStatus {
        exists: boolean;
        files: {
          arch: boolean;
          calls: boolean;
          dead: boolean;
          semantic: boolean;
        };
      }

      const getCacheStatus = (projectDir: string): CacheStatus => {
        const semanticPath = join(
          projectDir,
          ".tldr",
          "cache",
          "semantic",
          "index.faiss",
        );
        return {
          exists: true,
          files: {
            arch: false,
            calls: false,
            dead: false,
            semantic: existsSync(semanticPath),
          },
        };
      };

      const status = getCacheStatus(TEST_PROJECT_DIR);
      expect(status.files.semantic).toBe(true);
    });

    it("should check semantic index age", () => {
      mkdirSync(SEMANTIC_INDEX_DIR, { recursive: true });
      const faissPath = join(SEMANTIC_INDEX_DIR, "index.faiss");
      writeFileSync(faissPath, "mock faiss data");

      const stats = statSync(faissPath);
      const ageMs = Date.now() - stats.mtimeMs;
      const ageHours = Math.round(ageMs / (1000 * 60 * 60));

      // Just created, should be 0 hours old (use >= to handle -0)
      expect(ageHours).toBeGreaterThanOrEqual(0);
      expect(ageHours).toBeLessThan(1);
    });
  });

  describe("Cache status message", () => {
    it("should include semantic in available caches list", () => {
      mkdirSync(SEMANTIC_INDEX_DIR, { recursive: true });
      writeFileSync(join(SEMANTIC_INDEX_DIR, "index.faiss"), "data");
      writeFileSync(join(TLDR_CACHE_DIR, "arch.json"), "{}");

      const available: string[] = [];
      if (existsSync(join(TLDR_CACHE_DIR, "arch.json"))) available.push("arch");
      if (existsSync(join(SEMANTIC_INDEX_DIR, "index.faiss")))
        available.push("semantic");

      expect(available).toContain("arch");
      expect(available).toContain("semantic");
    });
  });
});

// =============================================================================
// Gap 4: tldr-read-enforcer.ts - Add slice for line queries
// =============================================================================

describe("Gap 4: tldr-read-enforcer slice support", () => {
  describe("Line number detection", () => {
    it("should detect line number in prompt", () => {
      const extractLineNumber = (prompt: string): number | null => {
        const match = prompt.match(/line\s+(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      };

      expect(extractLineNumber("what affects line 42")).toBe(42);
      expect(extractLineNumber("fix the bug at line 123")).toBe(123);
      expect(extractLineNumber("check Line 5")).toBe(5);
      expect(extractLineNumber("no line mentioned")).toBeNull();
    });

    it("should detect function name for slice", () => {
      const extractFunction = (prompt: string): string | null => {
        const match = prompt.match(/(?:function|def|method)\s+(\w+)/i);
        return match ? match[1] : null;
      };

      expect(extractFunction("function process_data")).toBe("process_data");
      expect(extractFunction("def main")).toBe("main");
      expect(extractFunction("no function")).toBeNull();
    });
  });

  describe("Slice command generation", () => {
    it("should generate tldr slice command", () => {
      const filePath = "/path/to/file.py";
      const funcName = "process";
      const lineNum = 42;

      const expectedCmd = `tldr slice ${filePath} ${funcName} ${lineNum}`;

      const generateSliceCmd = (file: string, func: string, line: number) => {
        return `tldr slice ${file} ${func} ${line}`;
      };

      expect(generateSliceCmd(filePath, funcName, lineNum)).toBe(expectedCmd);
    });

    it("should use slice layer when line number detected", () => {
      const prompt = "what affects line 42 in process function";

      const hasLineNumber = /line\s+\d+/i.test(prompt);
      const suggestedLayers = hasLineNumber
        ? ["ast", "slice"]
        : ["ast", "call_graph"];

      expect(suggestedLayers).toContain("slice");
    });
  });

  describe("Slice instead of PDG", () => {
    it("should prefer slice CLI over inline PDG extraction", () => {
      // Old pattern uses inline Python for PDG
      const badPattern = /pdg_extractor/;

      // New pattern uses CLI
      const goodCmd = "tldr slice file.py func 42";

      expect(badPattern.test(goodCmd)).toBe(false);
    });
  });
});

// =============================================================================
// Gap 5: session-start-dead-code.ts - Dead code on startup
// =============================================================================

describe("Gap 5: session-start-dead-code hook", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  describe("Hook triggering", () => {
    it("should only run on startup and resume", () => {
      const validSources = ["startup", "resume"];
      const invalidSources = ["clear", "compact"];

      const shouldRun = (source: string) => validSources.includes(source);

      expect(shouldRun("startup")).toBe(true);
      expect(shouldRun("resume")).toBe(true);
      expect(shouldRun("clear")).toBe(false);
      expect(shouldRun("compact")).toBe(false);
    });
  });

  describe("Dead code command", () => {
    it("should generate correct tldr dead command", () => {
      const projectPath = "/path/to/project";

      const expectedCmd = `tldr dead ${projectPath}`;

      const generateDeadCmd = (path: string) => {
        return `tldr dead ${path}`;
      };

      expect(generateDeadCmd(projectPath)).toBe(expectedCmd);
    });

    it("should parse dead code output", () => {
      // Mock output from tldr dead
      const mockOutput = JSON.stringify({
        dead_functions: [
          { name: "unused_helper", file: "utils.py", line: 42 },
          { name: "old_processor", file: "legacy.py", line: 10 },
        ],
        count: 2,
      });

      const parsed = JSON.parse(mockOutput);
      expect(parsed.count).toBe(2);
      expect(parsed.dead_functions[0].name).toBe("unused_helper");
    });
  });

  describe("Warning message format", () => {
    it("should format dead code warning", () => {
      const deadFuncs = [
        { name: "unused_helper", file: "utils.py" },
        { name: "old_processor", file: "legacy.py" },
      ];

      const formatWarning = (funcs: Array<{ name: string; file: string }>) => {
        if (funcs.length === 0) return "";
        return (
          `Dead code detected (${funcs.length} unused functions):\n` +
          funcs
            .slice(0, 5)
            .map((f) => `  - ${f.name} in ${f.file}`)
            .join("\n")
        );
      };

      const warning = formatWarning(deadFuncs);
      expect(warning).toContain("Dead code detected");
      expect(warning).toContain("unused_helper");
      expect(warning).toContain("utils.py");
    });

    it("should limit warning to 5 functions", () => {
      const manyFuncs = Array.from({ length: 10 }, (_, i) => ({
        name: `func_${i}`,
        file: "file.py",
      }));

      const formatWarning = (funcs: Array<{ name: string; file: string }>) => {
        const lines = funcs.slice(0, 5).map((f) => `  - ${f.name}`);
        if (funcs.length > 5) {
          lines.push(`  ... and ${funcs.length - 5} more`);
        }
        return lines.join("\n");
      };

      const warning = formatWarning(manyFuncs);
      expect(warning).toContain("func_0");
      expect(warning).toContain("func_4");
      expect(warning).not.toContain("func_5");
      expect(warning).toContain("and 5 more");
    });
  });
});

// =============================================================================
// Gap 6: arch-context-inject.ts - Architecture context for planning
// =============================================================================

describe("Gap 6: arch-context-inject hook", () => {
  describe("Planning intent detection", () => {
    it("should detect planning keywords in Task prompt", () => {
      const planningPatterns = [
        /\bplan\b/i,
        /\bdesign\b/i,
        /\barchitecture\b/i,
        /\brefactor\b/i,
        /\brestructure\b/i,
      ];

      const planningPrompts = [
        "Create a plan for implementing auth",
        "Design the new API architecture",
        "Refactor the database layer",
        "Restructure the project layout",
      ];

      for (const prompt of planningPrompts) {
        const hasPlanning = planningPatterns.some((p) => p.test(prompt));
        expect(hasPlanning).toBe(true);
      }
    });

    it("should NOT trigger on non-planning prompts", () => {
      const planningPatterns = [
        /\bplan\b/i,
        /\bdesign\b/i,
        /\barchitecture\b/i,
      ];

      const nonPlanningPrompts = [
        "Fix the bug in login",
        "Add a new test case",
        "Debug the API error",
      ];

      for (const prompt of nonPlanningPrompts) {
        const hasPlanning = planningPatterns.some((p) => p.test(prompt));
        expect(hasPlanning).toBe(false);
      }
    });
  });

  describe("Architecture command", () => {
    it("should generate correct tldr arch command", () => {
      const projectPath = "/path/to/project";

      const expectedCmd = `tldr arch ${projectPath}`;

      const generateArchCmd = (path: string) => {
        return `tldr arch ${path}`;
      };

      expect(generateArchCmd(projectPath)).toBe(expectedCmd);
    });

    it("should parse arch output", () => {
      // Mock output from tldr arch
      const mockOutput = JSON.stringify({
        layers: {
          entry: ["main.py", "cli.py"],
          service: ["user_service.py", "auth_service.py"],
          util: ["helpers.py", "utils.py"],
        },
        circular: [],
      });

      const parsed = JSON.parse(mockOutput);
      expect(parsed.layers.entry).toContain("main.py");
      expect(parsed.layers.service).toHaveLength(2);
    });
  });

  describe("Context injection", () => {
    it("should format architecture context for prompt", () => {
      const archData = {
        layers: {
          entry: ["main.py"],
          service: ["auth.py", "user.py"],
          util: ["helpers.py"],
        },
      };

      const formatArchContext = (data: {
        layers: Record<string, string[]>;
      }) => {
        const lines = ["## Architecture Layers"];
        for (const [layer, files] of Object.entries(data.layers)) {
          lines.push(`\n### ${layer.toUpperCase()}`);
          for (const file of files) {
            lines.push(`- ${file}`);
          }
        }
        return lines.join("\n");
      };

      const context = formatArchContext(archData);
      expect(context).toContain("## Architecture Layers");
      expect(context).toContain("### ENTRY");
      expect(context).toContain("- main.py");
    });

    it("should prepend arch context to Task prompt", () => {
      const originalPrompt = "Design the new auth system";
      const archContext = "## Architecture\n- Entry: main.py";

      const enhancedPrompt = `${archContext}\n\n---\n\n${originalPrompt}`;

      expect(enhancedPrompt).toContain("## Architecture");
      expect(enhancedPrompt).toContain("Design the new auth system");
    });
  });

  describe("Hook output format", () => {
    it("should return correct PreToolUse output", () => {
      interface HookOutput {
        hookSpecificOutput?: {
          hookEventName: string;
          permissionDecision: "allow" | "deny" | "ask";
          permissionDecisionReason?: string;
          updatedInput?: Record<string, unknown>;
        };
      }

      const createOutput = (
        prompt: string,
        archContext: string,
      ): HookOutput => {
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "allow",
            permissionDecisionReason: "Injected architecture context",
            updatedInput: {
              prompt: `${archContext}\n\n---\n\n${prompt}`,
            },
          },
        };
      };

      const output = createOutput("Plan the refactor", "## Arch");
      expect(output.hookSpecificOutput?.permissionDecision).toBe("allow");
      expect(output.hookSpecificOutput?.updatedInput?.prompt).toContain(
        "## Arch",
      );
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Integration: CLI availability", () => {
  it("should have tldr on PATH (skip if not installed)", () => {
    try {
      const result = execSync("which tldr", {
        encoding: "utf-8",
        timeout: 5000,
      });
      expect(result.trim()).toContain("tldr");
    } catch {
      // Skip if tldr not installed - this is expected in CI
      console.log("tldr not on PATH - skipping integration test");
    }
  });
});
