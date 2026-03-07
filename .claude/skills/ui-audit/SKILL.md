---
name: ui-audit
description: Web UI compliance audit - 100+ rules for accessibility, performance, UX
allowed-tools: [Read, Grep, Glob, Bash, Task]
metadata:
  user-invocable: true
---

# UI Compliance Audit

100+ rules from Vercel Web Interface Guidelines. Covers accessibility, forms, animation, performance, and UX.

Full rule details: `references/audit-rules.md`

## Activation

| Trigger | Context |
|---------|---------|
| `/ui-audit` | Run full audit |
| `/review --ui` | UI-focused review |
| "accessibility" | Suggest this skill |
| "a11y check" | Suggest this skill |
| "design review" | Suggest this skill |
| "UI compliance" | Suggest this skill |

---

## Audit Categories

| Category | Severity | Rules |
|----------|----------|-------|
| Accessibility (semantic HTML, ARIA) | CRITICAL | a11y-button-labels, a11y-form-labels, a11y-keyboard-handlers, a11y-heading-hierarchy, a11y-skip-link, a11y-live-regions |
| Focus States | HIGH | focus-visible-ring, focus-never-outline-none, focus-visible-over-focus, focus-within-groups |
| Forms | HIGH | form-autocomplete, form-correct-types, form-never-block-paste, form-inline-errors, form-focus-first-error |
| Animation | MEDIUM | anim-reduced-motion, anim-transform-opacity-only, anim-no-transition-all, anim-interruptible |
| Typography | MEDIUM | typo-ellipsis, typo-curly-quotes, typo-tabular-nums |
| Content Handling | MEDIUM | content-overflow, content-empty-states, content-variable-length |
| Images | MEDIUM | img-dimensions, img-lazy-loading, img-priority |
| Performance | MEDIUM | perf-virtualize, perf-no-layout-reads, perf-preconnect, perf-font-display |
| Navigation & State | MEDIUM | nav-url-reflects-state, nav-deep-linking, nav-destructive-confirm |
| Touch & Interaction | MEDIUM | touch-manipulation, touch-overscroll, touch-disable-selection |
| Dark Mode & Theming | MEDIUM | dark-color-scheme, dark-theme-color, dark-select-colors |
| Localization | LOW | i18n-date-format, i18n-number-format, i18n-no-ip-language |
| Hydration Safety | LOW | hydration-controlled-inputs, hydration-date-guard |
| Content & Copy | LOW | copy-active-voice, copy-title-case, copy-specific-labels, copy-second-person, copy-error-fixes |

---

## Anti-Patterns to Flag

| Pattern | Severity | Detection | Why |
|---------|----------|-----------|-----|
| `user-scalable=no` | CRITICAL | Grep viewport | Blocks zoom |
| `onPaste.*preventDefault` | CRITICAL | Grep onPaste | Blocks paste |
| `outline-none` (alone) | HIGH | Grep outline | Kills focus |
| `onClick` on non-button | HIGH | AST analysis | Bad semantics |
| Images w/o dimensions | MEDIUM | JSX analysis | CLS issues |
| `transition: all` | MEDIUM | Grep transition | Perf issue |
| Hardcoded date formats | LOW | Grep date patterns | i18n issues |

---

## Audit Workflow

```yaml
1. Structure: tldr structure . --lang typescript
2. Grep anti-patterns:
   - user-scalable=no
   - outline-none
   - onPaste.*preventDefault
   - transition:\s*all
3. Check components for:
   - Button aria-labels
   - Form labels
   - Image dimensions
4. Report by severity
```

## Output Format

```markdown
## UI Compliance Audit

### CRITICAL
- [file:line] Rule: a11y-button-labels - Missing aria-label
- [file:line] Rule: form-never-block-paste - Paste blocked

### HIGH
- [file:line] Rule: focus-never-outline-none - Focus removed

### MEDIUM
- [file:line] Rule: img-dimensions - Missing width/height
- [file:line] Rule: anim-no-transition-all - Using transition:all

### LOW
- [file:line] Rule: i18n-date-format - Hardcoded date format

### Summary
[X] Critical | [Y] High | [Z] Medium | [W] Low
Recommendation: [APPROVE/CHANGES_REQUESTED/BLOCK]
```

---

## Integration

- **With /review**: Use `--ui` flag
- **With agents**: Spawns ui-compliance-reviewer
- **Pairs with**: shadcn-create skill for fixes
- **Store findings**: Memory system for recurring issues
- **Full rules**: `references/audit-rules.md`

---
*Source: Vercel Web Interface Guidelines | 100+ rules | v1.0*
