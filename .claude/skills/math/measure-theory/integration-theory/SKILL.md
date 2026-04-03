---
name: integration-theory
description: "Problem-solving strategies for integration theory in measure theory"
allowed-tools: [Bash, Read]
---

# Integration Theory

## When to Use

Use this skill when working on integration-theory problems in measure theory.

## Decision Tree

1. **Simple function integration**
   - For s = sum(a*i \* chi*{E_i}): integral s dmu = sum(a_i \* mu(E_i))
   - `sympy_compute.py simplify "simple_integral"`

2. **Monotone Convergence Theorem (MCT)**
   - If 0 <= f*n <= f*{n+1} and f_n -> f:
   - lim integral(f_n) = integral(lim f_n)
   - Use for increasing sequences

3. **Dominated Convergence Theorem (DCT)**
   - If |f_n| <= g (integrable) and f_n -> f pointwise:
   - lim integral(f_n) = integral(f)
   - `z3_solve.py prove "dominated_convergence"`

4. **Fatou's Lemma**
   - integral(liminf f_n) <= liminf(integral f_n)
   - Use as lower bound when MCT/DCT don't apply

5. **Fubini-Tonelli**
   - For product measures: switch order of integration
   - Tonelli: non-negative functions (always valid)
   - Fubini: integrable functions

## Tool Commands

### Sympy_Simple_Integral

```bash
uv run python -m runtime.harness scripts/sympy_compute.py integrate "sum(a_i * chi_E_i)" --var mu
```

### Z3_Mct

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "f_n_increasing implies lim_integral_equals_integral_lim"
```

### Z3_Dct

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "abs(f_n) <= g and g_integrable implies limit_exchange"
```

### Sympy_Fatou

```bash
uv run python -m runtime.harness scripts/sympy_compute.py limit "liminf(integral_f_n)" --comparison "integral_liminf_f_n"
```

## Key Techniques

_From indexed textbooks:_

- [Measure, Integration Real Analysis (... (Z-Library)] If you go at a leisurely pace, then covering Chapters 1–5 in the rst semester may be a good goal. If you go a bit faster, then covering Chapters 1–6 in the rst semester may be more appropriate. For a second-semester course, covering some subset of Chapters 6 through 12 should produce a good course.
- [Measure, Integration Real Analysis (... (Z-Library)] Suppose B is a Borel set and f : B R is a Lebesgue measurable function. B : g(x) = f (x) gj Open Access This chapter is licensed under the terms of the Creative Commons Attribution-NonCommercial 4. International License (http://creativecommons.
- [Measure, Integration Real Analysis (... (Z-Library)] Statue in Milan of Maria Gaetana Agnesi, who in 1748 published one of the rst calculus textbooks. A translation of her book into English was published in 1801. In this chapter, we develop a method of integration more powerful than methods contemplated by the pioneers of calculus.
- [Measure, Integration Real Analysis (... (Z-Library)] Preface for Instructors Chapter 3: Integration with respect to a measure is dened in this chapter in a natural fashion rst for nonnegative measurable functions, and then for real-valued measurable functions. The Monotone Convergence Theorem and the Dominated Convergence Theorem are the big results in this chapter that allow us to interchange integrals and limits under appropriate conditions. Preface for Instructors Chapter 8: This chapter focuses on Hilbert spaces, which play a central role in modern mathematics.
- [Measure, Integration Real Analysis (... (Z-Library)] Chapter 6: After a quick review of metric spaces and vector spaces, this chapter denes normed vector spaces. The big result here is the Hahn–Banach Theorem about extending bounded linear functionals from a subspace to the whole space. Then this chapter introduces Banach spaces.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
