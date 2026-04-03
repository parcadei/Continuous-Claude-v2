---
name: analytic-functions
description: "Problem-solving strategies for analytic functions in complex analysis"
allowed-tools: [Bash, Read]
---

# Analytic Functions

## When to Use

Use this skill when working on analytic-functions problems in complex analysis.

## Decision Tree

1. **Is f analytic at z0?**
   - Check Cauchy-Riemann equations: du/dx = dv/dy, du/dy = -dv/dx
   - Check if f has power series expansion around z0
   - Check if f is differentiable in neighborhood of z0
   - `sympy_compute.py diff "u" --var x` and `sympy_compute.py diff "v" --var y`

2. **Cauchy-Riemann Verification**
   - Write f(z) = u(x,y) + iv(x,y)
   - Compute partial derivatives
   - Verify: du/dx = dv/dy AND du/dy = -dv/dx
   - `z3_solve.py prove "cauchy_riemann"`

3. **Power Series**
   - f(z) = sum\_{n=0}^{inf} a_n (z - z0)^n
   - Radius of convergence: R = 1/limsup |a_n|^(1/n)
   - `sympy_compute.py series "f(z)" --var z --at z0`

4. **Analytic Continuation**
   - Extend f beyond original domain via power series
   - Identity theorem: if f = g on set with limit point, then f = g everywhere

## Tool Commands

### Sympy_Diff_U

```bash
uv run python -m runtime.harness scripts/sympy_compute.py diff "u(x,y)" --var x
```

### Sympy_Diff_V

```bash
uv run python -m runtime.harness scripts/sympy_compute.py diff "v(x,y)" --var y
```

### Sympy_Series

```bash
uv run python -m runtime.harness scripts/sympy_compute.py series "exp(z)" --var z --at 0
```

### Z3_Cauchy_Riemann

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "diff(u,x) == diff(v,y)"
```

## Key Techniques

_From indexed textbooks:_

- [Complex Analysis (Elias M. Stein, Ram... (Z-Library)] A deep theorem which we prove in the next chapter says that the converse is true: every holomorphic function is analytic. For that reason, we use the terms holomorphic and analytic interchangeably. PRELIMINARIES TO COMPLEX ANALYSIS Corollary 2.
- [Complex Analysis (Elias M. Stein, Ram... (Z-Library)] Cauchy, 1826 There is a general principle in the theory, already implicit in Riemann’s work, which states that analytic functions are in an essential way charac- terized by their singularities. That is to say, globally analytic functions are “eectively” determined by their zeros, and meromorphic functions by their zeros and poles. While these assertions cannot be formulated as precise general theorems, there are nevertheless signicant instances where this principle applies.
- [Complex analysis an introduction to... (Z-Library)] EXERCISES If f(z) is analytic in the whole plane and real on the real axis, purely imaginary on the imaginary axis, show that f{z) is odd. COMPLEX INTEGRATION In the same situation, if v is the imaginary part of an analytic function f(z) in 12+, then f(z) has an analytic extension which satisfies f(z) = f(z). For the proof we construct the function V(z) which is equal to v(z) respect to this disk formed with the boundary values V.
- [Complex analysis an introduction to... (Z-Library)] E is compact it can be covered by a finite number of the smaller disks, and we find that the p(/nJ are bounded on E, contrary to assumption. EXERCISES Prove that in any region 0 the family of analytic functions with positive real part is normal. Under what added condition is it locally bounded?
- [Complex Analysis (Elias M. Stein, Ram... (Z-Library)] Notice that the radius of convergence of the above series is 1. Show that f cannot be continued analytically past the unit disc. Hint: Suppose θ = 2πp/2k, where p and k are positive integers.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
