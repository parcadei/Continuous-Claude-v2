---
name: constrained-optimization
description: "Problem-solving strategies for constrained optimization in optimization"
allowed-tools: [Bash, Read]
---

# Constrained Optimization

## When to Use

Use this skill when working on constrained-optimization problems in optimization.

## Decision Tree

1. **Constraint Classification**
   - Equality: h(x) = 0
   - Inequality: g(x) <= 0
   - Bounds: l <= x <= u

2. **Lagrangian Method (Equality Constraints)**
   - L(x, lambda) = f(x) + sum lambda_j \* h_j(x)
   - Solve: grad_x L = 0 and h(x) = 0
   - `sympy_compute.py solve "grad_L_system"`

3. **KKT Conditions (Inequality Constraints)**
   - Extend Lagrangian with mu_i for g_i(x) <= 0
   - Complementary slackness: mu_i \* g_i(x) = 0
   - `z3_solve.py prove "kkt_satisfied"`

4. **Penalty and Barrier Methods**
   - Penalty: add P(x) = rho \* sum max(0, g_i(x))^2
   - Barrier: add B(x) = -sum log(-g_i(x)) for interior point
   - Increase penalty/decrease barrier parameter iteratively

5. **SciPy Constrained Optimization**
   - `scipy.optimize.minimize(f, x0, method='SLSQP', constraints=cons)`
   - constraints = [{'type': 'eq', 'fun': h}, {'type': 'ineq', 'fun': lambda x: -g(x)}]
   - bounds = [(l1, u1), (l2, u2), ...]

## Tool Commands

### Scipy_Slsqp

```bash
uv run python -c "from scipy.optimize import minimize; cons = dict(type='eq', fun=lambda x: x[0] + x[1] - 1); res = minimize(lambda x: x[0]**2 + x[1]**2, [1, 1], method='SLSQP', constraints=cons); print('Min at', res.x)"
```

### Sympy_Lagrangian

```bash
uv run python -m runtime.harness scripts/sympy_compute.py solve "[2*x - lam, 2*y - lam, x + y - 1]" --vars "[x, y, lam]"
```

### Z3_Kkt_Satisfied

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "complementary_slackness"
```

## Key Techniques

_From indexed textbooks:_

- [nonlinear programming_tif] Conjugate Direction Methods** - Methods involving directions conjugate to each other with respect to a certain quadratic form, enhancing efficiency in finding minima. Quasi-Newton Methods** - Variants of Newton’s method that approximate the Hessian matrix. Nonderivative Methods\*\* - Address optimization methods that don’t require derivative information.
- [nonlinear programming_tif] Optimization Over a Convex Set** - Focuses on optimization problems constrained within a convex set. Optimality Conditions:** Similar to unconstrained optimization, but within the context of convex sets. Feasible Directions and Conditional Gradient\*\* - Explores methods that ensure feasibility within constraints.
- [nonlinear programming_tif] In this chapter we consider the constrained optimization problem minimize f(z) subject to z € X, where we assume throughout that: (a) X is a nonempty and convex subset of 2. When dealing with algo- rithms, we assume in addition that X is closed. The function f: %™ — R is continuously differentiable over X.
- [nonlinear programming_tif] The methods for obtaining lower bounds are elaborated on in Section 5. Lagrangian relaxation method is discussed in detail. This method requires the optimization of nondifferentiable functions, and some of the major relevant algorithms, subgradient and cutting plane methods, will be discussed in Chapter 6.
- [nonlinear programming_tif] The image depicts a three-dimensional graphical representation, likely related to linear algebra or optimization. Key elements include: - **Axes**: Three intersecting axes are shown, suggesting a three-dimensional coordinate system. Equation and Constraints\*\*: A linear equation `{x | Ax = b, x ≥ 0}` is noted, indicating a system or set of constraints.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
