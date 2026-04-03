---
name: rings
description: "Problem-solving strategies for rings in abstract algebra"
allowed-tools: [Bash, Read]
---

# Rings

## When to Use

Use this skill when working on rings problems in abstract algebra.

## Decision Tree

1. **Is R a ring?**
   - (R, +) is an abelian group
   - Multiplication is associative
   - Distributive laws: a(b+c) = ab + ac and (a+b)c = ac + bc
   - `z3_solve.py prove "ring_axioms"`

2. **Ring Properties**
   - Commutative ring: ab = ba for all a, b?
   - Ring with unity: exists 1 such that 1*a = a*1 = a?
   - Integral domain: ab = 0 implies a = 0 or b = 0?
   - `z3_solve.py prove "integral_domain"`

3. **Ideals**
   - I is ideal if: I is additive subgroup AND for all r in R, a in I: ra in I, ar in I
   - Principal ideal: (a) = {ra : r in R}
   - `sympy_compute.py simplify "r*a"` for ideal multiplication

4. **Ring Homomorphisms**
   - phi(a + b) = phi(a) + phi(b)
   - phi(ab) = phi(a)phi(b)
   - phi(1) = 1 (for rings with unity)

## Tool Commands

### Z3_Ring_Axioms

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "ForAll([a,b,c], a*(b+c) == a*b + a*c)"
```

### Z3_Integral_Domain

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "a*b == 0 implies a == 0 or b == 0"
```

### Sympy_Ideal

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "r*a"
```

## Key Techniques

_From indexed textbooks:_

- [Abstract Algebra] Reading the above equation mod4\(that is, considering this equation in the quotient ring Z/4Z), we must have {2} =2[9}=[9} ons ( io ‘| where the | he? Checking the few saad shows that we must take the 0 each time. Introduction to Rings Another ideal in RG is {}-"\_, agi | a € R}, i.
- [Abstract Algebra] Transcendental Extensions, Inseparable Extensions, Infinite Galois Groups Part V INTRODUCTION TO COMMUTATIVE RINGS, ALGEBRAIC GEOMETRY, AND HOMOLOGICAL ALGEBRA In this part of the book we continue the study of rings and modules, concentrating first on commutative rings. The topic of Commutative Algebra, which is of interest in its own right, is also a basic foundation for other areas of algebra. To indicate some of the © importance of the algebraic topics introduced, we parallel the development of the ring theory in Chapter 15 with an introduction to affine algebraic geometry.
- [Abstract Algebra] In the next section we give three important ways of constructing “larger” rings from a given ring (analogous to Example 6 above) and thus greafly expand our list of examples. Before doing so we mention some basic properties of arbitrary rings. The ring Z is a good example to keep in mind, although this ring has a good deal more algebraic structure than a general ring (for example, it is commutative and has an identity).
- [Abstract Algebra] Let R and S be rings with identities. S is of the form 'e x J where J is an ideal of R and J is an ideal of S. Prove that if R and S are nonzero rings then R x S is never a field.
- [Abstract Algebra] This connection of geometry and algebra shows a rich interplay between these two areas of mathematics and demonstrates again how results and structures in one circle of mathematical ideas provide insights into another. In Chapter 16 we continue with some of the fundamental structures involving commutative rings, culminating with Dedekind Domains and a structure theorem for modules over such rings which is a generalization of the structure theorem for modules over P. In Chapter 17 we describe some of the basic techniques of “homological algebra,” which continues with some of the questions raised by the failure of exactness of some of the sequences considered in Chapter 10.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
