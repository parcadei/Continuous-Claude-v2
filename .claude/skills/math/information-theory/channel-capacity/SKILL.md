---
name: channel-capacity
description: "Problem-solving strategies for channel capacity in information theory"
allowed-tools: [Bash, Read]
---

# Channel Capacity

## When to Use

Use this skill when working on channel-capacity problems in information theory.

## Decision Tree

1. **Mutual Information**
   - I(X;Y) = H(X) + H(Y) - H(X,Y)
   - I(X;Y) = H(X) - H(X|Y) = H(Y) - H(Y|X)
   - Symmetric: I(X;Y) = I(Y;X)
   - `scipy.stats.entropy(p) + scipy.stats.entropy(q) - joint_entropy`

2. **Channel Model**
   - Input X, output Y, channel P(Y|X)
   - Channel matrix: rows = inputs, columns = outputs
   - Element (i,j) = P(Y=j | X=i)

3. **Channel Capacity**
   - C = max\_{p(x)} I(X;Y)
   - Maximize over input distribution
   - Achieved by capacity-achieving distribution

4. **Common Channels**
   | Channel | Capacity |
   |---------|----------|
   | Binary Symmetric (BSC) | 1 - H(p) where p = crossover prob |
   | Binary Erasure (BEC) | 1 - epsilon where epsilon = erasure prob |
   | AWGN | 0.5 \* log2(1 + SNR) |

5. **Blahut-Arimoto Algorithm**
   - Iterative algorithm to compute capacity
   - Alternates between optimizing p(x) and p(y|x)
   - Converges to capacity
   - `z3_solve.py prove "capacity_upper_bound"`

## Tool Commands

### Scipy_Mutual_Info

```bash
uv run python -c "from scipy.stats import entropy; p = [0.5, 0.5]; q = [0.6, 0.4]; H_X = entropy(p, base=2); H_Y = entropy(q, base=2); print('H(X)=', H_X, 'H(Y)=', H_Y)"
```

### Sympy_Bsc_Capacity

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "1 + p*log(p, 2) + (1-p)*log(1-p, 2)"
```

### Z3_Capacity_Bound

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "I(X;Y) <= H(X)"
```

## Key Techniques

_From indexed textbooks:_

- [Elements of Information Theory] Elements of Information Theory -- Thomas M* Cover &amp; Joy A* Thomas -- 2\_, Auflage, New York, NY, 2012 -- Wiley-Interscience -- 9780470303153 -- 2fcfe3e8a16b3aeefeaf9429fcf9a513 -- Anna’s Archive. Using a randomly generated code, Shannon showed that one can send information at any rate below the capacity _C_ of the channel with an arbitrarily low probability of error. The idea of a randomly generated code is very unusual.

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
