---
name: boundary-value-problems
description: "Problem-solving strategies for boundary value problems in odes pdes"
allowed-tools: [Bash, Read]
---

# Boundary Value Problems

## When to Use

Use this skill when working on boundary-value-problems problems in odes pdes.

## Decision Tree

1. **Problem Classification**
   - Two-point BVP: conditions at x=a and x=b?
   - Sturm-Liouville: eigenvalue problem?
   - Mixed conditions: Dirichlet, Neumann, Robin?

2. **Shooting Method**
   - Convert BVP to IVP
   - Guess missing initial conditions
   - Iterate to satisfy boundary conditions
   - `scipy.integrate.solve_ivp` + root finding

3. **Finite Difference Method**
   - Discretize domain: x_i = a + i\*h
   - Replace derivatives with differences: y'' ~ (y*{i+1} - 2y_i + y*{i-1})/h^2
   - Solve resulting linear system
   - `sympy_compute.py linsolve "tridiagonal_matrix" "boundary_vector"`

4. **Collocation/BVP Solver**
   - `scipy.integrate.solve_bvp(ode, bc, x, y_init)`
   - Provide initial mesh and guess
   - Check residual for accuracy

5. **Eigenvalue Problems**
   - Sturm-Liouville form: -(p(x)y')' + q(x)y = lambda*w(x)*y
   - Eigenvalues are real if p, w > 0
   - Eigenfunctions orthogonal with weight w
   - `sympy_compute.py eigenvalues "sturm_liouville_matrix"`

## Tool Commands

### Scipy_Solve_Bvp

```bash
uv run python -c "from scipy.integrate import solve_bvp; import numpy as np; ode = lambda x, y: [y[1], -y[0]]; bc = lambda ya, yb: [ya[0], yb[0]-1]; x = np.linspace(0, np.pi, 10); y = np.zeros((2, 10)); sol = solve_bvp(ode, bc, x, y); print('Solution at pi/2:', sol.sol(np.pi/2)[0])"
```

### Sympy_Linsolve

```bash
uv run python -m runtime.harness scripts/sympy_compute.py linsolve "tridiagonal_matrix" "boundary_vector"
```

### Z3_Sturm_Liouville

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "eigenvalue_real"
```

## Key Techniques

_From indexed textbooks:_

- [Elementary Differential Equations and... (Z-Library)] Boundary Value Problems and Partial Differential Equations (6th ed. Boston: Academic August 7, 2012 21:05 c10 Sheet number 88 Page number 676 cyan black August 7, 2012 21:05 c11 Sheet number 1 Page number 677 cyan black C H A P T E R Boundary Value Problems and Sturm–Liouville Theory As a result of separating variables in a partial differential equation in Chapter 10, we repeatedly encountered the differential equation X + λX = 0, 0 < x < L with the boundary conditions X (0) = 0, X (L) = 0. This boundary value problem is the prototype of a large class of problems that are important in applied mathematics.
- [Elementary Differential Equations and... (Z-Library)] Nonhomogeneous Boundary Value Problems In this section we discuss how to solve nonhomogeneous boundary value problems for both ordinary and partial differential equations. Most of our attention is directed toward problems in which the differential equation alone is nonhomogeneous, while the boundary conditions are homogeneous. We assume that the solution can be expanded in a series of eigenfunctions of a related homogeneous problem, and then we determine the coefcients in this series so that the nonhomogeneous problem is satised.
- [Elementary Differential Equations and... (Z-Library)] Consider the boundary conditions y, y bounded as x → −1, −1 m = n. August 7, 2012 21:05 c11 Sheet number 46 Page number 722 cyan black Chapter 11. Boundary Value Problems general differential equations or boundary conditions.
- [An Introduction to Numerical Analysis... (Z-Library)] Modern Numerical Methods for Ordinary Wiley, New York. User's guide for DVERK: A subroutine for solving non-stiff ODEs. Keller (1966), Analysis of Numerical Methods.
- [Elementary Differential Equations and... (Z-Library)] Describe in a few words how the solution evolves as time advances. A nonreactive tracer at concentration c0 is continuously introduced into a steady ow at the upstream end of a column of length L packed with a homogeneous granular medium. Assuming that the tracer concentration in the column is initially zero, the boundary value problem that models this process is 0 < x < L, t > 0, t > 0, 0 < x < L, where c(x, t), v, and D are as in Problem 27.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
