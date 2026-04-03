---
name: propositional-logic
description: "Problem-solving strategies for propositional logic in mathematical logic"
allowed-tools: [Bash, Read]
---

# Propositional Logic

## When to Use

Use this skill when working on propositional-logic problems in mathematical logic.

## Decision Tree

1. **Identify Formula Structure**
   - Classify: tautology, contradiction, or contingent?
   - Main connective: AND, OR, IMPLIES, NOT, IFF?
   - `z3_solve.py sat "formula"` to check satisfiability

2. **Truth Table Method**
   - For small formulas (<=4 variables): enumerate all valuations
   - `sympy_compute.py truthtable "p & (p -> q) -> q"`
   - Tautology = all T, Contradiction = all F

3. **Natural Deduction**
   - Apply inference rules: Modus Ponens, Modus Tollens
   - Conditional proof: assume antecedent, derive consequent
   - `z3_solve.py prove "Implies(And(p, Implies(p,q)), q)"`

4. **Semantic Tableaux**
   - Build tree by decomposing formula
   - Closed branches = contradictions
   - All branches closed = valid argument

## Tool Commands

### Z3_Sat

```bash
uv run python -m runtime.harness scripts/z3_solve.py sat "And(p, Implies(p, q), Not(q))"
```

### Z3_Tautology

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "Implies(And(p, Implies(p, q)), q)"
```

### Sympy_Truthtable

```bash
uv run python -m runtime.harness scripts/sympy_compute.py truthtable "p & (p >> q) >> q"
```

### Z3_Modus_Ponens

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "Implies(And(p, Implies(p,q)), q)"
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
