---
name: connectedness
description: "Problem-solving strategies for connectedness in topology"
allowed-tools: [Bash, Read]
---

# Connectedness

## When to Use

Use this skill when working on connectedness problems in topology.

## Decision Tree

1. **Is X connected?**
   - Strategy 1 - Contradiction:
     - Assume X = U union V where U, V are disjoint, non-empty, and open
     - Derive a contradiction
   - Strategy 2 - Path connectedness:
     - Show for all x,y in X, exists continuous path f: [0,1] -> X with f(0)=x, f(1)=y
   - Strategy 3 - Fan lemma:
     - If {A_i} are connected sharing a common point, then union A_i is connected

2. **Connectedness Proofs**
   - Show no separation exists
   - `z3_solve.py prove "no_separation"`
   - Use intermediate value theorem for R subsets

3. **Path Connectedness**
   - Construct explicit path: f(t) = (1-t)x + ty for convex sets
   - `sympy_compute.py simplify "(1-t)*x + t*y"` to verify path

4. **Components**
   - Connected component: maximal connected subset containing x
   - Path component: maximal path-connected subset containing x

## Tool Commands

### Z3_No_Separation

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "no_separation"
```

### Sympy_Path

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "(1-t)*x + t*y"
```

### Z3_Ivt

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "intermediate_value"
```

## Key Techniques

_From indexed textbooks:_

- [Introduction to Topological Manifolds... (Z-Library)] Connectedness One of the most important elementary facts about continuous functions is the intermediate value theorem: If f is a continuous real-valued function dened on a closed bounded interval [a, b], then f takes on every value be- tween f (a) and f (b). The key idea here is the “connectedness” of intervals. In this section we generalize this concept to topological spaces.
- [Topology (Munkres, James Raymond) (Z-Library)] A b× lb× cb×0π1(A)×0π1(A)×0 156ConnectednessandCompactnessCh. DenetheunitballBninRnbytheequationBn={x|x≤1},wherex=(x1,. Theunitballispathconnected;givenanytwopointsxandyofBn,thestraight-linepathf:[0,1]→Rndenedbyf(t)=(1−t)x+tyliesinBn.
- [Introduction to Topological Manifolds... (Z-Library)] Thanks are due also to Mary Sheetz, who did an excellent job producing some of the illustrations under the pressures of time and a nicky author. My debt to the authors of several other textbooks will be obvious to anyone who knows those books: William Massey’s Algebraic Topology: An Introduction [Mas89], Allan Sieradski’s An Introduction to Topology and Homotopy [Sie92], Glen Bredon’s Topology and Geometry, and James Munkres’s Topology: A First Course [Mun75] and Elements of Algebraic Topology [Mun84] are foremost among them. Finally, I would like to thank my wife, Pm, for her forbearance and unagging support while I was spending far too much time with this book Preface and far too little with the family; without her help I unquestionably could not have done it.
- [Topology (Munkres, James Raymond) (Z-Library)] TheunionofacollectionofconnectedsubspacesofXthathaveapointincommonisconnected. Let{Aα}beacollectionofconnectedsubspacesofaspaceX;letpbeapointofAα. WeprovethatthespaceY=Aαisconnected.
- [Introduction to Topological Manifolds... (Z-Library)] Conversely, if X is disconnected, we can write X = U ∪ V where U and V are nonempty, open, and disjoint. This implies that U is open, closed, not empty, and not equal to X. Main Theorem on Connectedness).

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
