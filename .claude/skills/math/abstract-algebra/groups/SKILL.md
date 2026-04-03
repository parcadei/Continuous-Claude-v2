---
name: groups
description: "Problem-solving strategies for groups in abstract algebra"
allowed-tools: [Bash, Read]
---

# Groups

## When to Use

Use this skill when working on groups problems in abstract algebra.

## Decision Tree

1. **Is G a group under operation \*?**
   - Check closure: a,b in G implies a\*b in G?
   - Check associativity: (a*b)*c = a*(b*c)?
   - Check identity: exists e such that e*a = a*e = a?
   - Check inverses: for all a exists a^(-1) such that a\*a^(-1) = e?
   - Verify with `z3_solve.py prove "group_axioms"`

2. **Subgroup Test**
   - Show H is non-empty (usually by showing e in H)
   - Show that for all a, b in H: ab^(-1) in H
   - `z3_solve.py prove "subgroup_criterion"`

3. **Homomorphism Proof**
   - Verify phi(ab) = phi(a)phi(b) for all a, b in G1
   - Note: phi(e1) = e2 and phi(a^(-1)) = phi(a)^(-1) follow automatically
   - `sympy_compute.py simplify "phi(a*b) - phi(a)*phi(b)"`

4. **Order and Structure**
   - Element order: smallest n where a^n = e
   - Group order: |G| = number of elements
   - Lagrange: |H| divides |G| for subgroup H

## Tool Commands

### Z3_Group_Axioms

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "ForAll([a,b,c], op(op(a,b),c) == op(a,op(b,c)))"
```

### Z3_Subgroup

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "subgroup_criterion"
```

### Sympy_Simplify

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "phi(a*b) - phi(a)*phi(b)"
```

## Key Techniques

_From indexed textbooks:_

- [Abstract Algebra] Write a computer program to add and multiply mod n, for any n given as input. The output of these operations should be the least residues of the sums and products of two integers. Also include the feature that if (a,n) = 1, an integer c between 1 and n — 1 such that a-c = | may be printed on request.
- [Abstract Algebra] With a certain amount of elementary argument (calculations in A7, for example see Exercise 27) it can be shown that there is, up to isomorphism, a unique simple group of order 168 (it is not always the case that there is at most one simple group of a given order: there are 2 nonisomorphic simple groups of order +8! We could further show that such a G would have no elements of order pg, p and q distinct primes, no elements of order 9, and that distinct Sylow subgroups would intersect in the identity. We could then count the elements in Sylow p-subgroups for all primes p and we would find that these would total to exactly |G|.
- [Abstract Algebra] Some Techniques Before listing some techniques for producing normal subgroups in groups of a given (“medium”) order we note that in all the problems where one deals with groups of order n, for some specific n, it is first necessary to factor n into prime powers and then to compute the permissible values of np, for all primes p dividing n. We emphasize the need to be comfortable computing mod p when carrying out the last step. The techniques we describe may be listed as follows: (1) Counting elements.
- [Abstract Algebra] Composition Series and the Hélder Program Sec. This proof takes 255 pages of hard mathematics. Part (2) of the Hélder Program, sometimes called the extension problem, was rather vaguely formulated.
- [Abstract Algebra] APPLICATIONS IN GROUPS OF MEDIUM ORDER The purpose of this section is to work through a number of examples which illustrate many of the techniques we have developed. These examples use Sylow’s Theorems ex- tensively and demonstrate how they are applied in the study of finite groups. Motivated by the Holder Program we address primarily the problem of showing that for certain n every group of order n has a proper, nontrivial normal subgroup (i.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
