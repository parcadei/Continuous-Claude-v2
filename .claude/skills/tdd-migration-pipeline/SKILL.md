---
name: tdd-migration-pipeline
description: Orchestrator-only workflow for migrating/rewriting codebases with full TDD and agent delegation
allowed-tools: [Task, TodoWrite, Read, Bash]
---

# TDD Migration Pipeline

Orchestrator-only workflow for migrating or rewriting codebases. You do NOT read files, write code, or validate anything yourself. You only instruct agents and pipe context (paths, not contents).

## When to Use

- Migrating codebase from one language/framework to another
- Rewriting a system with TDD guarantees
- Large-scale refactoring with behavioral contracts
- When you want zero context growth in the orchestrator

## Core Principles

1. **ZERO orchestrator execution** - only instruct and pipe context
2. **All work done by agents** - you never read/write/validate
3. **Context window stays flat** - pass paths, not contents
4. **New code in separate directory** - never modify source

## Your Constraints

- Never say "let me read..." or "looking at..."
- Only say "Agent X: do Y with Z"
- Your context should NOT grow during execution
- All agents must use `qlty` and `tldr` skills

## Pipeline Phases

### Phase 1: SPEC
```
Instruct spec-agent (use scout or architect):
- Analyze {source_path} using tldr-skill
- Output: spec.md with behavioral contracts, types, edge cases
```

**Agent prompt template:**
```
Analyze the codebase at {source_path} using tldr commands (tldr structure, tldr extract, tldr calls).
Create spec.md with:
- All behavioral contracts (what each function/class promises)
- Input/output types
- Edge cases and invariants
- Dependencies between components
Write to: {target_dir}/spec.md
```

### Phase 2: FAILING TESTS
```
Instruct test-agent (use arbiter):
- Read spec.md
- Write failing tests in {target_dir}/tests/
- Tests should define expected behavior before implementation

Instruct review-agent (use critic):
- Validate tests cover spec completely
- No gaps in behavioral coverage
```

### Phase 3: ADVERSARIAL (x3 iterations)
```
Instruct premortem-agent (use premortem skill):
- Review spec + tests
- Identify failure modes, race conditions, edge cases
- DO NOT ASK - just add mitigations directly to spec
- Run 3 passes with fresh perspective each time
```

**Key:** Each pass should find NEW issues, not repeat previous ones.

### Phase 4: PHASED PLAN
```
Instruct planner-agent (use architect or plan-agent):
- Input: spec.md + tests + mitigations
- Output: phased-plan.yaml
- Requirements:
  - Dependency-ordered phases
  - Each phase = one testable unit
  - Clear inputs/outputs per phase
```

### Phase 5: BUILD LOOP (per phase)
```
For each phase in phased-plan.yaml:

  Instruct builder-agent (use kraken or spark):
  - Write code to pass tests for this phase
  - Use qlty for quality checks
  - Run tests after each change

  Instruct review-agent (use critic or judge):
  - Validate implementation matches spec
  - Check for regressions in previous phases
  - Verify no breaking changes
```

### Phase 6: INTEGRATION VALIDATION
```
Instruct integration-agent (use atlas or validator):
- Use tldr to diff against {reference_repo}
- Check for:
  - No race conditions
  - No hangs or deadlocks
  - No breaking changes vs original
  - All behavioral contracts preserved
- Output: validation-report.md
```

## Invocation

When invoking this workflow, specify:

```yaml
SOURCE: {path to source code}
TARGET_DIR: {new folder for migrated code}
TARGET_LANG: {typescript|python|go|rust|etc}
REFERENCE_REPO: {url or path for final diff comparison}
SKILLS: [tldr-code, qlty-check, {domain-specific}]
```

## Agent Mapping

| Phase | Agent Type | Subagent |
|-------|-----------|----------|
| Spec | research | `scout` or `architect` |
| Tests | validate | `arbiter` |
| Review | review | `critic` or `judge` |
| Premortem | review | `premortem` skill |
| Plan | plan | `architect` or `plan-agent` |
| Build | implement | `kraken` (large) or `spark` (small) |
| Integration | validate | `atlas` or `validator` |

## Example Orchestration

```
# Phase 1
Task(scout): "Analyze /src/old-system using tldr structure and tldr extract.
              Create spec.md at /migration/spec.md with all behavioral contracts."

# Phase 2
Task(arbiter): "Read /migration/spec.md. Write failing tests to /migration/tests/
               that define expected behavior."

Task(critic): "Review /migration/spec.md vs /migration/tests/.
              Report any behavioral gaps."

# Phase 3 (x3)
Task(premortem): "Review /migration/spec.md and /migration/tests/.
                 Identify failure modes. Add mitigations directly to spec. Pass 1/3."
[repeat with "Pass 2/3", "Pass 3/3"]

# Phase 4
Task(architect): "From /migration/spec.md and /migration/tests/,
                 create /migration/phased-plan.yaml with dependency-ordered phases."

# Phase 5 (loop)
Task(kraken): "Implement phase 1 from /migration/phased-plan.yaml.
              Code goes in /migration/src/. Run tests after."

Task(critic): "Review /migration/src/ against /migration/spec.md.
              Check for spec compliance and regressions."
[repeat for each phase]

# Phase 6
Task(atlas): "Run full integration tests on /migration/src/.
             Use tldr to diff against /src/old-system.
             Output /migration/validation-report.md."
```

## Anti-Patterns (DO NOT)

- Reading files into your context ("let me check the code...")
- Writing code directly ("I'll implement this function...")
- Validating anything yourself ("looking at the tests, I see...")
- Modifying the source directory
- Skipping the adversarial phase
- Running build without tests first

## Success Criteria

- [ ] All tests pass
- [ ] qlty reports clean
- [ ] tldr diff shows no breaking changes
- [ ] No race conditions or hangs
- [ ] validation-report.md confirms behavioral equivalence
