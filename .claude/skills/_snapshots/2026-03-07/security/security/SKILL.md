---
name: security
description: Security audit workflow - vulnerability scan → verification
---

# /security - Security Audit Workflow

Dedicated security analysis for sensitive code.

## When to Use

- "Security audit"
- "Check for vulnerabilities"
- "Is this secure?"
- "Review authentication code"
- "Check for injection attacks"
- Before handling auth, payments, user data
- After adding security-sensitive features

## Workflow Overview

```
┌─────────┐    ┌───────────┐
│  aegis  │───▶│ arbiter  │
│         │    │           │
└─────────┘    └───────────┘
  Security       Verify
  audit          fixes
```

## Agent Sequence

| # | Agent | Role | Output |
|---|-------|------|--------|
| 1 | **aegis** | Comprehensive security scan | Vulnerability report |
| 2 | **arbiter** | Verify fixes, run security tests | Verification report |

## Why Dedicated Security?

The `/review` workflow focuses on code quality. Security needs:
- Specialized vulnerability patterns
- Dependency scanning
- Secret detection
- OWASP Top 10 checks
- Authentication/authorization review

## Execution

### Phase 1: Security Audit

```
Task(
  subagent_type="aegis",
  prompt="""
  Security audit: [SCOPE]

  Scan for:

  **Injection Attacks:**
  - SQL injection
  - Command injection
  - XSS (Cross-Site Scripting)
  - LDAP injection

  **Authentication/Authorization:**
  - Broken authentication
  - Session management issues
  - Privilege escalation
  - Insecure direct object references

  **Data Protection:**
  - Sensitive data exposure
  - Hardcoded secrets/credentials
  - Insecure cryptography
  - Missing encryption

  **Configuration:**
  - Security misconfigurations
  - Default credentials
  - Verbose error messages
  - Missing security headers

  **Dependencies:**
  - Known vulnerable packages
  - Outdated dependencies
  - Supply chain risks

  Output: Detailed report with:
  - Severity (CRITICAL/HIGH/MEDIUM/LOW)
  - Location (file:line)
  - Description
  - Remediation steps
  """
)
```

### Phase 2: Verification (After Fixes)

```
Task(
  subagent_type="arbiter",
  prompt="""
  Verify security fixes: [SCOPE]

  Run:
  - Security-focused tests
  - Dependency audit (npm audit, pip audit)
  - Re-check reported vulnerabilities
  - Verify fixes don't introduce regressions

  Output: Verification report
  """
)
```

## Security Scopes

### Full Codebase
```
User: /security
→ Scan entire codebase
```

### Specific Area
```
User: /security authentication
→ Focus on auth-related code
```

### Single File
```
User: /security src/api/auth.py
→ Deep dive on one file
```

### Dependencies Only
```
User: /security --deps
→ Only dependency vulnerabilities
```

## Example

```
User: /security the payment processing code

Claude: Starting /security audit for payment code...

Phase 1: Security audit...
[Spawns aegis]

┌─────────────────────────────────────────────────────────────┐
│ Security Audit Report                                       │
├─────────────────────────────────────────────────────────────┤
│ Scope: src/services/payment/                                │
│ Files scanned: 12                                           │
│ Lines analyzed: 2,847                                       │
├─────────────────────────────────────────────────────────────┤
│ CRITICAL (1)                                                │
│ ──────────                                                  │
│ [C1] SQL Injection in payment.py:89                         │
│      query = f"SELECT * FROM orders WHERE id = {order_id}"  │
│      Fix: Use parameterized queries                         │
│                                                             │
│ HIGH (2)                                                    │
│ ────────                                                    │
│ [H1] Hardcoded API key in stripe_client.py:12               │
│      STRIPE_KEY = "sk_live_..."                             │
│      Fix: Move to environment variable                      │
│                                                             │
│ [H2] Missing input validation in refund.py:45               │
│      amount = request.json['amount']  # No validation       │
│      Fix: Validate amount is positive number                │
│                                                             │
│ MEDIUM (1)                                                  │
│ ──────────                                                  │
│ [M1] Verbose error messages in error_handler.py:23          │
│      return {"error": str(e)}  # Leaks internal details     │
│      Fix: Return generic message, log details internally    │
│                                                             │
│ LOW (0)                                                     │
│ ───────                                                     │
│ None                                                        │
├─────────────────────────────────────────────────────────────┤
│ Summary: 1 critical, 2 high, 1 medium, 0 low                │
│ Status: BLOCKING - Fix critical issues before release       │
└─────────────────────────────────────────────────────────────┘

Fix the critical and high issues, then run:
/security --verify
```

### After Fixes

```
User: /security --verify

Claude: Phase 2: Verifying fixes...
[Spawns arbiter]

✅ C1: SQL injection fixed - using parameterized queries
✅ H1: API key moved to environment variable
✅ H2: Input validation added
✅ M1: Error messages sanitized

All security tests passing.
Security audit: PASSED
```

## OWASP Top 10 Coverage

| Risk | Checked |
|------|---------|
| A01 Broken Access Control | ✅ |
| A02 Cryptographic Failures | ✅ |
| A03 Injection | ✅ |
| A04 Insecure Design | ✅ |
| A05 Security Misconfiguration | ✅ |
| A06 Vulnerable Components | ✅ |
| A07 Auth Failures | ✅ |
| A08 Data Integrity Failures | ✅ |
| A09 Logging Failures | ✅ |
| A10 SSRF | ✅ |

## Flags

- `--deps`: Dependencies only
- `--verify`: Re-run after fixes
- `--owasp`: Explicit OWASP Top 10 report
- `--secrets`: Focus on secret detection
