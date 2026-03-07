---
name: premortem
description: Identify failure modes before they occur using structured risk analysis
allowed-tools: [Read, Grep, Glob, Task, AskUserQuestion, TodoWrite]
---

# Pre-Mortem

Identify failure modes before they occur by systematically questioning plans, designs, and implementations. Based on Gary Klein's technique, popularized by Shreyas Doshi (Stripe).

## Usage

```
/premortem              # Auto-detect context, choose depth
/premortem quick        # Force quick analysis (plans, PRs)
/premortem deep         # Force deep analysis (before implementation)
/premortem <file>       # Analyze specific plan or code
```

## Core Concept

> "Imagine it's 3 months from now and this project has failed spectacularly. Why did it fail?"

## Risk Categories (Shreyas Framework)

| Category | Symbol | Meaning |
|----------|--------|---------|
| **Tiger** | `[TIGER]` | Clear threat that will hurt us if not addressed |
| **Paper Tiger** | `[PAPER]` | Looks threatening but probably fine |
| **Elephant** | `[ELEPHANT]` | Thing nobody wants to talk about |

## CRITICAL: Verify Before Flagging

**Do NOT flag risks based on pattern-matching alone.** Every potential tiger MUST go through verification.

### The False Positive Problem

Common mistakes that create false tigers:
- Seeing a hardcoded path without checking for `if exists():` fallback
- Finding missing feature X without asking "is X in scope?"
- Flagging code at line N without reading lines N±20 for context
- Assuming error case isn't handled without tracing the code

### Verification Checklist (REQUIRED)

Before flagging ANY tiger, verify:

```yaml
potential_finding:
  what: "Hardcoded path at line 42"

verification:
  context_read: true    # Did I read ±20 lines around the finding?
  fallback_check: true  # Is there try/except, if exists(), or else branch?
  scope_check: true     # Is this even in scope for this code?
  dev_only_check: true  # Is this in __main__, tests/, or dev-only code?

result: tiger | paper_tiger | false_alarm
```

**If ANY verification check is "no" or "unknown", DO NOT flag as tiger.**

### Required Evidence Format

Every tiger MUST include:

```yaml
tiger:
  risk: "<description>"
  location: "file.py:42"
  severity: high|medium
  # REQUIRED - what mitigation was checked and NOT found:
  mitigation_checked: "No exists() check, no try/except, no fallback branch"
```

If you cannot fill in `mitigation_checked` with specific evidence, it's not a verified tiger.

## Workflow

### Step 1: Detect Context & Depth

```python
# Auto-detect based on context
if in_plan_creation:
    depth = "quick"   # Localized scope
elif before_implementation:
    depth = "deep"    # Global scope
elif pr_review:
    depth = "quick"   # Localized scope
else:
    # Ask user
    AskUserQuestion(
        question="What depth of pre-mortem analysis?",
        header="Depth",
        options=[
            {"label": "Quick (2-3 min)", "description": "Plans, PRs, localized changes"},
            {"label": "Deep (5-10 min)", "description": "Before implementation, global scope"}
        ]
    )
```

### Step 2: Run Appropriate Checklist

#### Quick Checklist (Plans, PRs)

Run through these mentally, note any that apply:

**Core Questions:**
1. What's the single biggest thing that could go wrong?
2. Any external dependencies that could fail?
3. Is rollback possible if this breaks?
4. Edge cases not covered in tests?
5. Unclear requirements that could cause rework?

**Output Format:**
```yaml
premortem:
  mode: quick
  context: "<plan/PR being analyzed>"

  # Two-pass process: first gather potential risks, then verify each one
  potential_risks:  # Pass 1: Pattern-matching findings
    - "hardcoded path at line 42"
    - "missing error handling for X"

  # Pass 2: After verification
  tigers:
    - risk: "<description>"
      location: "file.py:42"
      severity: high|medium
      category: dependency|integration|requirements|testing
      mitigation_checked: "<what was NOT found>"  # REQUIRED

  elephants:
    - risk: "<unspoken concern>"
      severity: medium

  paper_tigers:
    - risk: "<looks scary but ok>"
      reason: "<why it's fine - what mitigation EXISTS>"
      location: "file.py:42-48"  # Show the mitigation location

  false_alarms:  # Findings that turned out to be nothing
    - finding: "<what was initially flagged>"
      reason: "<why it's not a risk>"
```

