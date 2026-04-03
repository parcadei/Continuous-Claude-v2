---
name: first-order-odes
description: "Problem-solving strategies for first order odes in odes pdes"
allowed-tools: [Bash, Read]
---

# First Order Odes

## When to Use

Use this skill when working on first-order-odes problems in odes pdes.

## Decision Tree

1. **Classify the ODE**
   - Linear: y' + P(x)y = Q(x)?
   - Separable: y' = f(x)g(y)?
   - Exact: M(x,y)dx + N(x,y)dy = 0 with dM/dy = dN/dx?
   - Bernoulli: y' + P(x)y = Q(x)y^n?

2. **Select Solution Method**
   | Type | Method |
   |------|--------|
   | Separable | Separate and integrate |
   | Linear | Integrating factor e^{int P dx} |
   | Exact | Find potential function |
   | Bernoulli | Substitute v = y^{1-n} |

3. **Numerical Solution (IVP)**
   - `scipy.integrate.solve_ivp(f, [t0, tf], y0, method='RK45')`
   - For stiff systems: `method='Radau'` or `method='BDF'`
   - Adaptive step size: specify rtol/atol, not step size

4. **Verify Solution**
   - Substitute back into ODE
   - Check initial/boundary conditions
   - `sympy_compute.py dsolve "y' + y = x" --ics "{y(0): 1}"`

5. **Phase Portrait (Autonomous)**
   - Find equilibria: f(y\*) = 0
   - Analyze stability: sign of f'(y\*)
   - `z3_solve.py solve "dy/dt == 0"`

## Tool Commands

### Scipy_Solve_Ivp

```bash
uv run python -c "from scipy.integrate import solve_ivp; sol = solve_ivp(lambda t, y: -y, [0, 5], [1]); print('y(5) =', sol.y[0][-1])"
```

### Sympy_Dsolve

```bash
uv run python -m runtime.harness scripts/sympy_compute.py dsolve "Derivative(y,x) + y" --ics "{y(0): 1}"
```

### Z3_Equilibrium

```bash
uv run python -m runtime.harness scripts/z3_solve.py solve "f(y_star) == 0"
```

## Key Techniques

_From indexed textbooks:_

- [Elementary Differential Equations and... (Z-Library)] Solving ODEs with MATLAB (New York: Cambridge REFERENCES cyan black NJ: Prentice-Hall, 1971). Mattheij, Robert, and Molenaar, Jaap, Ordinary Differential Equations in Theory and Practice Shampine, Lawrence F. Numerical Solution of Ordinary Differential Equations (New York: Chapman and Shampine, L.
- [Elementary Differential Equations and... (Z-Library)] Differential Equations: An Introduction to Modern Methods and Applications (2nd ed. Use the Laplace transform to solve the system 2e−t 3t α1 α2 , where α1 and α2 are arbitrary. How must α1 and α2 be chosen so that the solution is identical to Eq.
- [An Introduction to Numerical Analysis... (Z-Library)] Modern Numerical Methods for Ordinary Wiley, New York. User's guide for DVERK: A subroutine for solving non-stiff ODEs. Keller (1966), Analysis of Numerical Methods.
- [Elementary Differential Equations and... (Z-Library)] Show that the rst order Adams–Bashforth method is the Euler method and that the rst order Adams–Moulton method is the backward Euler method. Show that the third order Adams–Moulton formula is yn+1 = yn + (h/12)(5fn+1 + 8fn − fn−1). Derive the second order backward differentiation formula given by Eq.
- [An Introduction to Numerical Analysis... (Z-Library)] Test results on initial value methods for non-stiff ordinary differential equations, SIAM J. Comparing numerical methods for Fehlberg, E. Klassische Runge-Kutta-Formeln vierter und niedrigerer Ordnumg mit Schrittweiten-Kontrolle und ihre Anwendung auf Warme leitungsprobleme, Computing 6, 61-71.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
