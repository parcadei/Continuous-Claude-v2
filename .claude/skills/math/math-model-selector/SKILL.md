---
name: math-model-selector
description: Routes problems to appropriate mathematical frameworks using expert heuristics
---

# Math Model Selector

## When to Use

Trigger on phrases like:

- "what math should I use"
- "which mathematical framework"
- "how do I model this"
- "what kind of problem is this"
- "formalize this problem"

Use when user has a problem but doesn't know which mathematical domain applies.

## Process

Guide user through decision tree using Polya-style questions:

### 1. Identify the quantity

**Ask:** "What quantity or phenomenon are you trying to understand?"

- Physics problem -> conservation laws, differential equations
- Economics -> equilibrium, optimization
- Data patterns -> statistics, regression

### 2. Characterize change

**Ask:** "What changes, and how does it change?"

- Discrete steps -> difference equations, recurrences
- Continuous rate -> ODEs
- Rate of rate matters -> 2nd order ODEs
- Spatial variation -> PDEs

### 3. Check for uncertainty

**Ask:** "Is there randomness or uncertainty involved?"

- Deterministic -> standard analysis
- Epistemic uncertainty -> Bayesian methods
- Random process -> probability theory, stochastic processes

### 4. Optimization check

**Ask:** "Are you optimizing something?"

- Convex objective -> linear/quadratic programming
- Non-convex -> gradient descent, evolutionary methods
- Discrete choices -> combinatorics, integer programming

### 5. Answer precision

**Ask:** "What level of answer do you need?"

- Rough estimate -> dimensional analysis
- Qualitative behavior -> phase portraits, stability
- Numerical answer -> simulation
- Exact closed form -> analytical methods

## Key Questions to Ask

1. What changes? (discrete vs continuous)
2. What causes the change? (rate dependencies)
3. What's random? (uncertainty type)
4. What's being optimized? (objective function)
5. How precise? (qualitative vs quantitative)

## Output Format

```
Framework Recommendation:
- Primary: [framework name]
- Why: [one-sentence justification]

Starting Point:
- Key equations: [relevant formulas]
- Initial approach: [first step]

Tools to Use:
- [specific script or computation tool]

Related Skills:
- [domain skill to activate next]
```

## Example Interaction

```
User: I want to model how a rumor spreads through a population

Claude: Let me help you find the right framework.

Q1: What quantity are we tracking?
> Number of people who heard the rumor over time.

Q2: What causes it to change?
> Spread rate depends on who knows and who doesn't.

Q3: Is there randomness?
> Assume deterministic (average behavior) for now.

Q4: Optimizing anything?
> No, just understanding dynamics.

Q5: What precision?
> Qualitative behavior, maybe predict peak rate.

Framework Recommendation:
- Primary: First-order ODE (logistic growth)
- Why: Rate depends on current state nonlinearly

Starting Point:
- dN/dt = r * N * (1 - N/K)
- N = heard count, K = population, r = spread rate

Tools:
- sympy_compute.py solve (equilibrium)
- Phase line for qualitative behavior

Related Skills:
- math/math-intuition-builder (understand the model)
- odes-pdes/first-order-odes (solve it)
```

## Co-activates

After framework selection, suggest:

- **math-intuition-builder** - to understand the framework
- **Relevant domain skill** - for actual computation
- **math-mode** - for symbolic verification
