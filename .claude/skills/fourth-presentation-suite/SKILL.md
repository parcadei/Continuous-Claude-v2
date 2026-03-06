---
name: fourth-presentation-suite
description: Generate Fourth-branded EBR/QBR and sales presentations using a two-phase workflow. Phase 1 builds a stunning animated HTML presentation for design review and approval. Phase 2 converts the approved HTML to PPTX for distribution. HTML is always built first -- PPTX is never built until the user explicitly approves the HTML design. Uses the bundled html-engine for visual quality with Fourth brand identity. v6 adds Fourth Midnight palette, 4-color glow rotation, and corrected brand colors.
---

# Fourth Presentation Suite v6

---

## 1. Design Philosophy

**Visual design principles drive layout. Fourth brand guidelines constrain color and font.**

The #1 failure mode of AI-generated presentations is text walls on white backgrounds. This skill exists to prevent that. Every slide must earn its place through visual impact, not word count.

### Core Principles

1. **Visual Format First**: Before writing any bullet, ask -- can this be a stat, chart, quote, or table? If yes, use that format instead.
2. **One idea per slide**: If a slide has two ideas, split it into two slides.
3. **Numbers dominate**: Key metrics get 72-144pt treatment. They are the visual anchor, not a footnote.
4. **Variety is mandatory**: No two consecutive slides should look the same.
5. **White space is design**: A half-empty slide with one powerful number beats a full slide of bullets.
6. **Container variety**: Glass cards are ONE option, not the default for everything. Use accent strips, metric slabs, floating badges, and progress bars to break visual monotony.

### Anti-Patterns (NEVER do these)

- Same white background on every slide
- Paragraph text on slides (rewrite or split)
- Numbers in bullet form when chart/KPI format exists
- More than 4 bullets per slide
- Same layout for 3+ consecutive slides
- Missing section breaks in 8+ slide decks
- Bullets longer than 8 words
- Every slide using the same H2 + bullets template
- Charts without an insight title ("Revenue Data" instead of "Revenue Grew 23% YoY")
- Every container styled as a glass card (use varied container types)
- Raw usage stats without business outcome translation
- Emoji or Unicode codepoints as icons (use Lucide SVG icons via CDN — see Icon Rules below)
- Static cards for data with time-series dimensions (use tabs or accordions for interactivity)
- Improvised hybrid layouts when the Content-to-Layout table prescribes a specific pattern

---

## 1B. Visual Identity Non-Negotiables [CRITICAL]

**These rules are BLOCKING. Violating any of them produces an incorrect presentation. Do not approximate, improvise, or substitute any value below.**

### Mandatory CSS Variables

Copy this `:root` block VERBATIM into every HTML presentation. Do NOT approximate, rename, or substitute any value:

```css
:root {
    /* -------- CORE COLORS ("Fourth Midnight" — premium depth) -------- */
    --bg-primary: #0A1929;           /* Fourth Midnight - near-black, blue DNA */
    --bg-secondary: #0F2A3F;         /* Dark card surface */
    --bg-tertiary: #153650;          /* Hover states, active elements */
    --bg-card: rgba(15, 42, 63, 0.55); /* Glass on dark body */
    --bg-midnight: #051526;          /* Deepest dark */

    /* -------- TEXT COLORS -------- */
    --text-primary: #FFFFFF;
    --text-secondary: #CFD1D1;       /* Cool Grey */
    --text-muted: #8DA8C4;           /* Blue-tinted muted */

    /* -------- ACCENT COLORS (Fourth Brand — exact values) -------- */
    --accent: #6FB4E3;               /* Sky Blue */
    --teal: #00B69F;                 /* Teal Green */
    --sunrise: #FAA51A;              /* Sunrise Orange */
    --purple: #9678B6;               /* Fourth Purple */

    /* -------- SEMANTIC COLORS -------- */
    --success: #00B69F;
    --danger: #D81632;               /* Fourth Hot Red */
    --warning: #FAA51A;

    /* -------- FOURTH BRAND TOKENS -------- */
    --fourth-deep-blue: #0C4A7D;
    --fourth-teal: #00B69F;
    --fourth-sky-blue: #6FB4E3;
    --fourth-midnight: #002747;
    --fourth-sunrise: #FAA51A;
    --fourth-dark-gray: #373E42;
    --fourth-cool-grey: #CFD1D1;
    --fourth-soft-white: #F5F5F5;
    --fourth-white: #FFFFFF;
    --fourth-hot-red: #D81632;
    --fourth-purple: #9678B6;
    --fourth-vignette: linear-gradient(25deg, #00B69F 0%, #6FB4E3 40%, #0C4A7D 100%);
}
```

### Background Rules [CRITICAL — BLOCK if violated]

1. **Title slide**: MUST use `.bg-title` = `linear-gradient(160deg, #051526 0%, #0A1929 40%, #0F2A3F 100%)` — DARK, near-black. NEVER a light or teal gradient.
2. **Closing slide**: MUST use `.bg-closing` = `linear-gradient(160deg, #0F2A3F 0%, #0A1929 50%, #051526 100%)` — same dark depth, reversed direction.
3. **ALL content slides**: Dark background on `#0A1929` base. Only data/evidence slides may use light backgrounds for contrast relief.
4. **NEVER use the old vignette gradient** (`linear-gradient(25deg, #00B69F 0%, #6FB4E3 40%, #0C4A7D 100%)`) as a slide background. The vignette variable exists for accent elements ONLY (progress bars, decorative lines), NEVER as a full-slide background.
5. **4-color glow rotation** across dark content slides — no two consecutive slides share the same glow:

| CSS Class | Glow Color | Feel |
|---|---|---|
| `.bg-dark-radial` | Teal `rgba(0, 182, 159, 0.08)` at center | Cool, tech |
| `.bg-dark-tl` | Sunrise `rgba(250, 165, 26, 0.06)` at top-left | Warm energy |
| `.bg-dark-br` | Purple `rgba(150, 120, 182, 0.07)` at bottom-right | Depth |
| `.bg-dark-sweep` | Linear sweep `#051526 → #0A1929 → #153650` | Diagonal dark |

### Logo Rules [CRITICAL — BLOCK if violated]

1. **Title slide**: MUST include the Fourth logo image (white variant, `fourth-logo-hero` class, centered above the title, 120px). This is a real `<img>` tag with a base64 data URI — NOT text saying "FOURTH".
2. **Closing slide**: MUST include the Fourth logo image (white variant, `fourth-logo-closing` class, larger at 180px, centered above closing text).
3. **Content/section/data slides**: SHOULD frequently include `fourth-icon.png` (the "iQ" icon or Fourth shield) as a very large, nearly-transparent background element using `fourth-logo-backdrop` class (600-800px, 2.5-3% opacity). Use on MOST slides but NOT every slide — variety matters.
4. **Backdrop position rotates** across slides — no two consecutive slides should have the backdrop in the same position:
   - `fourth-logo-backdrop-right` — right edge, vertically centered (offset -120px)
   - `fourth-logo-backdrop-left` — left edge, vertically centered (offset -120px)
   - `fourth-logo-backdrop-large` — 800px, even more subtle (2.5% opacity)
5. **Every slide**: Small watermark logo or icon at bottom-right (`fourth-logo-watermark` class, 80px, 8% opacity).
6. **Logo data URIs**: The base64-encoded `data:image/png;base64,...` strings are in `references/logo-data-uris.md`. Read that file ONLY when you need to copy the URIs into `<img>` tags — do NOT hold the base64 content in working memory. The theme template (`fourth-executive.html`) uses `{{FOURTH_LOGO_WHITE}}` and `{{FOURTH_IQ_ICON}}` placeholders — replace these with the actual data URIs from `references/logo-data-uris.md` when generating slides. Copy them exactly — do NOT attempt to recreate or approximate logo images.

### Banned Patterns [BLOCK — using any of these is an error]

