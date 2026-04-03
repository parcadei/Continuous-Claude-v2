---
name: residues
version: 6.0-hybrid
description: Problem-solving strategies for residues in complex analysis
allowed-tools: [Bash, Read]
---

# Option: residues

## I (Initiation)

activate: [residue_computation, pole_classification, contour_integral, essential_singularity]
skip: [real_analysis_only, no_complex_plane]

## Y (Observation Space)

| signal          | source     | interpretation           |
| --------------- | ---------- | ------------------------ |
| f(z) expression | user input | function to analyze      |
| singularity z0  | problem    | point to compute residue |
| contour C       | problem    | integration path         |
| pole order      | limit test | determines formula       |

## U (Action Space)

primary: [Bash]
forbidden: [Edit]

## pi (Policy)

### P0: Classify Singularity

```
eta |-> simple_pole if lim (z-z0)*f(z) finite
eta |-> pole_order_n if (z-z0)^n * f(z) finite, (z-z0)^{n-1} not
eta |-> essential if neither (e.g., exp(1/z))
```

### P1: Compute Residue

| singularity  | formula                                       | command                                                        |
| ------------ | --------------------------------------------- | -------------------------------------------------------------- |
| simple pole  | lim\_{z->z0} (z-z0)\*f(z)                     | `sympy_compute.py limit "(z-z0)*f(z)" --var z --at z0`         |
| simple (g/h) | g(z0)/h'(z0)                                  | `sympy_compute.py "(g.subs(z,z0))/(diff(h,z).subs(z,z0))"`     |
| order n      | (1/(n-1)!) \* d^{n-1}/dz^{n-1}[(z-z0)^n f(z)] | `sympy_compute.py diff "((z-z0)**n)*f(z)" --var z --order n-1` |
| essential    | Laurent series coefficient of 1/z             | `sympy_compute.py series "f(z)" --var z --at z0`               |

### P2: Apply Residue Theorem

```
oint_C f(z)dz = 2*pi*i * sum(Res(f, z_k)) for z_k inside C
```

| action         | Q    | why                     |
| -------------- | ---- | ----------------------- |
| residue_cmd    | HIGH | direct computation      |
| l_hopital      | HIGH | g(z0)/h'(z0) shortcut   |
| laurent_series | MED  | essential singularities |

### Command Reference

```bash
uv run python -m runtime.harness scripts/sympy_compute.py residue "1/((z-1)*(z-2))" --var z --at 1
uv run python -m runtime.harness scripts/sympy_compute.py limit "(z-1)*f(z)" --var z --at 1
uv run python -m runtime.harness scripts/z3_solve.py prove "abs(z0) < R"
```

## beta (Termination)

success: [residue_computed, contour_integral_evaluated, all_poles_inside_C_summed]
failure: [singularity_outside_contour, essential_unhandled]

## Invariants

```
inv_1: verify pole is INSIDE contour before adding to sum
inv_2: check pole order before applying formula
```
