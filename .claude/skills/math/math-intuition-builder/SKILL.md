---
name: math-intuition-builder
description: Develops mathematical understanding through examples, visualization, and analogy
---

# Math Intuition Builder

## When to Use

Trigger on phrases like:

- "help me understand"
- "build intuition for"
- "what does this mean geometrically"
- "why does this work"
- "visualize this concept"
- "concrete example of"
- "what's the intuition behind"

Use before computation to establish understanding (Polya's "understand the problem" phase).

## Process

Guide through Mason's specializing-generalizing cycle:

### 1. Restate in own words

**Ask:** "Can you state the problem in your own words?"

- Forces re-processing
- Catches misunderstandings early
- Verifies shared understanding

### 2. Try concrete examples

**Ask:** "What would a concrete example look like?"

- Specialize: try N=3, x=2, simple case
- Ground abstract concepts in specifics
- Use computation tools to verify examples

### 3. Anticipate the answer

**Ask:** "What form should the answer take?"

- Work backwards from expected result
- Constrain solution space
- Check dimensional consistency

### 4. Visualize

**Ask:** "Can you draw a picture or diagram?"

- Multiple representations matter
- Algebraic <-> geometric <-> numeric
- ASCII diagrams for quick sketches

### 5. Simplify

**Ask:** "What's a simpler version of this problem?"

- Reduce dimension
- Remove terms
- Special cases reveal structure

### 6. Find analogies

**Ask:** "Does this remind you of anything you've solved before?"

- Pattern matching across domains
- Transfer solution strategies

## Key Questions to Ask

1. What are you trying to find? (restate)
2. What happens with small numbers? (specialize)
3. What shape should the answer be? (anticipate)
4. What does this look like visually? (represent)
5. What's the simplest version? (reduce)
6. What's similar? (analogize)

## Output Format

```
Understanding Checkpoint:

Restated Problem:
[User's words, verified]

Concrete Instance:
[Specific numerical example]

Visual Interpretation:
[Description or ASCII diagram]

Simplified Version:
[Special case that's easier]

Analogous Problems:
[Similar structures from other domains]

Intuition Summary:
[1-2 sentence "aha" insight]

Ready to Proceed:
- Next step: [specific action]
- Verify by: [sanity check]
```

## Example Interaction

```
User: I'm trying to understand why eigenvalues matter for stability

Claude: Let's build intuition step by step.

Q1: Restate the problem?
> I have x' = Ax and want to know if solutions grow or shrink.

Q2: Let's try a concrete example.
A = [[0, 1], [-1, 0]]

Computing eigenvalues: +/- i (purely imaginary)

What happens to solutions?
> They neither grow nor shrink?

Exactly. Solutions are circles - oscillation without growth.

Q3: Now try A = [[-1, 0], [0, -1]]
Eigenvalues: -1, -1 (negative real)

What happens?
> Shrinks to zero.

Yes. Negative real parts = decay.

Q4: Visual pattern:

  Im
   |    x unstable
   |
---+------- Re
   |
   |    x stable

Re(lambda) < 0: stable (decay)
Re(lambda) = 0: marginal (oscillate)
Re(lambda) > 0: unstable (blow up)

Q5: Analogies:
- Springs: eigenvalues = decay rates
- Populations: growth/death rates
- Circuits: time constants

Intuition Summary:
Eigenvalues are the system's "DNA" - they encode fundamental rates.
Look at real parts for stability.

Ready to Proceed:
- Next: Analyze your specific A matrix
- Verify: trace(A) < 0 and det(A) > 0 implies stability (2x2 case)
```

## Co-activates

Suggest alongside:

- **math-model-selector** - if framework unclear
- **math-mode** - for concrete computations
- **math-progress-monitor** - during problem solving
- **Relevant domain skill** - once intuition established