| Banned Value | Correct Value | Why |
|---|---|---|
| `linear-gradient(25deg, #00B69F 0%, #6FB4E3 40%, #0C4A7D 100%)` as slide background | `.bg-title` / `.bg-closing` dark gradients | The old vignette is a light teal-to-blue gradient. Title/closing slides must be DARK. |
| `--bg-primary: #0C2B46` | `--bg-primary: #0A1929` | Old mid-blue value. v6 uses near-black Fourth Midnight. |
| `--fourth-hot-red: #D9373B` | `--fourth-hot-red: #D81632` | Wrong red. Use the corrected brand-essentials value. |
| `--fourth-purple: #9279B2` | `--fourth-purple: #9678B6` | Wrong purple. Use the corrected brand-essentials value. |
| Text-only "FOURTH" as a substitute for the logo `<img>` | `<img src="data:image/png;base64,..." class="fourth-logo-hero">` | The logo is an image, not text. Always use the base64 data URI from `references/logo-data-uris.md`. |
| `rgba(12, 74, 125, ...)` as the only glow color on all slides | Rotate through teal, sunrise, purple, and sky glows | Using Deep Blue glow on every slide = no color variety. Rotate the 4-color system. |

### Icon Rules [CRITICAL — BLOCK if violated]

**NEVER use emoji or Unicode codepoints as icons.** All icons MUST be Lucide SVG icons loaded via CDN. This is a BLOCKING rule — any emoji character used as an icon (including in `icon-box` containers, alert icons, navigation arrows, or decorative elements) produces an incorrect presentation.

**1. Required CDN Include:**

Add to `<head>`:
```html
<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
```

Add at the end of `<body>`, AFTER all content:
```html
<script>
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof lucide !== 'undefined') { lucide.createIcons(); }
    });
</script>
```

**IMPORTANT:** Pin the Lucide version (e.g., `@0.460.0`) — do NOT use `@latest`, which can break if the package structure changes.

**2. Icon Usage Pattern:**

CORRECT:
```html
<div class="icon-box icon-box-teal">
    <i data-lucide="target" style="width: 20px; height: 20px;"></i>
</div>
```

WRONG (BLOCKED):
```html
<div class="icon-box icon-box-teal">🎯</div>
```

**3. Common EBR/QBR Icon Mapping:**

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

**4. Icon Sizing:**

Inside `icon-box` containers: `width: 20px; height: 20px;`
Inline with text: `width: 16px; height: 16px; vertical-align: middle;`
Hero/feature cards: `width: 24px; height: 24px;`

---

## 2. Content Transformation Step

Between receiving raw content and generating slides, you MUST transform the content. Raw input becomes visual output through this pipeline:

### Step 1: Extract and Classify

Read through all content and tag every piece:

| Content Tag | Examples | Route To |
|---|---|---|
| METRIC | "23% cost reduction", "$2.1M revenue", "94% satisfaction" | KPI slide or chart |
| TREND | "Q1: $1.2M, Q2: $1.5M, Q3: $1.8M" | Line/area chart |
| BREAKDOWN | "Restaurants 45%, Hotels 30%, Bars 15%" | Donut/bar chart |
| QUOTE | Customer testimonial, pull quote | Pull-quote slide |
| COMPARISON | "Before/after", "old vs new", feature matrix | Comparison or matrix table slide |
| GAP | "Current 73%, target 92%, gap -19pts" | Gap slide with progress bars |
| NARRATIVE | Everything else -- descriptions, explanations | Content slide (bullets ONLY) |

### Step 2: Rewrite for Slides

- Every bullet: MAX 8 words. Rewrite aggressively.
- Every title: MAX 12 words. State the insight, not the topic.
- Every metric: Extract the number and the label separately.

### Step 3: Assign Layouts

Use the Content-to-Layout Decision Table (Section 3) to assign each piece of classified content to a specific slide layout. Never default to "content slide with bullets" when a more visual format exists.

---

## 3. Content-to-Layout Decision Table [MANDATORY]

This is the primary design tool. Before creating any slide, match content to layout. **If content matches a layout in this table, that layout MUST be used. This is a BLOCKING rule — improvised hybrid layouts are an error when the table prescribes a specific pattern.**

| Content Type | Layout | NOT This |
|---|---|---|
| Single key metric | Full-slide KPI (144pt number + progress ring) | Bullet point with the number |
| 2-4 metrics together | KPI card grid (2x2 or 1x3) | Bullet list of numbers |
| 2-4 metrics with status | Stat row slide (status-colored cards + sparklines) | KPI grid without status context |
| Outcome with evidence | Outcome slide (96pt stat + teal divider + narrative) | Bullet list of results |
| Trend over time | Line/area chart | Table of numbers by quarter |
| Category breakdown | Bar chart or donut | Bullets listing percentages |
| Customer quote | Pull-quote (large text, teal bar) | Regular bullet |
| Before/after comparison | Two-column contrast | Paragraph describing both |
| Gap/variance analysis | Gap slide (card-per-row with progress bars + status badges) | Bullet list of gaps |
| Action items/next steps | Recommendation slide (numbered cards) | Bullet list of actions |
| Partnership commitments | Mutual commitments slide (split-panel checkmarks) | Single bullet list |
| Strategic roadmap items | Roadmap slide (pill badges + accent cards) | Bullet list of initiatives |
| Trend with premium feel | Gradient area chart (smooth + markers) | Plain line chart |
| Feature list (3-4 items) | Three-column icon+label | Bullet list |
| Narrative on dark bg | Dark content slide with sidebar cards | White bg content slide |
| Problem statement | Dark bg + single large sentence | Multi-bullet content slide |
| Section transition | Full gradient + oversized title (3 rotating variants) | Content slide with "Section:" prefix |
| Process or sequence | Numbered steps with icons | Wall of text |
| Feature comparison | Matrix table with check/cross marks | Bullet list of features |
| Key takeaway or claim | Problem slide (dark bg, one statement) | One of many bullets |

**Rule [BLOCK]**: If content matches a layout in this table, that layout MUST be used. Bullets are the LAST resort, not the default. Improvising a hybrid layout when the table prescribes a specific pattern is an error.

### Prescribed HTML Templates

**Platform Engagement / Usage Metrics → Stat Row:**
```html
<div class="stat-row">
    <div class="stat-card stat-good">
        <div class="stat-value" data-target="346000" data-suffix="K">346K</div>
        <div class="stat-label">TOTAL LOGINS</div>
        <div class="stat-change positive"><i data-lucide="trending-up"></i> +12% QoQ</div>
    </div>
    <!-- Repeat for each metric. Status classes: stat-good, stat-watch, stat-action -->
</div>
```

**Support & Resources / Feature Lists → Three-Column Icon+Label:**
```html
<div class="three-col">
    <div class="feature-card">
        <div class="icon-box icon-box-teal"><i data-lucide="life-buoy"></i></div>
        <h3>Customer Success Portal</h3>
        <p>24/7 support at help.hotschedules.com</p>
    </div>
    <!-- Repeat for each feature. NEVER use emoji in icon-box. -->
</div>
```

**Proven Results / Outcomes → Hero-Stat + Chart + Highlight:**
```html
<div class="two-col">
    <div>
        <div class="hero-stat" data-target="15" data-suffix="%">15%</div>
        <h3>Sales Uplift</h3>
        <p>Whataburger saw measurable improvement after Fourth platform adoption.</p>
    </div>
    <div>
        <canvas class="chart" data-type="bar" data-labels='["Before","After"]' data-values='[82,97]'></canvas>
        <div class="highlight-box">Key supporting detail or customer quote</div>
    </div>
</div>
```

### EBR/QBR Slide Sequence (recommended)

For Executive Business Reviews, follow this pattern:
1. Title slide
2. Section break: "Performance Overview"
3. Stat row or KPI grid (key metrics with status colors + sparklines)
4. Outcome slide (headline metric + narrative + optional chart)
5. Dark content slide (deeper context with sidebar cards)
6. Section break: "Opportunities"
7. Gap slide (areas needing attention with progress bars)
8. Pull quote (customer voice)
9. Section break: "Next Steps"
10. Recommendation slide (action items with pill timeline badges)
11. Roadmap slide (strategic initiatives with pill badges + accent cards)
12. Mutual commitments slide (split-panel + next review date)
13. Closing slide

---

## 4. Background Rotation Pattern

Visual rhythm comes from alternating background treatments. Use this mapping:

