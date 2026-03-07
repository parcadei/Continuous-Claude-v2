---
name: ui-audit
description: Web UI compliance audit - 100+ rules for accessibility, performance, UX
user-invocable: true
allowed-tools: [Read, Grep, Glob, Bash, Task]
---

# UI Compliance Audit

100+ rules from Vercel Web Interface Guidelines. Covers accessibility, forms, animation, performance, and UX.

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

## Category 1: CRITICAL - Accessibility

### Semantic HTML & ARIA

#### a11y-button-labels
**Rule**: Icon-only buttons MUST have `aria-label`.

```tsx
// BAD
<button><Icon /></button>

// GOOD
<button aria-label="Close menu"><Icon /></button>
```

#### a11y-form-labels
**Rule**: Form controls need `<label>` or `aria-label`.

```tsx
// BAD
<input placeholder="Email" />

// GOOD
<label>
  Email
  <input />
</label>
// OR
<input aria-label="Email" />
```

#### a11y-keyboard-handlers
**Rule**: Interactive elements need keyboard handlers (onKeyDown for Enter/Space).

#### a11y-semantic-first
**Rule**: Use semantic HTML before ARIA. Button over div+role="button".

#### a11y-heading-hierarchy
**Rule**: Headings must be hierarchical (h1 > h2 > h3). No skipping levels.

#### a11y-skip-link
**Rule**: Include skip link for keyboard users to bypass navigation.

#### a11y-live-regions
**Rule**: Async content updates need `aria-live="polite"`.

```tsx
<div aria-live="polite">{loadingMessage}</div>
```

---

## Category 2: HIGH - Focus States

#### focus-visible-ring
**Rule**: Interactive elements need visible focus via `focus-visible:ring-*`.

```css
/* GOOD */
button:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

#### focus-never-outline-none
**Rule**: NEVER use `outline-none` without focus replacement.

```css
/* BAD - Invisible focus */
*:focus { outline: none; }

/* GOOD - Custom focus */
*:focus { outline: none; }
*:focus-visible { ring: 2px solid blue; }
```

#### focus-visible-over-focus
**Rule**: Prefer `:focus-visible` over `:focus` (keyboard only, not mouse).

#### focus-within-groups
**Rule**: Use `:focus-within` for group focus styling (form fields, cards).

---

## Category 3: HIGH - Forms

#### form-autocomplete
**Rule**: Inputs need correct `autocomplete` attribute.

```tsx
<input type="email" autocomplete="email" />
<input type="password" autocomplete="current-password" />
```

#### form-meaningful-names
**Rule**: Use meaningful `name` attributes for form data.

#### form-correct-types
**Rule**: Use correct `type` attribute (email, tel, url, password).

#### form-never-block-paste
**Rule**: NEVER prevent paste on password fields.

```tsx
// BAD
<input type="password" onPaste={e => e.preventDefault()} />
```

#### form-clickable-labels
**Rule**: Labels must be clickable via `htmlFor` or wrapping.

#### form-disable-spellcheck
**Rule**: Disable spellcheck on email, codes, usernames.

```tsx
<input type="email" spellCheck="false" />
```

#### form-inline-errors
**Rule**: Show errors inline, not in alerts.

#### form-focus-first-error
**Rule**: Focus first error field on submit.

#### form-unsaved-warning
**Rule**: Warn before navigation with unsaved changes.

---

## Category 4: MEDIUM - Animation

#### anim-reduced-motion
**Rule**: Honor `prefers-reduced-motion`.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### anim-transform-opacity-only
**Rule**: Animate ONLY `transform` and `opacity` (GPU-accelerated).

```css
/* BAD - Triggers layout */
.animate { transition: width 0.3s; }

/* GOOD - GPU accelerated */
.animate { transition: transform 0.3s; }
```

#### anim-no-transition-all
**Rule**: NEVER use `transition: all`.

```css
/* BAD */
.element { transition: all 0.3s; }

