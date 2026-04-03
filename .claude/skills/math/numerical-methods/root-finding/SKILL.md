---
name: root-finding
description: "Problem-solving strategies for root finding in numerical methods"
allowed-tools: [Bash, Read]
---

# Root Finding

## When to Use

Use this skill when working on root-finding problems in numerical methods.

## Decision Tree

1. **Characterize the Problem**
   - Single root or multiple roots?
   - Bracketed (know interval containing root)?
   - Derivatives available?

2. **Method Selection**
   | Situation | Method | Implementation |
   |-----------|--------|----------------|
   | Bracketed, no derivatives | Bisection, Brent | `scipy.optimize.brentq` |
   | Derivatives available | Newton-Raphson | `scipy.optimize.newton` |
   | No derivatives | Secant method | `scipy.optimize.newton` (no fprime) |
   | System of equations | `scipy.optimize.fsolve` | Requires Jacobian ideally |

3. **Implement Root Finding**
   - `scipy.optimize.brentq(f, a, b)` - guaranteed convergence if bracketed
   - `scipy.optimize.newton(f, x0, fprime=df)` - quadratic convergence near root
   - For systems: `scipy.optimize.fsolve(F, x0)`

4. **Handle Multiple Roots**
   - Deflation: divide out found roots
   - Multiple starting points
   - `sympy_compute.py solve "f(x)" --var x` for symbolic solutions

5. **Verify Solutions**
   - Check |f(root)| < tolerance
   - Verify root is in expected domain
   - `z3_solve.py prove "f(root) == 0"`

## Tool Commands

### Scipy_Brentq

```bash
uv run python -c "from scipy.optimize import brentq; root = brentq(lambda x: x**2 - 2, 0, 2); print('Root:', root)"
```

### Scipy_Newton

```bash
uv run python -c "from scipy.optimize import newton; root = newton(lambda x: x**2 - 2, 1.0, fprime=lambda x: 2*x); print('Root:', root)"
```

### Sympy_Solve

```bash
uv run python -m runtime.harness scripts/sympy_compute.py solve "x**3 - x - 1" --var x
```

## Key Techniques

_From indexed textbooks:_

- [Numerical analysis (Burden R.L., Fair... (Z-Library)] How accurate was his approximation? C H A P T E R 2 Solutions of Equations in One Variable 2. Survey of Methods and Software In this chapter we have considered the problem of solving the equation f (x) = 0, where f is a given continuous function.
- [An Introduction to Numerical Analysis... (Z-Library)] Computational Solution of Nonlinear Operator Equations. Methods for Solving Systems of Nonlinear Equations. Society for Industrial and Applied Mathematics, Philadelphia.
- [An Introduction to Numerical Analysis... (Z-Library)] General polynomial rootfinding methods There are a large number of rootfind ing algorithms designed especially for polynomials. Many of these are taken up in detail in the books Dejon and Henrici (1969), Henrici (1974, chap. There are far too many types of such methods to attempt to describe them all here.
- [An Introduction to Numerical Analysis... (Z-Library)] J n Consider the product a 0 a 1 ••• am, where a 0 , a1, ••• , am are m + 1 num bers stored in a computer that uses n digit base fJ arithmetic. What is a rigorous bound for w? What is a statistical estimate for the size of w?
- [An Introduction to Numerical Analysis... (Z-Library)] Discussion of the Literature There is a large literature on methods for calculating the roots of a single equation. See the books by Householder (1970), Ostrowski (1973), and Traub (1964) for a more extensive development than has been given here. Newton's method is one of the most widely used methods, and its development is due to many people.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
