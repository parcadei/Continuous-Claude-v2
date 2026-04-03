---
name: open-sets
description: "Problem-solving strategies for open sets in topology"
allowed-tools: [Bash, Read]
---

# Open Sets

## When to Use

Use this skill when working on open-sets problems in topology.

## Decision Tree

1. **Is f: X -> Y continuous?**
   - For metric spaces: x_n -> x implies f(x_n) -> f(x)?
   - For general spaces: f^(-1)(open) = open?
   - For products: Check each coordinate function
   - `z3_solve.py prove "preimage_open"`

2. **Open Set Verification**
   - For metric spaces: for all x in U, exists epsilon > 0 with B(x,epsilon) subset U
   - `z3_solve.py prove "ball_contained"` with epsilon witnesses

3. **Topological Properties**
   - Interior: int(A) = largest open subset of A
   - Closure: cl(A) = smallest closed superset of A
   - Boundary: bd(A) = cl(A) \ int(A)

4. **Continuity Tests**
   - Epsilon-delta: for all epsilon > 0, exists delta > 0: d(x,a) < delta implies d(f(x),f(a)) < epsilon
   - `z3_solve.py prove "epsilon_delta_bound"`

## Tool Commands

### Z3_Preimage_Open

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "preimage_open"
```

### Z3_Epsilon_Delta

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "ForAll(eps, Exists(delta, d(x,a) < delta implies d(f(x),f(a)) < eps))"
```

### Z3_Ball_Contained

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "ball_contained"
```

## Key Techniques

_From indexed textbooks:_

- [Introduction to Topological Manifolds... (Z-Library)] Show that every local homeomorphism is an open map. Show that every homeomorphism is a local homeomorphism. Show that a bijective continuous open map is a homeomorphism.
- [Introduction to Topological Manifolds... (Z-Library)] The key motivation behind the denition of this new kind of space is the open set criterion for continuity (Lemma A. Appendix), which shows that continuous functions between metric spaces can be detected knowing only the open sets. Motivated by this observation, we make the following denition.
- [Introduction to Topological Manifolds... (Z-Library)] Suppose X is a set, and B is any collection of subsets of X whose union equals X. Let T be the collection of all unions of nite inter- sections of elements of B. Note that the empty set is the union of the empty collection of sets.
- [Introduction to Topological Manifolds... (Z-Library)] The product topology is “associative” in the sense that the three prod- uct topologies X1 × X2 × X3, (X1 × X2) × X3, and X1 × (X2 × X3) on the set X1 × X2 × X3 are all equal. For any i and any points xj ∈ Xj, j = i, the map fi : Xi → X1 × · · × Xn given by fi(x) = (x1, . If for each i, Bi is a basis for the topology of Xi, then the set {B1 × · · · × Bn : Bi ∈ Bi} is a basis for the product topology on X1 × · · · × Xn.
- [Introduction to Topological Manifolds... (Z-Library)] Here are some examples of closed subsets of familiar topological spaces. Any closed interval [a, b] ⊂ R is a closed set, as are the half-innite closed intervals [a, ∞) and (−∞, b]. Every subset of a discrete space is closed.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
