---
name: continuity
description: "Problem-solving strategies for continuity in real analysis"
allowed-tools: [Bash, Read]
---

# Continuity

## When to Use

Use this skill when working on continuity problems in real analysis.

## Decision Tree

1. **Check Definition**
   - f(a) exists (function defined at point)
   - lim\_{x->a} f(x) exists
   - lim\_{x->a} f(x) = f(a)

2. **Use SymPy for Limit Check**
   - `sympy_compute.py limit "f(x)" --var x --at a`
   - Compare with f(a)

3. **Piecewise Functions**
   - Check left and right limits separately
   - `sympy_compute.py limit "f(x)" --var x --at a --dir left`

4. **Verify with Z3**
   - `z3_solve.py prove "limit_exists implies continuous"`

## Tool Commands

### Sympy_Limit

```bash
uv run python -m runtime.harness scripts/sympy_compute.py limit "f(x)" --var x --at a
```

### Sympy_Limit_Left

```bash
uv run python -m runtime.harness scripts/sympy_compute.py limit "f(x)" --var x --at a --dir left
```

### Z3_Prove

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "continuous_at_a"
```

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