/* GOOD */
.element { transition: opacity 0.3s, transform 0.3s; }
```

#### anim-svg-transform-box
**Rule**: SVG transforms on `<g>` need `transform-box: fill-box`.

#### anim-interruptible
**Rule**: Keep animations interruptible (no pointer-events: none during).

---

## Category 5: MEDIUM - Typography

#### typo-ellipsis
**Rule**: Use proper ellipsis `…` not `...`.

#### typo-curly-quotes
**Rule**: Use curly quotes `""` not straight `""`.

#### typo-non-breaking-space
**Rule**: Use `&nbsp;` to prevent awkward line breaks.

#### typo-loading-ellipsis
**Rule**: Loading states end with `…` (Loading…).

#### typo-tabular-nums
**Rule**: Use `font-variant-numeric: tabular-nums` for numbers in tables.

```css
.table-numbers { font-variant-numeric: tabular-nums; }
```

---

## Category 6: MEDIUM - Content Handling

#### content-overflow
**Rule**: Text containers handle long content via `truncate`, `line-clamp-*`.

```css
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### content-empty-states
**Rule**: Handle empty states explicitly (no data, no results).

#### content-variable-length
**Rule**: Anticipate varied input lengths in UI.

---

## Category 7: MEDIUM - Images

#### img-dimensions
**Rule**: Images MUST have explicit `width` and `height`.

```tsx
// BAD - CLS
<img src="photo.jpg" />

// GOOD - Reserved space
<img src="photo.jpg" width={800} height={600} />
```

#### img-lazy-loading
**Rule**: Below-fold images use `loading="lazy"`.

#### img-priority
**Rule**: LCP images use `priority` or `fetchpriority="high"`.

---

## Category 8: MEDIUM - Performance

#### perf-virtualize
**Rule**: Virtualize lists with >50 items.

#### perf-no-layout-reads
**Rule**: No layout reads (offsetHeight, getBoundingClientRect) in render.

#### perf-batch-dom
**Rule**: Batch DOM operations.

#### perf-preconnect
**Rule**: Add `<link rel="preconnect">` for CDN domains.

#### perf-font-display
**Rule**: Critical fonts use `font-display: swap`.

---

## Category 9: MEDIUM - Navigation & State

#### nav-url-reflects-state
**Rule**: URL must reflect state (filters, tabs, pagination).

#### nav-deep-linking
**Rule**: Enable deep-linking to stateful UI.

#### nav-destructive-confirm
**Rule**: Destructive actions need confirmation dialogs.

---

## Category 10: MEDIUM - Touch & Interaction

#### touch-manipulation
**Rule**: Add `touch-action: manipulation` to remove 300ms delay.

#### touch-overscroll
**Rule**: Use `overscroll-behavior: contain` in modals.

#### touch-disable-selection
**Rule**: Disable text selection during drag operations.

#### touch-autofocus
**Rule**: Use `autoFocus` sparingly (can be disorienting).

---

## Category 11: MEDIUM - Dark Mode & Theming

#### dark-color-scheme
**Rule**: Set `color-scheme: dark` on `<html>` for system defaults.

#### dark-theme-color
**Rule**: Match `<meta name="theme-color">` to background.

#### dark-select-colors
**Rule**: Native `<select>` needs explicit colors for dark mode.

---

## Category 12: LOW - Localization

#### i18n-date-format
**Rule**: Use `Intl.DateTimeFormat`, not hardcoded formats.

```typescript
// BAD
`${date.getMonth()}/${date.getDate()}`

// GOOD
new Intl.DateTimeFormat('en-US').format(date)
```

#### i18n-number-format
**Rule**: Use `Intl.NumberFormat` for numbers/currency.

#### i18n-no-ip-language
**Rule**: Detect language via headers, not IP geolocation.

---

## Category 13: LOW - Hydration Safety

#### hydration-controlled-inputs
**Rule**: Inputs with `value` need `onChange` handler.

#### hydration-date-guard
**Rule**: Guard date/time rendering against SSR/client mismatch.

#### hydration-suppress-warning
**Rule**: Use `suppressHydrationWarning` sparingly.

---

## Category 14: LOW - Content & Copy

#### copy-active-voice
**Rule**: Use active voice in UI copy.

#### copy-title-case
**Rule**: Title Case for headings and buttons.

#### copy-numerals
**Rule**: Use numerals for counts (3 items, not three items).

#### copy-specific-labels
**Rule**: Specific labels (Save Changes, not Submit).

#### copy-second-person
**Rule**: Second person (Your profile, not My profile).

#### copy-error-fixes
**Rule**: Error messages should include how to fix.

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

---
*Source: Vercel Web Interface Guidelines | 100+ rules | v1.0*
