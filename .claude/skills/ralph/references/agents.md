# Ralph Agent Reference

## Agent Routing Table

| Task Type | Agent | Tool |
|-----------|-------|------|
| Code implementation | kraken | Task |
| Quick fixes (<20 lines) | spark | Task |
| Unit/integration tests | arbiter | Task |
| E2E tests | atlas | Task |
| Code research | scout | Task |
| External research | oracle | Task |
| Debugging | debug-agent | Task |
| Code review | critic | Task |
| Refactor/cleanup | strategic-refactorer OR judge | Task |
| Deploy verification | deployer | Verify preview deployment succeeded after implementation |
| Build log analysis | deployer | Diagnose deployment failures from Vercel build logs |
| Preview URL check | deployer | Confirm deployed content matches expectations |

## Skill Router Query

Before each task, optionally query for recommended agents:

```bash
python ~/.claude/scripts/ralph/ralph-skill-query.py \
  --task "implement authentication middleware" \
  --files src/auth.ts src/middleware.ts
```

## Spawning Pattern

```
Task tool:
  subagent_type: kraken  # or spark, arbiter, etc.
  prompt: |
    Story: STORY-001
    Task ID: 1.1
    Task: Implement user authentication
    Files: src/auth.ts, src/middleware.ts
    Requirements: [from PRD]
    Tests: Write unit tests for auth flow
```

**IMPORTANT:** Always include `Task ID: X.Y` in agent prompts. The `ralph-task-monitor` hook uses this to disambiguate which task completed when multiple agents run in parallel. Without it, state updates are skipped for ambiguous cases.

## Agent Output Convention [C:9]

ALWAYS include in every agent prompt -- add this instruction:
"End your response with a JSON status block:
```json
{"ralph_status": {"task_id": "X.Y", "status": "complete|failed", "commit": "hash_or_none"}}
```
"

This is REQUIRED, not optional. Without it, tasks never get marked complete automatically.

Complete example:

```json
{"ralph_status": {"task_id": "X.Y", "status": "complete", "commit": "<hash>"}}
```

On failure:

```json
{"ralph_status": {"task_id": "X.Y", "status": "failed", "error": "<reason>"}}
```

The task monitor detects status in priority order:
1. **Structured JSON** (`ralph_status` object) -- unambiguous, required
2. **XML tags** (`<TASK_COMPLETE task="1.1" commit="abc123"/>`) -- explicit with task ID
3. **Pattern matching** (fallback) -- heuristic, may miss edge cases

When structured output is present, state updates happen immediately without disambiguation logic.

## TDD Enforcement

| Phase | Agent | Contract |
|-------|-------|----------|
| RED | arbiter | Write failing tests only. No production code. |
| GREEN | kraken | Minimal code to pass tests. No extras. |
| VERIFY | arbiter | Full suite + typecheck + lint. No modifications. |

Task atomicity: max 3-5 files, 1 behavior, 1-3 test cases per slice.

### Periodic REFACTOR

After every 5 completed tasks (or when lint surfaces duplication warnings):

```
Task(subagent_type: "strategic-refactorer" OR "judge")
  prompt: "Review the last 5 completed tasks for duplication, dead code, and abstraction opportunities. Refactor only what tests already cover."
```

Skip if the codebase is clean.

## Parallel Orchestration

Ralph can spawn multiple agents simultaneously for independent tasks.

### Independent Tasks (Parallel)

```
# Single message with multiple Task tool calls:
Task(subagent_type: kraken, prompt: "Implement feature A in src/a.ts")
Task(subagent_type: kraken, prompt: "Implement feature B in src/b.ts")
Task(subagent_type: arbiter, prompt: "Write tests for feature C in tests/c.test.ts")
```

### Parallel Detection Rules

| Pattern | Execution |
|---------|-----------|
| Different files | Parallel OK |
| Same file | Sequential |
| Test depends on impl | Sequential |
| Independent features | Parallel OK |
| Shared utilities | Sequential |

## Prohibited Actions

Ralph MUST NOT use these directly:

| Action | Instead |
|--------|---------|
| `Edit` file directly | `Task(kraken)` |
| `Write` file directly | `Task(kraken)` |
| `Bash` npm test | `Task(arbiter)` |
| `Bash` npm run lint | `Task(arbiter)` |
| Debug directly | `Task(debug-agent)` |
| Research codebase | `Task(scout)` |

**Allowed Tools:** Read, Glob, Grep, Task, AskUserQuestion

## Docker-Isolated Agents

Ralph can spawn agents in Docker containers for true process isolation with memory integration.

### Architecture

```
RALPH ORCHESTRATOR
  1. Select task from IMPLEMENTATION_PLAN.md
  2. Call prepare-agent-context.py (query memory)
  3. Spawn Docker container with /context mounted
  4. Wait for completion
  5. Call extract-agent-learnings.py (store learnings)
       |                                    ^
       | docker run                         | exit + output
       v                                    |
DOCKER CONTAINER
  Volumes:
  ├── /context/learnings.md (pre-fetched memories, ro)
  ├── /context/knowledge-tree.json (project structure, ro)
  ├── /workspace (project files, rw)
  └── /workspace/.ralph/agent-output.json (results, rw)
```

### Context Directory

| File | Purpose |
|------|---------|
| `learnings.md` | Human-readable past learnings |
| `knowledge-tree.json` | Project structure and navigation |
| `task.md` | Full task instructions with context |
| `meta.json` | Task metadata for learning extraction |

### Memory Query Strategy

`prepare-agent-context.py` runs 3 queries before spawning:

```python
results1 = recall_learnings(f"{task_type} {keywords}", k=5)     # Similar task patterns
results2 = recall_learnings(f"{task_type} errors failures", k=3) # Errors to avoid
results3 = recall_learnings(f"{project_name} patterns", k=3)    # Project-specific
```

### Spawn Command

```bash
~/.claude/scripts/ralph/spawn-ralph-docker.sh \
  --task "Implement authentication middleware" \
  --story-id "STORY-001" \
  --project-dir "/path/to/project" \
  --iteration 1 \
  --max-iterations 30
```

### Agent Output Format

```json
{
  "status": "success" | "failure" | "blocked",
  "task_description": "...",
  "task_type": "implement" | "test" | "refactor" | "fix",
  "files_modified": ["path1", "path2"],
  "commit_hash": "abc123",
  "approach_summary": "What approach was taken",
  "key_insight": "Key learning from this task",
  "error_message": null | "...",
  "verification": {
    "tests_passed": true,
    "typecheck_passed": true,
    "lint_passed": true
  }
}
```

### Learning Extraction

| Task Status | Learning Type | Content |
|-------------|---------------|---------|
| `success` | `WORKING_SOLUTION` | What worked, files, approach, key insight |
| `failure` | `FAILED_APPROACH` | What failed, error, what to avoid |
| `blocked` | (skipped) | Not enough signal |

## File Locking

Ralph uses PostgreSQL `file_claims` table to prevent conflicts.

### Check Before Spawning

```sql
SELECT * FROM file_claims
WHERE file_path = 'src/auth.ts'
AND released_at IS NULL;
```

If claimed: wait (poll every 5s, max 60s), reassign, or run sequentially. Agents auto-claim on start and release on completion.