| Slide Type | Background Treatment |
|---|---|
| Title slide | Fourth Midnight dark gradient (`.bg-title` — near-black, NOT vignette) |
| Section break | Solid Deep Blue or gradient overlay (3 variants rotate) |
| KPI/stat slide | Dark navy bg (auto-rotated variant) |
| Stat row slide | Dark navy bg (auto-rotated variant) |
| Outcome slide | Dark navy bg (auto-rotated variant) |
| Dark content slide | Dark navy bg (auto-rotated variant) |
| Gap slide | Dark navy bg (auto-rotated variant) |
| Recommendation slide | Dark navy bg (auto-rotated variant) |
| Mutual commitments | Dark navy bg (auto-rotated variant) |
| Roadmap slide | Dark navy bg (auto-rotated variant) |
| Content (agenda) | `bg='dark', numbered=True` for EBR agendas |
| Content/evidence | Soft White (#F5F5F5) or White |
| Chart/data slide | White or very subtle blue tint |
| Quote/testimonial | Midnight Navy + left-edge teal accent bar |
| Comparison slide | Light bg, colored column highlights |
| Problem statement | Midnight Navy or Deep Blue, white text |
| Closing/CTA | Fourth Midnight dark gradient (`.bg-closing` — bookend with title, NOT vignette) |

### Dark Background Auto-Rotation

The builder auto-rotates dark backgrounds through 4 variants to prevent visual monotony:

| Variant | Type | Center/Angle | Feel |
|---|---|---|---|
| `radial` | Radial | (50, 35) | Center glow |
| `corner_tl` | Radial | (15, 20) | Top-left energy |
| `corner_br` | Radial | (85, 80) | Bottom-right depth |
| `sweep` | Linear | 135 deg | Diagonal dark sweep |

All EBR slides pass `variant='auto'` to `_set_dark_bg()`, which advances an `itertools.cycle` through these 4 variants. No two consecutive dark slides will share the same glow position. Callers can still pass an explicit variant to override the cycle.

### Section Break Variant Rotation

Section breaks auto-rotate through 3 distinct compositions via `_section_break_counter % 3`:

| Variant | Composition | Visual Effect |
|---|---|---|
| 0 | Left-aligned title + decorative diagonal lines on right | Depth and dimension |
| 1 | Full-bleed section number background (200pt, 5% opacity) + centered title | Bold and graphic |
| 2 | Asymmetric layout + gradient shape on right side | Dynamic and modern |

All 3 variants share the same radial gradient background (teal -> deep blue -> navy). The rotation is automatic -- callers just call `add_section_break(title, subtitle)` and the builder cycles through variants.

### Hard Rule: No more than 2 consecutive slides may share the same background treatment.

The overall deck must also alternate dark and light:
- **Never** 4+ consecutive dark slides without a light break
- **Title + Closing:** Always Fourth Midnight dark gradient (`.bg-title` / `.bg-closing`), NEVER vignette
- **Content/agenda:** Use `bg='dark'` for EBR agendas (NOT plain white)
- **Data/evidence:** Light background for contrast relief

Use the `BackgroundRotation` helper in `fourth_pptx_core.py` to track and enforce this during PPTX generation.

---

## 5. Typography as Design Element

Size contrast is the primary design tool -- not everything at the same scale.

| Element | Size | Weight | Use |
|---|---|---|---|
| Category label | 12pt | Poppins SemiBold UPPERCASE | Teal, positioned above slide title (e.g., "WORKFORCE INTELLIGENCE") |
| Slide title | 36-48pt | Poppins SemiBold | Deep Blue on light bg, White on dark bg |
| KPI number | 72-144pt | Poppins Bold | The dominant visual element on stat slides. v5 hero: 144pt. |
| Section break headline | 60-80pt | Poppins SemiBold | White on gradient, full visual impact |
| Body text | 18pt | Poppins Regular | Dark Gray, supporting role only |
| Caption / source | 12-14pt | Poppins Regular | Footnotes, attributions |
| Letter-spaced label | 12-28pt | +50-200 hundredths tracking | Metric labels, column headers (via `set_letter_spacing()`) |

### Category Labels

Every content slide and KPI slide should have a small uppercase category label above the title. This creates a consistent navigation system and adds visual structure.

Examples: `WORKFORCE INTELLIGENCE`, `ROI`, `CUSTOMER SUCCESS`, `PLATFORM OVERVIEW`, `NEXT STEPS`

Use `add_category_label(slide, "LABEL TEXT")` in `fourth_pptx_core.py`.

---

## 6. The Two-Phase Workflow

### Phase 1: HTML Design

```
Build HTML -> Internal quality gate -> Deliver to user
                                       |
User reviews in browser (animations, charts, full layout)
                                       |
Revisions if needed -> Repeat until approved
                                       |
User says: "Approved" / "Looks good" / "Convert it"
```

**Rules:**
- Never build PPTX before HTML is approved
- HTML is the design artefact -- all creative decisions happen here
- After delivering HTML, end with: *"Open in your browser to review. When happy, say 'approved' and I'll convert to PPTX."*

**HTML references (bundled in this skill):**
1. `html-engine/themes/fourth-executive.html` -- Fourth brand-aligned HTML presentation theme (default)
2. `html-engine/themes/midnight-executive.html` -- Generic dark HTML theme (alternate)
3. `html-engine/STYLE_PRESETS.md` -- CSS custom properties and style presets
4. `html-engine/components/midnight-components.html` -- Reusable HTML slide components

### Phase 2: PPTX Conversion

Only triggered by explicit approval. The PPTX is a faithful conversion -- no new design decisions.

**Before converting, state:** *"Converting to PPTX. Animations become static, web fonts substituted, but content, structure, and brand colours carry over faithfully."*

### PPTX Conversion Map

| HTML Slide Type | PPTX Method |
|---|---|
| Title | `builder.add_title_slide(title, subtitle, logo_path)` |
| Section break | `builder.add_section_break(title, subtitle)` |
| Content (bullets, light bg) | `builder.add_content_slide(title, bullets, category_label)` |
| Content (dark bg, numbered) | `builder.add_content_slide(title, bullets, category_label, bg='dark', numbered=True)` |
| Content (dark bg, narrative) | `builder.add_dark_content_slide(label, headline, body, sidebar_cards)` |
| KPI (single metric) | `builder.add_kpi_slide(metric_value, metric_label, context, bg, category_label)` |
| KPI grid (2-4 metrics) | `builder.add_kpi_grid(metrics, bg)` |
| Stat row (2-4 KPIs with status) | `builder.add_stat_row_slide(label, headline, stats, sparkline_data)` |
| Outcome (stat + narrative + chart) | `builder.add_outcome_slide(label, stat_value, stat_label, headline, body, why_it_matters, chart_data)` |
| Quote/testimonial | `builder.add_pull_quote(quote, attribution, role)` |
| Problem statement | `builder.add_problem_slide(statement)` |
| Before/after | `builder.add_comparison_slide(title, before, after)` |
| Gap analysis | `builder.add_gap_slide(label, headline, gaps)` |
| Recommendation/actions | `builder.add_recommendation_slide(label, headline, actions)` |
| Mutual commitments | `builder.add_mutual_commitments_slide(label, headline, fourth_items, client_items, client_name, next_review_date, contact_name, contact_email)` |
| Roadmap (strategic) | `builder.add_roadmap_slide(label, headline, pills, items)` |
| Two-column | `builder.add_two_column(title, left, right)` |
| Three-column | `builder.add_three_column(title, columns)` |
| Chart/data | `builder.add_data_slide(title)` + `cb.add_*()` |
| Chart on dark bg | `builder.add_data_slide(title)` + `cb.add_dark_*()` |
| Premium area chart | `cb.add_dark_area_chart(slide, categories, series, title, position, gradient_color)` |
| Table | `builder.add_table_slide(title)` + `tb.add_*()` |
| Table on dark bg | `builder.add_table_slide(title)` + `tb.add_dark_table()` |
| Closing | `builder.add_closing_slide(title, subtitle, contact, logo)` |
| Callout/insight strip | `builder.add_callout_strip(slide, text, top, accent_color)` |
| HTML glass card | `builder._add_glass_card()` via `OoxmlEffects.apply_glass_card()` |
| HTML radial bg | `builder._set_dark_bg('radial')` via `OoxmlEffects.set_slide_gradient_bg()` |
| HTML glow effect | `OoxmlEffects.add_glow()` on relevant shapes |

**IMPORTANT:** `ChartBuilder` and `TableBuilder` are instance classes. Create them first:
```python
cb = ChartBuilder()
tb = TableBuilder()
```

---

## 7. Script Reference

### fourth_pptx_core.py

**Classes:**
- `FourthBrand` -- brand constants (colors, fonts, dimensions)
- `TextFormatter` -- heading/body/bullet formatting, 4x6 enforcement
- `BackgroundManager` -- solid, gradient, vignette, image backgrounds
- `BackgroundRotation` -- track and enforce background variety across slides
- `ImageHandler` -- file/base64 image insertion, logo placement
- `PresentationBuilder` -- main builder API (all `add_*` methods)
- `PresentationRebrander` -- rebrand existing PPTX files

**Key PresentationBuilder methods:**

| Method | Purpose |
|---|---|
| `add_title_slide(title, subtitle, logo_path)` | Vignette bg, centered white text |
| `add_content_slide(title, bullets, body_text, layout, category_label)` | Standard content (light bg), max 4 bullets of 8 words |
| `add_dark_content_slide(label, headline, body, sidebar_cards)` | Dark navy bg + eyebrow label + headline + body + optional glass sidebar cards |
| `add_section_break(title, subtitle)` | 3 rotating variants: v0 left-aligned + decorative lines, v1 full-bleed section number, v2 asymmetric + gradient shape. All share radial gradient bg. |
| `add_kpi_slide(metric_value, metric_label, context, bg, category_label)` | Impact Moment: 144pt hero number with glow, 28pt letter-spaced label. Percentages get progress ring; non-percentages get comparison bar. No glass card -- raw number dominates. |
| `add_kpi_grid(metrics, bg)` | 2x2 or 1x3 metric card grid with glass cards |
| `add_stat_row_slide(label, headline, stats, sparkline_data)` | Dark bg + status-differentiated KPI cards (teal/amber/red accent bars). Optional `sparkline_data` adds mini trend sparklines to each card. stats=[{value, label, change, status}] |
| `add_outcome_slide(label, stat_value, stat_label, headline, body, why_it_matters, chart_data)` | 96pt stat with teal divider, narrative right, expanded chart area. Pass `chart_data={categories, series}` for inline gradient area chart |
| `add_pull_quote(quote, attribution, role)` | Large quote on dark bg with teal bar |
| `add_problem_slide(statement)` | Single powerful statement on dark bg |
| `add_comparison_slide(title, before, after)` | Two-column before/after. Accepts list of strings or dict {title, points} |
| `add_gap_slide(label, headline, gaps)` | Card-per-row layout: each gap gets a data card with area name, current/target values, progress bar, and floating status badge. gaps=[{area, current, best_practice, gap, status}] |
| `add_recommendation_slide(label, headline, actions)` | Numbered action rows in glass cards with pill timeline badges. actions=[{title, description, timeline}] |
| `add_mutual_commitments_slide(label, headline, fourth_items, client_items, client_name, next_review_date, contact_name, contact_email)` | Split-panel: deep blue tint (Fourth) and sky blue tint (Client) columns with teal accent bars, check circles, and accent strip items. Compact next-review bar at bottom. |
| `add_roadmap_slide(label, headline, pills, items)` | Strategic roadmap with pill badge row + left-accent cards. pills=[{text, style}], items=[{title, description, relevant, timeline}] |
| `add_two_column(title, left, right)` | Side-by-side content |
| `add_three_column(title, columns)` | Feature highlights (icon+heading+body) |
| `add_data_slide(title)` | Chart placeholder, returns (slide, area) |
| `add_table_slide(title)` | Table placeholder, returns (slide, area) |
| `add_image_slide(title, image_path, image_b64, caption)` | Image-focused layout |
| `add_quote_slide(quote, attribution, source_title)` | Light bg quote (legacy) |
| `add_closing_slide(title, subtitle, contact, logo)` | Vignette bg closing |
| `add_category_label(slide, label_text)` | Small uppercase teal label above title |
| `add_callout_strip(slide, text, top, accent_color)` | Teal-accented insight box (utility, call on any slide) |
| `add_pill_badge(slide, text, left, top, width, height, bg_color_hex, text_color, outline_only, outline_color_hex)` | Modern rounded pill tag -- solid (teal bg) or outline-only mode |
| `add_divider_line(slide, left, top, width, color_hex, alpha_pct, thickness)` | Thin semi-transparent horizontal separator |
| `add_checkmark_item(slide, text, left, top, width, check_color)` | Teal checkmark + text (replaces plain bullets for commitment items) |

**v5 Internal Helpers** (called automatically by the slide methods above, but available for custom layouts):

| Method | Purpose |
|---|---|
| `_add_floating_badge(slide, left, top, text, bg_color, text_color, font_size_pt)` | Pill-shaped badge with auto-calculated width. Default teal bg, white text, 10pt. |
| `_add_accent_strip(slide, left, top, width, text, accent_color, font_size_pt)` | Full-width container with left accent bar (0.08" teal) + 6% white fill body. |
| `_add_metric_slab(slide, left, top, width, height, value, label, sublabel)` | Premium gradient-filled stat container (teal->deep blue diagonal). 72pt value, 16pt label with letter spacing. |
| `_add_progress_bar_shape(slide, left, top, width, current_pct, height, track_color, fill_color, label)` | Two-shape progress bar (20% alpha track + solid fill). Optional percentage label to the right. |
| `_add_mini_sparkline(slide, left, top, width, height, values, color)` | Freeform-shape trend line from normalized data points. 1.5pt teal line, transparent fill. Needs 2+ values. |

### fourth_ooxml.py (v3+v4+v5)

**Class: OoxmlEffects** -- Low-level OOXML XML injection for visual effects
python-pptx cannot produce. All methods operate on shape._element.spPr.

| Method | Effect | OOXML Element |
|---|---|---|
| `set_radial_gradient` | Radial gradient fill | `<a:gradFill>` + `<a:path path="circle">` |
| `set_linear_gradient` | Linear gradient fill | `<a:gradFill>` + `<a:lin>` |
| `set_semi_transparent_fill` | Alpha fill | `<a:solidFill>` + `<a:alpha>` |
| `set_rounded_corners` | Rounded rectangle | `<a:prstGeom prst="roundRect">` |
| `add_glow` | Colored halo | `<a:glow>` |
| `add_outer_shadow` | Drop shadow | `<a:outerShdw>` |
| `add_inner_shadow` | Inset shadow | `<a:innerShdw>` |
| `add_soft_edge` | Edge blur | `<a:softEdge>` |
| `apply_glass_card` | Glass morphism composite | All of the above combined |
| `apply_status_border` | Status-colored border | `<a:ln>` with alpha |
| `set_series_gradient_fill` | Area chart gradient (teal to transparent) | `<a:gradFill>` on `<c:ser>/<c:spPr>` |
| `add_markers_to_series` | Circle markers with fill + outline | `<c:marker>` on `<c:ser>` |
| `enable_smooth_lines` | Cubic spline smooth curves | `<c:smooth val="1"/>` |
| `set_series_line_style` | Visible line on area chart series | `<a:ln>` on `<c:ser>/<c:spPr>` |
| `set_slide_gradient_bg` | Slide gradient background | `<p:bg>` + `<a:gradFill>` |
| `set_slide_solid_bg` | Slide solid background | `<p:bg>` + `<a:solidFill>` |

**v5 New Methods:**

| Method | Effect | Use Case |
|---|---|---|
| `set_letter_spacing(run, spacing_hundredths=200)` | Character tracking on a text run. 200 = +2pt spacing. Negative tightens. | Metric labels, column headers, "FOURTH COMMITS TO" text |
| `set_diagonal_gradient(shape, stops, angle_deg=135)` | Diagonal gradient fill on any shape. stops=[{pos, color, alpha}]. | Metric slabs (teal->deep blue at 135 deg) |
| `create_progress_bar(slide, left, top, width, height, fill_pct, track_color, fill_color, track_alpha=20, corner_radius_pct=50)` | Two overlapping shapes: track (alpha fill, full width) + fill bar (solid, percentage of width). Returns (track, fill). | Gap cards, stat visualizations |
| `create_ring_segment(slide, cx, cy, outer_r, inner_r, start_deg, sweep_deg, fill_color, alpha=100)` | Custom geometry donut arc via `<a:custGeom>`. Partial ring with inner/outer radii. | KPI progress ring (percentage metrics) |
| `add_decorative_line(slide, start_left, start_top, end_left, end_top, color, alpha=10, width_pt=0.5)` | Thin decorative diagonal line shape. Low alpha for subtle depth. | Section break variant 0 (right-side decorative lines) |

**IMPORTANT:** After any XML injection, element order in spPr MUST be:
xfrm -> prstGeom -> fill -> ln -> effectLst. Use `_reorder_spPr_children()`.

### fourth_pptx_data.py

**Classes:**
- `ChartBuilder` -- bar, column, line, area, pie, donut, scatter, combo charts; plus dark-theme variants
- `TableBuilder` -- styled tables, KPI tables, matrix comparison tables; plus dark-theme table
- `DataFormatter` -- currency, percentage, number formatting

**Key methods:**

| Method | Purpose |
|---|---|
| `ChartBuilder.add_bar_chart(slide, categories, series, title, position)` | Horizontal bars |
| `ChartBuilder.add_column_chart(...)` | Vertical columns |
| `ChartBuilder.add_line_chart(...)` | Trend lines with markers |
| `ChartBuilder.add_donut_chart(slide, categories, values, title, position)` | Part-of-whole |
| `ChartBuilder.add_combo_chart(slide, categories, bar_series, line_series, ...)` | Column + line |
| `ChartBuilder.add_dark_bar_chart(slide, categories, series, title, position)` | Bar chart for dark bg |
| `ChartBuilder.add_dark_column_chart(...)` | Column chart for dark bg |
| `ChartBuilder.add_dark_line_chart(...)` | Line chart for dark bg |
| `ChartBuilder.add_dark_area_chart(slide, categories, series, title, position, gradient_color, smooth)` | Premium gradient area chart: teal-to-transparent fill, smooth curves, circle markers |
| `ChartBuilder.add_dark_donut(slide, categories, values, title, position, cutout)` | Donut for dark bg |
| `TableBuilder.add_table(slide, headers, rows, position)` | Standard table |
| `TableBuilder.add_kpi_table(slide, kpis, position)` | KPI display table |
| `TableBuilder.add_matrix_table(slide, headers, rows, position)` | Feature comparison with check/cross |
| `TableBuilder.add_dark_table(slide, headers, rows, position, col_widths)` | Semi-transparent rows on dark bg |

---

## 8. Skill Stack

This skill is self-contained with a bundled `html-engine/` for HTML Phase 1:

```
html-engine/                       <- Bundled: HTML themes, components, style presets
      +                               fourth-executive theme (default), midnight-executive (alt)
fourth-presentation-suite          <- This skill: Fourth brand, design-first workflow,
                                      content transformation, PPTX generation, quality gates
```

**Before building any presentation, read in this order:**
1. `html-engine/themes/fourth-executive.html` -- **READ FIRST.** Copy the `:root` CSS variables directly from this file. Do not approximate or recreate them. This is the source of truth for all colors, backgrounds, and layout patterns. Logo `<img>` tags use `{{FOURTH_LOGO_WHITE}}` and `{{FOURTH_IQ_ICON}}` placeholders — you will replace these with real data URIs from step 2.
2. `references/logo-data-uris.md` -- **Read ONLY when copying logo URIs into `<img>` tags.** Contains 2 base64-encoded PNG data URIs (~166KB total). Copy the URI for `FOURTH_LOGO_WHITE` into hero, closing, and watermark `<img>` tags. Copy `FOURTH_IQ_ICON` into backdrop and iq-mark `<img>` tags. Do NOT hold this file's content in working memory after copying — it is large and only needed during `<img>` tag construction.
3. This file -- Fourth-specific workflow, design rules, and PPTX API reference
4. `html-engine/STYLE_PRESETS.md` -- CSS custom properties and style presets (Phase 1 only)
5. `html-engine/components/midnight-components.html` -- Reusable HTML components (Phase 1 only)
6. `references/brand-essentials.md` -- color palette, fonts, tone (loose guide)
7. `references/layout-catalog.md` -- layout selection with prescriptive decision logic

### Context Management [CRITICAL]

The logo data URIs are ~166KB of base64 text. To avoid exceeding your context window:
- **DO**: Read `references/logo-data-uris.md` → immediately copy the URIs into your `<img>` tags → move on. Treat it as a clipboard operation.
- **DO NOT**: Read the logo file early and hold it in memory while planning slides. Read it LAST, right before writing the final HTML.
- **DO NOT**: Attempt to paraphrase, compress, or re-encode the base64 strings. Copy verbatim.
- **Recommended workflow**: Build the entire HTML structure with `{{FOURTH_LOGO_WHITE}}` and `{{FOURTH_IQ_ICON}}` placeholders first. Then, as the final step, read `references/logo-data-uris.md` and do a find-replace to insert the actual data URIs.

---

## 9. v5/v6 Visual Design System

v5 replaces the uniform glass-card-for-everything approach with a toolkit of distinct visual primitives. The goal: every slide feels different, breaking the visual monotony that plagued v4.

### 9.1 Container Variety

| Container | When | Visual Effect |
|---|---|---|
| Glass card (`apply_glass_card`) | Sidebar cards, recommendation rows | Semi-transparent with rounded corners, glow, and shadow |
| Accent strip (`_add_accent_strip`) | Commitment items, inline highlights | Teal left bar + 6% white-fill body. Clean and compact. |
| Metric slab (`_add_metric_slab`) | Hero stats, premium number callouts | Teal-to-deep-blue diagonal gradient with inner shadow. 72pt value. |
| Floating badge (`_add_floating_badge`) | Status indicators, labels, tags | Auto-width pill with solid fill. Default teal bg. |
| Progress bar (`_add_progress_bar_shape`) | Gap metrics, completion status | Track (20% alpha) + fill (solid). Optional percentage label. |
| Data card row | Gap slide rows | 4% white fill + status-colored bottom border |
| Split panel | Mutual commitments | Two tinted columns (deep blue / sky blue) with vertical accent bars |
| Icon box | Feature cards, resource items, three-column layouts | 48x48px rounded container with Lucide icon. NEVER emoji. |

**Rule:** No more than 3 glass cards on any single slide. If you have 4+ containers, use accent strips or data card rows instead.

**Stat Row Data Model [MANDATORY]:** Every stat card MUST include all 4 fields:
1. `value` — the metric number (e.g., "346K", "$2.1M", "94%")
2. `label` — what it measures (e.g., "TOTAL LOGINS", "REVENUE")
3. `change` — period-over-period delta with direction (e.g., "+12% QoQ", "-3% MoM")
4. `status` — good/watch/action driving the accent color

A stat card with only value and label is INCOMPLETE. The change delta and status color are what make stat rows superior to plain KPI grids.

### 9.2 Status Differentiation

All status-aware slides (stat row, gap, badges) use consistent color coding:

| Status | Accent Color | Hex | Use |
|---|---|---|---|
| `good` | Teal | `00B69F` | On track, positive change, target met |
| `watch` | Amber | `FFB700` | Needs attention, slight miss, declining trend |
| `action` | Red | `D81632` | Critical gap, immediate action needed |

### 9.3 Scale Drama

v5 uses dramatic size contrast to create visual hierarchy:

| Element | Size | Context |
|---|---|---|
| KPI hero number | 144pt | `add_kpi_slide` -- the biggest number in the deck |
| Outcome stat | 96pt | `add_outcome_slide` -- large but not hero-level |
| Stat card value | 36-48pt | `add_stat_row_slide` -- auto-scaled by character count |
| Section number bg | 200pt | Section break variant 1 -- giant 5% opacity watermark |
| Metric label | 28pt | KPI slide -- with +150 hundredths letter spacing |

### 9.4 Shape-Based Data Visualization

v5 uses shapes (not just charts) for data visualization:

| Shape | Method | Visual |
|---|---|---|
| Progress ring | `create_ring_segment()` | Donut arc for percentage KPIs (outer/inner radius) |
| Progress bar | `create_progress_bar()` | Track + fill bar for gap analysis |
| Mini sparkline | `_add_mini_sparkline()` | Freeform line shape for trends in stat cards |
| Comparison bar | Inline in `add_kpi_slide` | Side-by-side track for non-percentage KPIs |

### 9.5 Decorative Elements

Subtle visual depth without overwhelming content:

| Element | Opacity | Purpose |
|---|---|---|
| Decorative diagonal lines | 6-10% alpha | Section break variant 0, right-side depth |
| Section number watermark | 5% alpha | Section break variant 1, graphic identity |
| Gradient shape | 15-20% alpha | Section break variant 2, asymmetric energy |
| Progress ring track | 8% alpha | KPI slide background arc |
| Card bottom borders | 25% alpha | Gap slide status indicator |

### 9.6 Interactive Element Guidance

The component library (`midnight-components.html`) includes 8 Alpine.js interactive components. Use them to increase information density without cluttering slides.

**Required CDN Includes (in this order — collapse MUST load before Alpine core):**
```html
<!-- Alpine.js Collapse Plugin (MUST load first) -->
<script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
<!-- Alpine.js Core -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

**Component-to-Use-Case Table:**

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

**Main Deck vs Appendix Guidance:**

- **Main deck**: Keep interactions simple. Use tabs for quarterly data views and tooltips for metric definitions. Avoid modals and accordions in the main narrative — they hide information the audience needs to see.
- **Appendix**: Use the full interactive toolkit. Accordions for regional breakdowns, modals for complete data tables, collapsibles for methodology notes, carousels for additional case studies.

**Rule:** Never add interactivity for decoration. Every interactive element must serve a concrete information-density purpose — it should compress 2+ views into one slide or reveal detail that would otherwise require an extra slide.

---

## 10. Quality Checklist

Run this checklist BEFORE delivering any presentation. Design quality first, brand compliance second.

### Design Quality (must all pass)

- [ ] Every numeric claim uses KPI or chart format (NOT bullets)
- [ ] No more than 2 consecutive slides share a background treatment
- [ ] All bullets are 8 words or fewer
- [ ] No slide has more than 4 bullets
- [ ] At least 1 section break per 5 content slides
- [ ] Title and closing slides use DARK backgrounds (`#0A1929` base via `.bg-title` / `.bg-closing`), NOT light teal gradients
- [ ] Fourth logo (image, not text) present on title and closing slides
- [ ] Background watermark logo (`fourth-logo-watermark`) visible on every slide at 8% opacity
- [ ] Background backdrop logo (`fourth-logo-backdrop`) on most content slides at 2.5-3% opacity, position rotating
- [ ] CSS `:root` variables match v6 spec exactly (verify `--bg-primary: #0A1929`, `--fourth-hot-red: #D81632`, `--fourth-purple: #9678B6`)
- [ ] No slide uses the old vignette gradient as a full background
- [ ] Category labels present on content and KPI slides
- [ ] At least one chart or data visualization in any deck with numeric claims
- [ ] Container variety: no more than 3 glass cards per slide
- [ ] No emoji or Unicode codepoints as icons — all icons are Lucide SVG via `<i data-lucide="...">`
- [ ] Lucide CDN included in `<head>` and `lucide.createIcons()` called at end of `<body>`
- [ ] Stat row cards include all 4 fields: value, label, change delta, and status color
- [ ] Interactive elements (tabs, accordions, collapsibles) used where data density warrants
- [ ] Content-to-Layout decision table was followed — no improvised hybrid layouts
- [ ] Feature lists use three-column icon+label layout, not two-column bullet lists
- [ ] Status colors used consistently (teal=good, amber=watch, red=action)
- [ ] No slide would embarrass a VP in a boardroom

### Brand Compliance (must all pass)

- [ ] Colors from Fourth palette only (Deep Blue, Teal, Sky Blue, Midnight Navy, etc.)
- [ ] Poppins font throughout (Semibold for headings, Regular for body)
- [ ] iQ spelled correctly (lowercase i, uppercase Q)
- [ ] "Powered by iQ" on closing slide
- [ ] No pure black (#000000) -- use Midnight Navy (#002747)
- [ ] No Teal text on white backgrounds (accent only, fails contrast)
- [ ] Minimum 14pt text size on all slides
- [ ] Logo IMAGE (base64 data URI from `references/logo-data-uris.md`, NOT text) on title and closing slides — ALWAYS required

### Structural Quality

- [ ] One key idea per slide
- [ ] Insight-driven titles ("Revenue Grew 23%" not "Revenue Data")
- [ ] Active voice throughout
- [ ] No jargon -- hospitality professional should understand without explanation
- [ ] Narrative arc: Hook -> Problem -> Solution -> Evidence -> Action

---

## 11. Premium Execution Standards

These rules are MANDATORY for boardroom-quality output. Violations produce amateurish slides that embarrass the presenter.

### 11.1 Text Must Never Overflow Its Container

python-pptx textboxes overflow silently -- text renders past the box boundary and collides with neighboring elements. The code has auto-shrink guards, but content authors must also respect constraints:

| Element | Max Length | Why |
|---|---|---|
| Stat card value | 6 chars | Cards are 2.6" wide at 36-48pt |
| Stat card label | 20 chars | Two lines max in the label zone |
| KPI hero number | 6 chars | 144pt in full-width centered box |
| Outcome stat_value | 6 chars | 96pt in left panel |
| Checkmark item | 50 chars | >50 wraps to 2 lines at 14pt on 4.6" |
| Sidebar card title | 25 chars | Card is 4.0" with 0.4" padding |
| Sidebar card body | 80 chars | 3-4 lines max at 12pt |
| Roadmap item title | 40 chars | Left-accent card with timeline badge |
| Recommendation title | 45 chars | Glass card with number circle + badge |
| Accent strip text | 60 chars | Full-width container with 0.08" accent bar |
| Floating badge text | 15 chars | Auto-width pill at 10pt |

**If content exceeds these limits:** Rewrite shorter. Do NOT just pass it through and hope for the best. Every extra character risks visual collision.

### 11.2 Background Variety is Mandatory

The builder auto-rotates dark backgrounds through 4 variants (center radial, top-left corner, bottom-right corner, diagonal sweep). Section breaks auto-rotate through 3 composition variants. But the overall deck must also alternate between dark and light:

- **Title + Closing:** Always Fourth Midnight dark gradient (`.bg-title` / `.bg-closing`), NEVER the old teal->sky blue vignette
- **Section breaks:** Always radial gradient (teal -> deep blue -> navy), 3 rotating compositions
- **Content/agenda:** Use `bg='dark'` for EBR agendas (NOT plain white)
- **Data/evidence:** Light background for contrast relief
- **Never:** 4+ consecutive dark slides without a light break

The auto-rotation handles dark variant variety and section break composition variety. The content author handles dark/light rhythm.

### 11.3 Tables Must Look Modern

Default table rendering is borderless with:
- Teal header accent line (2pt bottom border only)
- No cell grid lines
- Semi-transparent alternating row fills (8%/4% white on dark bg)

**Never** produce tables with visible grid lines, solid blue headers, or the default PowerPoint table style. If you see grid lines, the `modern=True` parameter was turned off -- turn it back on.

### 11.4 Spacing Must Account for Text Wrapping

When placing repeated elements (checklist items, card stacks, bullet rows):

| Font Size | Single Line Height | 2-Line Height | Safe Step |
|---|---|---|---|
| 18pt | 0.30" | 0.55" | 0.60" |
| 16pt | 0.26" | 0.48" | 0.55" |
| 14pt | 0.24" | 0.44" | 0.50" |
| 12pt | 0.20" | 0.38" | 0.42" |

Always use the "Safe Step" value for item spacing. Never assume single-line.

### 11.5 EBR Deck Production Checklist

Before delivering ANY EBR/QBR deck, verify:

- [ ] Agenda slide uses dark background with numbered items
- [ ] No stat value truncated or wrapped inside its card
- [ ] All sidebar cards visible (not overflowing slide bottom)
- [ ] All checkmark items readable with no overlap
- [ ] Gap cards have progress bars and status badges (not just a table)
- [ ] No two consecutive dark slides have the same glow position
- [ ] No two consecutive section breaks share the same variant
- [ ] Pull quote has generous spacing (not cramped)
- [ ] Outcome charts render (check for `[CHART]` in verification)
- [ ] Title and closing slides bookend with DARK backgrounds (`.bg-title` / `.bg-closing`), NOT vignette
- [ ] Every KPI stat visible on one line inside its container
- [ ] Mutual commitments uses split-panel layout (not single-column)
- [ ] Sparklines visible on stat row cards when data is provided

---

## 12. Layout Grid Specifications

Construction blueprints for complex slide types. Each entry has a zone diagram, content constraints, and example code. Use these when building PPTX slides to get spacing right first time.

### KPI Hero Slide

**Zones:**
```
+-----------------------+
| [category_label]      |  Zone A: 0.6"-0.8"
+-----------------------+
|    144pt HERO NUMBER  |  Zone B: 0.8"-3.2"
|       (centered)      |  Glow effect on text box
+-----------------------+
| 28pt Metric Label     |  Zone C: 3.3"-4.1"
| (+150 hundredths spc) |  Cool Grey, letter-spaced
+-----------------------+
|   [Progress Ring]     |  Zone D: 4.2"-6.6"
|   or Comparison Bar   |  Percentages get ring,
|                       |  non-% get bar
+-----------------------+
| Context line 14pt     |  Zone E: 6.5"-7.0"
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| category_label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| metric_value | 6 chars | 144pt Bold White + glow |
| metric_label | 30 chars | 28pt Regular Cool Grey + letter spacing |
| context | 60 chars | 14pt Cool Grey |

**Example:**
```python
builder.add_kpi_slide(
    metric_value='15%',
    metric_label='Uplift in Sales Per Labor Hour',
    context='vs. 8% QSR industry average  |  Powered by Fourth iQ',
    category_label='IMPACT',
)
```

### Outcome Slide

**Zones:**
```
+-----------+-----------+
| 96pt Stat | Headline  |  Zone A: 1.1"-2.9"
| Teal bar  | Body      |
+-----------+-----------+
| CHART (full width)    |  Zone B: 3.0"-5.85"
+-----------------------+
| >> Callout            |  Zone C: 6.0"-6.7"
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| stat_value | 6 chars | 96pt Bold White |
| stat_label | 25 chars | 18pt Cool Grey |
| headline | 50 chars (2 lines) | 36pt Bold White |
| body | 120 chars | 14pt Cool Grey |
| chart_data.categories | 3-6 items | -- |
| why_it_matters | 100 chars | 14pt White |

**Example:**
```python
builder.add_outcome_slide(
    label='LABOR EFFICIENCY',
    stat_value='+23%',
    stat_label='Labor Cost Reduction',
    headline='SPLH Trending Up Across All Regions',
    body='Consistent improvement driven by AI-powered scheduling',
    why_it_matters='Every $1 SPLH increase = $420K annual savings at volume',
    chart_data={
        'categories': ['Jan', 'Feb', 'Mar', 'Apr'],
        'series': [{'name': 'SPLH ($)', 'values': [16.20, 17.10, 17.85, 18.42]}],
        'title': 'Sales Per Labor Hour',
    },
)
```

### Stat Row Slide

**Zones:**
```
+-----------------------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline 36pt         |
+-----------------------+
| [Card] [Card] [Card]  |  Zone B: 3.0"-6.2"
| 36-48pt status cards  |  (max 4 cards, centered)
| accent bar on top     |  teal/amber/red by status
| [sparkline]           |  mini trend line (optional)
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars | 36pt Bold White |
| stats[].value | 6 chars | Auto-scaled: <=3 chars 48pt, <=5 chars 40pt, 6+ chars 36pt |
| stats[].label | 20 chars | 12pt Cool Grey |
| stats[].change | 10 chars | 12pt Teal/Red |
| stats[].status | good/watch/action | Accent bar + card tint color |
| sparkline_data[] | 2+ floats per card | Teal freeform line, auto-normalized |

**Example:**
```python
builder.add_stat_row_slide(
    label='KEY METRICS',
    headline='Q2 2025 Performance Snapshot',
    stats=[
        {'value': '346K', 'label': 'Total Logins', 'change': '+12% QoQ', 'status': 'good'},
        {'value': '97%', 'label': 'Approval Rate', 'change': '+2.1%', 'status': 'good'},
        {'value': '$18.42', 'label': 'Sales Per Labor Hour', 'change': '+$1.37', 'status': 'good'},
        {'value': '94%', 'label': 'Shift Fill Rate', 'change': '-1.2%', 'status': 'watch'},
    ],
    sparkline_data=[
        [310, 325, 338, 346],
        [94, 95, 96.5, 97],
        [16.2, 17.1, 17.85, 18.42],
        [96, 95.5, 95, 94],
    ],
)
```

### Dark Content Slide

**Zones:**
```
+-----------+-----------+
| [eyebrow]             |  Zone A: 0.8"-2.5"
| Headline 36pt         |
| ---- teal accent ---- |
+-----------+-----------+
| Body text | [Card 1]  |  Zone B: 2.9"-7.0"
| bullets   | [Card 2]  |  Left 7": body
| or prose  | [Card 3]  |  Right 4": glass cards
+-----------+-----------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars (2 lines) | 36pt Bold White (hl_h=1.0") |
| body | 300 chars or 4 bullets | 18pt Cool Grey |
| sidebar_cards[].title | 25 chars | 14pt Bold White |
| sidebar_cards[].body | 80 chars (3-4 lines) | 14pt Cool Grey |

**Sidebar auto-fit:** Card heights auto-calculate from available space:
`card_h = (SLIDE_HEIGHT - body_top - MARGIN_BOTTOM - (n-1) * 0.2") / n`

**Example:**
```python
builder.add_dark_content_slide(
    label='WORKFORCE INTELLIGENCE',
    headline='AI Forecasting Drives Precision Scheduling',
    body=[
        'Demand signals integrated from POS + weather + events',
        '15-minute interval labor plans vs. daily blocks',
        'Manager override rate down 34% since launch',
    ],
    sidebar_cards=[
        {'title': 'Forecast Accuracy', 'body': '92.4% accuracy on 7-day labor demand. Industry average is 78%.'},
        {'title': 'Schedule Optimization', 'body': 'AI fills 89% of shifts within 2 hours of posting. Overtime down 18%.'},
        {'title': 'Manager Adoption', 'body': '94% of GMs use AI-suggested schedules. Training NPS: +72.'},
    ],
)
```

### Gap Slide

**Zones:**
```
+-----------------------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline 36pt         |
+-----------------------+
| Area Name (16pt bold) |  Zone B: 2.2"-6.5"
| Current: X | Target: Y|  Card-per-row layout
| [====progress bar====]|  max 6 rows
| [GAP badge] [STATUS]  |  Progress bar + floating badges
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars | 36pt Bold White |
| gaps[].area | 30 chars | 16pt Bold White |
| gaps[].current | 15 chars | 11pt Cool Grey |
| gaps[].best_practice | 15 chars | 11pt Cool Grey |
| gaps[].gap | 15 chars | 10pt Bold White (floating badge) |
| gaps[].status | good/watch/action | Badge + border color |

**Example:**
```python
builder.add_gap_slide(
    label='GAP ANALYSIS',
    headline='Areas for Improvement',
    gaps=[
        {'area': 'Schedule Adherence', 'current': '87%', 'best_practice': '95%', 'gap': '-8 pts', 'status': 'action'},
        {'area': 'Labor Cost %', 'current': '29.1%', 'best_practice': '26%', 'gap': '+3.1 pts', 'status': 'watch'},
        {'area': 'Forecast Accuracy', 'current': '92.4%', 'best_practice': '95%', 'gap': '-2.6 pts', 'status': 'watch'},
        {'area': 'Turnover Rate', 'current': '62%', 'best_practice': '45%', 'gap': '+17 pts', 'status': 'action'},
    ],
)
```

### Recommendation Slide

**Zones:**
```
+-----------------------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline 36pt         |
+-----------------------+
| (1) Title        [Q1] |  Zone B: 2.4"-6.8"
|     Description        |  Glass cards, max 5 rows
| (2) Title        [Q2] |  Numbered circles + pill
|     Description        |  timeline badges right
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars | 36pt Bold White |
| actions[].title | 40 chars | 18pt Bold White |
| actions[].description | 80 chars | 14pt Cool Grey |
| actions[].timeline | 10 chars | 10pt Bold White (pill badge) |

**Example:**
```python
builder.add_recommendation_slide(
    label='RECOMMENDATIONS',
    headline='Three Actions to Accelerate Results',
    actions=[
        {'title': 'Deploy Schedule Adherence Alerts', 'description': 'Real-time push notifications when locations deviate from planned schedules by more than 10%', 'timeline': 'Q3 2025'},
        {'title': 'Expand AI Forecasting to Catering', 'description': 'Extend demand prediction to catering and event orders -- currently manual, high-waste category', 'timeline': 'Q3 2025'},
        {'title': 'Pilot Retention Risk Scoring', 'description': 'Use tenure, schedule patterns, and engagement data to flag flight-risk employees 30 days early', 'timeline': 'Q4 2025'},
    ],
)
```

### Mutual Commitments Slide

**Zones:**
```
+-----------+-----------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline (centered)   |
+-----------+-----------+
| FOURTH     | CLIENT   |  Zone B: 2.0"-5.6"
| COMMITS TO | COMMITS  |  Split-panel: deep blue
| [teal bar] | [sky bar]|  tint left, sky blue
| >> item    | >> item  |  tint right
| >> item    | >> item  |  Check circles + accent
| >> item    | >> item  |  strips per item
+-----------+-----------+
| NEXT REVIEW: date     |  Zone C: 6.0"-7.0"
| contact info          |  Compact footer bar
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 40 chars | 36pt Bold White (centered) |
| fourth_items[] | 50 chars each (>50 wraps, warn) | 14pt White, check circles, accent strips |
| client_items[] | 50 chars each (>50 wraps, warn) | 14pt White, check circles, accent strips |
| client_name | 20 chars | 12pt Bold Teal UPPERCASE + letter spacing |
| next_review_date | 15 chars | 14pt Bold Teal |
| contact_name | 30 chars | 14pt Cool Grey |
| contact_email | 40 chars | 14pt Cool Grey |

**Example:**
```python
builder.add_mutual_commitments_slide(
    label='NEXT STEPS',
    headline='Mutual Commitments',
    fourth_items=[
        'Deploy schedule adherence alerts by Aug 15',
        'Complete catering forecast pilot at 5 locations',
        'Deliver retention risk scoring POC',
        'Quarterly optimization review with Ops team',
    ],
    client_items=[
        'Provide catering sales data for 12 months',
        'Assign GM champions at 5 pilot locations',
        'Share turnover exit-interview data',
        'Schedule Q3 EBR for September 18',
    ],
    client_name="Torchy's Tacos",
    next_review_date='September 18, 2025',
    contact_name='Sarah Mitchell',
    contact_email='sarah.mitchell@fourth.com',
)
```

### Roadmap Slide

**Zones:**
```
+-----------------------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline 36pt         |
+-----------------------+
| [pill] [pill] [pill]  |  Zone B: 2.2"-2.6"
+-----------------------+
| >> Title     [Q1 '26] |  Zone C: 2.75"-6.4"
|    Desc + "Relevant.." |  Left-accent cards, max 4
| >> Title     [Q2 '26] |  Teal left bar + outline pill
|    Desc + "Relevant.." |
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars | 36pt Bold White |
| pills[].text | 15 chars | 10pt Bold White (pill badge) |
| pills[].style | solid/outline | Teal fill or outline |
| items[].title | 40 chars | 16pt Bold White |
| items[].description | 80 chars | 14pt Cool Grey |
| items[].relevant | 80 chars | 12pt "Relevant because:" Teal + Grey |
| items[].timeline | 10 chars | Outline pill badge |

**Example:**
```python
builder.add_roadmap_slide(
    label='ROADMAP RELEVANCE',
    headline="What's Coming That Matters to You",
    pills=[
        {'text': 'AI/ML', 'style': 'solid'},
        {'text': 'Scheduling', 'style': 'solid'},
        {'text': 'Analytics', 'style': 'outline'},
    ],
    items=[
        {
            'title': 'Intelligent Break Scheduling',
            'description': 'ML-optimized break timing that balances compliance, coverage, and employee preference',
            'relevant': "Torchy's has 12% break-compliance gaps in TX locations",
            'timeline': 'Q3 2025',
        },
        {
            'title': 'Cross-Location Labor Sharing',
            'description': 'Automated shift-offer routing across nearby locations when demand spikes or no-shows occur',
            'relevant': "23 Torchy's locations within 15-mile clusters in DFW and Austin",
            'timeline': 'Q4 2025',
        },
    ],
)
```

---

## 13. v6 Theme System

v6 aligns the PPTX engine with the "Fourth Executive v2" HTML theme. The visual identity shifts from mid-blue backgrounds to a near-black "Fourth Midnight" palette with multi-color glow variety.

### 13.1 Fourth Midnight Palette

| Token | Hex | Role |
|---|---|---|
| Fourth Midnight (body) | `#0A1929` | Primary slide body background (L=10%, near-black with blue DNA) |
| Deepest dark | `#051526` | Title/closing gradient endpoints (L=7%) |
| Dark card surface | `#0F2A3F` | Glass card fills on midnight body |
| Glass fill | `rgba(15,42,63,0.55)` | Denser glass cards on near-black (was 0.10 alpha on mid-blue) |

The old Deep Blue `#0C4A7D` (L=27%) remains in the brand palette for non-slide contexts but is no longer the primary slide background.

### 13.2 Four-Color Glow Rotation

v5 used teal glow exclusively. v6 rotates through 4 glow colors across slides to prevent visual monotony:

| Order | Color | Hex | Effect |
|---|---|---|---|
| 1 | Teal | `#00B69F` | Default brand energy |
| 2 | Sunrise Orange | `#FAA51A` | Warm accent glow |
| 3 | Purple | `#9678B6` | Differentiation depth |
| 4 | Sky Blue | `#6FB4E3` | Cool open glow |

**PPTX usage:** `FourthBrand.GLOW_COLORS[counter % 4]` provides the next color in rotation. The glow rotation is independent of the dark background variant rotation (Section 4).

**HTML usage:** CSS classes `.glow-teal`, `.glow-sunrise`, `.glow-purple`, `.glow-sky` apply the corresponding glow. Background variants auto-rotate colored radial glows (teal center, sunrise top-left, purple bottom-right, sky blue fallback).

### 13.3 Accent Redistribution

| Role | v5 | v6 |
|---|---|---|
| Primary accent | Teal `#00B69F` | Sky Blue `#6FB4E3` |
| Secondary accent | Sky Blue `#6FB4E3` | Teal `#00B69F` (accent lines, status indicators only) |
| Status good | Teal | Teal (unchanged) |
| Status action | `#D9373B` | `#D81632` (corrected to brand-essentials) |

Sky Blue is promoted to primary accent for headings, links, and interactive elements. Teal remains for status-good indicators and thin accent lines.

### 13.4 Corrected Brand Colors

Per `brand-essentials.md`, the following colors were corrected in v6:

| Color | v5 Value | v6 Value (Corrected) |
|---|---|---|
| Hot Red | `#D9373B` | `#D81632` |
| Purple | `#9279B2` | `#9678B6` |
| Sunrise Orange | (not present) | `#FAA51A` |

### 13.5 Glass Card Density

On the near-black Fourth Midnight body, glass cards use denser fills:
- Fill: `rgba(15,42,63,0.55)` (was `rgba(255,255,255,0.10)` on mid-blue)
- Border: `rgba(111,180,227,0.15)` (Sky Blue tint instead of white)
- Backdrop blur: 20px (HTML) / inner shadow approximation (PPTX)

---

## 14. Reference Files

| File | Path | Purpose |
|---|---|---|
| Brand essentials | `references/brand-essentials.md` | Color palette, fonts, tone, iQ rules. Loose guide -- constrains palette, not layout. |
| Layout catalog | `references/layout-catalog.md` | Prescriptive layout selection with When/When Not/Background/Typography per type. |
| HTML theme (default) | `html-engine/themes/fourth-executive.html` | Fourth Executive brand-aligned HTML theme (Phase 1). |
| HTML theme (alt) | `html-engine/themes/midnight-executive.html` | Midnight Executive generic dark theme (Phase 1). |
| HTML style presets | `html-engine/STYLE_PRESETS.md` | CSS custom properties, color tokens, animation presets. |
| HTML components | `html-engine/components/midnight-components.html` | Reusable HTML slide components (Phase 1). |
| HTML template ref | `references/fourth-html-template.md` | HTML presentation structure spec. |
| OOXML effects | `scripts/fourth_ooxml.py` | OoxmlEffects -- glass cards, gradients, glow, shadows, progress bars, ring segments, decorative lines. |
| Core PPTX script | `scripts/fourth_pptx_core.py` | PresentationBuilder, BackgroundManager, BackgroundRotation, rebrander, v5 helpers. |
| Data viz script | `scripts/fourth_pptx_data.py` | ChartBuilder, TableBuilder, DataFormatter + dark-theme variants. |
| Backgrounds | `assets/backgrounds/` | 16 pre-rendered background PNGs. |
| Logos | `assets/logos/` | 4 Fourth logo variants (standard, white, teal-on-dark, icon). |
| Template | `assets/template/` | Official PPTX template file. |
