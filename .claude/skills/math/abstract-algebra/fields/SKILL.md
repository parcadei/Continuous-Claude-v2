---
name: fields
description: "Problem-solving strategies for fields in abstract algebra"
allowed-tools: [Bash, Read]
---

# Fields

## When to Use

Use this skill when working on fields problems in abstract algebra.

## Decision Tree

1. **Is F a field?**
   - (F, +) is an abelian group with identity 0
   - (F \ {0}, \*) is an abelian group with identity 1
   - Distributive law holds
   - `z3_solve.py prove "field_axioms"`

2. **Field Extensions**
   - E is extension of F if F is subfield of E
   - Degree [E:F] = dimension of E as F-vector space
   - `sympy_compute.py minpoly "alpha" --var x` for minimal polynomial

3. **Characteristic**
   - char(F) = smallest n > 0 where n\*1 = 0, or 0 if none exists
   - char(F) is 0 or prime
   - For finite field: |F| = p^n where p = char(F)

4. **Algebraic Elements**
   - alpha is algebraic over F if it satisfies polynomial with coefficients in F
   - `sympy_compute.py solve "p(alpha) = 0"` for algebraic relations

## Tool Commands

### Z3_Field_Axioms

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "field_axioms"
```

### Sympy_Minpoly

```bash
uv run python -m runtime.harness scripts/sympy_compute.py minpoly "sqrt(2)" --var x
```

### Sympy_Solve

```bash
uv run python -m runtime.harness scripts/sympy_compute.py solve "x**2 - 2" --var x
```

## Key Techniques

_From indexed textbooks:_

- [Abstract Algebra] Write a computer program to add and multiply mod n, for any n given as input. The output of these operations should be the least residues of the sums and products of two integers. Also include the feature that if (a,n) = 1, an integer c between 1 and n — 1 such that a-c = | may be printed on request.
- [Abstract Algebra] Reading the above equation mod4\(that is, considering this equation in the quotient ring Z/4Z), we must have {2} =2[9}=[9} ons ( io ‘| where the | he? Checking the few saad shows that we must take the 0 each time. Introduction to Rings Another ideal in RG is {}-"\_, agi | a € R}, i.
- [Catergories for the working mathematician] Geometric Functional Analysis and Its Applications. Lectures in Abstract Algebra II. Lectures in Abstract Algebra III.
- [Abstract Algebra] For p an odd prime, (Z/p*Z)* is an abelian group of order p* ‘(p — 1). Sylow p-subgroup of this group is cyclic. The map Z/p°Z > Z/pZ defined by at+(p*) a+t+(p) is a ring homomorphism (reduction mod p) which gives a surjective group homo- morphism from (Z/p%Z)_ onto (Z/pZ)_.
- [A Classical Introduction to Modern Number Theory (Graduate] Graduate Texts in Mathematics 84 Editorial Board s. Ribet Springer Science+Business Media, LLC 2 3 TAKEUTtlZARING. Introduction to Axiomatic Set Theory.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
