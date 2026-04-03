---
name: lebesgue-measure
description: "Problem-solving strategies for lebesgue measure in measure theory"
allowed-tools: [Bash, Read]
---

# Lebesgue Measure

## When to Use

Use this skill when working on lebesgue-measure problems in measure theory.

## Decision Tree

1. **Outer measure construction**
   - m\*(A) = inf{sum |I_n| : A subset union(I_n)}
   - `sympy_compute.py sum "length(I_n)" --var n`

2. **Caratheodory criterion**
   - E is measurable if: m*(A) = m*(A & E) + m\*(A & E^c) for all A
   - `z3_solve.py prove "caratheodory_criterion"`

3. **Lebesgue measure properties**
   - Translation invariant: m(E + x) = m(E)
   - sigma-additive on measurable sets
   - m([a,b]) = b - a

4. **Regularity theorems**
   - Inner regularity: m(E) = sup{m(K) : K compact, K subset E}
   - Outer regularity: m(E) = inf{m(U) : U open, E subset U}

## Tool Commands

### Sympy_Outer_Measure

```bash
uv run python -m runtime.harness scripts/sympy_compute.py sum "length(I_n)" --var n --from 1 --to oo
```

### Z3_Caratheodory

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "mu(A) == mu(A & E) + mu(A & E_complement)"
```

### Sympy_Borel_Sets

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "open_set_countable_union"
```

## Key Techniques

_From indexed textbooks:_

- [Measure, Integration Real Analysis (... (Z-Library)] Lebesgue measure on the Lebesgue measurable sets does have one small advantage over Lebesgue measure on the Borel sets: every subset of a set with (outer) measure 0 is Lebesgue measurable but is not necessarily a Borel set. However, any natural process that produces a subset of R will produce a Borel set. Thus this small advantage does not often come up in practice.
- [Measure, Integration Real Analysis (... (Z-Library)] B j j You have probably long suspected that not every subset of R is a Borel set. Now j j j j Section 2D Lebesgue Measure restricted to the Borel sets, is a measure. Borel sets Outer measure is a measure on (R, of R.
- [Measure, Integration Real Analysis (... (Z-Library)] The terminology Lebesgue set would make good sense in parallel to the termi- nology Borel set. However, Lebesgue set has another meaning, so we need to use Lebesgue measurable set. Every Lebesgue measurable set differs from a Borel set by a set with outer measure 0.
- [Measure, Integration Real Analysis (... (Z-Library)] If you go at a leisurely pace, then covering Chapters 1–5 in the rst semester may be a good goal. If you go a bit faster, then covering Chapters 1–6 in the rst semester may be more appropriate. For a second-semester course, covering some subset of Chapters 6 through 12 should produce a good course.
- [Measure, Integration Real Analysis (... (Z-Library)] Egorov’s Theorem, which states that pointwise convergence of a sequence of measurable functions is close to uniform convergence, has multiple applications in later chapters. Luzin’s Theorem, back in the context of R, sounds spectacular but has no other uses in this book and thus can be skipped if you are pressed for time. Chapter 4: The highlight of this chapter is the Lebesgue Differentiation Theorem, which allows us to differentiate an integral.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
