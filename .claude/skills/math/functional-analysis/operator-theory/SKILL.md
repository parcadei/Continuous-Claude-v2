---
name: operator-theory
description: "Problem-solving strategies for operator theory in functional analysis"
allowed-tools: [Bash, Read]
---

# Operator Theory

## When to Use

Use this skill when working on operator-theory problems in functional analysis.

## Decision Tree

1. **Bounded operator verification**
   - ||Tx|| <= M||x|| for some M
   - Operator norm: ||T|| = sup{||Tx|| : ||x|| = 1}
   - `z3_solve.py prove "operator_bounded"`

2. **Adjoint operator**
   - <Tx, y> = <x, T*y> defines T*
   - For matrices: T\* = conjugate transpose
   - `sympy_compute.py simplify "<Tx, y> - <x, T*y>"`

3. **Spectral Theory**
   - Spectrum: sigma(T) = {lambda : T - lambda\*I not invertible}
   - Self-adjoint: spectrum is real
   - `z3_solve.py prove "self_adjoint_real_spectrum"`

4. **Compact operators**
   - T compact if T(bounded set) has compact closure
   - Approximable by finite-rank operators
   - `sympy_compute.py limit "||T - T_n||" --var n`

5. **Spectral Theorem**
   - Self-adjoint compact: T = sum(lambda_n \* P_n)
   - eigenvalues -> 0, eigenvectors form orthonormal basis

## Tool Commands

### Z3_Bounded_Operator

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "norm(Tx) <= M*norm(x)"
```

### Sympy_Adjoint

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "<Tx, y> - <x, T_star_y>"
```

### Z3_Spectral

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "self_adjoint implies real_spectrum"
```

### Sympy_Compact

```bash
uv run python -m runtime.harness scripts/sympy_compute.py limit "norm(T - T_n)" --var n --at oo
```

## Key Techniques

_From indexed textbooks:_

- [Introductory Functional Analysis with Applications] Spectral theory is one of the main branches of modern functional analysis and its applications. Roughly speaking, it is concerned with certain inverse operators, their general properties and their relations to the original operators. Such inverse operators arise quite naturally in connection with the problem of solving equations (systems of linear algebraic equations, differential equations, integral equations).
- [Introductory Functional Analysis with Applications] Unbounded linear operators in Hilb,ert spaces will be considered in Chap. Brief orientation about main content of Chap. We begin with finite dimensional vector spaces.
- [Introductory Functional Analysis with Applications] Most unbounded linear operators occurring in practical problems are closed or have closed linear extensions (Sec. Unbounded Linear Operators in Hilbert Space The spectrum of a self-adjoint linear operator is real, also in the unbounded case (d. T is obtained by means of the Cayley transform U= (T- iI)(T+ iI)-1 of T (d.
- [Introductory Functional Analysis with Applications] Compact Operators and Their Spectrum is called a degenerate kernel. Here we may assume each of the two sets {ab· . If an equation (1) with such a kernel has a solution x, show that it must be of the form n x(s' = ji(s) + lot L cjaj(s), j~l and the unknown constants must satisfy cj - n lot L ajkCk = Yj' k~l where j= 1,···, n.
- [Introductory Functional Analysis with Applications] As indicated before, our key to the application of complex analysis to spectral theory will be Theorem 7. The theorem states that for every value AoEp(n the resolvent R>. TE B(X, X) on a complex Banach space X has a power series repre- sentation (4) R>.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
