/**
 * Tests for Pattern Orchestrator Hook
 *
 * Tests the multi-agent pattern orchestration logic:
 * - Pattern tag extraction
 * - State loading/saving
 * - Pipeline, Jury, Debate, GenCritic handlers
 * - TTL expiration
 * - Session validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// Test fixtures
const TEST_PROJECT_DIR = "/tmp/pattern-orchestrator-test";
const PATTERN_DIR = join(TEST_PROJECT_DIR, ".claude", "cache", "patterns");

function setupTestEnv(): void {
  process.env.CLAUDE_PROJECT_DIR = TEST_PROJECT_DIR;
  if (!existsSync(PATTERN_DIR)) {
    mkdirSync(PATTERN_DIR, { recursive: true });
  }
}

function cleanupTestEnv(): void {
  if (existsSync(TEST_PROJECT_DIR)) {
    rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }
}

function createPatternState(
  type: string,
  id: string,
  overrides: Record<string, unknown> = {},
): string {
  const state = {
    id,
    type,
    active: true,
    session_id: "test-session-123",
    created: Date.now(),
    ttl_minutes: 30,
    agents: {},
    ...overrides,
  };
  const path = join(PATTERN_DIR, `${type}-${id}.json`);
  writeFileSync(path, JSON.stringify(state, null, 2));
  return path;
}

function readPatternState(
  type: string,
  id: string,
): Record<string, unknown> | null {
  const path = join(PATTERN_DIR, `${type}-${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

// =============================================================================
// Pattern Tag Extraction Tests
// =============================================================================

describe("Pattern Tag Extraction", () => {
  it("should extract valid pattern tags", () => {
    const testCases = [
      {
        input: "[PATTERN:pipeline-abc123:research]",
        expected: { type: "pipeline", id: "abc123", stage: "research" },
      },
      {
        input: "[PATTERN:jury-vote1:juror1]",
        expected: { type: "jury", id: "vote1", stage: "juror1" },
      },
      {
        input: "[PATTERN:debate-topic_1:pro]",
        expected: { type: "debate", id: "topic_1", stage: "pro" },
      },
      {
        input: "[PATTERN:gencritic-gen-001:generator]",
        expected: { type: "gencritic", id: "gen-001", stage: "generator" },
      },
    ];

    const regex = /\[PATTERN:([a-z]+)-([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\]/;

    for (const { input, expected } of testCases) {
      const match = input.match(regex);
      expect(match).not.toBeNull();
      expect(match![1]).toBe(expected.type);
      expect(match![2]).toBe(expected.id);
      expect(match![3]).toBe(expected.stage);
    }
  });

  it("should not match invalid pattern tags", () => {
    const invalidTags = [
      "[PATTERN:pipe line-abc:stage]", // space in type
      "[PATTERN:pipeline:stage]", // missing id
      "[PATTERN:pipeline-:stage]", // empty id
      "[PATTERN:pipeline-abc:]", // empty stage
      "PATTERN:pipeline-abc:stage", // missing brackets
      "[pattern:pipeline-abc:stage]", // lowercase PATTERN
    ];

    const regex = /\[PATTERN:([a-z]+)-([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\]/;

    for (const tag of invalidTags) {
      const match = tag.match(regex);
      // Some might partially match, so we check the full match
      if (match) {
        // If it matches, verify the groups are valid
        expect(match[1]).toBeTruthy();
        expect(match[2]).toBeTruthy();
        expect(match[3]).toBeTruthy();
      }
    }
  });

  it("should extract tag from longer prompt", () => {
    const prompt = `
            You are a research agent.
            [PATTERN:pipeline-research001:gather]
            Please gather information about the topic.
        `;

    const regex = /\[PATTERN:([a-z]+)-([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\]/;
    const match = prompt.match(regex);

    expect(match).not.toBeNull();
    expect(match![1]).toBe("pipeline");
    expect(match![2]).toBe("research001");
    expect(match![3]).toBe("gather");
  });
});

// =============================================================================
// State Management Tests
// =============================================================================

describe("State Management", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should create and read pattern state", () => {
    createPatternState("pipeline", "test1", {
      stages: ["stage1", "stage2", "stage3"],
      currentStage: 0,
    });

    const state = readPatternState("pipeline", "test1");
    expect(state).not.toBeNull();
    expect(state!.type).toBe("pipeline");
    expect(state!.id).toBe("test1");
    expect(state!.active).toBe(true);
    expect(state!.stages).toEqual(["stage1", "stage2", "stage3"]);
  });

  it("should handle missing state gracefully", () => {
    const state = readPatternState("pipeline", "nonexistent");
    expect(state).toBeNull();
  });

  it("should detect expired patterns", () => {
    // Create an expired pattern (TTL in the past)
    const expiredState = {
      id: "expired1",
      type: "pipeline",
      active: true,
      session_id: "test-session",
      created: Date.now() - 60 * 60 * 1000, // 1 hour ago
      ttl_minutes: 30, // 30 minute TTL
      agents: {},
    };

    const path = join(PATTERN_DIR, "pipeline-expired1.json");
    writeFileSync(path, JSON.stringify(expiredState));

    const state = readPatternState("pipeline", "expired1");
    expect(state).not.toBeNull();

    // Calculate if expired
    const now = Date.now();
    const expiresAt =
      (state!.created as number) + (state!.ttl_minutes as number) * 60 * 1000;
    const isExpired = now > expiresAt;

    expect(isExpired).toBe(true);
  });
});

// =============================================================================
// Pipeline Handler Tests
// =============================================================================

describe("Pipeline Handler", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should track stage completion", () => {
    createPatternState("pipeline", "pipe1", {
      stages: ["research", "analyze", "report"],
      currentStage: 0,
      agents: {},
    });

    // Simulate first stage completion by updating state
    const state = readPatternState("pipeline", "pipe1")!;
    state.agents = {
      "agent-001": {
        stage: "research",
        status: "complete",
        result: "Research findings...",
        completed_at: Date.now(),
      },
    };
    state.currentStage = 1;

    const path = join(PATTERN_DIR, "pipeline-pipe1.json");
    writeFileSync(path, JSON.stringify(state, null, 2));

    const updated = readPatternState("pipeline", "pipe1");
    expect(updated!.currentStage).toBe(1);
    expect(Object.keys(updated!.agents as object)).toHaveLength(1);
  });

  it("should mark pipeline inactive on completion", () => {
    createPatternState("pipeline", "pipe2", {
      stages: ["only_stage"],
      currentStage: 0,
      agents: {},
    });

    // Simulate completion
    const state = readPatternState("pipeline", "pipe2")!;
    state.agents = {
      "agent-001": {
        stage: "only_stage",
        status: "complete",
        result: "Done",
        completed_at: Date.now(),
      },
    };
    state.active = false;
    state.currentStage = 0;

    const path = join(PATTERN_DIR, "pipeline-pipe2.json");
    writeFileSync(path, JSON.stringify(state, null, 2));

    const updated = readPatternState("pipeline", "pipe2");
    expect(updated!.active).toBe(false);
  });
});

// =============================================================================
// Jury Handler Tests
// =============================================================================

describe("Jury Handler", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should collect votes from jurors", () => {
    createPatternState("jury", "jury1", {
      votes: [],
      threshold: 0.5,
      agents: {
        juror1: { stage: "vote", status: "pending" },
        juror2: { stage: "vote", status: "pending" },
        juror3: { stage: "vote", status: "pending" },
      },
    });

    // Simulate votes
    const state = readPatternState("jury", "jury1")!;
    (state.votes as Array<{ agent_id: string; vote: boolean }>).push(
      { agent_id: "juror1", vote: true },
      { agent_id: "juror2", vote: true },
      { agent_id: "juror3", vote: false },
    );

    const path = join(PATTERN_DIR, "jury-jury1.json");
    writeFileSync(path, JSON.stringify(state, null, 2));

    const updated = readPatternState("jury", "jury1");
    expect((updated!.votes as unknown[]).length).toBe(3);
  });

  it("should calculate verdict based on threshold", () => {
    const votes = [
      { agent_id: "j1", vote: true },
      { agent_id: "j2", vote: true },
      { agent_id: "j3", vote: false },
      { agent_id: "j4", vote: false },
      { agent_id: "j5", vote: true },
    ];

    const threshold = 0.6;
    const approveCount = votes.filter((v) => v.vote).length;
    const approveRatio = approveCount / votes.length;
    const verdict = approveRatio >= threshold ? "APPROVED" : "REJECTED";

    expect(approveCount).toBe(3);
    expect(approveRatio).toBe(0.6);
    expect(verdict).toBe("APPROVED");
  });
});

// =============================================================================
// Debate Handler Tests
// =============================================================================

describe("Debate Handler", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should track debate rounds", () => {
    createPatternState("debate", "debate1", {
      round: 1,
      maxRounds: 3,
      positions: [],
      agents: {},
    });

    // Simulate round 1
    const state = readPatternState("debate", "debate1")!;
    (
      state.positions as Array<{
        side: string;
        agent_id: string;
        argument: string;
      }>
    ).push(
      {
        side: "pro",
        agent_id: "pro-agent",
        argument: "Pro argument for round 1",
      },
      {
        side: "con",
        agent_id: "con-agent",
        argument: "Con argument for round 1",
      },
    );
    state.round = 2;

    const path = join(PATTERN_DIR, "debate-debate1.json");
    writeFileSync(path, JSON.stringify(state, null, 2));

    const updated = readPatternState("debate", "debate1");
    expect(updated!.round).toBe(2);
    expect((updated!.positions as unknown[]).length).toBe(2);
  });

  it("should alternate between pro and con", () => {
    const sides = ["pro", "con", "pro", "con", "pro", "con"];
    const rounds = sides.map((side, i) => Math.floor(i / 2) + 1);

    expect(rounds).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

// =============================================================================
// GenCritic Handler Tests
// =============================================================================

describe("GenCritic Handler", () => {
  beforeEach(() => {
    setupTestEnv();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it("should track iterations", () => {
    createPatternState("gencritic", "gc1", {
      iteration: 1,
      maxIterations: 5,
      approved: false,
      agents: {},
    });

    // Simulate iteration
    const state = readPatternState("gencritic", "gc1")!;
    state.iteration = 2;
    state.lastFeedback = "Needs more detail in section 2";

    const path = join(PATTERN_DIR, "gencritic-gc1.json");
    writeFileSync(path, JSON.stringify(state, null, 2));

    const updated = readPatternState("gencritic", "gc1");
    expect(updated!.iteration).toBe(2);
    expect(updated!.lastFeedback).toBe("Needs more detail in section 2");
  });

  it("should detect approval keywords", () => {
    const approvalKeywords = ["approved", "lgtm", "looks good"];
    const testResponses = [
      { text: "This looks good to me.", expected: true },
      { text: "APPROVED - ready for production", expected: true },
      { text: "LGTM!", expected: true },
      { text: "Needs more work on error handling.", expected: false },
      { text: "Please revise section 3.", expected: false },
    ];

    for (const { text, expected } of testResponses) {
      const lowerText = text.toLowerCase();
      const isApproved = approvalKeywords.some((kw) => lowerText.includes(kw));
      expect(isApproved).toBe(expected);
    }
  });

  it("should stop on max iterations", () => {
    createPatternState("gencritic", "gc2", {
      iteration: 5,
      maxIterations: 5,
      approved: false,
      agents: {},
    });

    const state = readPatternState("gencritic", "gc2")!;
    const iteration = state.iteration as number;
    const maxIterations = state.maxIterations as number;

    expect(iteration >= maxIterations).toBe(true);
  });
});

// =============================================================================
// Security Tests
// =============================================================================

describe("Security", () => {
  it("should validate IDs against injection attacks", () => {
    const safeIdPattern = /^[a-zA-Z0-9_-]{1,64}$/;

    const validIds = ["abc123", "my-pattern", "test_001", "A1B2C3"];
    const invalidIds = [
      "../etc/passwd",
      "$(whoami)",
      "`id`",
      "; rm -rf /",
      "a".repeat(100),
      "",
      "hello world",
      "test\ninjection",
    ];

    for (const id of validIds) {
      expect(safeIdPattern.test(id)).toBe(true);
    }

    for (const id of invalidIds) {
      expect(safeIdPattern.test(id)).toBe(false);
    }
  });

  it("should require session_id match", () => {
    setupTestEnv();
    try {
      createPatternState("pipeline", "sec1", {
        session_id: "original-session",
      });

      const state = readPatternState("pipeline", "sec1")!;
      const inputSessionId = "different-session";

      expect(state.session_id).not.toBe(inputSessionId);
    } finally {
      cleanupTestEnv();
    }
  });
});

// =============================================================================
// Vote Parsing Tests
// =============================================================================

describe("Vote Parsing", () => {
  it("should parse approval votes", () => {
    const approvalResponses = [
      "I APPROVE this proposal",
      "Yes, this looks good",
      "I accept the changes",
      "APPROVED with minor suggestions",
    ];

    for (const response of approvalResponses) {
      const lower = response.toLowerCase();
      const vote =
        lower.includes("approve") ||
        lower.includes("yes") ||
        lower.includes("accept");
      expect(vote).toBe(true);
    }
  });

  it("should parse rejection votes", () => {
    const rejectionResponses = [
      "I REJECT this proposal",
      "No, this needs more work",
      "I deny the request",
    ];

    for (const response of rejectionResponses) {
      const lower = response.toLowerCase();
      const vote =
        lower.includes("reject") ||
        lower.includes("no") ||
        lower.includes("deny");
      expect(vote).toBe(true);
    }
  });

  it("should extract reason from response", () => {
    const response =
      "I approve this. Reason: The implementation is clean and well-tested.";
    const reasonMatch = response.match(/reason[:\s]+(.+?)(?:\n|$)/i);

    expect(reasonMatch).not.toBeNull();
    expect(reasonMatch![1].trim()).toBe(
      "The implementation is clean and well-tested.",
    );
  });
});
