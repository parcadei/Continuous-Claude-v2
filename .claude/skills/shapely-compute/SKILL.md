---
name: shapely-compute
description: Computational geometry with Shapely - create geometries, boolean operations, measurements, predicates
triggers:
  [
    "geometry",
    "polygon",
    "intersection",
    "area",
    "contains",
    "distance between points",
    "buffer",
    "convex hull",
    "centroid",
    "WKT",
  ]
---

# Computational Geometry with Shapely

## When to Use

- Creating geometric shapes (points, lines, polygons)
- Boolean operations (intersection, union, difference)
- Spatial predicates (contains, intersects, within)
- Measurements (area, length, distance, centroid)
- Geometry transformations (translate, rotate, scale)
- Validating and fixing invalid geometries

## Quick Reference

| I want to...    | Command               | Example                                                   |
| --------------- | --------------------- | --------------------------------------------------------- |
| Create geometry | `create`              | `create polygon --coords "0,0 1,0 1,1 0,1"`               |
| Intersection    | `op intersection`     | `op intersection --g1 "POLYGON(...)" --g2 "POLYGON(...)"` |
| Check contains  | `pred contains`       | `pred contains --g1 "POLYGON(...)" --g2 "POINT(0.5 0.5)"` |
| Calculate area  | `measure area`        | `measure area --geom "POLYGON(...)"`                      |
| Distance        | `distance`            | `distance --g1 "POINT(0 0)" --g2 "POINT(3 4)"`            |
| Transform       | `transform translate` | `transform translate --geom "..." --params "1,2"`         |
| Validate        | `validate`            | `validate --geom "POLYGON(...)"`                          |

## Commands

### create

Create geometric objects from coordinates.

```bash
# Point
uv run python scripts/shapely_compute.py create point --coords "1,2"

# Line (2+ points)
uv run python scripts/shapely_compute.py create line --coords "0,0 1,1 2,0"

# Polygon (3+ points, auto-closes)
uv run python scripts/shapely_compute.py create polygon --coords "0,0 1,0 1,1 0,1"

# Polygon with hole
uv run python scripts/shapely_compute.py create polygon --coords "0,0 10,0 10,10 0,10" --holes "2,2 8,2 8,8 2,8"

# MultiPoint
uv run python scripts/shapely_compute.py create multipoint --coords "0,0 1,1 2,2"

# MultiLineString (pipe-separated lines)
uv run python scripts/shapely_compute.py create multilinestring --coords "0,0 1,1|2,2 3,3"

# MultiPolygon (pipe-separated polygons)
uv run python scripts/shapely_compute.py create multipolygon --coords "0,0 1,0 1,1 0,1|2,2 3,2 3,3 2,3"
```

### op (operations)

Boolean geometry operations.

```bash
# Intersection of two polygons
uv run python scripts/shapely_compute.py op intersection \
    --g1 "POLYGON((0 0,2 0,2 2,0 2,0 0))" \
    --g2 "POLYGON((1 1,3 1,3 3,1 3,1 1))"

# Union
uv run python scripts/shapely_compute.py op union --g1 "POLYGON(...)" --g2 "POLYGON(...)"

# Difference (g1 - g2)
uv run python scripts/shapely_compute.py op difference --g1 "POLYGON(...)" --g2 "POLYGON(...)"

# Symmetric difference (XOR)
uv run python scripts/shapely_compute.py op symmetric_difference --g1 "..." --g2 "..."

# Buffer (expand/erode)
uv run python scripts/shapely_compute.py op buffer --g1 "POINT(0 0)" --g2 "1.5"

# Convex hull
uv run python scripts/shapely_compute.py op convex_hull --g1 "MULTIPOINT((0 0),(1 1),(0 2),(2 0))"

# Envelope (bounding box)
uv run python scripts/shapely_compute.py op envelope --g1 "POLYGON(...)"

# Simplify (reduce points)
uv run python scripts/shapely_compute.py op simplify --g1 "LINESTRING(...)" --g2 "0.5"
```

### pred (predicates)

Spatial relationship tests (returns boolean).

