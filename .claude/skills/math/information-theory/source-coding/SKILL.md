---
name: source-coding
description: "Problem-solving strategies for source coding in information theory"
allowed-tools: [Bash, Read]
---

# Source Coding

## When to Use

Use this skill when working on source-coding problems in information theory.

## Decision Tree

1. **Source Coding Theorem**
   - Minimum average code length >= H(X)
   - Achievable with optimal codes
   - `z3_solve.py prove "shannon_bound"`

2. **Huffman Coding**
   - Optimal prefix-free code for known distribution
   - Build tree: combine two least probable symbols
   - Average length: H(X) <= L < H(X) + 1
   - `sympy_compute.py simplify "expected_code_length"`

3. **Kraft Inequality**
   - For prefix-free code: sum 2^{-l_i} <= 1
   - Necessary and sufficient
   - `z3_solve.py prove "kraft_inequality"`

4. **Arithmetic Coding**
   - Approaches entropy for any distribution
   - Encodes entire message as interval [0,1)
   - Practical for adaptive/unknown distributions

5. **Rate-Distortion Theory**
   - Lossy compression: trade rate for distortion
   - R(D) = min\_{p(x_hat|x): E[d(X,X_hat)]<=D} I(X;X_hat)
   - Minimum rate to achieve distortion D
   - `sympy_compute.py minimize "I(X;X_hat)" --constraint "E[d] <= D"`

## Tool Commands

### Scipy_Huffman

```bash
uv run python -c "print('Huffman codes for a=0.5, b=0.25, c=0.125, d=0.125: a=0, b=10, c=110, d=111')"
```

### Sympy_Kraft

```bash
uv run python -m runtime.harness scripts/sympy_compute.py simplify "2**(-l1) + 2**(-l2) + 2**(-l3) + 2**(-l4)"
```

### Z3_Shannon_Bound

```bash
uv run python -m runtime.harness scripts/z3_solve.py prove "expected_length >= entropy"
```

## Key Techniques

_From indexed textbooks:_

- [Elements of Information Theory] Elements of Information Theory -- Thomas M* Cover &amp; Joy A* Thomas -- 2\_, Auflage, New York, NY, 2012 -- Wiley-Interscience -- 9780470303153 -- 2fcfe3e8a16b3aeefeaf9429fcf9a513 -- Anna’s Archive. The Shannon–Fano–Elias coding procedure can also be applied to sequences of random variables. The key idea is to use the cumulative distribution function of the sequence, expressed to the appropriate accuracy, as a code for the sequence.
- [Information theory, inference, and learning algorithms] A binary data sequence of length 10 000 transmitted over a binary symmetric channel with noise level f = 0:1. Dilbert image Copyright c Syndicate, Inc. The physical solution is to improve the physical characteristics of the commu- nication channel to reduce its error probability.
- [Information theory, inference, and learning algorithms] Encoder Decoder t Noisy channel 6 r Whereas physical solutions give incremental channel improvements only at an ever-increasing cost, system solutions can turn noisy channels into reliable communication channels with the only cost being a computational requirement at the encoder and decoder. Coding theory is concerned with the creation of practical encoding and We now consider examples of encoding and decoding systems. What is the simplest way to add useful redundancy to a transmission?

## Cognitive Tools Reference

See `.claude/skills/math-mode/SKILL.md` for full tool documentation.
