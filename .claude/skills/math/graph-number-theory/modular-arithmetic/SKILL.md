---
name: modular-arithmetic
description: "Problem-solving strategies for modular arithmetic in graph number theory"
allowed-tools: [Bash, Read]
---

# Modular Arithmetic

## When to Use

Use this skill when working on modular-arithmetic problems in graph number theory.

## Decision Tree

1. **Extended Euclidean Algorithm**
   - Find gcd(a,b) and x,y with ax + by = gcd(a,b)
   - Modular inverse: a^{-1} mod n when gcd(a,n) = 1
   - `sympy_compute.py solve "a*x == 1 mod n"`

2. **Chinese Remainder Theorem**
   - System x = a_i (mod m_i) with coprime m_i
   - Unique solution mod prod(m_i)
   - `z3_solve.py prove "crt_solution_exists"`

3. **Euler's Theorem**
   - a^{phi(n)} = 1 (mod n) when gcd(a,n) = 1
   - phi(p^k) = p^{k-1}(p-1)
   - `sympy_compute.py simplify "euler_phi"`

4. **Quadratic Residues**
   - Legendre symbol: (a/p) = a^{(p-1)/2} mod p
   - Quadratic reciprocity: (p/q)(q/p) = (-1)^{...}
   - Tonelli-Shanks for square roots

5. **Order and Primitive Roots**
   - ord_n(a) = smallest k with a^k = 1 (mod n)
   - Primitive root: ord_n(a) = phi(n)

## Tool Commands

### Sympy_Mod_Inverse

```bash
uv run python -m runtime.harness scripts/sympy_compute.py solve "a*x == 1 mod n" --var x
```

### Z3_Crt

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "solution_exists_iff_pairwise_coprime"
```

### Sympy_Euler_Phi

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "phi(p**k) == p**(k-1)*(p-1)"
```

### Z3_Quadratic_Residue

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "legendre_symbol_multiplicative"
```

## Key Techniques

_From indexed textbooks:_

- [Graph Theory (Graduate Texts in Mathematics (173))] By N we denote the set of natural numbers, including zero. The set Z/nZ of integers modulo n is denoted by Zn; its elements are written as i := i + nZ. When we regard Z2 = {0, 1} as a eld, we also denote it as F2 = {0, 1}.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
