---
name: tdd-migrate
description: TDD workflow for migrations - orchestrate agents, zero main context growth
allowed-tools: [Task, TodoWrite, Write, Read, Bash]
---

# TDD Migrate

Orchestrate TDD migrations with agents doing all work. Main context stays clean.

## When to Use

- "Port X from Python to TypeScript"
- "Create N adapters following existing pattern"
- "Migrate module to new architecture"
- "TDD implementation of multiple similar items"

## Parameters

```
/tdd-migrate <source_path> <target_path> --pattern <reference> --items "item1,item2,item3"
```

- `source_path`: Path to analyze (existing code)
- `target_path`: Where to create new code
- `pattern`: Reference file/pattern to follow
- `items`: Comma-separated list of things to create

## Workflow

```
Phase 0: YAML TODO List
    │
    ▼
Phase 1: TLDR Analysis ─────────────────┐
    │                                    │
    ▼                                    │ Parallel scouts
Phase 2: Write Failing Tests ───────────┤ per item
    │                                    │
    ▼                                    │
Phase 3: Implement (minimal) ───────────┤
    │                                    │
    ▼                                    │
Phase 4: Build + Pass Tests ────────────┘
    │
    ▼
Phase 5: QLTY Check ────────────────────┐
    │                                    │ Parallel
Phase 6: Review Agent Validates ────────┘
    │
    ▼
Phase 7: TLDR Diff (new vs reference)
    │
    ▼
Phase 8: Fix Issues (if any)
    │
    ▼
Complete
```

## Key Principles

1. **Main context = orchestration only**
   - Never read files directly (use scout)
   - Never implement directly (use kraken/spark)
   - Never run tests directly (use validator)
   - Only pipe context and coordinate

2. **Agents do ALL work**
   | Task | Agent |
   |------|-------|
   | Explore/analyze | scout |
   | Write tests + implement | kraken |
   | Quick fixes | spark |
   | Run tests/validate | validator |
   | Code review | critic |

3. **Parallel where independent**
   - All items can be implemented in parallel if independent
   - Review + QLTY run in parallel
   - TLDR analysis runs in parallel with planning

4. **Review after each major step**
   - After implementation: critic reviews
   - After fixes: validator re-validates

## Instructions

### Step 0: Create YAML TODO

Write a YAML plan file to `thoughts/shared/plans/<name>-tdd.yaml`:

```yaml
---
title: <Migration Name>
date: <today>
type: implementation-plan
approach: TDD (test → build → pass → review)

items:
  - name: item1
    file: <target_path>/item1.ts
    test: <target_path>/__tests__/item1.test.ts
    deps: []
  - name: item2
    # ...

reference: <pattern_file>

workflow:
  per_item:
    1: Write failing test
    2: Implement minimal
    3: Build
    4: Pass test
    5: QLTY check
    6: Review
  final:
    7: Integration test
    8: TLDR diff
```

### Step 1: Launch Scout Agents (parallel)

```
Task (scout): Analyze <source_path> with TLDR
Task (scout): Analyze <pattern> to understand structure
Task (scout): Read migration handoff if exists
```

### Step 2: Launch Kraken Agents (parallel per item)

For each item, launch ONE kraken that does full TDD:

```
Task (kraken): Implement <item> using TDD workflow
  1. Read pattern file
  2. Write failing test
  3. Implement
  4. Run: bun test <test_file>
  5. Run: qlty check <impl_file>
```

### Step 3: Review + Validate (parallel)

```
Task (critic): Review all new files against pattern
Task (validator): Run full test suite
Task (validator): QLTY check all files
```

### Step 4: Fix Issues

If critic/validator found issues:

```
Task (spark): Fix <specific issue>
Task (validator): Re-validate
```

### Step 5: TLDR Diff

```
Task (validator): TLDR diff new files vs reference
  - tldr structure <new_file> --lang <lang>
  - tldr structure <reference> --lang <lang>
  - Compare patterns
```

### Step 6: Update Continuity

Update ledger with completed work.

## Example: Rigg Adapters

```bash
/tdd-migrate /Users/cosimo/Documents/rigg/src/sdk/providers \
  /Users/cosimo/Documents/rigg/src/sdk/providers \
  --pattern lmstudio.ts \
  --items "xai,cerebras,togetherai,deepinfra,perplexity"
```

Resulted in:
- 5 parallel kraken agents
- 39 tests passing
- All adapters working
- ~15 minutes total

## Anti-Patterns (AVOID)

| Bad | Good |
|-----|------|
| Read files in main context | Launch scout agent |
| Write code in main context | Launch kraken/spark agent |
| Run tests in main context | Launch validator agent |
| Skip review | Always launch critic |
| Sequential items | Parallel krakens |
| Fix in main context | Launch spark |

## Agent Prompts

### Scout (analysis)
```
Explore <path> to understand:
1. Structure/patterns
2. Interfaces/types
3. Dependencies
Return actionable summary for implementation.
```

### Kraken (TDD)
```
Implement <item> using TDD:
1. Read <pattern> for structure
2. Write failing test to <test_path>
3. Implement minimal to <impl_path>
4. Run: <test_command>
5. Run: qlty check <impl_path>
Report: status, issues, files created.
```

### Critic (review)
```
Review <files> against <pattern>:
1. Pattern compliance
2. Type safety
3. Missing registrations
4. Security issues
DO NOT edit. Report issues only.
```

### Spark (fix)
```
Fix <specific issue>:
1. Read <file>
2. Make minimal edit
3. Verify fix
```

### Validator (test)
```
Validate <files>:
1. Run <test_command>
2. Run qlty check
3. Report pass/fail/issues
```

## Success Criteria

- [ ] All tests pass
- [ ] QLTY reports no issues
- [ ] Critic found no critical issues
- [ ] TLDR diff shows pattern compliance
- [ ] All items registered/exported properly
