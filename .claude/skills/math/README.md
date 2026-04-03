# Math Cognitive Stack

A multi-layer system for machine-verified mathematical problem solving.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MATH COGNITIVE STACK                          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1 │ SymPy        │ Symbolic computation (exact)          │
│  Layer 2 │ Z3           │ Constraint solving (SAT/SMT)          │
│  Layer 3 │ Scratchpad   │ Step-by-step verification             │
│  Layer 4 │ Lean 4       │ Formal proof verification             │
└─────────────────────────────────────────────────────────────────┘
```

## When to Use Each Layer

| Problem Type      | Layer      | Why                        |
| ----------------- | ---------- | -------------------------- |
| Solve equation    | SymPy      | Exact symbolic solutions   |
| Prove inequality  | Z3         | SAT solver for constraints |
| Verify derivation | Scratchpad | Step verification          |
| Formal theorem    | Lean 4     | Machine-checked proof      |
| Category theory   | Lean 4     | Abstract structures        |

## Quick Start

```bash
# Symbolic computation
uv run python scripts/sympy_compute.py solve "x**2 - 4 = 0"

# Matrix operations
uv run python scripts/sympy_compute.py eigenvalues "[[1,2],[3,4]]"
uv run python scripts/sympy_compute.py eigenvectors "[[2,0],[0,3]]"

# Formal verification (Lean 4)
lake build  # Compiler-in-the-loop
```

## Skill Hierarchy

```
.claude/skills/
├── math/                    # Domain skills by topic
│   ├── abstract-algebra/    # Groups, rings, fields
│   ├── category-theory/     # Functors, nat trans, limits
│   ├── complex-analysis/    # Analytic functions, residues
│   ├── functional-analysis/ # Banach spaces, operators
│   ├── linear-algebra/      # Matrices, eigenvalues, vectors
│   ├── mathematical-logic/  # Propositional, predicate logic
│   ├── measure-theory/      # Lebesgue, sigma-algebras
│   ├── real-analysis/       # Limits, continuity, convergence
│   ├── topology/            # Open sets, compactness
│   └── ...
├── lean4/                   # Base Lean 4 setup
├── lean4-functors/          # Functor syntax
├── lean4-nat-trans/         # Natural transformations
├── lean4-limits/            # Products, coproducts
└── math-mode/               # SymPy + Z3 integration
```

## Domain Skills

Each domain skill contains:

- `SKILL.md` - When to use, key patterns
- `THEOREMS.md` - Core theorems and definitions
- `EXAMPLES.md` - Worked examples with verification

## Learning From Sessions

Agents can query past reasoning:

- Handoffs: `thoughts/shared/handoffs/`
- Braintrust: `uv run python scripts/braintrust_analyze.py --session-id <id>`

## Related Skills

- `/math-mode` - SymPy + Z3 cognitive prosthetics
- `/lean4` - Formal theorem proving with APOLLO repair

See `WORKFLOW.md` for the full development workflow.
