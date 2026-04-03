# Claim Verification Rule

**LESSON LEARNED:** An 80% false claim rate occurred when grep results were trusted without reading files.

## Before Making Existence Claims

When asserting "X exists", "X doesn't exist", or "X has/lacks Y":

### 1. EXISTS Claims

```
WRONG: grep found "try.*catch" in file → "file has error handling"
RIGHT: Read the file, find the try/catch block, confirm it wraps relevant code
```

### 2. DOESN'T EXIST Claims

```
WRONG: grep returned no results → "feature doesn't exist"
RIGHT: Search with Glob, try alternate names, Read likely files to confirm absence
```

### 3. BEHAVIOR Claims

```
WRONG: Found function name in grep → "system does X"
RIGHT: Read the function, trace the logic, understand what it actually does
```

## Confidence Markers

Mark every factual claim about the codebase:

| Marker      | Meaning                        | When to Use                 |
| ----------- | ------------------------------ | --------------------------- |
| ✓ VERIFIED  | Read the file, traced the code | Safe to assert              |
| ? INFERRED  | Based on grep/search pattern   | Must verify before claiming |
| ✗ UNCERTAIN | Haven't checked                | Must investigate            |

## Two-Pass Audit Pattern

When doing system audits or reviews:

**Pass 1: Hypotheses**

```
"I think X might be missing" (? INFERRED)
```

**Pass 2: Verification**

```
Read the actual file
→ Found X at line 42
→ "X exists at file.ts:42" (✓ VERIFIED)
```

## Common False Claim Patterns

| Pattern                        | Why It Fails                             |
| ------------------------------ | ---------------------------------------- |
| `grep -L "pattern"`            | File might use different naming          |
| `grep "error"` returns nothing | Might be called "exception" or "failure" |
| "No files matched"             | Searched wrong directory or extension    |
| Found in comments              | Not actual implementation                |

## Enforcement

The `epistemic-reminder` hook injects warnings after Grep results. Follow them.
