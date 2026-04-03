---
name: prime-numbers
description: "Problem-solving strategies for prime numbers in graph number theory"
allowed-tools: [Bash, Read]
---

# Prime Numbers

## When to Use

Use this skill when working on prime-numbers problems in graph number theory.

## Decision Tree

1. **Primality testing hierarchy**
   - Trial division: O(sqrt(n)), exact
   - Miller-Rabin: O(k log^3 n), probabilistic
   - AKS: O(log^6 n), deterministic polynomial

2. **Factorization**
   - Trial division for small factors
   - Pollard's rho: probabilistic, medium numbers
   - Quadratic sieve: large numbers
   - `sympy_compute.py factor "n"`

3. **Prime distribution**
   - Prime Number Theorem: pi(x) ~ x/ln(x)
   - Prime gaps: p\_{n+1} - p_n
   - `sympy_compute.py limit "pi(x) * ln(x) / x"`

4. **Fermat's Little Theorem**
   - a^{p-1} = 1 (mod p) for a not divisible by p
   - Use for modular exponentiation
   - `z3_solve.py prove "fermat_little"`

5. **Wilson's Theorem**
   - (p-1)! = -1 (mod p) iff p is prime

## Tool Commands

### Sympy_Factor

```bash
uv run python -m runtime.harness scripts/sympy_compute.py factor "n"
```

### Z3_Primality

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "no_divisor_between_1_and_sqrt_n"
```

### Sympy_Prime_Count

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "pi(x) ~ x/ln(x)"
```

### Z3_Fermat_Little

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "a**(p-1) == 1 mod p"
```

## Key Techniques

_From indexed textbooks:_

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
