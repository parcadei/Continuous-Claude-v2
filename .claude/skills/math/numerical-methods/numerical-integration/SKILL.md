---
name: numerical-integration
description: "Problem-solving strategies for numerical integration in numerical methods"
allowed-tools: [Bash, Read]
---

# Numerical Integration

## When to Use

Use this skill when working on numerical-integration problems in numerical methods.

## Decision Tree

1. **Identify Integral Type**
   - Definite integral over finite interval?
   - Improper integral (infinite bounds or singularities)?
   - Multiple dimensions?

2. **Select Quadrature Method**
   - Smooth function, finite interval: Gaussian quadrature
   - Oscillatory integrand: specialized methods (Filon, Levin)
   - Singularity at endpoint: adaptive methods
   - `scipy.integrate.quad(f, a, b)` for general 1D

3. **Adaptive Integration**
   - Let algorithm subdivide where needed
   - Specify error tolerances (rtol, atol)
   - `scipy.integrate.quad(f, a, b, epsabs=1e-8, epsrel=1e-8)`

4. **Multiple Dimensions**
   - `scipy.integrate.dblquad` for 2D
   - `scipy.integrate.tplquad` for 3D
   - Monte Carlo for higher dimensions

5. **Verify Accuracy**
   - Compare with known analytic solutions
   - Check convergence by refining tolerance
   - `sympy_compute.py integrate "f(x)" --var x --from a --to b`

## Tool Commands

### Scipy_Quad

```bash
uv run python -c "from scipy.integrate import quad; import numpy as np; result, err = quad(lambda x: np.sin(x), 0, np.pi); print('Integral:', result, 'Error:', err)"
```

### Scipy_Dblquad

```bash
uv run python -c "from scipy.integrate import dblquad; result, err = dblquad(lambda y, x: x*y, 0, 1, 0, 1); print('Integral:', result)"
```

### Sympy_Integrate

```bash
uv run python -m runtime.harness scripts/sympy_compute.py integrate "sin(x)" --var x --from 0 --to "pi"
```

## Key Techniques

_From indexed textbooks:_

- [An Introduction to Numerical Analysis... (Z-Library)] Even though the topic of numerical integration is one of the oldest in numerical analysis and there is a very large literature, new papers continue to appear at a fairly high rate. Many of these results give methods for special classes of problems, for example, oscillatory integrals, and others are a response to changes in computers, for example, the use of vector pipeline architectures. The best survey of numerical integration is the large and detailed work of Davis and Rabinowitz (1984).
- [An Introduction to Numerical Analysis... (Z-Library)] Automatic computation of improper integrals over a bounded or unbounded planar region, Computing 27, 253-284. Approximate Calculation of Multiple Integrals. Prentice-Hall, Englewood Cliffs, N.
- [Numerical analysis (Burden R.L., Fair... (Z-Library)] Composite Numerical Integration 4. Survey of Methods and Software 235 250 5 Initial-Value Problems for Ordinary Differential Equations 259 5. The Elementary Theory of Initial-Value Problems 5.
- [An Introduction to Numerical Analysis... (Z-Library)] A comparison of numerical integration programs, J. Numerical methods based on Whittaker cardinal or sine Wahba, G. Ill-posed problems: Numerical and statistical methods for mildly, moderately, and severely ill-posed problems with noisy data, Tech.
- [Elementary Differential Equations and... (Z-Library)] August 7, 2012 21:05 c08 Sheet number 1 Page number 451 cyan black C H A P T E R Numerical Methods Up to this point we have discussed methods for solving differential equations by using analytical techniques such as integration or series expansions. Usually, the emphasis was on nding an exact expression for the solution. Unfortunately, there are many important problems in engineering and science, especially nonlinear ones, to which these methods either do not apply or are very complicated to use.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
