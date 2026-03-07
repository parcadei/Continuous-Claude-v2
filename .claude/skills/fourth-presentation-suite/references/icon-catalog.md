# Icon Catalog — Lucide SVG Icons for EBR/QBR

**NEVER use emoji or Unicode codepoints as icons.** All icons MUST be Lucide SVG via CDN.

## Required CDN Include

In `<head>`:
```html
<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
```

At end of `<body>` (AFTER all content):
```html
<script>
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof lucide !== 'undefined') { lucide.createIcons(); }
    });
</script>
```

Pin the version (`@0.460.0`) — do NOT use `@latest`.

## Usage Pattern

```html
<!-- CORRECT -->
<div class="icon-box icon-box-teal">
    <i data-lucide="target" style="width: 20px; height: 20px;"></i>
</div>

<!-- WRONG (BLOCKED) -->
<div class="icon-box icon-box-teal">🎯</div>
```

## Sizing

| Context | Size |
|---|---|
| Inside `icon-box` containers | `width: 20px; height: 20px;` |
| Inline with text | `width: 16px; height: 16px; vertical-align: middle;` |
| Hero/feature cards | `width: 24px; height: 24px;` |

## EBR/QBR Icon Mapping

| Concept | Lucide Icon Name | Use For |
|---|---|---|
| Performance / metrics | `bar-chart-3` | KPI slides, analytics sections |
| Growth / improvement | `trending-up` | Positive change indicators |
| Decline / concern | `trending-down` | Negative change indicators |
| Users / people | `users` | Workforce, headcount, team |
| Calendar / timeline | `calendar` | Date ranges, scheduling |
| Target / goal | `target` | Goals, targets, objectives |
| Support / help | `life-buoy` | Support resources, help center |
| Training / education | `graduation-cap` | Training programs, learning |
| Revenue / money | `dollar-sign` | Financial metrics |
| Savings / efficiency | `piggy-bank` | Cost reduction, savings |
| Settings / config | `settings` | Platform configuration |
| Check / success | `check-circle` | Completed items, success |
| Warning / alert | `alert-triangle` | Warnings, attention needed |
| Info / details | `info` | Information callouts |
| Location / region | `map-pin` | Regional data, locations |
| Time / clock | `clock` | Time-based metrics |
| Star / rating | `star` | Ratings, favorites |
| Shield / security | `shield-check` | Compliance, security |
| Megaphone / news | `megaphone` | Announcements, updates |
| Book / documentation | `book-open` | Documentation, resources |
| Rocket / launch | `rocket` | New features, launches |
| Award / achievement | `award` | Achievements, milestones |
