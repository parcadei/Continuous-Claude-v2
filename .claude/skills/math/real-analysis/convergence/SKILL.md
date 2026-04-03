---
name: convergence
description: "Problem-solving strategies for convergence in real analysis"
allowed-tools: [Bash, Read]
---

# Convergence

## When to Use

Use this skill when working on convergence problems in real analysis.

## Decision Tree

1. **Identify Sequence/Series Type**
   - Geometric series: |r| < 1 converges
   - p-series: p > 1 converges
   - Alternating series: check decreasing + limit 0

2. **Apply Convergence Tests**
   - Ratio test: `sympy_compute.py limit "a_{n+1}/a_n"`
   - Root test: `sympy_compute.py limit "a_n^(1/n)"`
   - Comparison test: find bounding series

3. **Verify Bounds**
   - Use `z3_solve.py prove` for inequality bounds
   - Check monotonicity with derivatives

4. **Compute Sum (if convergent)**
   - `sympy_compute.py sum "a_n" --var n --from 0 --to oo`

## Tool Commands

### Sympy_Limit

```bash
uv run python -m runtime.harness scripts/sympy_compute.py limit "a_n" --var n --at oo
```

### Sympy_Sum

```bash
uv run python -m runtime.harness scripts/sympy_compute.py sum "1/n**2" --var n --from 1 --to oo
```

### Z3_Prove

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "series_bounded"
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
