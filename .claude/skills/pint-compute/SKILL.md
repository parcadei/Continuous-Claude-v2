---
name: pint-compute
description: Unit-aware computation with Pint - convert units, dimensional analysis, unit arithmetic
allowed-tools: [Bash, Read]
---

# Unit Computation with Pint

Cognitive prosthetics for unit-aware computation. Use Pint for converting between units, performing unit arithmetic, checking dimensional compatibility, and simplifying compound units.

## When to Use

- Converting between units (meters to feet, kg to pounds)
- Unit-aware arithmetic (velocity x time = distance)
- Dimensional analysis (is force = mass x acceleration?)
- Simplifying compound units to base or named units
- Parsing and analyzing quantities with units

## Quick Reference

| I want to... | Command | Example |
|--------------|---------|---------|
| Convert units | `convert` | `convert "5 meters" --to feet` |
| Unit math | `calc` | `calc "10 m/s * 5 s"` |
| Check dimensions | `check` | `check newton --against "kg * m / s^2"` |
| Parse quantity | `parse` | `parse "100 km/h"` |
| Simplify units | `simplify` | `simplify "1 kg*m/s^2"` |

## Commands

### parse
Parse a quantity string into magnitude, units, and dimensionality.
```bash
opc-run -m runtime.harness scripts/pint_compute.py \
    parse "100 km/h"

opc-run -m runtime.harness scripts/pint_compute.py \
    parse "9.8 m/s^2"
```

### convert
Convert a quantity to different units.
```bash
opc-run -m runtime.harness scripts/pint_compute.py \
    convert "5 meters" --to feet

opc-run -m runtime.harness scripts/pint_compute.py \
    convert "100 km/h" --to mph

opc-run -m runtime.harness scripts/pint_compute.py \
    convert "1 atmosphere" --to pascal
```

### calc
Perform unit-aware arithmetic. Operators must be space-separated.
```bash
opc-run -m runtime.harness scripts/pint_compute.py \
    calc "5 m * 3 s"

opc-run -m runtime.harness scripts/pint_compute.py \
    calc "10 m / 2 s"

opc-run -m runtime.harness scripts/pint_compute.py \
    calc "5 meters + 300 cm"
```

### check
Check if two units have compatible dimensions.
```bash
opc-run -m runtime.harness scripts/pint_compute.py \
    check newton --against "kg * m / s^2"

opc-run -m runtime.harness scripts/pint_compute.py \
    check joule --against "kg * m^2 / s^2"
```

### simplify
Simplify compound units to base or compact form.
```bash
opc-run -m runtime.harness scripts/pint_compute.py \
    simplify "1 kg*m/s^2"

opc-run -m runtime.harness scripts/pint_compute.py \
    simplify "1000 m"
```

## Common Unit Domains

| Domain | Examples |
|--------|----------|
| Length | meter, foot, inch, mile, km, yard |
| Time | second, minute, hour, day, year |
| Mass | kg, gram, pound, ounce, ton |
| Velocity | m/s, km/h, mph, knot |
| Energy | joule, calorie, eV, kWh, BTU |
| Force | newton, pound_force, dyne |
| Temperature | kelvin, celsius, fahrenheit |
| Pressure | pascal, bar, atmosphere, psi |
| Power | watt, horsepower |

## Output Format

All commands return JSON with relevant fields:

```json
{
  "result": "16.4042 foot",
  "magnitude": 16.4042,
  "units": "foot",
  "dimensionality": "[length]",
  "latex": "16.4042\\,\\mathrm{ft}"
}
```

## Error Handling

Dimensionality errors are caught and reported:
```bash
# This will error - incompatible dimensions
opc-run -m runtime.harness scripts/pint_compute.py \
    convert "5 meters" --to kg
# Error: Cannot convert '[length]' to '[mass]'
```

## Related Skills

- /math-mode - Full math orchestration (SymPy + Z3)
- /sympy-compute - Symbolic computation
