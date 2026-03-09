# Docker Agent Task: {{TASK_DESCRIPTION}}

**Story:** {{STORY_ID}}
**Task ID:** {{TASK_ID}}
**Iteration:** {{ITERATION}} / {{MAX_ITERATIONS}}
**Project:** {{PROJECT_NAME}}

---

## CRITICAL: Read Context First [BLOCK]

Before implementing, you MUST read these files:

### 1. Past Learnings (Required)
```bash
cat /context/learnings.md
```
This contains:
- **What Worked Before**: Successful approaches for similar tasks
- **What To Avoid**: Failed approaches and pitfalls
- **Codebase Patterns**: Project-specific conventions

**Apply patterns that worked. Avoid patterns that failed.**

### 2. Project Structure (If Available)
```bash
cat /context/knowledge-tree.json
```
This contains:
- Project structure and directories
- Technology stack
- Key files and entry points

---

## Your Task

{{TASK_DESCRIPTION}}

### Requirements
{{REQUIREMENTS}}

### Files to Modify
{{FILES}}

### Constraints
- Follow existing patterns in the codebase
- Write tests if the task involves new functionality
- Commit changes with conventional commit message

---

## Output Requirements [C:10]

**After completing work, you MUST write results to `/workspace/.ralph/agent-output.json`**

This file is critical - it enables:
1. Automated learning extraction
2. Task verification
3. Progress tracking

### Output Schema

```json
{
  "status": "success" | "failure" | "blocked",
  "task_description": "{{TASK_DESCRIPTION}}",
  "task_type": "{{TASK_TYPE}}",
  "files_modified": ["path/to/file1.ts", "path/to/file2.ts"],
  "commit_hash": "abc123def456" | null,
  "approach_summary": "Brief description of the approach taken",
  "key_insight": "One key thing that made this work (or would have helped)",
  "error_message": null | "Description of error if failed",
  "failure_stage": null | "planning" | "implementation" | "testing",
  "avoid_next_time": null | "What to avoid if this failed",
  "verification": {
    "tests_passed": true | false | null,
    "typecheck_passed": true | false | null,
    "lint_passed": true | false | null
  },
  "learnings_applied": [
    "Applied pattern X from past session",
    "Avoided pitfall Y mentioned in learnings"
  ]
}
```

### Status Values

| Status | When to Use |
|--------|-------------|
| `success` | Task completed, tests pass, committed |
| `failure` | Task failed despite attempts |
| `blocked` | Cannot proceed (missing info, external dependency) |

### Writing the Output

```bash
# Ensure directory exists
mkdir -p /workspace/.ralph

# Write output (example for success)
cat > /workspace/.ralph/agent-output.json << 'EOF'
{
  "status": "success",
  "task_description": "{{TASK_DESCRIPTION}}",
  "task_type": "implement",
  "files_modified": ["src/auth/middleware.ts", "src/auth/types.ts"],
  "commit_hash": "abc123",
  "approach_summary": "Created auth middleware with JWT validation and refresh token handling",
  "key_insight": "Using a middleware factory pattern allowed easy testing",
  "error_message": null,
  "failure_stage": null,
  "avoid_next_time": null,
  "verification": {
    "tests_passed": true,
    "typecheck_passed": true,
    "lint_passed": true
  },
  "learnings_applied": [
    "Applied token refresh pattern from similar auth task"
  ]
}
EOF
```

---

## Workflow

### 1. Read Context
```bash
cat /context/learnings.md
cat /context/knowledge-tree.json 2>/dev/null || echo "No knowledge tree"
```

### 2. Understand Codebase
Explore the workspace to understand existing patterns:
```bash
ls -la /workspace/src/
# Use grep, find, or read files as needed
```

### 3. Implement
Write the code following:
- Patterns from learnings.md
- Existing codebase conventions
- Task requirements

### 4. Test
```bash
# Run tests (auto-detect framework)
npm test 2>/dev/null || pytest 2>/dev/null || go test ./... 2>/dev/null || echo "No tests"
```

### 5. Commit
```bash
git add -A
git commit -m "{{COMMIT_MESSAGE}}"
```

### 6. Write Output
Write `/workspace/.ralph/agent-output.json` with results.

---

## Remember

- **Fresh context = no accumulated errors**: You start clean each time
- **Learnings are your memory**: Past agents' experiences help you succeed
- **Output enables learning**: Your output helps future agents
- **One task, one focus**: Complete this task fully before exiting

---

*Docker Agent Prompt v1.0 - Memory-Aware Agent Architecture*
