---
name: categories-functors
description: "Problem-solving strategies for categories functors in category theory"
allowed-tools: [Bash, Read]
---

# Categories Functors

## When to Use

Use this skill when working on categories-functors problems in category theory.

## Decision Tree

1. **Verify Category Axioms**
   - Objects and morphisms (arrows) defined?
   - Identity morphism for each object: id_A: A -> A
   - Composition associative: (f . g) . h = f . (g . h)
   - Write Lean 4: `theorem assoc : (f ≫ g) ≫ h = f ≫ (g ≫ h) := Category.assoc`

2. **Check Functor Properties**
   - F: C -> D maps objects to objects, arrows to arrows
   - Preserves identity: F(id*A) = id*{F(A)}
   - Preserves composition: F(g . f) = F(g) . F(f)
   - Write Lean 4: `theorem comp : F.map (g ≫ f) = F.map g ≫ F.map f := F.map_comp`

3. **Functor Types**
   - Covariant: preserves arrow direction
   - Contravariant: reverses arrow direction
   - Faithful/Full: injective/surjective on Hom-sets
   - Equivalence: full, faithful, essentially surjective

4. **Common Functors**
   - Forgetful functor: forgets structure (e.g., Grp -> Set)
   - Free functor: left adjoint to forgetful
   - Hom functor: Hom(A, -) or Hom(-, B)
   - Power set functor: Set -> Set via X |-> P(X)

5. **Verify with Lean 4**
   - Compiler-in-the-loop: write proof, `lake build` checks
   - Mathlib has full category theory library
   - See: `.claude/skills/lean4-functors/SKILL.md` for exact syntax

## Tool Commands

### Lean4_Category

```bash
# Lean 4 with Mathlib: import CategoryTheory.Category.Basic
```

### Lean4_Functor

```bash
# Lean 4: theorem map_comp (F : C ⥤ D) : F.map (g ≫ f) = F.map g ≫ F.map f := F.map_comp
```

### Lean4_Build

```bash
lake build  # Compiler-in-the-loop verification
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
