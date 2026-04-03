---
name: banach-spaces
description: "Problem-solving strategies for banach spaces in functional analysis"
allowed-tools: [Bash, Read]
---

# Banach Spaces

## When to Use

Use this skill when working on banach-spaces problems in functional analysis.

## Decision Tree

1. **Verify Banach space**
   - Complete normed vector space
   - Check: every Cauchy sequence converges
   - `z3_solve.py prove "completeness"`

2. **Hahn-Banach Theorem**
   - Extend bounded linear functionals
   - Separate convex sets
   - `z3_solve.py prove "extension_exists"`

3. **Open Mapping Theorem**
   - Surjective bounded operator between Banach spaces is open
   - Consequence: bounded inverse exists
   - `z3_solve.py prove "open_mapping"`

4. **Closed Graph Theorem**
   - T: X -> Y has closed graph implies T bounded
   - Strategy: verify graph closure, conclude boundedness
   - `z3_solve.py prove "closed_graph_implies_bounded"`

5. **Uniform Boundedness Principle**
   - Pointwise bounded family of operators is uniformly bounded
   - Application: prove operator families are bounded

## Tool Commands

### Z3_Completeness

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "cauchy_sequence implies convergent"
```

### Z3_Open_Mapping

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "T_surjective_bounded implies T_open"
```

### Z3_Closed_Graph

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "graph_closed implies T_bounded"
```

### Sympy_Norm

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "norm(alpha*x + beta*y)"
```

## Key Techniques

_From indexed textbooks:_

- [Introductory Functional Analysis with Applications] If (X, d) is a pseudometric space, we call a set B(xo; r) = {x E X I d(x, xo) < r} an open ball in X with center Xo and radius r. Note that this is analogous to 1. What are open balls of radius 1 in Prob.
- [Measure, Integration Real Analysis (... (Z-Library)] Section 5C Lebesgue Integration on Rn 11 Suppose E is a subset of Rm Rn and Rm : (x, y) x E for some y . Dene f : R2 R by = (0, 0), (a) Prove that D1(D2 f ) and D2(D1 f ) exist everywhere on R2. Show that D1(D2 f ) (c) Explain why (b) does not violate 5.
- [Real Analysis (Halsey L. Royden, Patr... (Z-Library)] The Hahn-Banach Theorem has a rather humble nature. The only mathematical con- cepts needed for its statement are linear spaces and linear, subadditive, and positively homogeneous functionals. Besides Zorn’s Lemma, its proof relies on nothing more than the rudimentary properties of the real numbers.
- [Introductory Functional Analysis with Applications] If in a normed space X, absolute convergence of any series always implies convergence of that series, show that X is complete. Show that in a Banach space, an absolutely convergent series is convergent. Schauder basis) Show that if a normed space has a Schauder basis, it is separable.
- [Introductory Functional Analysis with Applications] What are the adjoints of a zero operator 0 and an identity operator I? Annihllator) Let X and Y be normed spaces, T: X - Y a bounded linear operator and -M = (¥t( T), the closure of the range of T. Fundamental Theorems for Normed and Banach Spaces To complete this discussion, we should also list some of the main differences between the adjoint operator T X of T: X ~ Y and the Hilbert-adjoint operator T\* of T: Hi ~ H 2 , where X, Yare normed spaces and Hi> H2 are Hilbert spaces.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
