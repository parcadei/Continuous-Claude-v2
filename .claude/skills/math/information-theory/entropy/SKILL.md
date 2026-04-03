---
name: entropy
description: "Problem-solving strategies for entropy in information theory"
allowed-tools: [Bash, Read]
---

# Entropy

## When to Use

Use this skill when working on entropy problems in information theory.

## Decision Tree

1. **Shannon Entropy**
   - H(X) = -sum p(x) log2 p(x)
   - Maximum for uniform distribution: H_max = log2(n)
   - Minimum = 0 for deterministic (one outcome certain)
   - `scipy.stats.entropy(p, base=2)` for discrete

2. **Entropy Properties**
   - Non-negative: H(X) >= 0
   - Concave in p
   - Chain rule: H(X,Y) = H(X) + H(Y|X)
   - `z3_solve.py prove "entropy_nonnegative"`

3. **Joint and Conditional Entropy**
   - H(X,Y) = -sum sum p(x,y) log2 p(x,y)
   - H(Y|X) = H(X,Y) - H(X)
   - H(Y|X) <= H(Y) with equality iff independent

4. **Differential Entropy (Continuous)**
   - h(X) = -integral f(x) log f(x) dx
   - Can be negative!
   - Gaussian: h(X) = 0.5 * log2(2*pi*e*sigma^2)
   - `sympy_compute.py integrate "-f(x)*log(f(x))" --var x`

5. **Maximum Entropy Principle**
   - Given constraints, max entropy distribution is least biased
   - Uniform for no constraints
   - Exponential for E[X] = mu constraint
   - Gaussian for E[X], Var[X] constraints

## Tool Commands

### Scipy_Entropy

```bash
uv run python -c "from scipy.stats import entropy; p = [0.25, 0.25, 0.25, 0.25]; H = entropy(p, base=2); print('Entropy:', H, 'bits')"
```

### Scipy_Kl_Div

```bash
uv run python -c "from scipy.stats import entropy; p = [0.5, 0.5]; q = [0.9, 0.1]; kl = entropy(p, q); print('KL divergence:', kl)"
```

### Sympy_Entropy

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "-p*log(p, 2) - (1-p)*log(1-p, 2)"
```

## Key Techniques

_From indexed textbooks:_

- [Elements of Information Theory] Elements of Information Theory -- Thomas M* Cover &amp; Joy A* Thomas -- 2\_, Auflage, New York, NY, 2012 -- Wiley-Interscience -- 9780470303153 -- 2fcfe3e8a16b3aeefeaf9429fcf9a513 -- Anna’s Archive. What is the channel capacity of this channel? This is the multiple\-access channel solved by Liao and Ahlswede.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
