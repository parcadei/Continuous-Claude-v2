---
name: residues
description: "Problem-solving strategies for residues in complex analysis"
allowed-tools: [Bash, Read]
---

# Residues

## When to Use

Use this skill when working on residues problems in complex analysis.

## Decision Tree

1. **Computing Residues**
   - Simple pole at z0:
     - Res(f, z0) = lim\_{z->z0} (z - z0)f(z)
     - `sympy_compute.py limit "(z - z0)*f(z)" --var z --at z0`
   - Pole of order n:
     - Res(f, z0) = (1/(n-1)!) \* lim d^{n-1}/dz^{n-1}[(z-z0)^n f(z)]
     - `sympy_compute.py diff "((z-z0)**n)*f(z)" --var z --order n-1`
   - L'Hopital shortcut for f = g/h with simple pole:
     - Res(f, z0) = g(z0)/h'(z0)

2. **Identify Pole Order**
   - Simple pole: (z - z0)f(z) has finite limit
   - Order n: (z - z0)^n f(z) has finite limit, but (z - z0)^{n-1} f(z) doesn't
   - `sympy_compute.py limit "(z - z0)**n * f(z)" --var z --at z0`

3. **Essential Singularities**
   - Neither pole nor removable (e.g., e^{1/z} at z=0)
   - Compute residue via Laurent series
   - `sympy_compute.py series "exp(1/z)" --var z --at 0`

4. **Apply Residue Theorem**
   - oint_C f(z)dz = 2*pi*i \* (sum of residues inside C)
   - Count only poles INSIDE the contour
   - `z3_solve.py prove "pole_inside_contour"`

## Tool Commands

### Sympy_Residue

```bash
uv run python -m runtime.harness scripts/sympy_compute.py residue "1/((z-1)*(z-2))" --var z --at 1
```

### Sympy_Limit

```bash
uv run python -m runtime.harness scripts/sympy_compute.py limit "(z - z0)*f(z)" --var z --at z0
```

### Sympy_Laurent

```bash
uv run python -m runtime.harness scripts/sympy_compute.py series "exp(1/z)" --var z --at 0
```

### Z3_Pole_Inside

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "abs(z0) < R"
```

## Key Techniques

_From indexed textbooks:_

- [Complex analysis an introduction to... (Z-Library)] The fact that the calculus of residues yields complex rather than real integrals is no dis¬ (49) with g(z) — z, we obtain <»» i>(”)=25 / f^w) = 2vi / /'(_) /(z) - w z dz. If (49) is applied with g(z) = zm, equation (50) is replaced by 2iri I |z-zo| = /'(_) f(z) - w zm dz. The right-hand member represents an analytic function of w for \w — ir0| < 8.
- [Complex analysis an introduction to... (Z-Library)] What are the possible values of r dz J \/l — z2 over a closed curve in the region? THE CALCULUS OF RESIDUES The results of the preceding section have shown that the determination of line integrals of analytic functions over closed curves can be reduced to the determination of periods. Under certain circumstances it turns out that the periods can be found without or with very little computation.
- [Complex analysis an introduction to... (Z-Library)] Hint: Sketch the image of the imaginary axis and apply the argument principle to a large half disk. Evaluation of Definite Integrals. The calculus of residues pro¬ vides a very efficient tool for the evaluation of definite integrals.
- [Complex analysis an introduction to... (Z-Library)] The particular function 1 /(z — ay) has a vanishing period. The constant Rj which produces this result is called the residue of f(z) at the point ay. We repeat the definition in the following form: It is helpful to use such self-explanatory notations as R = Res!
- [Complex Analysis (Elias M. Stein, Ram... (Z-Library)] Cauchy, 1826 There is a general principle in the theory, already implicit in Riemann’s work, which states that analytic functions are in an essential way charac- terized by their singularities. That is to say, globally analytic functions are “eectively” determined by their zeros, and meromorphic functions by their zeros and poles. While these assertions cannot be formulated as precise general theorems, there are nevertheless signicant instances where this principle applies.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