#### Deep Checklist (Before Implementation)

Work through each category systematically:

**Technical Risks:**
- [ ] Scalability: Works at 10x/100x current load?
- [ ] Dependencies: External services + fallbacks defined?
- [ ] Data: Availability, consistency, migrations clear?
- [ ] Latency: SLA requirements will be met?
- [ ] Security: Auth, injection, OWASP considered?
- [ ] Error handling: All failure modes covered?

**Integration Risks:**
- [ ] Breaking changes identified?
- [ ] Migration path defined?
- [ ] Rollback strategy exists?
- [ ] Feature flags needed?

**Process Risks:**
- [ ] Requirements clear and complete?
- [ ] All stakeholder input gathered?
- [ ] Tech debt being tracked?
- [ ] Maintenance burden understood?

**Testing Risks:**
- [ ] Coverage gaps identified?
- [ ] Integration test plan exists?
- [ ] Load testing needed?
- [ ] Manual testing plan defined?

**Output Format:**
```yaml
premortem:
  mode: deep
  context: "<implementation being analyzed>"

  # Two-pass process
  potential_risks:  # Pass 1: Initial scan findings
    - "no circuit breaker for external API"
    - "hardcoded timeout value"

  # Pass 2: After verification (read context, check for mitigations)
  tigers:
    - risk: "<description>"
      location: "file.py:42"
      severity: high|medium
      category: scalability|dependency|data|security|integration|testing
      mitigation_checked: "<what mitigations were looked for and NOT found>"
      suggested_fix: "<how to address>"

  elephants:
    - risk: "<unspoken concern>"
      severity: medium|high
      suggested_fix: "<suggested approach>"

  paper_tigers:
    - risk: "<looks scary>"
      reason: "<why it's actually ok - cite the mitigation code>"
      location: "file.py:45-52"

  false_alarms:
    - finding: "<initial concern>"
      reason: "<why verification showed it's not a risk>"

  checklist_gaps:
    - category: "<which checklist section>"
      items_failed: ["<item1>", "<item2>"]
```

### Step 3: Present Risks via AskUserQuestion

**BLOCKING:** Present findings and require user decision.

```python
# Build risk summary
risk_summary = format_risks(tigers, elephants)

AskUserQuestion(
    question=f"""Pre-Mortem identified {len(tigers)} tigers, {len(elephants)} elephants:

{risk_summary}

How would you like to proceed?""",
    header="Risks",
    options=[
        {
            "label": "Accept risks and proceed",
            "description": "Acknowledged but not blocking"
        },
        {
            "label": "Add mitigations to plan (Recommended)",
            "description": "Update plan with risk mitigations before proceeding"
        },
        {
            "label": "Research mitigation options",
            "description": "I don't know how to mitigate - help me find solutions"
        },
        {
            "label": "Discuss specific risks",
            "description": "Talk through particular concerns"
        }
    ]
)
```

### Step 4: Handle User Response

#### If "Accept risks and proceed"
```python
# Log acceptance for audit trail
print("Risks acknowledged. Proceeding with implementation.")
# Continue to next workflow step
```

#### If "Add mitigations to plan"
```python
# User provides mitigation approach
# Update plan file with mitigations section
# Re-run quick premortem to verify mitigations address risks
```

