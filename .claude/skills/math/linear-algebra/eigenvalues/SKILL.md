---
name: eigenvalues
description: "Problem-solving strategies for eigenvalues in linear algebra"
allowed-tools: [Bash, Read]
---

# Eigenvalues

## When to Use

Use this skill when working on eigenvalues problems in linear algebra.

## Decision Tree

1. **Compute Characteristic Polynomial**
   - det(A - lambda\*I) = 0
   - `sympy_compute.py charpoly "[[a,b],[c,d]]" --var lam`

2. **Find Eigenvalues**
   - Solve characteristic polynomial
   - `sympy_compute.py eigenvalues "[[1,2],[3,4]]"`

3. **Find Eigenvectors**
   - For each eigenvalue lambda: solve (A - lambda\*I)v = 0
   - `sympy_compute.py eigenvectors "[[1,2],[3,4]]"`

4. **Verify**
   - Check Av = lambda\*v with `z3_solve.py prove`
   - Verify algebraic/geometric multiplicity

## Tool Commands

### Sympy_Eigenvalues

```bash
uv run python -m runtime.harness scripts/sympy_compute.py eigenvalues "[[1,2],[3,4]]"
```

### Sympy_Charpoly

```bash
uv run python -m runtime.harness scripts/sympy_compute.py charpoly "[[a,b],[c,d]]" --var lam
```

### Z3_Verify

```bash
uv run python -m runtime.harness scripts/z3_solve.py sat "det(A - lambda*I) == 0"
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
