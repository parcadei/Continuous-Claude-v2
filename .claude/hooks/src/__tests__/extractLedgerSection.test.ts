/**
 * Tests for extractLedgerSection() function
 *
 * Phase 2a TDD: These tests are written BEFORE the implementation.
 * They should FAIL until the function is implemented.
 *
 * Run with: npx tsx --test src/__tests__/extractLedgerSection.test.ts
 */

import { describe, it } from "node:test";
import * as assert from "node:assert";

// Import the function under test
import { extractLedgerSection } from "../session-start-continuity.js";

describe("extractLedgerSection", () => {
  it("should return correct Ledger section from valid handoff", () => {
    const handoffContent = `# Work Stream: test-session

## Ledger
**Updated:** 2025-12-30T00:00:00Z
**Goal:** Test the new format
**Branch:** main
**Test:** npm test

### Now
[->] Testing new format

### This Session
- [x] Completed item 1
- [x] Completed item 2

### Next
- [ ] Priority 1
- [ ] Priority 2

### Decisions
- Decision 1: Rationale

---

## Context
Detailed context here that should NOT be included.
More context lines.
`;

    const result = extractLedgerSection(handoffContent);

    assert.notStrictEqual(
      result,
      null,
      "Should not return null for valid handoff with Ledger section",
    );
    assert.ok(
      result!.startsWith("## Ledger"),
      'Result should start with "## Ledger"',
    );
    assert.ok(
      result!.includes("**Goal:** Test the new format"),
      "Should include Goal field",
    );
    assert.ok(result!.includes("### Now"), "Should include Now section");
    assert.ok(
      result!.includes("[->] Testing new format"),
      "Should include current focus",
    );
    assert.ok(
      result!.includes("### Decisions"),
      "Should include Decisions section",
    );
    assert.ok(
      !result!.includes("## Context"),
      "Should NOT include Context section",
    );
    assert.ok(
      !result!.includes("Detailed context here"),
      "Should NOT include context content",
    );
  });

  it("should return null for handoff without Ledger section", () => {
    const handoffContent = `# Work Stream: test-session

## Context
This handoff has no Ledger section.
Just context directly.

## What Was Done
- Some work
`;

    const result = extractLedgerSection(handoffContent);

    assert.strictEqual(
      result,
      null,
      "Should return null when no Ledger section exists",
    );
  });

  it("should return null for empty file", () => {
    const handoffContent = "";

    const result = extractLedgerSection(handoffContent);

    assert.strictEqual(result, null, "Should return null for empty content");
  });

  it("should handle Ledger section at end of file (no --- separator)", () => {
    const handoffContent = `# Work Stream: test-session

## Ledger
**Updated:** 2025-12-30T00:00:00Z
**Goal:** Test edge case
**Branch:** feature/test

### Now
[->] Current task

### Next
- [ ] Future task`;

    const result = extractLedgerSection(handoffContent);

    assert.notStrictEqual(
      result,
      null,
      "Should not return null when Ledger is at end of file",
    );
    assert.ok(
      result!.startsWith("## Ledger"),
      'Result should start with "## Ledger"',
    );
    assert.ok(
      result!.includes("**Goal:** Test edge case"),
      "Should include Goal field",
    );
    assert.ok(result!.includes("### Now"), "Should include Now section");
    assert.ok(result!.includes("### Next"), "Should include Next section");
    assert.ok(result!.includes("Future task"), "Should include the last item");
  });

  it("should handle multiple ## headings after Ledger - stops at first ---", () => {
    const handoffContent = `# Work Stream: test-session

## Ledger
**Updated:** 2025-12-30T00:00:00Z
**Goal:** Multiple headings test
**Branch:** main

### Now
[->] Current focus

### Decisions
- Key decision

---

## Context
Context section.

## What Was Done
Work section.

## Blockers
Blockers section.
`;

    const result = extractLedgerSection(handoffContent);

    assert.notStrictEqual(result, null, "Should not return null");
    assert.ok(
      result!.startsWith("## Ledger"),
      'Result should start with "## Ledger"',
    );
    assert.ok(
      result!.includes("### Decisions"),
      "Should include Decisions (before separator)",
    );
    assert.ok(
      !result!.includes("## Context"),
      "Should NOT include Context (after separator)",
    );
    assert.ok(
      !result!.includes("## What Was Done"),
      "Should NOT include What Was Done",
    );
    assert.ok(!result!.includes("## Blockers"), "Should NOT include Blockers");
  });

  it("should handle Ledger with no --- but next ## heading", () => {
    // Edge case: No --- separator, but there's a ## heading that ends the Ledger
    const handoffContent = `# Work Stream: test-session

## Ledger
**Updated:** 2025-12-30T00:00:00Z
**Goal:** No separator test

### Now
[->] Working

## Context
This is after Ledger, should not be included.
`;

    const result = extractLedgerSection(handoffContent);

    assert.notStrictEqual(result, null, "Should not return null");
    assert.ok(
      result!.includes("**Goal:** No separator test"),
      "Should include Goal",
    );
    assert.ok(result!.includes("### Now"), "Should include Now");
    assert.ok(
      !result!.includes("## Context"),
      "Should stop at ## Context heading",
    );
  });

  it("should trim whitespace from extracted content", () => {
    const handoffContent = `# Work Stream: test-session

## Ledger

**Updated:** 2025-12-30T00:00:00Z


### Now
[->] Task


---

## Context
`;

    const result = extractLedgerSection(handoffContent);

    assert.notStrictEqual(result, null, "Should not return null");
    // The result should be trimmed (no leading/trailing whitespace in content)
    assert.ok(
      !result!.endsWith("\n\n\n"),
      "Should not end with multiple newlines",
    );
  });
});
