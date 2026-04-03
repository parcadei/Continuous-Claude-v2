---
name: second-order-odes
description: "Problem-solving strategies for second order odes in odes pdes"
allowed-tools: [Bash, Read]
---

# Second Order Odes

## When to Use

Use this skill when working on second-order-odes problems in odes pdes.

## Decision Tree

1. **Classify the ODE**
   - Constant coefficients: ay'' + by' + cy = f(x)?
   - Variable coefficients: y'' + P(x)y' + Q(x)y = R(x)?
   - Cauchy-Euler: x^2 y'' + bxy' + cy = 0?

2. **Homogeneous with Constant Coefficients**
   - Characteristic equation: ar^2 + br + c = 0
   - Distinct real roots: y = c1*e^{r1*x} + c2*e^{r2*x}
   - Repeated root: y = (c1 + c2*x)e^{r*x}
   - Complex roots a +/- bi: y = e^{ax}(c1*cos(bx) + c2*sin(bx))
   - `sympy_compute.py solve "a*r**2 + b*r + c" --var r`

3. **Particular Solution (Non-homogeneous)**
   - Undetermined coefficients: guess based on f(x)
   - Variation of parameters: y_p = u1*y1 + u2*y2
   - `sympy_compute.py dsolve "y'' + y = sin(x)"`

4. **Numerical Solution**
   - Convert to first-order system: let v = y', then v' = y''
   - `solve_ivp(system, [t0, tf], [y0, v0])`

5. **Boundary Value Problems**
   - Shooting method: guess initial slope, iterate
   - `scipy.integrate.solve_bvp(ode, bc, x, y_init)`

## Tool Commands

### Scipy_Solve_Ivp_System

```bash
uv run python -c "from scipy.integrate import solve_ivp; sol = solve_ivp(lambda t, Y: [Y[1], -Y[0]], [0, 10], [1, 0]); print('y(10) =', sol.y[0][-1])"
```

### Sympy_Charpoly

```bash
uv run python -m runtime.harness scripts/sympy_compute.py solve "r**2 + r + 1" --var r
```

### Sympy_Dsolve_2Nd

```bash
uv run python -m runtime.harness scripts/sympy_compute.py dsolve "Derivative(y,x,2) + y"
```

## Key Techniques

_From indexed textbooks:_

- [An Introduction to Numerical Analysis... (Z-Library)] Modern Numerical Methods for Ordinary Wiley, New York. User's guide for DVERK: A subroutine for solving non-stiff ODEs. Keller (1966), Analysis of Numerical Methods.
- [Elementary Differential Equations and... (Z-Library)] Riccati equation and that y1(t) = 1 is one solution. Use the transformation suggested in Problem 33, and nd the linear equation satised by v(t). Find v(t) in the case that x(t) = at, where a is a constant.
- [An Introduction to Numerical Analysis... (Z-Library)] Test results on initial value methods for non-stiff ordinary differential equations, SIAM J. Comparing numerical methods for Fehlberg, E. Klassische Runge-Kutta-Formeln vierter und niedrigerer Ordnumg mit Schrittweiten-Kontrolle und ihre Anwendung auf Warme leitungsprobleme, Computing 6, 61-71.
- [Elementary Differential Equations and... (Z-Library)] Two papers by Robert May cited in the text are R. May,“Biological Populations with Nonoverlapping Generations: Stable Points, Stable Cycles, and Chaos,” Science 186 (1974), pp. Biological Populations Obeying Difference Equations: Stable Points, Stable Cycles, and Chaos,” Journal of Theoretical Biology 51 (1975), pp.
- [An Introduction to Numerical Analysis... (Z-Library)] COLSYS: collocation software for boundary-value ODEs, ACM Trans. Numerical Solutions of Boundary Value Problems for Ordinary Differential Equations. Elementary Differential Equations and Boundary Value Problems, 4th ed.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
