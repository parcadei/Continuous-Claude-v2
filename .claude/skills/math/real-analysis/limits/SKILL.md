---
name: limits
description: "Problem-solving strategies for limits in real analysis"
allowed-tools: [Bash, Read]
---

# Limits

## When to Use

Use this skill when working on limits problems in real analysis.

## Decision Tree

1. **Direct Substitution**
   - Try plugging in the value directly
   - If you get a determinate form, that's the answer

2. **Indeterminate Form? (0/0, inf/inf)**
   - Try algebraic manipulation (factor, rationalize)
   - Try L'Hopital's rule: `sympy_compute.py diff` on numerator/denominator

3. **Squeeze Theorem**
   - If bounded: find g(x) <= f(x) <= h(x) where lim g = lim h
   - Verify bounds with `z3_solve.py prove`

4. **Epsilon-Delta Proof**
   - For rigorous proof: set up |f(x) - L| < epsilon
   - Find delta in terms of epsilon
   - Verify with `math_scratchpad.py verify`

## Tool Commands

### Sympy_Limit

```bash
uv run python -m runtime.harness scripts/sympy_compute.py limit "sin(x)/x" --var x --at 0
```

### Sympy_Diff

```bash
uv run python -m runtime.harness scripts/sympy_compute.py diff "x**2" --var x
```

### Z3_Prove

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "limit_bound" --vars x
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
