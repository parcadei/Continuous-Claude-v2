---
name: predicate-logic
description: "Problem-solving strategies for predicate logic in mathematical logic"
allowed-tools: [Bash, Read]
---

# Predicate Logic

## When to Use

Use this skill when working on predicate-logic problems in mathematical logic.

## Decision Tree

1. **Quantifier Analysis**
   - Identify: ForAll (universal), Exists (existential)
   - Scope of quantifiers and free/bound variables
   - `z3_solve.py prove "ForAll([x], P(x)) implies P(a)"`

2. **Prenex Normal Form**
   - Move all quantifiers to front
   - Standardize variables to avoid capture
   - `sympy_compute.py simplify "prenex(formula)"`

3. **Skolemization (for Exists)**
   - Replace existential quantifiers with Skolem functions
   - Exists x. P(x) -> P(c) or P(f(y)) depending on scope
   - Needed for resolution-based proofs

4. **Resolution Proof**
   - Convert to CNF, negate conclusion
   - Apply resolution rule until empty clause or saturation
   - `z3_solve.py prove "resolution_valid"`

5. **Model Theory**
   - Construct countermodel to refute invalid argument
   - Finite model for finite domain
   - `z3_solve.py model "Exists([x], P(x) & Not(Q(x)))"`

## Tool Commands

### Z3_Forall

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "ForAll([x], Implies(P(x), Q(x)))"
```

### Z3_Exists

```bash
uv run python -m runtime.harness scripts/z3_solve.py sat "Exists([x], And(P(x), Not(Q(x))))"
```

### Z3_Universal_Instantiation

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "Implies(ForAll([x], P(x)), P(a))"
```

### Z3_Model

```bash
uv run python -m runtime.harness scripts/z3_solve.py model "Exists([x], P(x))"
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
