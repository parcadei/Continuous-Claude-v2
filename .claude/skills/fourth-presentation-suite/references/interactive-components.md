# Interactive Components Reference

Alpine.js interactive components from `html-engine/components/midnight-components.html`. Use to increase information density without cluttering slides.

## Required CDN Includes

Load in this order (collapse MUST load before Alpine core):
```html
<!-- Alpine.js Collapse Plugin (MUST load first) -->
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
<!-- Alpine.js Core -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

## Component-to-Use-Case Table

| Component | Use When | NOT For |
|---|---|---|
| Tabs (pill/underline) | Quarterly data views, multi-metric dashboards, before/after comparisons with 3+ states | Simple 2-item before/after (use two-column instead) |
| Accordion | Appendix drilldown, multi-region breakdowns, FAQ-style detail expansion | Main deck slides with 3 or fewer items |
| Collapsible | Supplementary detail under KPIs, methodology notes, data source attribution | Primary narrative content that all viewers need |
| Modal | Deep-dive data tables, full datasets behind summaries, detailed methodology | Core narrative or content every viewer must see |
| Tooltip | Metric definitions, abbreviation explanations, footnote-style context | Long text or paragraph explanations |
| Carousel | Case studies, testimonials, location highlights, multi-example evidence | Primary data or metrics (too hidden for key data) |
| Toggle | Annual/Monthly view switching, with/without normalization toggles | More than 2 states (use tabs instead) |
| Dropdown | Metric selector, time range filter, region picker | Primary navigation or slide switching |

## Main Deck vs Appendix

- **Main deck**: Tabs for quarterly data views, tooltips for metric definitions. Avoid modals and accordions — they hide information the audience needs to see.
- **Appendix**: Full toolkit. Accordions for regional breakdowns, modals for complete data tables, collapsibles for methodology, carousels for additional case studies.

## Rule

Never add interactivity for decoration. Every interactive element must compress 2+ views into one slide or reveal detail that would otherwise require an extra slide.
