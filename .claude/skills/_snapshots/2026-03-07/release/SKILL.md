---
name: release
description: Release preparation workflow - security audit → E2E tests → review → changelog → docs
---

# /release - Release Workflow

Structured release preparation to ship with confidence.

## When to Use

- "Prepare a release"
- "Ship version X"
- "Release to production"
- "Cut a release"
- "Ready to deploy"
- Before any production deployment

## Workflow Overview

```
┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌──────────┐    ┌─────────┐
│  aegis  │───▶│  atlas  │───▶│ review-agent │───▶│  herald  │───▶│  scribe │
│         │    │         │    │              │    │          │    │         │
└─────────┘    └─────────┘    └──────────────┘    └──────────┘    └─────────┘
  Security       E2E            Final              Version         Release
  audit          tests          review             bump            notes
```

## Agent Sequence

| # | Agent | Role | Output |
|---|-------|------|--------|
| 1 | **aegis** | Security vulnerability scan | Security report |
| 2 | **atlas** | Run full E2E test suite | Test report |
| 3 | **review-agent** | Final release review | Release approval |
| 4 | **herald** | Version bump, changelog generation | Updated version files |
| 5 | **scribe** | Release notes, documentation | RELEASE.md, docs |

## Why This Order?

1. **Security first**: Catch vulnerabilities before they ship
2. **E2E tests**: Verify full system works end-to-end
3. **Final review**: Human-in-the-loop approval
4. **Version bump**: Only after approval
5. **Documentation**: Ship with proper release notes

## Execution

### Phase 1: Security Audit

```
Task(
  subagent_type="aegis",
  prompt="""
  Security audit for release: [VERSION]

  Scan for:
  - Dependency vulnerabilities (npm audit, pip audit)
  - Hardcoded secrets/credentials
  - SQL injection, XSS, CSRF risks
  - Authentication/authorization issues
  - Insecure configurations

  Output: Security report with severity levels
  """
)
```

### Phase 2: E2E Tests

```
Task(
  subagent_type="atlas",
  prompt="""
  Run E2E tests for release: [VERSION]

  Execute:
  - Full E2E test suite
  - Critical path tests
  - Integration tests
  - Performance benchmarks (if applicable)

  Output: Test report with pass/fail counts
  """
)
```

### Phase 3: Final Review

```
Task(
  subagent_type="review-agent",
  prompt="""
  Final release review: [VERSION]

  Review:
  - Security audit results
  - E2E test results
  - Changes since last release (git log)
  - Breaking changes
  - Migration requirements

  Output: RELEASE_APPROVED or RELEASE_BLOCKED with reasons
  """
)
```

### Phase 4: Version Bump & Changelog

```
Task(
  subagent_type="herald",
  prompt="""
  Prepare release: [VERSION]

  Tasks:
  - Bump version in package.json/pyproject.toml
  - Generate CHANGELOG.md entry
  - Update version constants in code
  - Tag commit (don't push yet)

  Follow semantic versioning.
  """
)
```

### Phase 5: Release Notes

```
Task(
  subagent_type="scribe",
  prompt="""
  Write release notes: [VERSION]

  Include:
  - Summary of changes
  - New features
  - Bug fixes
  - Breaking changes
  - Migration guide (if needed)
  - Contributors

  Output: RELEASE.md or update docs
  """
)
```

## Release Types

### Major Release (Breaking Changes)
```
/release --major
→ Full workflow with migration guide
```

### Minor Release (New Features)
```
/release --minor
→ Full workflow, lighter security review
```

### Patch Release (Bug Fixes)
```
/release --patch
→ Security + tests + quick review
```

### Hotfix
```
/release --hotfix
→ Expedited: aegis → atlas → herald
```

## Example

```
User: /release v2.0.0

Claude: Starting /release workflow for v2.0.0...

Phase 1: Security audit...
[Spawns aegis]
✅ No critical vulnerabilities
⚠️ 2 low-severity issues (documented)

Phase 2: E2E tests...
[Spawns atlas]
✅ 156/156 E2E tests passing

Phase 3: Final review...
[Spawns review-agent]
✅ RELEASE_APPROVED
- 47 commits since v1.9.0
- 3 new features
- 12 bug fixes
- No breaking changes

Phase 4: Version bump...
[Spawns herald]
✅ Version bumped to 2.0.0
✅ CHANGELOG.md updated
✅ Git tag created

Phase 5: Release notes...
[Spawns scribe]
✅ RELEASE-v2.0.0.md created

┌─────────────────────────────────────────┐
│ Release v2.0.0 Ready                    │
├─────────────────────────────────────────┤
│ Security: ✅ Passed                     │
│ Tests: ✅ 156/156                       │
│ Review: ✅ Approved                     │
│                                         │
│ Next steps:                             │
│ 1. git push origin v2.0.0              │
│ 2. Create GitHub release               │
│ 3. Deploy to production                │
└─────────────────────────────────────────┘
```

## Blockers

The workflow stops if:
- Critical security vulnerability found
- E2E tests failing
- Review verdict is RELEASE_BLOCKED

```
Phase 1: Security audit...
❌ CRITICAL: SQL injection in user.py:45

Release blocked. Fix critical issues before proceeding.
```

## Flags

- `--major/--minor/--patch`: Semantic version type
- `--hotfix`: Expedited release path
- `--skip-security`: Skip security audit (not recommended)
- `--dry-run`: Run checks without bumping version
