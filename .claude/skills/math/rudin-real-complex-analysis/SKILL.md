---
name: rudin-real-complex-analysis
description: Problem-solving with Rudin's Real and Complex Analysis textbook
allowed-tools: [Bash, Read]
---

# Rudin's Real and Complex Analysis

Reference skill for Walter Rudin's "Real and Complex Analysis" (3rd Edition) - a graduate-level text covering measure theory, integration, functional analysis, and complex analysis.

## When to Use

Use this skill when working on:

- Measure theory and Lebesgue integration
- Lp spaces and functional analysis
- Complex analysis (analytic functions, contour integration, residues)
- Connections between real and complex analysis

## Topics Covered

### Real Analysis

- Limits and continuity in metric spaces
- Convergence of sequences and series
- Differentiation and integration techniques
- Metric spaces and topology

### Complex Analysis

- Analytic functions and Cauchy-Riemann equations
- Contour integration and Cauchy's theorem
- Residue theorem and applications
- Conformal mappings
- Power series representations

### Topology

- Topological spaces
- Compactness and connectedness
- Metric space topology

### Algebra

- Rings and ideals (in context of function spaces)

## Decision Tree

1. **Measure/Integration Problem?**
   - Use Lebesgue dominated convergence
   - Check Fatou's lemma for liminf/limsup
   - Apply Fubini-Tonelli for iterated integrals

2. **Complex Analysis Problem?**
   - Check analyticity via Cauchy-Riemann
   - For integrals: residue theorem
   - For mappings: Schwarz lemma, conformal properties

3. **Functional Analysis?**
   - Riesz representation for duals
   - Hahn-Banach for extensions
   - Open mapping/closed graph theorems

## Tool Commands

### Query Rudin Content

```bash
uv run python scripts/ragie_query.py --query "YOUR_TOPIC measure integration" --partition math-textbooks --top-k 5
```

### SymPy for Symbolic Computation

```bash
uv run python scripts/sympy_compute.py integrate "exp(-x**2)" --var x --bounds "0,oo"
```

### Z3 for Verification

```bash
uv run python scripts/z3_solve.py prove "forall x, |f(x)| <= M implies bounded"
```

## Key Theorems Reference

| Theorem               | Chapter | Use Case                           |
| --------------------- | ------- | ---------------------------------- |
| Dominated Convergence | Ch 1    | Interchange limit and integral     |
| Riesz Representation  | Ch 2    | Identify dual spaces               |
| Cauchy's Theorem      | Ch 10   | Contour integrals = 0 for analytic |
| Residue Theorem       | Ch 10   | Evaluate real integrals            |
| Open Mapping          | Ch 5    | Surjective bounded linear maps     |

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
