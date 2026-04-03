---
name: contour-integrals
description: "Problem-solving strategies for contour integrals in complex analysis"
allowed-tools: [Bash, Read]
---

# Contour Integrals

## When to Use

Use this skill when working on contour-integrals problems in complex analysis.

## Decision Tree

1. **Integral Type Selection**
   - For integral\_{-inf}^{inf} f(x)dx where f decays like 1/x^a, a > 1:
     - Use semicircular contour (upper or lower half-plane)
   - For integral involving e^{ix} or trigonometric functions:
     - Close in upper half-plane for e^{ix} (Jordan's lemma)
     - Close in lower half-plane for e^{-ix}
   - For integral_0^{2pi} f(cos theta, sin theta)d theta:
     - Substitute z = e^{i theta}, use unit circle contour
   - For integrand with branch cuts:
     - Use keyhole or dogbone contour around cuts

2. **Contour Setup**
   - Identify singularities and their locations
   - Choose contour that encloses desired singularities
   - `sympy_compute.py solve "f(z) = inf"` to find poles

3. **Jordan's Lemma**
   - For integral over semicircle of radius R:
   - If |f(z)| -> 0 as |z| -> inf, semicircular contribution vanishes

4. **Compute with Residue Theorem**
   - oint_C f(z)dz = 2*pi*i \* (sum of residues inside C)
   - `sympy_compute.py residue "f(z)" --var z --at z0`

## Tool Commands

### Sympy_Residue

```bash
uv run python -m runtime.harness scripts/sympy_compute.py residue "1/(z**2 + 1)" --var z --at I
```

### Sympy_Poles

```bash
uv run python -m runtime.harness scripts/sympy_compute.py solve "z**2 + 1" --var z
```

### Sympy_Integrate

```bash
uv run python -m runtime.harness scripts/sympy_compute.py integrate "1/(x**2 + 1)" --var x --from "-oo" --to "oo"
```

## Key Techniques

_From indexed textbooks:_

- [Complex Analysis (Elias M. Stein, Ram... (Z-Library)] The keyhole contour and one small, connected by a narrow corridor. The interior of Γ, which we denote by Γint, is clearly that region enclosed by the curve, and can be given precise meaning with enough work. We x a point z0 in that If f is holomorphic in a neighborhood of Γ and its interior, interior.
- [Complex Analysis (Elias M. Stein, Ram... (Z-Library)] For the proof, consider a multiple keyhole which has a loop avoiding In each one of the poles. Let the width of the corridors go to zero. Suppose that f is holomorphic in an open set containing a toy contour γ and its interior, except for poles at the points z1, .
- [Complex Analysis (Elias M. Stein, Ram... (Z-Library)] CAUCHY’S THEOREM AND ITS APPLICATIONS The following denition is loosely stated, although its applications will be clear and unambiguous. We call a toy contour any closed curve where the notion of interior is obvious, and a construction similar to that in Theorem 2. Its positive orientation is that for which the interior is to the left as we travel along the toy contour.
- [Complex Analysis (Elias M. Stein, Ram... (Z-Library)] Suppose that f is holomorphic in an open set containing a circle C and its interior, except for poles at the points z1, . The identity γ f (z) dz = 2πi N k=1 reszk f is referred to as the residue formula. Examples The calculus of residues provides a powerful technique to compute a wide range of integrals.
- [Complex analysis an introduction to... (Z-Library)] Hint: Sketch the image of the imaginary axis and apply the argument principle to a large half disk. Evaluation of Definite Integrals. The calculus of residues pro¬ vides a very efficient tool for the evaluation of definite integrals.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
