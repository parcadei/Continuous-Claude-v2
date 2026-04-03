---
name: compactness
description: "Problem-solving strategies for compactness in topology"
allowed-tools: [Bash, Read]
---

# Compactness

## When to Use

Use this skill when working on compactness problems in topology.

## Decision Tree

1. **Is X compact?**
   - If X subset R^n: Is X closed AND bounded? (Heine-Borel)
   - If X is metric: Does every sequence have convergent subsequence?
   - General: Does every open cover have finite subcover?
   - `z3_solve.py prove "bounded_and_closed"`

2. **Compactness Tests**
   - Heine-Borel (R^n): closed + bounded = compact
   - Sequential: every sequence has convergent subsequence
   - `sympy_compute.py limit "a_n" --var n` to check convergence

3. **Product Spaces**
   - Tychonoff: product of compact spaces is compact
   - Finite products preserve compactness directly

4. **Consequences of Compactness**
   - Continuous image of compact is compact
   - Continuous real function on compact attains max/min
   - `sympy_compute.py maximum "f(x)" --var x --domain "[a,b]"`

## Tool Commands

### Z3_Bounded_Closed

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "bounded_and_closed"
```

### Sympy_Limit

```bash
uv run python -m runtime.harness scripts/sympy_compute.py limit "a_n" --var n --at oo
```

### Sympy_Maximum

```bash
uv run python -m runtime.harness scripts/sympy_compute.py maximum "f(x)" --var x --domain "[a,b]"
```

## Key Techniques

_From indexed textbooks:_

- [Topology (Munkres, James Raymond) (Z-Library)] CompactSpaces163 164ConnectednessandCompactnessCh. Itisnotasnaturalorintuitiveastheformer;somefamiliaritywithitisneededbeforeitsusefulnessbecomesapparent. AcollectionAofsubsetsofaspaceXissaidtocoverX,ortobeacoveringofX,iftheunionoftheelementsofAisequaltoX.
- [Real Analysis (Halsey L. Royden, Patr... (Z-Library)] If X contains more than one point, show that the only possible extreme points of B have norm 1. If X = Lp[a, b], 1 < p < ∞, show that every unit vector in B is an extreme point of B. If X = L∞[a, b], show that the extreme points of B are those functions f ∈ B such that |f | = 1 almost everywhere on [a, b].
- [Topology (Munkres, James Raymond) (Z-Library)] ShowthatinthenitecomplementtopologyonR,everysubspaceiscom-pact. IfRhasthetopologyconsistingofallsetsAsuchthatR−AiseithercountableorallofR,is[0,1]acompactsubspace? ShowthataniteunionofcompactsubspacesofXiscompact.
- [Real Analysis (Halsey L. Royden, Patr... (Z-Library)] The Eberlein-ˇSmulian Theorem . Metrizability of Weak Topologies . X is reexive; (ii) B is weakly compact; (iii) B is weakly sequentially compact.
- [Topology (Munkres, James Raymond) (Z-Library)] SupposethatYiscompactandA={Aα}α∈JisacoveringofYbysetsopeninX. Thenthecollection{Aα∩Y|α∈J}isacoveringofYbysetsopeninY;henceanitesubcollection{Aα1∩Y,. Aαn}isasubcollectionofAthatcoversY.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
