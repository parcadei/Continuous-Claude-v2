# Ralph State Management Reference

## Files Reference

| Path | Purpose |
|------|---------|
| `~/.claude/templates/ralph/PROMPT_BUILD.md` | Build loop prompt |
| `~/.claude/templates/ralph/AGENT_PROMPT.md` | Docker agent prompt template |
| `~/.claude/scripts/ralph/ralph-skill-query.py` | Skill router query |
| `~/.claude/scripts/ralph/prepare-agent-context.py` | Pre-spawn context builder |
| `~/.claude/scripts/ralph/extract-agent-learnings.py` | Post-completion learning extractor |
| `~/.claude/scripts/ralph/spawn-ralph-docker.sh` | Memory-aware Docker spawn |
| `$CLAUDE_OPC_DIR/scripts/core/recall_learnings.py` | Memory recall (Phase 0, 2) |
| `$CLAUDE_OPC_DIR/scripts/core/store_learning.py` | Learning storage (Phase 4) |
| `~/.claude/docker/ralph/docker-compose.yml` | Docker configuration |
| `${PROJECT}/.claude/knowledge-tree.json` | Project navigation (Phase 0) |
| `${PROJECT}/ROADMAP.md` | Goal tracking (auto-updated by hooks) |
| `/tasks/prd-*.md` | Human-readable PRD |
| `/tasks/tasks-*.md` | Task breakdown |
| `.ralph/IMPLEMENTATION_PLAN.md` | Implementation checklist |
| `.ralph/agent-output.json` | Agent task results |
| `.ralph/orchestration.json` | Iteration and status tracking |

## Memory & Knowledge Integration

| Phase | System | Usage |
|-------|--------|-------|
| Phase 0 | Memory | Recall similar features |
| Phase 0 | Knowledge Tree | Understand project structure |
| Phase 0 | ROADMAP | Check current goals |
| Phase 2 | Memory | Recall implementation patterns |
| Phase 3 | Knowledge Tree | Injected via `pre-tool-knowledge` hook |
| Phase 4 | Memory | Store learnings from feature |
| Phase 4 | ROADMAP | Auto-updated via `prd-roadmap-sync` hook |

## Iteration Control

```yaml
Iteration Limits:
  max_iterations: 30        # Default for feature work
  small_task_max: 10        # For quick fixes
  large_task_max: 50        # For complex multi-file features

On Max Reached:
  action: BLOCKED
  output: |
    <BLOCKED/>
    Story: {{STORY_ID}}
    Reason: Max iterations ({{max}}) reached without completion
    Completed: {{completed_tasks}} / {{total_tasks}}
    Need: User intervention

Iteration Tracking:
  - Increment counter at start of each delegation cycle
  - Log iteration number in agent prompts
  - Store iteration count in .ralph/orchestration.json
```

## AFK vs HITL Modes

```yaml
HITL (Human-in-the-loop):
  max_iterations: 10
  mode: Interactive pair programming
  verify: After each task
  escalate: Immediately on uncertainty

AFK (Away-from-keyboard):
  max_iterations: 30
  mode: Autonomous batch processing
  verify: At end or on failure
  escalate: After max retries exhausted
```

## Fresh Context Architecture

**Key insight: "Progress doesn't persist in the LLM's context window — it lives in your files and git history."**

### Why Fresh Context

- Accumulated errors compound over long sessions
- Hallucination drift increases with context rot
- Earlier mistakes pollute later decisions
- Token efficiency degrades with bloated context

### How Ralph Achieves It

```yaml
Ralph (parent):
  - Maintains minimal coordination context
  - Reads plan, selects task, spawns agent
  - Receives agent result summary
  - Does NOT inherit agent's full working context

Agent (child):
  - Fresh context via Task tool isolation
  - Receives only: task description + file list + requirements
  - Works independently
  - Returns: commit hash + summary + status
```

### Context Isolation Table

| Context Type | Where | Persists Across Agents? |
|--------------|-------|------------------------|
| Code changes | Git commits | Yes (via git) |
| Task status | IMPLEMENTATION_PLAN.md | Yes (via file) |
| Learnings | archival_memory table | Yes (via DB) |
| Working context | Agent's context window | No (fresh each time) |
| Error history | orchestration.json | Yes (for escalation) |

## Project Readiness Check (Phase 0.0)

Ensure infrastructure before starting:

1. **Ralph state:** If `.ralph/state.json` missing:
   ```bash
   python ~/.claude/scripts/ralph/ralph-state-v2.py init --project ${PROJECT}
   ```
   Also auto-copies `.ralph/CLAUDE.md` (TDD enforcement contract).

2. **Knowledge tree:** If `.claude/knowledge-tree.json` missing:
   ```bash
   cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/knowledge_tree.py --project ${PROJECT} --verbose
   ```

3. **ROADMAP.md:** If missing, create minimal template:
   ```markdown
   # Project Roadmap
   ## Current Focus
   _No current goal set._
   ## Completed
   ## Planned
   ```

Run silently — do NOT prompt user during readiness checks.

## Comparison: Original Ralph vs This Implementation

| Feature | Original Ralph | Our Implementation |
|---------|---------------|-------------------|
| Fresh context per iteration | New AI instance | Task tool / Docker isolation |
| External verification | `verifyCompletion()` | Verification checklist |
| Iteration limits | 5-50 based on size | 10/30/50 tiers |
| State via files | `prd.json`, `progress.txt` | `.ralph/`, memory DB |
| Cost tracking | Basic | Planned (future) |
| Multi-agent | Single per iteration | Parallel orchestration |
| Memory system | Flat file | Semantic search DB + pgvector |
| Pre-spawn context | None | `prepare-agent-context.py` |
| Post-completion learning | None | `extract-agent-learnings.py` |
| Docker isolation | None | Full container isolation |
| Enforcement | None | Hook-based |

**Key insight preserved:** "Ralph is a deterministically mallocing orchestrator that avoids context rot."
