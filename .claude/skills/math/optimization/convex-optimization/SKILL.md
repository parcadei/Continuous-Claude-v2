---
name: convex-optimization
description: "Problem-solving strategies for convex optimization in optimization"
allowed-tools: [Bash, Read]
---

# Convex Optimization

## When to Use

Use this skill when working on convex-optimization problems in optimization.

## Decision Tree

1. **Verify Convexity**
   - Objective function: Hessian positive semidefinite?
   - Constraint set: intersection of convex sets?
   - `z3_solve.py prove "hessian_psd"`

2. **Problem Classification**
   | Type | Solver |
   |------|--------|
   | Linear Programming | `scipy.optimize.linprog` |
   | Quadratic Programming | `scipy.optimize.minimize(method='SLSQP')` |
   | General Convex | Interior point methods |
   | Semidefinite | CVXPY with SDP solver |

3. **Standard Form**
   - minimize f(x) subject to g_i(x) <= 0, h_j(x) = 0
   - Convert max to min by negating
   - Convert >= to <= by negating

4. **KKT Conditions (Necessary & Sufficient)**
   - Stationarity: grad L = 0
   - Primal feasibility: g_i(x) <= 0, h_j(x) = 0
   - Dual feasibility: lambda_i >= 0
   - Complementary slackness: lambda_i \* g_i(x) = 0
   - `z3_solve.py prove "kkt_conditions"`

5. **Solve and Verify**
   - `scipy.optimize.minimize(f, x0, constraints=cons)`
   - Check constraint satisfaction
   - Verify solution is global minimum (convex guarantees this)

## Tool Commands

### Scipy_Linprog

```bash
uv run python -c "from scipy.optimize import linprog; res = linprog([-1, -2], A_ub=[[1, 1], [2, 1]], b_ub=[4, 5]); print('Optimal:', -res.fun, 'at x=', res.x)"
```

### Scipy_Minimize

```bash
uv run python -c "from scipy.optimize import minimize; res = minimize(lambda x: (x[0]-1)**2 + (x[1]-2)**2, [0, 0]); print('Minimum at', res.x)"
```

### Z3_Kkt

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "kkt_conditions"
```

## Key Techniques

_From indexed textbooks:_

- [Additional Exercises for Convex Optimization (with] Finally, there are lots of methods that will do better than this, usually by taking this as a starting point and ‘polishing’ the result after that. Several of these have been shown to give fairly reliable, if modest, improvements. You were not required to implement any of these methods.
- [Additional Exercises for Convex Optimization (with] K { X = x Ax yi } where e is the p-dimensional vector of ones. This is a polyhedron and thus a convex set. Rm has the form − The residual Aˆx − Describe a heuristic method for approximately solving this problem, using convex optimization.
- [Additional Exercises for Convex Optimization (with] We then pick a small positive number , and a vector c cT x minimize subject to fi(x) 0, hi(x) = 0, f0(x) ≤ p + . There are dierent strategies for choosing c in these experiments. The simplest is to choose the c’s randomly; another method is to choose c to have the form ei, for i = 1, .
- [Additional Exercises for Convex Optimization (with] We formulate the solution as the following bi-criterion optimization problem: (J ch, T ther) cmax, cmin, 0, minimize subject to c(t) c(t) a(k) ≤ ≥ t = 1, . T The key to this problem is to recognize that the objective T ther is quasiconvex. The problem as stated is convex for xed values of T ther.
- [nonlinear programming_tif] Optimization Over a Convex Set** - Focuses on optimization problems constrained within a convex set. Optimality Conditions:** Similar to unconstrained optimization, but within the context of convex sets. Feasible Directions and Conditional Gradient\*\* - Explores methods that ensure feasibility within constraints.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
