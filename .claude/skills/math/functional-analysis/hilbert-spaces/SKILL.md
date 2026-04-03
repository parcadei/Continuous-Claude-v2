---
name: hilbert-spaces
description: "Problem-solving strategies for hilbert spaces in functional analysis"
allowed-tools: [Bash, Read]
---

# Hilbert Spaces

## When to Use

Use this skill when working on hilbert-spaces problems in functional analysis.

## Decision Tree

1. **Orthogonal decomposition**
   - For closed subspace M: H = M + M^perp (direct sum)
   - Every x = P*M(x) + P*{M^perp}(x)
   - `sympy_compute.py simplify "x - projection"`

2. **Projection Theorem**
   - For closed convex C, unique nearest point exists
   - P_C is nonexpansive: ||P_C(x) - P_C(y)|| <= ||x - y||
   - `z3_solve.py prove "projection_exists_unique"`

3. **Riesz Representation**
   - Every f in H\* has form f(x) = <x, y_f> for unique y_f
   - ||f|| = ||y_f||
   - `z3_solve.py prove "riesz_representation"`

4. **Parseval's Identity**
   - For orthonormal basis {e_n}: ||x||^2 = sum|<x, e_n>|^2
   - `sympy_compute.py sum "abs(<x, e_n>)**2"`

5. **Bessel's Inequality**
   - sum|<x, e_n>|^2 <= ||x||^2 for any orthonormal set

## Tool Commands

### Sympy_Inner_Product

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "<x + y, z> == <x,z> + <y,z>"
```

### Z3_Projection

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "x - P_M(x) in M_perp"
```

### Z3_Riesz

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "bounded_linear_functional iff inner_product_form"
```

### Sympy_Parseval

```bash
uv run python -m runtime.harness scripts/sympy_compute.py sum "abs(<x, e_n>)**2" --var n --from 1 --to oo
```

## Key Techniques

_From indexed textbooks:_

- [Introductory Functional Analysis with Applications] This proves that A is dense in H, and since A is countable, H is separable. For using Hilbert spaces in applications one must know what total orthonormal set or sets to choose in a specific situation and how to investigate properties of the elements of such sets. For certain function spaces this problem will be considered in the next section, Which 3.
- [Introductory Functional Analysis with Applications] Sx, y) = (Tx, y), we see that Sx = Tx by Lemma 3. SxI + {3SX2, y) Inner Product Spaces. Hilbert Spaces (Space R3) Show that any linear functional f on R3 can be represented by a dot product: (Space f) Show that every bounded linear functional f on 12 can be represented in the fonn f(x) = L gj~ ~ j=1 If z is any fixed element of an inner product space X, show that f(x) = (x, z) defines a bounded linear functional f on X, of norm Ilzll.
- [Introductory Functional Analysis with Applications] HILBERT SPACES In a normed space we can add vectors and mUltiply vectors by scalars, just as in elementary vector algebra. Furthermore, the norm on such a space generalizes the elementary concept of the length of a vector. However, what is still missing in a general normed space, and what we would like to have if possible, is an analogue of the familiar dot product and resulting formulas, notably and the condition for orthogonality (perpendicularity) a· b=O which are important tools in many applications.
- [Introductory Functional Analysis with Applications] Inner product spaces are special normed spaces, as we shall see. Historically they are older than general normed spaces. Their theory is richer and retains many features of Euclidean space, a central concept being orthogonality.
- [Introductory Functional Analysis with Applications] What are the adjoints of a zero operator 0 and an identity operator I? Annihllator) Let X and Y be normed spaces, T: X - Y a bounded linear operator and -M = (¥t( T), the closure of the range of T. Fundamental Theorems for Normed and Banach Spaces To complete this discussion, we should also list some of the main differences between the adjoint operator T X of T: X ~ Y and the Hilbert-adjoint operator T\* of T: Hi ~ H 2 , where X, Yare normed spaces and Hi> H2 are Hilbert spaces.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
