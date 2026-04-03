---
name: interpolation
description: "Problem-solving strategies for interpolation in numerical methods"
allowed-tools: [Bash, Read]
---

# Interpolation

## When to Use

Use this skill when working on interpolation problems in numerical methods.

## Decision Tree

1. **Assess Data Characteristics**
   - How many data points? Spacing uniform or non-uniform?
   - Is data smooth or noisy?
   - Need derivatives at endpoints?

2. **Select Interpolation Method**
   - Few points (<10): Polynomial (Lagrange, Newton)
   - Many points, smooth data: Cubic splines
   - Noisy data: Smoothing splines or least squares
   - High dimensions: Use simplex-based (n+1 neighbors vs 2^n)

3. **Implement with SciPy**
   - `scipy.interpolate.CubicSpline(x, y)` - natural cubic spline
   - `scipy.interpolate.make_interp_spline(x, y, k=3)` - B-spline
   - `scipy.interpolate.interp1d(x, y, kind='cubic')` - 1D interpolation

4. **Validate Results**
   - Check for Runge's phenomenon at boundaries (high-degree polynomials)
   - Cross-validate: leave-one-out error estimation
   - Visual inspection of interpolated curve
   - `sympy_compute.py limit "interp_error" --at boundaries`

5. **High-Dimensional Considerations**
   - Coxeter-Freudenthal-Kuhn triangulation for O(n log n) point location
   - Barycentric subdivision for balanced performance

## Tool Commands

### Scipy_Cubic_Spline

```bash
uv run python -c "from scipy.interpolate import CubicSpline; import numpy as np; x = np.array([0,1,2,3]); y = np.array([0,1,4,9]); cs = CubicSpline(x, y); print(cs(1.5))"
```

### Scipy_Bspline

```bash
uv run python -c "from scipy.interpolate import make_interp_spline; import numpy as np; x = np.array([0,1,2,3]); y = np.array([0,1,4,9]); bspl = make_interp_spline(x, y, k=3); print(bspl(1.5))"
```

### Sympy_Lagrange

```bash
uv run python -m runtime.harness scripts/sympy_compute.py interpolate "[(0,0),(1,1),(2,4)]" --var x
```

## Key Techniques

_From indexed textbooks:_

- [An Introduction to Numerical Analysis... (Z-Library)] DISCUSSION OF THE LITERATURE Discussion of the Literature As noted in the introduction, interpolation theory is a foundation for the development of methods in numerical integration and differentiation, approxima tion theory, and the numerical solution of differential equations. Each of these· topics is developed in the following chapters, and the associated literature is discussed at that point. Additional results on interpolation theory are given in de Boor (1978), Davis (1963), Henrici (1982, chaps.
- [Numerical analysis (Burden R.L., Fair... (Z-Library)] The most commonly used form of interpolation is piecewise-polynomial interpolation. If function and derivative values are available, piecewise cubic Hermite interpolation is recommended. This is the preferred method for interpolating values of a function that is the solution to a differential equation.
- [Numerical analysis (Burden R.L., Fair... (Z-Library)] Copyright 2010 Cengage Learning. May not be copied, scanned, or duplicated, in whole or in part. Due to electronic rights, some third party content may be suppressed from the eBook and/or eChapter(s).
- [Numerical analysis (Burden R.L., Fair... (Z-Library)] Galerkin and Rayleigh-Ritz methods are both determined by Eq. However, this is not the case for an arbitrary boundary-value problem. A treatment of the similarities and differences in the two methods and a discussion of the wide application of the Galerkin method can be found in [Schul] and in [SF].
- [An Introduction to Numerical Analysis... (Z-Library)] Polynomial interpolation theory has a number of important uses. In this text, its primary use is to furnish some mathematical tools that are used in developing methods in the areas of approximation theory, numerical integration, and the numerical solution of differential equations. A second use is in developing means - for working with functions that are stored in tabular form.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
