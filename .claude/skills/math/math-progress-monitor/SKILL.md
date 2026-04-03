---
name: math-progress-monitor
description: Metacognitive check-ins during problem solving - detects when to pivot or persist
---

# Math Progress Monitor

## When to Use

Trigger on phrases like:

- "am I on the right track"
- "is this approach working"
- "I'm stuck"
- "should I try something else"
- "verify my progress"
- "check my reasoning"
- "is this getting too complicated"

Use mid-work to assess whether to continue, pivot, or decompose (Schoenfeld's metacognitive control).

## Process

Run a structured progress assessment:

### 1. Inventory attempts

**Ask:** "What have you tried so far?"

- List each approach
- Order by when attempted
- Note time spent

### 2. Extract learnings

**Ask:** "What did each attempt tell you?"

- Even failures provide information
- What was ruled out?
- What patterns emerged?

### 3. Complexity check

**Ask:** "Is complexity growing faster than expected?"

- Warning signs:
  - More terms than you started with
  - New variables appearing
  - Calculation getting messier
- Normal: complexity stays flat or decreases

### 4. Spot-check verification

**Ask:** "Can you verify any intermediate results?"

- Run numerical examples
- Check limiting cases
- Dimensional analysis

### 5. Decomposition check

**Ask:** "Is there a simpler sub-problem to solve first?"

- Identify dependencies
- Find stepping stones
- Reduce scope

### 6. Sunk cost assessment

**Ask:** "What would abandoning this approach cost?"

- Time already spent (irrelevant)
- Insights that transfer (relevant)
- Probability of success if continue

## Key Questions to Ask

1. What have you tried? (inventory)
2. What did you learn? (extract)
3. Is it getting simpler or harder? (complexity)
4. Can you check a piece? (verify)
5. What's the smallest step? (decompose)
6. Should you pivot? (decide)

## Output Format

```
Progress Assessment:

Status: [On track / Hitting resistance / Should pivot]

Attempts Summary:
1. [Approach] -> [Outcome/Learning]
2. [Approach] -> [Outcome/Learning]

Complexity Check:
- Expected: [what should this look like]
- Actual: [what it actually looks like]
- Verdict: [Normal / Warning / Abandon]

Verification Points:
- [Intermediate result to check]
- [Numerical test case]

Recommendation:
[Continue / Modify approach / Switch strategy / Decompose / Get more info]

If Pivoting:
- Alternative: [specific new approach]
- Why it might work: [reasoning]
```

## Example Interaction

```
User: I've been trying to evaluate this integral for an hour

Claude: Let's do a progress check.

Q1: What have you tried?
> u-substitution with u = sin(x), then integration by parts twice.

Q2: What did each tell you?
> Substitution made it longer. Parts created a cycle.

Q3: Complexity now vs start?
> Much worse. Started with 3 terms, now have 8.

Complexity Check:
- Expected: Should simplify or stay similar
- Actual: 3 terms -> 8 terms after 2 techniques
- Verdict: WARNING - likely wrong approach

Let me verify an intermediate step...

[Runs sympy on original integral]

This integral has closed form using:
- Beta function (special function)
- Or contour integration

Recommendation: PIVOT

Your algebraic approaches won't simplify this pattern.

Alternative Approach:
1. Recognize: integral of sin^m(x) * cos^n(x)
2. Use Beta function identity
3. Or convert to complex exponentials

Related Skills:
- complex-analysis/contour-integrals
- numerical-methods/numerical-integration

Would you like the Beta function approach, or get a numerical answer first to verify?
```

## Co-activates

When user is stuck, suggest:

- **math-intuition-builder** - reset understanding
- **math-model-selector** - if framework was wrong
- **math-mode** - for verification computations
- **Relevant domain skill** - for alternative approach
