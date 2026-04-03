---
name: natural-transformations
description: "Problem-solving strategies for natural transformations in category theory"
allowed-tools: [Bash, Read]
---

# Natural Transformations

## When to Use

Use this skill when working on natural-transformations problems in category theory.

## Decision Tree

1. **Verify Naturality**
   - eta: F => G is natural transformation between functors F, G: C -> D
   - For each f: A -> B in C, diagram commutes:
     G(f) . eta_A = eta_B . F(f)
   - Write Lean 4: `theorem nat : η.app B ≫ G.map f = F.map f ≫ η.app A := η.naturality`

2. **Component Analysis**
   - eta_A: F(A) -> G(A) for each object A
   - Each component is morphism in target category D
   - Lean 4: `def η : F ⟶ G where app := fun X => ...`

3. **Natural Isomorphism**
   - Each component eta_A is isomorphism
   - Functors F and G are naturally isomorphic
   - Notation: F ≅ G (NatIso in Mathlib)

4. **Functor Category**
   - [C, D] has functors as objects
   - Natural transformations as morphisms
   - Vertical composition: Lean 4 `CategoryTheory.NatTrans.vcomp`
   - Horizontal composition: `CategoryTheory.NatTrans.hcomp`

5. **Yoneda Lemma Application**
   - Nat(Hom(A, -), F) ~ F(A) naturally in A
   - Lean 4: `CategoryTheory.yonedaEquiv`
   - Fully embeds C into [C^op, Set]
   - See: `.claude/skills/lean4-nat-trans/SKILL.md` for exact syntax

## Tool Commands

### Lean4_Naturality

```bash
# Lean 4: theorem nat : η.app B ≫ G.map f = F.map f ≫ η.app A := η.naturality
```

### Lean4_Nat_Trans

```bash
# Lean 4: def η : F ⟶ G where app := fun X => component_X
```

### Lean4_Yoneda

```bash
# Lean 4: CategoryTheory.yonedaEquiv -- Yoneda lemma
```

### Lean4_Build

```bash
lake build  # Compiler-in-the-loop verification
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