```bash
# Does polygon contain point?
uv run python scripts/shapely_compute.py pred contains \
    --g1 "POLYGON((0 0,2 0,2 2,0 2,0 0))" \
    --g2 "POINT(1 1)"

# Do geometries intersect?
uv run python scripts/shapely_compute.py pred intersects --g1 "..." --g2 "..."

# Is g1 within g2?
uv run python scripts/shapely_compute.py pred within --g1 "POINT(1 1)" --g2 "POLYGON(...)"

# Do geometries touch (share boundary)?
uv run python scripts/shapely_compute.py pred touches --g1 "..." --g2 "..."

# Do geometries cross?
uv run python scripts/shapely_compute.py pred crosses --g1 "LINESTRING(...)" --g2 "LINESTRING(...)"

# Are geometries disjoint (no intersection)?
uv run python scripts/shapely_compute.py pred disjoint --g1 "..." --g2 "..."

# Do geometries overlap?
uv run python scripts/shapely_compute.py pred overlaps --g1 "..." --g2 "..."

# Are geometries equal?
uv run python scripts/shapely_compute.py pred equals --g1 "..." --g2 "..."

# Does g1 cover g2?
uv run python scripts/shapely_compute.py pred covers --g1 "..." --g2 "..."

# Is g1 covered by g2?
uv run python scripts/shapely_compute.py pred covered_by --g1 "..." --g2 "..."
```

### measure

Geometric measurements.

```bash
# Area (polygons)
uv run python scripts/shapely_compute.py measure area --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))"

# Length (lines, polygon perimeter)
uv run python scripts/shapely_compute.py measure length --geom "LINESTRING(0 0,3 4)"

# Centroid
uv run python scripts/shapely_compute.py measure centroid --geom "POLYGON((0 0,2 0,2 2,0 2,0 0))"

# Bounds (minx, miny, maxx, maxy)
uv run python scripts/shapely_compute.py measure bounds --geom "POLYGON(...)"

# Exterior ring (polygon only)
uv run python scripts/shapely_compute.py measure exterior_ring --geom "POLYGON(...)"

# All measurements at once
uv run python scripts/shapely_compute.py measure all --geom "POLYGON((0 0,2 0,2 2,0 2,0 0))"
```

### distance

Distance between geometries.

```bash
uv run python scripts/shapely_compute.py distance --g1 "POINT(0 0)" --g2 "POINT(3 4)"
# Returns: {"distance": 5.0, "g1_type": "Point", "g2_type": "Point"}
```

### transform

Affine transformations.

```bash
# Translate (move)
uv run python scripts/shapely_compute.py transform translate \
    --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))" --params "5,10"
# params: dx,dy or dx,dy,dz

# Rotate (degrees, around centroid by default)
uv run python scripts/shapely_compute.py transform rotate \
    --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))" --params "45"
# params: angle or angle,origin_x,origin_y

# Scale (from centroid by default)
uv run python scripts/shapely_compute.py transform scale \
    --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))" --params "2,2"
# params: sx,sy or sx,sy,origin_x,origin_y

# Skew
uv run python scripts/shapely_compute.py transform skew \
    --geom "POLYGON(...)" --params "15,0"
# params: xs,ys (degrees)
```

### validate / makevalid

Check and fix geometry validity.

```bash
# Check if valid
uv run python scripts/shapely_compute.py validate --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))"
# Returns: {"is_valid": true, "type": "Polygon", ...}

# Fix invalid geometry (self-intersecting, etc.)
uv run python scripts/shapely_compute.py makevalid --geom "POLYGON((0 0,2 2,2 0,0 2,0 0))"
```

### coords

Extract coordinates from geometry.

```bash
uv run python scripts/shapely_compute.py coords --geom "POLYGON((0 0,1 0,1 1,0 1,0 0))"
# Returns: {"coords": [[0,0],[1,0],[1,1],[0,1],[0,0]], "type": "Polygon"}
```

### fromwkt

Parse WKT and get geometry information.

```bash
uv run python scripts/shapely_compute.py fromwkt "POLYGON((0 0,1 0,1 1,0 1,0 0))"
# Returns: {"type": "Polygon", "bounds": [...], "area": 1.0, ...}
```

## Geometry Types

- `point` - Single coordinate (x, y) or (x, y, z)
- `line`/`linestring` - Sequence of connected points
- `polygon` - Closed shape with optional holes
- `multipoint`, `multilinestring`, `multipolygon` - Collections

## Input Formats

- **Coordinates string**: `"0,0 1,0 1,1 0,1"` (space-separated x,y pairs)
- **WKT**: `"POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))"`

## Output Format

All commands return JSON with:

- `wkt`: WKT representation of result geometry
- `type`: Geometry type (Point, LineString, Polygon, etc.)
- `bounds`: (minx, miny, maxx, maxy)
- `is_valid`, `is_empty`: Validity flags
- Measurement-specific fields (area, length, distance, etc.)

## Common Use Cases

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

## Related Skills

- `/math-mode` - Full math orchestration (SymPy, Z3)
- `/math-plot` - Visualization with matplotlib
