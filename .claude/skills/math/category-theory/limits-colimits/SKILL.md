---
name: limits-colimits
description: "Problem-solving strategies for limits colimits in category theory"
allowed-tools: [Bash, Read]
---

# Limits Colimits

## When to Use

Use this skill when working on limits-colimits problems in category theory.

## Decision Tree

1. **Identify Limit Type**
   - Product: limit of discrete diagram
   - Equalizer: limit of parallel pair f, g: A -> B
   - Pullback: limit of A -> C <- B
   - Terminal object: limit of empty diagram
   - Lean 4: `CategoryTheory.Limits` namespace

2. **Verify Universal Property**
   - Cone from L with projections pi_i: L -> D_i
   - For any cone from X, unique morphism u: X -> L
   - Triangles commute: pi_i . u = cone_i
   - Lean 4: `IsLimit.lift` gives the unique morphism

3. **Colimit (Dual)**
   - Coproduct: colimit of discrete diagram
   - Coequalizer: colimit of parallel pair
   - Pushout: colimit of A <- C -> B
   - Initial object: colimit of empty diagram

4. **Compute Limits Concretely**
   - In Set: product = Cartesian product
   - Equalizer = {x | f(x) = g(x)}
   - Pullback = {(a,b) | f(a) = g(b)}
   - `sympy_compute.py solve "f(a) == g(b)"`

5. **Preservation**
   - Right adjoint preserves limits
   - Left adjoint preserves colimits
   - Representable functors preserve limits
   - Lean 4: `Adjunction.rightAdjointPreservesLimits`
   - See: `.claude/skills/lean4-limits/SKILL.md` for exact syntax

## Tool Commands

### Lean4_Limit

```bash
# Lean 4: import CategoryTheory.Limits.Shapes.Products
```

### Lean4_Universal

```bash
# Lean 4: IsLimit.lift cone -- unique morphism from universal property
```

### Sympy_Pullback

```bash
uv run python -m runtime.harness scripts/sympy_compute.py solve "f(a) == g(b)"
```

### Lean4_Build

```bash
lake build  # Compiler-in-the-loop verification
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
