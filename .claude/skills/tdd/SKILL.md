---
name: tdd
description: Test-Driven Development workflow
user-invocable: true
---

# Test-Driven Development

Write tests before implementation. Red-Green-Refactor.

## Core Cycle

### 1. RED - Write Failing Test
```bash
# Write test first
# Run it - MUST fail
# Verify it fails for the RIGHT reason
```

### 2. GREEN - Minimal Implementation
```bash
# Write simplest code to pass
# Don't add features beyond test
# Don't refactor yet
```

### 3. REFACTOR - Clean Up
```bash
# Improve code quality
# Keep tests green
# Remove duplication
```

## Guidelines

**DO:**
- Write test BEFORE implementation - no exceptions
- One test per behavior, clear names
- Use real code, minimize mocks
- Run tests frequently

**DON'T:**
- Write code first (if you did, DELETE IT)
- Write tests that pass immediately
- Add untested features
- Mock everything

## Test Naming

```
test_<function>_<scenario>_<expected>

# Examples:
test_login_valid_credentials_returns_token
test_login_invalid_password_raises_error
test_cache_expired_item_returns_none
```

## When Tests Are Hard

Hard to test = design problem. Options:
1. Extract pure function from side effects
2. Dependency injection
3. Simplify the interface

## Quality Check After TDD

```bash
qlty check --fix
```

## References

For test patterns: `cat ref/test-patterns.md`
For framework guides: `cat ref/frameworks.md`