#### If "Research mitigation options"
```python
# Spawn parallel research for each HIGH severity tiger
for tiger in high_severity_tigers:
    # Internal: How has codebase handled this before?
    Task(
        subagent_type="scout",
        prompt=f"""
        Find how this codebase has previously handled: {tiger.category}

        Specifically looking for patterns related to: {tiger.risk}

        Return:
        - File:line references to similar solutions
        - Patterns used
        - Libraries/utilities available
        """
    )

    # External: What are best practices?
    Task(
        subagent_type="oracle",
        prompt=f"""
        Research best practices for: {tiger.risk}

        Context: {tiger.category} in a {tech_stack} codebase

        Return:
        - Recommended approaches (ranked)
        - Library options
        - Common pitfalls to avoid
        """
    )

# Wait for research to complete
# Synthesize options
# Present via AskUserQuestion with 2-4 mitigation options
```

#### If "Discuss specific risks"
```python
# Ask which risk to discuss
AskUserQuestion(
    question="Which risk would you like to discuss?",
    header="Risk",
    options=[format_risk_option(r) for r in all_risks[:4]]
)
# Then have conversation about that specific risk
```

### Step 5: Update Plan (if mitigations added)

If user added mitigations, append to the plan:

```markdown
## Risk Mitigations (Pre-Mortem)

### Tigers Addressed:
1. **{risk}** (severity: {severity})
   - Mitigation: {user_or_researched_mitigation}
   - Added to phase: {phase_number}

### Accepted Risks:
1. **{risk}** - Accepted because: {reason}

### Pre-Mortem Run:
- Date: {timestamp}
- Mode: {quick|deep}
- Tigers: {count}
- Elephants: {count}
```

## Integration Points

### In create_plan / plan-agent

After plan structure is approved, before ExitPlanMode:

```python
# Run quick premortem
/premortem quick

# If HIGH risks found, block until addressed
# If only MEDIUM/LOW, inform and proceed
```

### After plan approval, before implementation

```python
# Run deep premortem on full plan
/premortem deep thoughts/shared/plans/YYYY-MM-DD-feature.md

# Block until all HIGH tigers addressed
```

### In PR review workflows

```python
# Run quick premortem on diff scope
/premortem quick

# Inform of any risks found
```

## Severity Thresholds

| Severity | Blocking? | Action Required |
|----------|-----------|-----------------|
| HIGH | Yes | Must address or explicitly accept |
| MEDIUM | No | Inform user, recommend addressing |
| LOW | No | Note for awareness |

## Example Session

```
User: /premortem deep thoughts/shared/plans/2026-01-08-api-rate-limiting.md

Claude: Running deep pre-mortem on API rate limiting plan...

[Reviews plan against deep checklist]

Pre-mortem complete. Found 2 tigers, 1 elephant:

**TIGERS:**
1. [HIGH] No circuit breaker for external payment API
   - Category: dependency
   - If payment API is slow/down, requests will pile up

2. [HIGH] No rollback strategy defined
   - Category: integration
   - If rate limiting breaks auth flow, no quick fix path

**ELEPHANTS:**
1. [MEDIUM] Team hasn't used Redis before
   - We're introducing Redis for rate limit counters
   - Learning curve could slow implementation

**PAPER TIGERS:**
1. Database migration size - Only adds one index, <1s migration

[AskUserQuestion presented]

User: Research mitigation options

Claude: Researching mitigations...

[Spawns scout + oracle in parallel]

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

Claude: Added to plan:

## Risk Mitigations (Pre-Mortem)

### Tigers Addressed:
1. **No circuit breaker** (HIGH)
   - Mitigation: Extend src/utils/retry.ts with circuit breaker state
   - Added to Phase 1

Shall I also address the rollback strategy tiger?
```

## References

- [Pre-Mortems by Shreyas Doshi](https://coda.io/@shreyas/pre-mortems)
- [Gary Klein's Original Research](https://hbr.org/2007/09/performing-a-project-premortem)
- [Project Pre-Mortem Guide - Mountain Goat Software](https://www.mountaingoatsoftware.com/blog/use-a-pre-mortem-to-identify-project-risks-before-they-occur)
