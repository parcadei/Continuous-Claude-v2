# UserPromptSubmit Hook Latency Analysis

## Current State

12 hooks fire **serially** on every user prompt submission:

| # | Hook | Timeout | Purpose | Merge Candidate? |
|---|------|---------|---------|------------------|
| 0 | heartbeat.mjs | 5s | Session heartbeat to DB | No (unique) |
| 1 | maestro-state-manager.mjs | 5s | Manage maestro phase state | Merge with #6 |
| 2 | guardrail-enforcer.mjs | 5s | Enforce guardrails | No (unique) |
| 3 | skill-activation-prompt.mjs | 10s | Suggest skills from prompt | No (complex) |
| 4 | memory-awareness.mjs | 10s | Check for relevant memories | No (complex) |
| 5 | pageindex-navigator.mjs | 5s | PageIndex doc routing | No (unique) |
| 6 | maestro-detector.mjs | 5s | Detect maestro intent | Merge with #1 |
| 7 | user-confirmation-detector.mjs | 5s | Detect user confirmations | No (unique) |
| 8 | ralph-watchdog.mjs | 5s | Monitor Ralph state | Merge with #9, #10 |
| 9 | ralph-progress-inject.mjs | 3s | Inject Ralph progress | Merge with #8, #10 |
| 10 | ralph-retry-reminder.mjs | 5s | Remind about retries | Merge with #8, #9 |
| 11 | braintrust_hooks.py | 10s | Log to Braintrust | No (Python, separate) |

**Total timeout budget:** 73s (worst case)
**Typical latency:** ~1-2s total (most hooks return immediately if not relevant)

## Optimization Recommendations

### Quick Win: Merge Ralph hooks (hooks #8, #9, #10)

Three Ralph hooks all read the same state file (`.ralph/state.json`). Merging them into a single `ralph-prompt-handler.mjs` that does all three checks would:
- Eliminate 2 process spawns (~200ms each)
- Reduce file I/O (read state once instead of 3 times)
- **Estimated savings: 400-600ms per prompt**

### Medium: Merge Maestro hooks (#1 and #6)

Both read maestro state. `maestro-state-manager` manages phase transitions, `maestro-detector` detects maestro intent. Could be one hook.
- **Estimated savings: 200-300ms per prompt**

### Harder: Parallelize independent hooks

Claude Code runs hooks serially within a single entry. To parallelize, we'd need to split the single UserPromptSubmit entry into multiple entries (each with fewer hooks). However, Claude Code's hook runner already processes entries in order, so this requires architectural understanding of the hook runner's behavior.

Alternative: Create a "multiplexer" hook that spawns child processes in parallel and waits for all to complete. This adds complexity but could run all 12 hooks concurrently.

### Not Recommended: Remove hooks

All 12 hooks serve distinct purposes. None are dead weight — they just need consolidation.

## Action Items

1. **P1:** Merge ralph-watchdog + ralph-progress-inject + ralph-retry-reminder → `ralph-prompt-handler.mjs`
2. **P2:** Merge maestro-state-manager + maestro-detector → `maestro-prompt-handler.mjs`
3. **P3:** Consider a parallel multiplexer if latency remains >1s after merges

## Expected Impact

After P1+P2 merges: 12 hooks → 9 hooks, ~600-900ms latency reduction per prompt.
