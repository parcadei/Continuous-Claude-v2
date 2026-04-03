---
name: graph-algorithms
description: "Problem-solving strategies for graph algorithms in graph number theory"
allowed-tools: [Bash, Read]
---

# Graph Algorithms

## When to Use

Use this skill when working on graph-algorithms problems in graph number theory.

## Decision Tree

1. **Traversal selection**
   - BFS: shortest paths (unweighted), level structure
   - DFS: cycle detection, topological sort, SCC

2. **Shortest path algorithms**
   | Algorithm | Use Case | Complexity |
   |-----------|----------|------------|
   | Dijkstra | Non-negative weights | O((V+E) log V) |
   | Bellman-Ford | Negative weights | O(VE) |
   | Floyd-Warshall | All pairs | O(V^3) |

3. **Minimum Spanning Tree**
   - Prim's: dense graphs, greedy from vertex
   - Kruskal's: sparse graphs, union-find
   - `z3_solve.py prove "cut_property"`

4. **Network Flow**
   - Max-flow = min-cut (Ford-Fulkerson)
   - Matching via flow network
   - `sympy_compute.py linsolve "flow_conservation"`

5. **Graph properties**
   - Spectral: eigenvalues of adjacency matrix
   - Connectivity: via DFS/BFS
   - Coloring: greedy or SAT reduction

## Tool Commands

### Sympy_Adjacency

```bash
uv run python -m runtime.harness scripts/sympy_compute.py eigenvalues "adjacency_matrix"
```

### Z3_Dijkstra

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "d[v] >= d[u] + w(u,v) for all edges"
```

### Z3_Mst_Cut

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "min_edge_crossing_cut_in_mst"
```

### Sympy_Flow

```bash
uv run python -m runtime.harness scripts/sympy_compute.py linsolve "flow_conservation_equations"
```

## Key Techniques

_From indexed textbooks:_

- [Graph Theory (Graduate Texts in Mathematics (173))] Given two numerical graph invariants i1 and i2, write i1 i2 if we can force i2 to be arbitrarily high on some subgraph of G by assuming that i1(G) is large enough. Formally: write i1 i2 if there exists a function f : N → N such that, given any k ∈ N, every graph G with i1(G) f (k) has a subgraph H with i2(H) k. If i1 i2 as well as i1 i2, write i1 ∼ i2.
- [Graph Theory (Graduate Texts in Mathematics (173))] Find the smallest integer b = b(k) such that every graph of order n with more than kn + b edges has a (k + 1)-edge- connected subgraph, for every k ∈ N. Show that every tree T has at least Δ(T ) leaves. Show that a tree without a vertex of degree 2 has more leaves than other vertices.
- [Graph Theory (Graduate Texts in Mathematics (173))] For every n > 1, nd a bipartite graph on 2n vertices, ordered in such a way that the greedy algorithm uses n rather than 2 colours. Exercises Consider the following approach to vertex colouring. First, nd a max- imal independent set of vertices and colour these with colour 1; then nd a maximal independent set of vertices in the remaining graph and colour those 2, and so on.
- [Graph Theory (Graduate Texts in Mathematics (173))] Show that, for every r ∈ N, every innite graph of upper density s subgraph for every s ∈ N. Deduce that the upper density of innite graphs can only take r−1 has a K r the countably many values of 0, 1, 1 2 , 2 3 , 3 4 Extremal Graph Theory Given a tree T , nd an upper bound for ex(n, T ) that is linear in n and independent of the structure of T , i. Prove the Erd˝os-S´os conjecture for the case when the tree considered is a star.
- [Graph Theory (Graduate Texts in Mathematics (173))] Colouring Slightly more generally, a class G of graphs is called χ-bounded if there exists a function f : N → N such that χ(G) f (r) for every graph G ⊇ Kr in G. In such graphs, then, we can force a Kr subgraph by making χ larger than f (r). Show that the four colour theorem does indeed solve the map colouring problem stated in the rst sentence of the chapter.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
