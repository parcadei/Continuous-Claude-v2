---
name: sigma-algebras
description: "Problem-solving strategies for sigma algebras in measure theory"
allowed-tools: [Bash, Read]
---

# Sigma Algebras

## When to Use

Use this skill when working on sigma-algebras problems in measure theory.

## Decision Tree

1. **Verify sigma-algebra axioms**
   - X in F (whole space is measurable)
   - A in F implies A^c in F (closed under complements)
   - A_n in F implies union(A_n) in F (closed under countable unions)
   - `z3_solve.py prove "sigma_algebra_axioms"`

2. **sigma-algebra generation**
   - Start with generating collection C
   - sigma(C) = smallest sigma-algebra containing C
   - Use Dynkin's pi-lambda theorem for uniqueness

3. **Measurability verification**
   - f is measurable if f^{-1}(B) in F for all Borel B
   - Sufficient: check for open sets or intervals
   - `sympy_compute.py simplify "preimage(f, interval)"`

4. **Product sigma-algebras**
   - F1 x F2 = sigma{A x B : A in F1, B in F2}
   - Projections are measurable

## Tool Commands

### Z3_Sigma_Axioms

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "X_in_F and closed_under_complement and closed_under_countable_union"
```

### Z3_Dynkin_Pi_Lambda

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "pi_system_subset_lambda implies sigma_equal"
```

### Sympy_Preimage

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "f_inv(A_union_B) == f_inv(A) | f_inv(B)"
```

## Key Techniques

_From indexed textbooks:_

- [Statistical Inference (George Casella... (Z-Library)] PROBABILITY THEORY Definition 1. A collection of subsets of S is called a sigma algebra (or Borel field), denoted by B, if it satisfies the following three properties: a. B (the empty set is an element of B).
- [Measure, Integration Real Analysis (... (Z-Library)] S T is the smallest s-algebra containing the measurable rectangles). S T The technique outlined above should be used when possible. However, in some situations there seems to be no reasonable way to verify that the collection of sets with the desired property is a s-algebra.
- [Statistical Inference (George Casella... (Z-Library)] Thus, again by property (b), N2, A; € B. Associated with sample space § we can have many different sigma algebras. For example, the collection of the two sets {#, S} is a sigma algebra, usually called the trivial sigma algebra.
- [Real Analysis (Halsey L. Royden, Patr... (Z-Library)] Proposition 13 Let F be a collection of subsets of a set X. Then the intersection A of all σ-algebras of subsets of X that contain F is a σ-algebra that contains F. Moreover, it is the smallest σ-algebra of subsets of X that contains F, in the sense that any σ-algebra that contains F also contains A.
- [Real Analysis (Halsey L. Royden, Patr... (Z-Library)] Let M be the collection of subsets of X that are either countable or have a countable complement in X. For E ∈ M, dene µ(E) = 0 if E is countable and µ(E) = 1, if E has a countable complement. Is this measure space complete?

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
