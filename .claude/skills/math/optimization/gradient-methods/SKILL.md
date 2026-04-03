---
name: gradient-methods
description: "Problem-solving strategies for gradient methods in optimization"
allowed-tools: [Bash, Read]
---

# Gradient Methods

## When to Use

Use this skill when working on gradient-methods problems in optimization.

## Decision Tree

1. **Basic Gradient Descent**
   - Update: x\_{k+1} = x_k - alpha \* grad f(x_k)
   - Step size alpha: fixed, diminishing, or line search
   - Convergence: O(1/k) for convex, linear for strongly convex

2. **Step Size Selection**
   | Method | Approach |
   |--------|----------|
   | Fixed | alpha constant (requires tuning) |
   | Backtracking | Armijo condition: f(x - alpha*grad) <= f(x) - c*alpha*||grad||^2 |
   | Exact line search | minimize f(x - alpha*grad) over alpha |
   | Adaptive | Adam, RMSprop (ML applications) |

3. **Accelerated Methods**
   - Momentum: add velocity term
   - Nesterov: look-ahead gradient
   - Conjugate gradient: for quadratic functions
   - `scipy.optimize.minimize(f, x0, method='CG')` - conjugate gradient

4. **Newton's Method**
   - Update: x\_{k+1} = x_k - H^{-1} \* grad f
   - Requires Hessian (expensive but quadratic convergence)
   - Quasi-Newton (BFGS): approximate Hessian
   - `scipy.optimize.minimize(f, x0, method='BFGS')`

5. **Convergence Diagnostics**
   - Monitor ||grad f|| < tolerance
   - Check function value decrease
   - Watch for oscillation (step size too large)
   - `sympy_compute.py diff "f" --var x` for gradient

## Tool Commands

### Scipy_Bfgs

```bash
uv run python -c "from scipy.optimize import minimize; res = minimize(lambda x: (x[0]-1)**2 + 100*(x[1]-x[0]**2)**2, [0, 0], method='BFGS'); print('Rosenbrock min at', res.x)"
```

### Scipy_Cg

```bash
uv run python -c "from scipy.optimize import minimize; res = minimize(lambda x: x[0]**2 + x[1]**2, [1, 1], method='CG'); print('Min at', res.x)"
```

### Sympy_Gradient

```bash
uv run python -m runtime.harness scripts/sympy_compute.py diff "x**2 + y**2" --var "[x, y]"
```

## Key Techniques

_From indexed textbooks:_

- [nonlinear programming_tif] Gradient Methods** - These methods use gradient information to iteratively approach the optimum. Convergence** - Addressing convergence properties. Descent Directions and Stepsize Rules:\*\* Focuses on how to choose descent directions and appropriate step sizes.
- [nonlinear programming_tif] The application of gradient methods to unconstrained optimal control prob- lems is straightforward in principle. For example the steepest descent method takes the form W = b oMV H, (kb ph,y), i=0,. Pl = Thus, given u¥, one computes zF by forward propagation of the system equation, and then p\*¥ by backward propagation of the adjoint equation.
- [nonlinear programming_tif] Footer or Trailing Row\*\*: - There is an empty concluding element indicated by a single ". Overall, this table serves as an index for chapters or sections within a document, with particular emphasis on optimization methods and related mathematical strategies, as evidenced by the listed methods like Gradient, Newton, and other derivative techniques. The scattered letters and empty slots may denote a form of stylistic or formatting choice rather than meaningful content in this context.
- [nonlinear programming_tif] Zoutendijk’s method uses tw ) oscalatse)Oand'ye 0,1), a i ! P, where ¢ — Y™k € and my is the firs onnegative k ok 28 %, ) it T #(z*,7"e) < -y (a) Show that (b) Prove that {d*} is gradient relat ishi i i Tt pones A related, thus establishing stationarity of the 2. Min-H Method for Optimal Control) Consider the problem of findin g sequences u = (z1,22,.
- [nonlinear programming_tif] Mustration of the function f of Exercise 1. Stability) (www) We are often interested in whether optimal solutions change radically when the problem data are slightly perturbed. This issue is addressed by stability analysis, to be contrasted with sensitivity analysis, which deals with how much optimal solutions change when problem data change.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
