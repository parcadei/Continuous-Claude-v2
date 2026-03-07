---
name: braintrust-analyze
version: 6.0-hybrid
description: Analyze Claude Code sessions via Braintrust tracing
---

# Option: braintrust-analyze

## I (Initiation)
activate: [retrospective, debug_failure, weekly_review, skill_opportunity, token_analysis]
skip: [active_implementation, planning_phase]

## Y (Observation Space)
| signal | source | interpretation |
|--------|--------|----------------|
| session_id | Braintrust API | target session |
| spans | Braintrust traces | tool/agent/skill calls |
| token_usage | span metadata | consumption patterns |

## U (Action Space)
primary: [Bash]
forbidden: [Write, Edit]

## pi (Policy)

### P0: Mode Selection
```
eta |-> last_session if no_params
eta |-> specific_mode if param_provided
```

| action | Q | why | mitigation |
|--------|---|-----|------------|
| guess_session | -inf | Wrong data analyzed | use --last-session |
| skip_api_check | -inf | BRAINTRUST_API_KEY may be missing | check env first |

### P1: Execute Analysis
```
eta |-> run_script(mode) via Bash
mode in {--last-session, --sessions N, --agent-stats, --skill-stats, --detect-loops, --replay ID, --weekly-summary, --token-trends}
```

| action | Q | why |
|--------|---|-----|
| last_session | HIGH | Most common use case |
| detect_loops | HIGH | Finds inefficiencies |
| agent_stats | MED | Weekly review |

### Command Reference
```bash
uv run python -m runtime.harness scripts/braintrust_analyze.py [OPTIONS]
```

## beta (Termination)
```
beta(eta) = 1.0 if analysis_displayed OR api_error
```
success: [patterns_identified, loops_found, summary_generated]
failure: [api_key_missing, no_sessions_found]

## Output Schema
```yaml
sections: [session_id, tool_breakdown, agent_spawns, skill_activations, recommendations]
```

## Invariants
```
inv_1: never write files (read-only analysis)
inv_2: always check BRAINTRUST_API_KEY exists
```
