# Pre-Mortem Example Session

Annotated walkthrough of a deep premortem on an API rate limiting plan.

## Session Transcript

```
User: /premortem deep thoughts/shared/plans/2026-01-08-api-rate-limiting.md

Claude: Running deep pre-mortem on API rate limiting plan...

[Reviews plan against deep checklist]

Pre-mortem complete. Found 2 tigers, 1 elephant:

**TIGERS:**
1. [HIGH] No circuit breaker for external payment API
   - Category: dependency
   - If payment API is slow/down, requests will pile up
   - mitigation_checked: No retry wrapper, no timeout, no fallback path found

2. [HIGH] No rollback strategy defined
   - Category: integration
   - If rate limiting breaks auth flow, no quick fix path
   - mitigation_checked: No feature flag, no gradual rollout, no revert script

**ELEPHANTS:**
1. [MEDIUM] Team hasn't used Redis before
   - We're introducing Redis for rate limit counters
   - Learning curve could slow implementation

**PAPER TIGERS:**
1. Database migration size - Only adds one index, <1s migration
   - Verified at migrations/0042_add_rate_limit_index.sql:3

[AskUserQuestion presented with 4 options]

User: Research mitigation options

Claude: Researching mitigations for 2 HIGH tigers...

[Spawns scout + oracle in parallel for each tiger]

Found 3 options for circuit breaker:

1. **Use existing retry util** (Recommended)
   - Found at src/utils/retry.ts:45
   - Already handles exponential backoff
   - Just need to add circuit breaker state

2. **Add resilience4j-lite**
   - Popular library for this pattern
   - More features but new dependency

3. **Custom implementation**
   - Full control but more code to maintain

Which approach for the circuit breaker?

User: Option 1 - use existing retry util

Claude: Added to plan. Now addressing tiger 2: no rollback strategy.

Found options:
1. **Feature flag** (Recommended) - wrap new rate limiter in flag, instant disable
2. **Blue/green deployment** - run old + new in parallel for 24h
3. **Manual revert script** - pre-written rollback runbook

User: Feature flag

Claude: Added to plan:

## Risk Mitigations (Pre-Mortem)

### Tigers Addressed:
1. **No circuit breaker** (HIGH)
   - Mitigation: Extend src/utils/retry.ts with circuit breaker state
   - Added to Phase 1

2. **No rollback strategy** (HIGH)
   - Mitigation: Wrap rate limiter in RATE_LIMIT_ENABLED feature flag
   - Added to Phase 0 (infrastructure)

### Accepted Risks: None

### Pre-Mortem Run:
- Date: 2026-01-08T14:32:00Z
- Mode: deep
- Tigers: 2 (both addressed) | Elephants: 1 (accepted)
```

## Key Patterns Demonstrated

1. **Two-pass process** — initial scan found 4 potential risks, verification reduced to 2 real tigers + 1 elephant
2. **mitigation_checked field** — each tiger shows exactly what was looked for and not found
3. **Paper tiger documented** — migration size flagged initially, dismissed with evidence (file:line)
4. **Parallel research** — scout (internal) + oracle (external) run simultaneously per tiger
5. **User chooses** — Claude presents options, user decides, Claude implements the update

## False Alarm Example

The migration size was initially flagged as a potential risk ("large migration could lock table"). Verification:
- Read `migrations/0042_add_rate_limit_index.sql`
- Found: `CREATE INDEX CONCURRENTLY` — non-blocking
- Result: false_alarm, documented with reason
