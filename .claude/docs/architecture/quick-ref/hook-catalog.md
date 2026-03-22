# Hook Catalog

**Total registered: 55 hooks across 6 event types**
Last updated: 2026-03-21

## SessionStart (9 hooks)

| Hook | Description |
|------|-------------|
| session-start-docker | Ensure Docker services are running |
| session-register | Register session in PostgreSQL for cross-terminal coordination |
| session-start-continuity | Load handoffs and prior session context |
| session-start-init-check | Auto-generate knowledge tree if missing |
| session-start-recovery | Recover from interrupted sessions |
| braintrust_hooks session_start | Braintrust observability trace init |
| roadmap-reconcile | Sync ROADMAP.md with actual state on session start |
| session-start-tldr-cache | Pre-cache TLDR structure analysis |
| hook-health-monitor | Verify hook registration health on startup |

## UserPromptSubmit (12 hooks)

| Hook | Description |
|------|-------------|
| heartbeat | Session keepalive heartbeat to PostgreSQL |
| maestro-state-manager | Manage Maestro workflow phase state |
| guardrail-enforcer | Enforce operational guardrails on user prompts |
| skill-activation-prompt | Detect skill trigger keywords in user input |
| memory-awareness | Inject relevant memories from semantic search |
| pageindex-navigator | Route to PageIndex for document queries |
| maestro-detector | Detect /maestro workflow activation |
| user-confirmation-detector | Detect user confirmations for gated operations |
| ralph-watchdog | Monitor Ralph iteration limits and escalation |
| ralph-progress-inject | Inject Ralph progress state into context |
| ralph-retry-reminder | Remind about failed Ralph agent retries |
| braintrust_hooks user_prompt_submit | Braintrust prompt-level tracing |

## PreToolUse (17 hooks)

| Hook | Matcher | Description |
|------|---------|-------------|
| pre-plan-memory | EnterPlanMode | Recall relevant memories before planning |
| agent-validate | Agent | Validate agent type and configuration |
| explore-to-scout | Agent | Redirect Explore agent to scout |
| no-haiku-enforcer | Agent | Block haiku model selection for agents |
| navigator-validate | Agent | Validate navigator agent configuration |
| task-router | Agent | Suggest better agent for task type |
| ralph-template-inject | Agent | Inject Ralph templates into agent prompts |
| maestro-enforcer | Agent | Enforce Maestro phase gating (block skipping) |
| pre-tool-knowledge | Agent | Inject knowledge tree context for agents |
| tldr-context-inject | Agent | Inject TLDR analysis context for agents |
| smart-search-router | Grep | Route to AST-grep or TLDR for structured searches |
| tldr-read-enforcer | Read | Suggest TLDR structure before reading large files |
| ralph-delegation-enforcer | Edit\|Write\|Bash | Block direct code edits when Ralph is active |
| navigator-safety | Bash | Safety checks for bash commands |
| plan-to-ralph-enforcer | Edit\|Write | Block code edits after plan approval (use Ralph) |
| file-claims | Edit\|Write | Distributed file locking across sessions |
| test-before-done | TaskUpdate | Require test evidence before marking task complete |

## PostToolUse (21 hooks)

| Hook | Matcher | Description |
|------|---------|-------------|
| braintrust_hooks post_tool_use | * | Braintrust tool-use tracing |
| agent-error-capture | Agent | Capture and log agent errors |
| agent-verification | Agent | Verify agent output claims |
| ralph-task-monitor | Agent | Track Ralph delegated task completion |
| epistemic-reminder | Grep\|Read | Warn about unverified grep/read claims |
| post-plan-roadmap | ExitPlanMode | Sync plan to ROADMAP.md after approval |
| plan-exit-tracker | ExitPlanMode | Track plan approval state for enforcement |
| roadmap-completion | TaskUpdate\|Bash | Track roadmap task completions |
| git-commit-roadmap | Bash | Update ROADMAP.md after git commits |
| ralph-monitor | Bash | Monitor Ralph bash command output |
| test-run-tracker | Bash | Track test execution results |
| smarter-everyday | Edit\|Write\|Bash\|TaskUpdate | Extract learnings from tool use patterns (L0) |
| prd-roadmap-sync | Write\|Edit | Sync PRD changes to ROADMAP.md |
| sync-to-repo | Write\|Edit | Auto-sync ~/.claude changes to continuous-claude repo |
| git-auto-commit | Write\|Edit | Auto-commit ~/.claude file changes |
| tree-invalidate | Write\|Edit | Mark knowledge tree stale after file changes |
| pageindex-watch | Write\|Edit | Update PageIndex after doc file changes |
| auto-build | Write\|Edit | Auto-rebuild hooks after source changes |
| import-validator | Edit\|Write | Validate import paths after code edits |
| periodic-extract | * | Periodic learning extraction (L0 timer) |
| telemetry-tracker | Skill\|Task | Track skill and task usage telemetry |
| mcp-activity-tracker | * | Track MCP server tool usage |
| vercel-deploy-context | Bash | Inject Vercel deployment context after deploy commands |
| post-edit-diagnostics | Edit\|Write | Run type check and lint after code edits |
| web-lookup-advisor | WebFetch\|WebSearch | Suggest Nia/context7 before web lookups |

## PreCompact (2 hooks)

| Hook | Description |
|------|-------------|
| pre-compact-extract | Extract learnings before context compaction (L1) |
| pre-compact-continuity | Save continuity state before compaction |

## SessionEnd (5 hooks)

| Hook | Description |
|------|-------------|
| maestro-cleanup | Clean up Maestro workflow state files |
| session-end-extract | Extract session learnings on close (L2) |
| braintrust_hooks session_end | Finalize Braintrust session trace |
| braintrust_hooks stop | Flush Braintrust trace data |
| session-outcome | Prompt for session outcome marking |

## Blocking Hooks

Only PreToolUse hooks can block tool execution via `permissionDecision: "deny"`.

Key blockers:
- **file-claims** -- prevents concurrent edits to same file across sessions
- **ralph-delegation-enforcer** -- blocks direct code edits when Ralph is active
- **plan-to-ralph-enforcer** -- blocks code edits after plan approval
- **maestro-enforcer** -- blocks phase-skipping in Maestro workflows
- **no-haiku-enforcer** -- blocks haiku model selection for agents
- **test-before-done** -- blocks task completion without test evidence

## File Locations

```
~/.claude/hooks/
  src/              # TypeScript source
  dist/             # Compiled JS (esbuild output, .mjs)
  package.json      # Dependencies and build script
  braintrust_hooks.py  # Python hooks for Braintrust observability
```

## Registration

All hooks registered in `~/.claude/settings.json` under `hooks.<EventType>[]`.
Use Node.js atomic read-modify-write to update settings.json (never Edit tool).
