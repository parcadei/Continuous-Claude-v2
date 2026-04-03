---
name: vector-spaces
description: "Problem-solving strategies for vector spaces in linear algebra"
allowed-tools: [Bash, Read]
---

# Vector Spaces

## When to Use

Use this skill when working on vector-spaces problems in linear algebra.

## Decision Tree

1. **Check Subspace**
   - Contains zero vector?
   - Closed under addition?
   - Closed under scalar multiplication?
   - Verify with `z3_solve.py prove`

2. **Linear Independence**
   - Set up Ax = 0 where columns are vectors
   - `sympy_compute.py nullspace "A"`
   - Trivial nullspace = independent

3. **Basis and Dimension**
   - Find spanning set, remove dependent vectors
   - `sympy_compute.py rref "A"` to find pivot columns
   - Dimension = number of pivots

4. **Change of Basis**
   - Find transition matrix P
   - New coords = P^(-1) \* old coords
   - `sympy_compute.py inverse "P"`

## Tool Commands

### Sympy_Nullspace

```bash
uv run python -m runtime.harness scripts/sympy_compute.py nullspace "[[1,2,3],[4,5,6]]"
```

### Sympy_Rref

```bash
uv run python -m runtime.harness scripts/sympy_compute.py rref "[[1,2,3],[4,5,6]]"
```

### Z3_Prove

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "subspace_closed"
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
