# Mathematical Computation and Formal Verification

Continuous Claude provides a complete mathematical stack combining symbolic computation, constraint solving, unit arithmetic, computational geometry, and machine-verified proofs.

## Overview

The math capabilities span two domains:

1. **Computation** - Solve equations, prove inequalities, convert units, perform geometric calculations
2. **Formal Verification** - Machine-verified mathematical proofs using Lean 4

## Quick Navigation

| Need            | Tool        | Section                                                   |
| --------------- | ----------- | --------------------------------------------------------- |
| Formal proof    | `/prove`    | [Formal Verification](#formal-verification)               |
| Solve equations | SymPy       | [Symbolic Math](#symbolic-math-sympy)                     |
| Prove theorems  | Z3          | [Constraint Solving](#constraint-solving-z3)              |
| Convert units   | Pint        | [Unit Computation](#unit-computation-pint)                |
| Geometry        | Shapely     | [Computational Geometry](#computational-geometry-shapely) |
| Auto-route      | Math Router | [Unified Entry Point](#unified-entry-point)               |

---

## Formal Verification

Machine-verified mathematical proofs using Lean 4 and Mathlib. For mathematicians who want verified proofs without learning Lean syntax.

### Usage

```
/prove every group homomorphism preserves identity
/prove Monsky's theorem
/prove continuous functions on compact sets are uniformly continuous
```

### The 5-Phase Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  RESEARCH → DESIGN → TEST → IMPLEMENT → VERIFY              │
└─────────────────────────────────────────────────────────────┘
```

#### Phase 1: RESEARCH

**Goal:** Understand if and how this can be formalized.

1. **Search Mathlib** - Is this already formalized?

   ```bash
   grep -r "theorem_name" ~/.elan/toolchains/*/lib/lean4/library/
   ```

2. **Search External** - What's the known proof strategy?
   - Use Nia MCP if available: `mcp__nia__search`
   - Use Perplexity MCP if available: `mcp__perplexity__search`
   - Fall back to WebSearch for papers/references
   - Check for existing formalizations (Coq, Isabelle)

3. **Identify Obstacles**
   - What lemmas are NOT in Mathlib?
   - Does proof require axioms beyond ZFC?
   - Is the statement even true? (search for counterexamples)

**Output:** Brief summary of proof strategy and obstacles

**CHECKPOINT:** If obstacles found, workflow pauses for user decision:

- "This requires [X]. Options: (a) restricted version, (b) accept axiom, (c) abort"

#### Phase 2: DESIGN

**Goal:** Build proof structure before filling details.

Create Lean file with:

- Imports
- Definitions needed
- Main theorem statement
- Helper lemmas as `sorry` placeholders

Annotate each sorry:

```lean
-- SORRY: needs proof (straightforward)
-- SORRY: needs proof (complex - ~50 lines)
-- AXIOM CANDIDATE: v₂ constraint - will test in Phase 3
```

Verify skeleton compiles (with sorries).

**Output:** `proofs/<theorem_name>.lean` with annotated structure

#### Phase 3: TEST

**Goal:** Catch false lemmas BEFORE trying to prove them.

For each AXIOM CANDIDATE sorry:

1. Generate test cases

   ```lean
   #eval testLemma (randomInput1)  -- should return true
   #eval testLemma (randomInput2)  -- should return true
   ```

2. Run tests

   ```bash
   lake env lean test_lemmas.lean
   ```

3. If counterexample found - report and pause for user input

**CHECKPOINT:** Only proceed if all axiom candidates pass testing.

#### Phase 4: IMPLEMENT

**Goal:** Complete the proofs.

Standard iteration loop:

1. Pick a sorry
2. Write proof attempt
3. Compiler-in-the-loop checks (hook fires automatically)
4. If error, Godel-Prover suggests fixes
5. Iterate until sorry is filled
6. Repeat for all sorries

**Tools active:**

- compiler-in-the-loop hook (on every Write)
- Godel-Prover suggestions (on errors)

#### Phase 5: VERIFY

**Goal:** Confirm proof quality.

1. **Axiom Audit**

   ```bash
   lake build && grep "depends on axioms" output
   ```

   - Standard: propext, Classical.choice, Quot.sound (acceptable)
   - Custom axioms: LIST EACH ONE

2. **Sorry Count**

   ```bash
   grep -c "sorry" proofs/<file>.lean
   ```

   - Must be 0 for "complete" proof

3. **Generate Summary**

### Example Output

```
┌─────────────────────────────────────────────────────┐
│ ✓ MACHINE VERIFIED                                  │
│                                                     │
│ Theorem: ∀ φ : G →* H, φ(1_G) = 1_H                │
│                                                     │
│ Proof Strategy: Direct application of              │
│ MonoidHom.map_one from Mathlib.                    │
│                                                     │
│ Phases:                                             │
│   Research: Found in Mathlib.Algebra.Group.Hom     │
│   Design: Single lemma, no sorries needed          │
│   Test: N/A (trivial)                              │
│   Implement: 3 lines                               │
│   Verify: 0 custom axioms, 0 sorries               │
│                                                     │
│ File: proofs/group_hom_identity.lean               │
└─────────────────────────────────────────────────────┘
```

### What Can Be Proven

| Domain           | Examples                                           |
| ---------------- | -------------------------------------------------- |
| Category Theory  | Functors, natural transformations, Yoneda lemma    |
| Abstract Algebra | Groups, rings, homomorphisms, field extensions     |
| Topology         | Continuity, compactness, connectedness             |
| Analysis         | Limits, derivatives, integrals, uniform continuity |
| Logic            | Propositional, first-order, proof theory           |

### Research Tool Priority

The workflow uses available tools in priority order:

| Tool                | Best For                    |
| ------------------- | --------------------------- |
| Mathlib grep/loogle | Existing formalizations     |
| Nia MCP             | Library documentation       |
| Perplexity MCP      | Proof strategies, papers    |
| WebSearch           | General references          |
| WebFetch            | Specific paper/page content |

If no search tools available, workflow proceeds with caution and notes "research phase skipped".

### Checkpoints

The workflow pauses for user input when:

- Research finds obstacles requiring decisions
- Testing finds counterexamples
- Implementation hits unfillable sorry after N attempts

### Requirements

- **Lean 4.26.0** - Theorem prover
- **Mathlib** - 100K+ formalized theorems
- **Godel-Prover** (optional) - AI tactic suggestions via LM Studio
  - Download Godel-Prover model
  - Run with LM Studio on `http://localhost:1234`
  - Provides tactic suggestions on compiler errors
- **compiler-in-the-loop hook** - Automatic verification on every write

### Limitations

- Complex proofs may take multiple iterations
- Novel research-level proofs may exceed capabilities
- Some statements require axioms beyond standard ZFC

---

## Symbolic Math (SymPy)

Exact symbolic computation for algebra, calculus, and discrete mathematics.

### Command Structure

```bash
uv run python opc/scripts/sympy_compute.py <command> <args>
```

### Algebra

#### Solve Equations

```bash
# Single equation
uv run python opc/scripts/sympy_compute.py solve "x**2 - 4 = 0" --var x --domain real

# System of equations
uv run python opc/scripts/sympy_compute.py solve "x + y = 5, x - y = 1" --var x y

# Polynomial
uv run python opc/scripts/sympy_compute.py solve "x**3 - 6*x**2 + 11*x - 6" --var x
```

#### Simplify Expressions

```bash
# Trig simplification
uv run python opc/scripts/sympy_compute.py simplify "sin(x)**2 + cos(x)**2" --strategy trig

# Algebraic
uv run python opc/scripts/sympy_compute.py simplify "(x**2 - 1)/(x - 1)"

# Expand
uv run python opc/scripts/sympy_compute.py simplify "(x + 1)**3" --strategy expand
```

#### Factor

```bash
# Polynomial
uv run python opc/scripts/sympy_compute.py factor "x**2 - 5*x + 6"

# Integer factorization
uv run python opc/scripts/sympy_compute.py factorint 12345
```

### Calculus

#### Differentiate

```bash
# First derivative
uv run python opc/scripts/sympy_compute.py diff "x**3" --var x

# Higher order
uv run python opc/scripts/sympy_compute.py diff "sin(x)" --var x --order 3

# Partial derivatives
uv run python opc/scripts/sympy_compute.py diff "x**2 + y**2" --var x
```

#### Integrate

```bash
# Indefinite integral
uv run python opc/scripts/sympy_compute.py integrate "sin(x)" --var x

# Definite integral
uv run python opc/scripts/sympy_compute.py integrate "x**2" --var x --bounds 0 1

# Multiple variables
uv run python opc/scripts/sympy_compute.py integrate "x*y" --var x y --bounds "x:0:1,y:0:x"
```

#### Limits

```bash
# Basic limit
uv run python opc/scripts/sympy_compute.py limit "sin(x)/x" --var x --point 0

# Limit at infinity
uv run python opc/scripts/sympy_compute.py limit "(1 + 1/x)**x" --var x --point oo

# One-sided limit
uv run python opc/scripts/sympy_compute.py limit "1/x" --var x --point 0 --direction "+"
```

#### Series Expansion

```bash
# Taylor series
uv run python opc/scripts/sympy_compute.py series "exp(x)" --var x --point 0 --n 5

# Around arbitrary point
uv run python opc/scripts/sympy_compute.py series "log(x)" --var x --point 1 --n 4
```

#### Differential Equations

```bash
# ODE
uv run python opc/scripts/sympy_compute.py dsolve "f''(x) + f(x)" --func f --var x

# With initial conditions
uv run python opc/scripts/sympy_compute.py dsolve "f'(x) - f(x)" --func f --var x --ics "f(0):1"
```

### Linear Algebra

#### Matrix Operations

```bash
# Determinant
uv run python opc/scripts/sympy_compute.py det "[[1,2],[3,4]]"

# Eigenvalues
uv run python opc/scripts/sympy_compute.py eigenvalues "[[2,1],[1,2]]"

# Eigenvectors
uv run python opc/scripts/sympy_compute.py eigenvectors "[[2,1],[1,2]]"

# Inverse
uv run python opc/scripts/sympy_compute.py inverse "[[1,2],[3,4]]"

# Row echelon form
uv run python opc/scripts/sympy_compute.py rref "[[1,2,3],[4,5,6]]"

# Rank
uv run python opc/scripts/sympy_compute.py rank "[[1,2,3],[4,5,6]]"

# Nullspace
uv run python opc/scripts/sympy_compute.py nullspace "[[1,2],[2,4]]"

# Characteristic polynomial
uv run python opc/scripts/sympy_compute.py charpoly "[[2,1],[1,2]]" --var lambda
```

#### Solve Linear Systems

```bash
# Ax = b
uv run python opc/scripts/sympy_compute.py linsolve "[[1,2],[3,4]]" "[5,6]"
```

### Number Theory

```bash
# Prime factorization
uv run python opc/scripts/sympy_compute.py factorint 360

# Primality test
uv run python opc/scripts/sympy_compute.py isprime 97

# GCD
uv run python opc/scripts/sympy_compute.py gcd 48 180

# LCM
uv run python opc/scripts/sympy_compute.py lcm 12 18

# Modular inverse
uv run python opc/scripts/sympy_compute.py modinverse 3 11
```

### Combinatorics

```bash
# Binomial coefficient C(n,k)
uv run python opc/scripts/sympy_compute.py binomial 10 3

# Factorial
uv run python opc/scripts/sympy_compute.py factorial 5

# Permutations P(n,k)
uv run python opc/scripts/sympy_compute.py permutation 10 3

# Integer partitions
uv run python opc/scripts/sympy_compute.py partition 5

# Catalan numbers
uv run python opc/scripts/sympy_compute.py catalan 5

# Bell numbers
uv run python opc/scripts/sympy_compute.py bell 5
```

---

## Constraint Solving (Z3)

SMT solver for constraint satisfaction, theorem proving, and optimization.

### Command Structure

```bash
uv run python opc/scripts/z3_solve.py <command> <args>
```

### Satisfiability

Check if constraints are satisfiable and find models.

```bash
# Basic SAT
uv run python opc/scripts/z3_solve.py sat "x > 0, x < 10, x*x == 49" --type int

# Boolean constraints
uv run python opc/scripts/z3_solve.py sat "a || b, !a || c, !b || !c" --type bool

# Mixed types
uv run python opc/scripts/z3_solve.py sat "x + y > 10, x > 0, y > 0" --type int
```

**Output:** Returns `sat` or `unsat`, plus model if satisfiable.

### Theorem Proving

Prove statements are always true.

```bash
# Commutativity
uv run python opc/scripts/z3_solve.py prove "x + y == y + x" --vars x y --type int

# Inequality
uv run python opc/scripts/z3_solve.py prove "x**2 + y**2 >= 2*x*y" --vars x y --type real

# Logical implication
uv run python opc/scripts/z3_solve.py prove "(a && b) => (a || b)" --vars a b --type bool
```

**Output:** Returns `proved` or `counterexample`.

### Optimization

Find min/max values subject to constraints.

```bash
# Maximize objective
uv run python opc/scripts/z3_solve.py optimize "x + y" \
  --constraints "x >= 0, y >= 0, x + y <= 100" \
  --direction maximize --type real

# Minimize with multiple constraints
uv run python opc/scripts/z3_solve.py optimize "x**2 + y**2" \
  --constraints "x + y >= 10, x >= 0, y >= 0" \
  --direction minimize --type real
```

**Output:** Returns optimal value and variable assignments.

### Examples

#### Puzzle Solving

```bash
# Sudoku constraint checking
uv run python opc/scripts/z3_solve.py sat \
  "x1 != x2, x1 != x3, x2 != x3, x1 + x2 + x3 == 6" \
  --type int
```

#### Verification

```bash
# Check invariant holds
uv run python opc/scripts/z3_solve.py prove \
  "(x > 0 && y > 0) => (x + y > 0)" \
  --vars x y --type int
```

---

## Unit Computation (Pint)

Unit-aware arithmetic with automatic conversions and dimensional analysis.

### Command Structure

```bash
uv run python opc/scripts/pint_compute.py <command> <args>
```

### Convert Units

```bash
# Length
uv run python opc/scripts/pint_compute.py convert "5 meters" --to feet

# Speed
uv run python opc/scripts/pint_compute.py convert "100 km/h" --to mph

# Pressure
uv run python opc/scripts/pint_compute.py convert "1 atmosphere" --to pascal

# Energy
uv run python opc/scripts/pint_compute.py convert "1000 calories" --to joules

# Temperature
uv run python opc/scripts/pint_compute.py convert "98.6 fahrenheit" --to celsius
```

### Unit Arithmetic

```bash
# Multiply (velocity × time = distance)
uv run python opc/scripts/pint_compute.py calc "10 m/s * 5 s"

# Divide (distance / time = velocity)
uv run python opc/scripts/pint_compute.py calc "100 meters / 10 seconds"

# Add compatible units
uv run python opc/scripts/pint_compute.py calc "5 meters + 300 cm"

# Force calculation
uv run python opc/scripts/pint_compute.py calc "10 kg * 9.8 m/s^2"
```

### Check Dimensional Compatibility

```bash
# Verify Newton = kg⋅m/s²
uv run python opc/scripts/pint_compute.py check newton --against "kg * m / s^2"

# Verify Joule = kg⋅m²/s²
uv run python opc/scripts/pint_compute.py check joule --against "kg * m^2 / s^2"
```

### Parse Quantities

```bash
# Extract magnitude, units, dimensionality
uv run python opc/scripts/pint_compute.py parse "100 km/h"

# Parse compound units
uv run python opc/scripts/pint_compute.py parse "9.8 m/s^2"
```

### Simplify Units

```bash
# Simplify to base units
uv run python opc/scripts/pint_compute.py simplify "1 kg*m/s^2"
# Result: 1 newton

# Simplify to compact form
uv run python opc/scripts/pint_compute.py simplify "1000 m"
# Result: 1 km
```

### Common Unit Domains

| Domain      | Examples                          |
| ----------- | --------------------------------- |
| Length      | meter, foot, inch, mile, km, yard |
| Time        | second, minute, hour, day, year   |
| Mass        | kg, gram, pound, ounce, ton       |
| Velocity    | m/s, km/h, mph, knot              |
| Energy      | joule, calorie, eV, kWh, BTU      |
| Force       | newton, pound_force, dyne         |
| Temperature | kelvin, celsius, fahrenheit       |
| Pressure    | pascal, bar, atmosphere, psi      |
| Power       | watt, horsepower                  |

### Error Handling

Dimensionality errors are caught automatically:

```bash
# This will error - incompatible dimensions
uv run python opc/scripts/pint_compute.py convert "5 meters" --to kg
# Error: Cannot convert '[length]' to '[mass]'
```

---

## Computational Geometry (Shapely)

Create and analyze geometric shapes with boolean operations, measurements, and spatial predicates.

### Command Structure

```bash
uv run python opc/scripts/shapely_compute.py <command> <args>
```

### Create Geometries

```bash
# Point
uv run python opc/scripts/shapely_compute.py create point --coords "1,2"

# Line (2+ points)
uv run python opc/scripts/shapely_compute.py create line --coords "0,0 1,1 2,0"

# Polygon (auto-closes)
uv run python opc/scripts/shapely_compute.py create polygon --coords "0,0 1,0 1,1 0,1"

# Polygon with hole
uv run python opc/scripts/shapely_compute.py create polygon \
  --coords "0,0 10,0 10,10 0,10" \
  --holes "2,2 8,2 8,8 2,8"

# MultiPoint
uv run python opc/scripts/shapely_compute.py create multipoint --coords "0,0 1,1 2,2"
```

### Boolean Operations

```bash
# Intersection
uv run python opc/scripts/shapely_compute.py op intersection \
  --g1 "POLYGON((0 0,2 0,2 2,0 2,0 0))" \
  --g2 "POLYGON((1 1,3 1,3 3,1 3,1 1))"

# Union
uv run python opc/scripts/shapely_compute.py op union \
  --g1 "POLYGON((0 0,1 0,1 1,0 1,0 0))" \
  --g2 "POLYGON((0.5 0.5,1.5 0.5,1.5 1.5,0.5 1.5,0.5 0.5))"

# Difference (g1 - g2)
uv run python opc/scripts/shapely_compute.py op difference \
  --g1 "POLYGON((0 0,2 0,2 2,0 2,0 0))" \
  --g2 "POLYGON((1 1,3 1,3 3,1 3,1 1))"

# Buffer (expand/erode)
uv run python opc/scripts/shapely_compute.py op buffer \
  --g1 "POINT(0 0)" --g2 "1.5"

# Convex hull
uv run python opc/scripts/shapely_compute.py op convex_hull \
  --g1 "MULTIPOINT((0 0),(1 1),(0 2),(2 0))"

# Envelope (bounding box)
uv run python opc/scripts/shapely_compute.py op envelope \
  --g1 "LINESTRING(0 0,1 3,2 1)"

# Simplify (reduce points)
uv run python opc/scripts/shapely_compute.py op simplify \
  --g1 "LINESTRING(0 0,0.1 0.05,0.2 0.1,1 1)" --g2 "0.1"
```

### Spatial Predicates

Boolean tests for spatial relationships.

```bash
# Contains
uv run python opc/scripts/shapely_compute.py pred contains \
  --g1 "POLYGON((0 0,2 0,2 2,0 2,0 0))" \
  --g2 "POINT(1 1)"

# Intersects
uv run python opc/scripts/shapely_compute.py pred intersects \
  --g1 "LINESTRING(0 0,2 2)" \
  --g2 "LINESTRING(0 2,2 0)"

# Within
uv run python opc/scripts/shapely_compute.py pred within \
  --g1 "POINT(1 1)" \
  --g2 "POLYGON((0 0,2 0,2 2,0 2,0 0))"

# Touches (share boundary)
uv run python opc/scripts/shapely_compute.py pred touches \
  --g1 "POLYGON((0 0,1 0,1 1,0 1,0 0))" \
  --g2 "POLYGON((1 0,2 0,2 1,1 1,1 0))"

# Disjoint (no intersection)
uv run python opc/scripts/shapely_compute.py pred disjoint \
  --g1 "POINT(0 0)" \
  --g2 "POINT(5 5)"
```

### Measurements

```bash
# Area (polygons)
uv run python opc/scripts/shapely_compute.py measure area \
  --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))"

# Length (lines, perimeter)
uv run python opc/scripts/shapely_compute.py measure length \
  --geom "LINESTRING(0 0,3 4)"

# Centroid
uv run python opc/scripts/shapely_compute.py measure centroid \
  --geom "POLYGON((0 0,2 0,2 2,0 2,0 0))"

# Bounds (minx, miny, maxx, maxy)
uv run python opc/scripts/shapely_compute.py measure bounds \
  --geom "POLYGON((1 1,3 1,3 3,1 3,1 1))"

# All measurements
uv run python opc/scripts/shapely_compute.py measure all \
  --geom "POLYGON((0 0,2 0,2 2,0 2,0 0))"
```

### Distance

```bash
# Distance between geometries
uv run python opc/scripts/shapely_compute.py distance \
  --g1 "POINT(0 0)" --g2 "POINT(3 4)"
# Result: 5.0
```

### Transformations

```bash
# Translate (move)
uv run python opc/scripts/shapely_compute.py transform translate \
  --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))" --params "5,10"

# Rotate (degrees, around centroid)
uv run python opc/scripts/shapely_compute.py transform rotate \
  --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))" --params "45"

# Scale (from centroid)
uv run python opc/scripts/shapely_compute.py transform scale \
  --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))" --params "2,2"

# Skew
uv run python opc/scripts/shapely_compute.py transform skew \
  --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))" --params "15,0"
```

### Validation

```bash
# Check validity
uv run python opc/scripts/shapely_compute.py validate \
  --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))"

# Fix invalid geometry
uv run python opc/scripts/shapely_compute.py makevalid \
  --geom "POLYGON((0 0,2 2,2 0,0 2,0 0))"
```

### Common Use Cases

| Use Case            | Command                           |
| ------------------- | --------------------------------- |
| Collision detection | `pred intersects`                 |
| Point-in-polygon    | `pred contains`                   |
| Area calculation    | `measure area`                    |
| Buffer zones        | `op buffer`                       |
| Shape combination   | `op union`                        |
| Shape subtraction   | `op difference`                   |
| Bounding box        | `op envelope` or `measure bounds` |
| Simplify path       | `op simplify`                     |

### Input Formats

- **Coordinates string**: `"0,0 1,0 1,1 0,1"` (space-separated x,y pairs)
- **WKT**: `"POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))"`

### Output Format

All commands return JSON with:

- `wkt`: WKT representation
- `type`: Geometry type
- `bounds`: (minx, miny, maxx, maxy)
- `is_valid`, `is_empty`: Validity flags
- Measurement-specific fields

---

## Unified Entry Point

The `/math` skill provides automatic routing to the right tool.

### Usage

```
/math solve x² - 4 = 0
/math integrate sin(x) from 0 to π
/math convert 5 miles to km
/math is x² + 1 > 0 for all x?
```

### Routing Logic

| Your Request                      | Routes To               |
| --------------------------------- | ----------------------- |
| "solve", "calculate", "compute"   | SymPy (exact symbolic)  |
| "is X always true?"               | Z3 (constraint proving) |
| "convert units"                   | Pint                    |
| "area", "polygon", "intersection" | Shapely                 |
| "prove formally"                  | Redirects to `/prove`   |

### Auto-Route Script

```bash
# Get the exact command to run
uv run python opc/scripts/math_router.py route "solve x^2 - 5x + 6 = 0"
```

Returns the appropriate script and arguments.

---

## Complete Example Workflows

### Example 1: Physics Problem

Calculate force, convert units, verify dimensionality.

```bash
# Calculate force (F = ma)
uv run python opc/scripts/pint_compute.py calc "10 kg * 9.8 m/s^2"
# Result: 98 newton

# Convert to pound-force
uv run python opc/scripts/pint_compute.py convert "98 newton" --to pound_force
# Result: 22.03 lbf

# Verify dimensionality
uv run python opc/scripts/pint_compute.py check newton --against "kg * m / s^2"
# Result: compatible
```

### Example 2: Geometric Analysis

Create shapes, find intersection, calculate area.

```bash
# Create two overlapping squares
uv run python opc/scripts/shapely_compute.py create polygon \
  --coords "0,0 2,0 2,2 0,2"
# Store WKT as $square1

uv run python opc/scripts/shapely_compute.py create polygon \
  --coords "1,1 3,1 3,3 1,3"
# Store WKT as $square2

# Find intersection
uv run python opc/scripts/shapely_compute.py op intersection \
  --g1 "$square1" --g2 "$square2"
# Store result WKT

# Calculate intersection area
uv run python opc/scripts/shapely_compute.py measure area --geom "$result"
# Result: 1.0 square units
```

### Example 3: Mathematical Proof

Prove inequality using symbolic and constraint methods.

```bash
# Symbolic verification (SymPy)
uv run python opc/scripts/sympy_compute.py simplify "(x-y)**2" --strategy expand
# Result: x^2 - 2*x*y + y^2

# Constraint solver verification (Z3)
uv run python opc/scripts/z3_solve.py prove "x**2 + y**2 >= 2*x*y" --vars x y --type real
# Result: PROVED (equivalent to (x-y)^2 >= 0)
```

### Example 4: Formal Verification

Machine-verify a theorem about groups.

```
/prove every group homomorphism preserves identity

Phase 1: Research
- Found MonoidHom.map_one in Mathlib.Algebra.Group.Hom

Phase 2: Design
- Single lemma, imports Mathlib.Algebra.Group.Hom

Phase 3: Test
- N/A (trivial from Mathlib)

Phase 4: Implement
theorem group_hom_identity {G H : Type*} [Group G] [Group H]
  (φ : G →* H) : φ 1 = 1 := by
  exact MonoidHom.map_one φ

Phase 5: Verify
- 0 custom axioms
- 0 sorries
✓ MACHINE VERIFIED
```

---

## Tool Selection Guide

### When to Use Each Tool

| Task                     | Use      | Not                    |
| ------------------------ | -------- | ---------------------- |
| Exact equation solving   | SymPy    | Approximate numeric    |
| Theorem proving (formal) | `/prove` | Z3                     |
| Constraint satisfaction  | Z3       | SymPy                  |
| Unit conversion          | Pint     | Manual calculation     |
| Geometry                 | Shapely  | Manual coordinates     |
| Quick check              | Z3       | Full `/prove` workflow |

### Computation vs Verification

**Computation** (`/math`, SymPy, Z3, Pint, Shapely):

- Get numeric/symbolic results
- Solve equations
- Calculate values
- Check satisfiability

**Formal Verification** (`/prove`):

- Machine-verified proofs
- Publication-quality correctness
- Build on Mathlib theorems
- Export to other proof systems

Use `/math` for calculations. Use `/prove` for rigorous verification.

---

## Requirements and Setup

### SymPy and Z3

```bash
# Install via uv (included in deps)
cd opc && uv sync
```

### Pint and Shapely

```bash
# Already included in standard dependencies
cd opc && uv sync
```

### Lean 4 and Mathlib (for /prove)

```bash
# Install Lean via elan
curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh

# Verify installation
lean --version
# Should show: Lean (version 4.26.0)

# Mathlib is auto-installed when you run /prove
```

### Godel-Prover (optional, for /prove)

For AI-assisted tactic suggestions:

1. Download Godel-Prover model
2. Install LM Studio
3. Load model and start server on `http://localhost:1234`
4. Set environment variable:
   ```bash
   export GODEL_PROVER_URL=http://localhost:1234
   ```

The `/prove` workflow will use Godel-Prover if available, otherwise uses compiler-in-the-loop only.

---

## Performance Characteristics

| Tool     | Speed | Precision        | Best For                   |
| -------- | ----- | ---------------- | -------------------------- |
| SymPy    | Fast  | Exact            | Symbolic algebra, calculus |
| Z3       | Fast  | Exact            | Constraints, SAT, SMT      |
| Pint     | Fast  | Exact            | Unit conversion            |
| Shapely  | Fast  | Floating-point   | Geometric computation      |
| `/prove` | Slow  | Machine-verified | Rigorous proofs            |

---

## Troubleshooting

### SymPy: "Cannot solve equation"

Some equations don't have closed-form solutions. Try:

- Numeric solving with SciPy/NumPy
- Simplify the equation first
- Use Z3 for constraint satisfaction

### Z3: "Unsat" when expected "Sat"

- Check constraints are not contradictory
- Try different type annotations (int vs real)
- Use `--debug` flag for more info

### Pint: "Dimensionality error"

Cannot convert incompatible units. Check:

- Are dimensions compatible? (can't convert length to mass)
- Compound units must match (m/s to km/h works, m/s to kg fails)

### Shapely: "Invalid geometry"

Use `makevalid` to fix:

```bash
uv run python opc/scripts/shapely_compute.py makevalid --geom "<WKT>"
```

### /prove: Lean compilation fails

```bash
# Update Lean
elan update

# Clean and rebuild
cd proofs && lake clean && lake build
```

### /prove: Godel-Prover not connecting

```bash
# Check LM Studio is running
curl http://localhost:1234/health

# Check model loaded
# LM Studio → Model Library → Verify Godel-Prover loaded
```

---

## See Also

- [TLDR CLI](/docs/tools/README.md#tldr-cli) - Code analysis
- [Skills](/docs/skills/) - Workflow automation
- [Hooks](/docs/hooks/) - Lifecycle extensions
