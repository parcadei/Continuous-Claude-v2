---
name: fourth-presentation-suite
description: Generate Fourth-branded EBR/QBR and sales presentations using a two-phase workflow. Phase 1 builds a stunning animated HTML presentation for design review and approval. Phase 2 converts the approved HTML to PPTX for distribution. HTML is always built first -- PPTX is never built until the user explicitly approves the HTML design. Uses the bundled html-engine for visual quality with Fourth brand identity. v6 adds Fourth Midnight palette, 4-color glow rotation, and corrected brand colors.
---

# Fourth Presentation Suite v6

---

## 1. Design Philosophy

**Visual design principles drive layout. Fourth brand guidelines constrain color and font.**

The #1 failure mode of AI-generated presentations is text walls on white backgrounds. Every slide must earn its place through visual impact, not word count.

### Core Principles

1. **Visual Format First**: Before writing any bullet, ask -- can this be a stat, chart, quote, or table? If yes, use that format instead.
2. **One idea per slide**: If a slide has two ideas, split it into two slides.
3. **Numbers dominate**: Key metrics get 72-144pt treatment. They are the visual anchor, not a footnote.
4. **Variety is mandatory**: No two consecutive slides should look the same.
5. **White space is design**: A half-empty slide with one powerful number beats a full slide of bullets.
6. **Container variety**: Glass cards are ONE option, not the default for everything. Use accent strips, metric slabs, floating badges, and progress bars.

### Anti-Patterns (NEVER)

- Same white background on every slide; paragraph text on slides; bullets > 8 words; > 4 bullets per slide
- Numbers in bullet form when chart/KPI format exists; same layout for 3+ consecutive slides
- Every container styled as a glass card; emoji/Unicode as icons (use Lucide SVG — see `references/icon-catalog.md`)
- Improvised hybrid layouts when the Content-to-Layout table prescribes a specific pattern
- Static cards for time-series data (use tabs/accordions); charts without insight titles

---

## 1B. Visual Identity Non-Negotiables [CRITICAL]

**BLOCKING rules. Do not approximate, improvise, or substitute any value.**

### Mandatory CSS Variables

Copy the `:root` block VERBATIM from `html-engine/themes/fourth-executive.html` into every HTML presentation. Do NOT approximate, rename, or recreate values — that file is the source of truth.

**Critical values to verify** (these are the ones most often wrong):
- `--bg-primary: #0A1929` (NOT `#0C2B46` or any other blue)
- `--fourth-hot-red: #D81632` (NOT `#D9373B`)
- `--fourth-purple: #9678B6` (NOT `#9279B2`)
- `--bg-card: rgba(15, 42, 63, 0.55)` (dense glass on dark body)
- `--fourth-vignette` is for accent elements ONLY, NEVER as a full slide background

### Background Rules [CRITICAL — BLOCK if violated]

1. **Title slide**: MUST use `.bg-title` = `linear-gradient(160deg, #051526 0%, #0A1929 40%, #0F2A3F 100%)` — DARK, near-black. NEVER a light or teal gradient.
2. **Closing slide**: MUST use `.bg-closing` = `linear-gradient(160deg, #0F2A3F 0%, #0A1929 50%, #051526 100%)`.
3. **ALL content slides**: Dark background on `#0A1929` base. Only data/evidence slides may use light backgrounds.
4. **NEVER use the old vignette gradient** as a slide background. It is for accent elements ONLY.
5. **4-color glow rotation** across dark content slides — no two consecutive slides share the same glow:

| CSS Class | Glow Color | Feel |
|---|---|---|
| `.bg-dark-radial` | Teal `rgba(0, 182, 159, 0.08)` at center | Cool, tech |
| `.bg-dark-tl` | Sunrise `rgba(250, 165, 26, 0.06)` at top-left | Warm energy |
| `.bg-dark-br` | Purple `rgba(150, 120, 182, 0.07)` at bottom-right | Depth |
| `.bg-dark-sweep` | Linear sweep `#051526 → #0A1929 → #153650` | Diagonal dark |

### Logo Rules [CRITICAL — BLOCK if violated]

1. **Title slide**: MUST include Fourth logo image (`fourth-logo-hero` class, 120px, base64 `<img>` — NOT text saying "FOURTH").
2. **Closing slide**: MUST include Fourth logo image (`fourth-logo-closing` class, 180px).
3. **Content slides**: SHOULD include `fourth-icon.png` as large nearly-transparent backdrop (`fourth-logo-backdrop` class, 600-800px, 2.5-3% opacity) — rotate position across slides.
4. **Backdrop positions rotate**: `fourth-logo-backdrop-right`, `fourth-logo-backdrop-left`, `fourth-logo-backdrop-large`.
5. **Every slide**: Small watermark at bottom-right (`fourth-logo-watermark` class, 80px, 8% opacity).
6. **Logo data URIs**: In `references/logo-data-uris.md`. Read ONLY when copying into `<img>` tags. Theme uses `{{FOURTH_LOGO_WHITE}}` and `{{FOURTH_IQ_ICON}}` placeholders — replace with actual URIs at final step.

### Banned Patterns [BLOCK]

| Banned | Correct | Why |
|---|---|---|
| Old vignette gradient as slide background | `.bg-title` / `.bg-closing` dark gradients | Old vignette is light teal-to-blue. Title/closing MUST be dark. |
| `--bg-primary: #0C2B46` | `--bg-primary: #0A1929` | Old mid-blue value. v6 uses near-black. |
| `--fourth-hot-red: #D9373B` | `--fourth-hot-red: #D81632` | Wrong red. |
| `--fourth-purple: #9279B2` | `--fourth-purple: #9678B6` | Wrong purple. |
| Text-only "FOURTH" as logo | `<img src="data:image/png;base64,...">` | Logo is an image, always use base64 URI. |
| Same glow color on all slides | Rotate through teal/sunrise/purple/sky | No variety = amateurish. |

### Icon Rules [CRITICAL — BLOCK if violated]

NEVER use emoji or Unicode codepoints as icons. All icons MUST be Lucide SVG via CDN.
See `references/icon-catalog.md` for CDN setup, usage pattern, sizing, and the full EBR/QBR icon mapping table.

---

## 2. Content Transformation Step

Between receiving raw content and generating slides, MUST classify and transform:

| Content Tag | Examples | Route To |
|---|---|---|
| METRIC | "23% cost reduction", "$2.1M revenue" | KPI slide or chart |
| TREND | "Q1: $1.2M, Q2: $1.5M, Q3: $1.8M" | Line/area chart |
| BREAKDOWN | "Restaurants 45%, Hotels 30%" | Donut/bar chart |
| QUOTE | Customer testimonial | Pull-quote slide |
| COMPARISON | "Before/after", feature matrix | Comparison or matrix slide |
| GAP | "Current 73%, target 92%, gap -19pts" | Gap slide with progress bars |
| NARRATIVE | Everything else | Content slide (bullets ONLY) |

Rewrite rules: Every bullet MAX 8 words. Every title MAX 12 words, stating the insight not the topic. Then use Section 3 to assign layouts.

---

## 3. Content-to-Layout Decision Table [MANDATORY — BLOCKING]

**If content matches a layout in this table, that layout MUST be used. Improvised hybrid layouts are an error.**

| Content Type | Layout | NOT This |
|---|---|---|
| Single key metric | Full-slide KPI (144pt number + progress ring) | Bullet with the number |
| 2-4 metrics together | KPI card grid (2x2 or 1x3) | Bullet list of numbers |
| 2-4 metrics with status | Stat row slide (status-colored cards + sparklines) | KPI grid without status |
| Outcome with evidence | Outcome slide (96pt stat + teal divider + narrative) | Bullet list of results |
| Trend over time | Line/area chart | Table of numbers by quarter |
| Category breakdown | Bar chart or donut | Bullets listing percentages |
| Customer quote | Pull-quote (large text, teal bar) | Regular bullet |
| Before/after | Two-column contrast | Paragraph describing both |
| Gap/variance | Gap slide (card-per-row, progress bars, status badges) | Bullet list of gaps |
| Action items | Recommendation slide (numbered glass cards) | Bullet list |
| Partnership commitments | Mutual commitments slide (split-panel checkmarks) | Single bullet list |
| Strategic roadmap | Roadmap slide (pill badges + accent cards) | Bullet list |
| Feature list (3-4 items) | Three-column icon+label | Bullet list |
| Section transition | Full gradient + oversized title (3 rotating variants) | Content slide with "Section:" prefix |
| Problem statement | Dark bg + single large sentence | Multi-bullet content slide |

### Prescribed HTML Templates

**Platform Engagement → Stat Row:**
```html
<div class="stat-row">
    <div class="stat-card stat-good">
        <div class="stat-value" data-target="346000" data-suffix="K">346K</div>
        <div class="stat-label">TOTAL LOGINS</div>
        <div class="stat-change positive"><i data-lucide="trending-up"></i> +12% QoQ</div>
    </div>
    <!-- Status classes: stat-good, stat-watch, stat-action -->
</div>
```

**Support/Feature Lists → Three-Column Icon+Label:**
```html
<div class="three-col">
    <div class="feature-card">
        <div class="icon-box icon-box-teal"><i data-lucide="life-buoy"></i></div>
        <h3>Customer Success Portal</h3>
        <p>24/7 support at help.hotschedules.com</p>
    </div>
</div>
```

### EBR/QBR Recommended Slide Sequence

1. Title → 2. Section break: "Performance Overview" → 3. Stat row / KPI grid → 4. Outcome slide → 5. Dark content slide → 6. Section break: "Opportunities" → 7. Gap slide → 8. Pull quote → 9. Section break: "Next Steps" → 10. Recommendation slide → 11. Roadmap slide → 12. Mutual commitments → 13. Closing

---

## 4. Background Rotation Pattern

| Slide Type | Treatment |
|---|---|
| Title / Closing | Fourth Midnight dark gradient (`.bg-title` / `.bg-closing` — NEVER vignette) |
| Section break | Radial gradient (3 variants rotate) |
| All dark content slides | Auto-rotated variant (radial/corner-tl/corner-br/sweep) |
| Content/evidence | Soft White (#F5F5F5) or White |
| Chart/data | White or very subtle blue tint |
| Quote/testimonial | Midnight Navy + left-edge teal accent bar |

**Hard rule:** No more than 2 consecutive slides share the same background. Never 4+ consecutive dark slides without a light break. Use `BackgroundRotation` helper to enforce during PPTX generation.

**Section break variants** auto-rotate via `_section_break_counter % 3`: left-aligned + decorative lines (v0), full-bleed section number watermark (v1), asymmetric + gradient shape (v2).

---

## 5. Typography as Design Element

| Element | Size | Weight | Notes |
|---|---|---|---|
| Category label | 12pt | Poppins SemiBold UPPERCASE | Teal, above slide title |
| Slide title | 36-48pt | Poppins SemiBold | Deep Blue on light, White on dark |
| KPI number | 72-144pt | Poppins Bold | Dominant visual element |
| Section break headline | 60-80pt | Poppins SemiBold | White on gradient |
| Body text | 18pt | Poppins Regular | Supporting role only |
| Caption / source | 12-14pt | Poppins Regular | Footnotes, attributions |

Every content/KPI slide SHOULD have a small uppercase category label above the title (e.g., `WORKFORCE INTELLIGENCE`, `ROI`, `NEXT STEPS`).

---

## 6. The Two-Phase Workflow

### Phase 1: HTML Design

Build HTML → internal quality gate → deliver to user → user reviews in browser → revisions if needed → user approves.

**Rules:**
- Never build PPTX before HTML is approved
- After delivering HTML, end with: *"Open in your browser to review. When happy, say 'approved' and I'll convert to PPTX."*

### Phase 2: PPTX Conversion

Only triggered by explicit approval. No new design decisions — faithful conversion only.

**State before converting:** *"Converting to PPTX. Animations become static, web fonts substituted, but content, structure, and brand colours carry over faithfully."*

### PPTX Conversion Map

Each HTML slide type maps 1:1 to a `builder.add_*()` method. Key mappings:

- Title → `add_title_slide` | Section break → `add_section_break` | Closing → `add_closing_slide`
- KPI single → `add_kpi_slide` | KPI grid → `add_kpi_grid` | Stat row → `add_stat_row_slide`
- Outcome → `add_outcome_slide` | Gap → `add_gap_slide` | Recommendation → `add_recommendation_slide`
- Dark content → `add_dark_content_slide` | Roadmap → `add_roadmap_slide` | Mutual commitments → `add_mutual_commitments_slide`
- Chart → `add_data_slide` + `cb.add_*()` | Table → `add_table_slide` + `tb.add_*()`
- Quote → `add_pull_quote` | Problem → `add_problem_slide` | Before/after → `add_comparison_slide`

Full signatures and parameters: `@references/script-api-reference.md`

---

## 7. Script Reference

Three scripts power PPTX generation. Full API tables: `@references/script-api-reference.md`

| Script | Key Classes |
|---|---|
| `scripts/fourth_pptx_core.py` | `PresentationBuilder`, `BackgroundRotation`, `FourthBrand`, `TextFormatter`, `PresentationRebrander` |
| `scripts/fourth_ooxml.py` | `OoxmlEffects` — glass cards, gradients, glow, shadows, progress bars, ring segments |
| `scripts/fourth_pptx_data.py` | `ChartBuilder`, `TableBuilder`, `DataFormatter` + dark-theme variants |

Instantiate before use: `cb = ChartBuilder()` / `tb = TableBuilder()`

**OOXML element order after any XML injection:** `xfrm -> prstGeom -> fill -> ln -> effectLst`. Use `_reorder_spPr_children()`.

---

## 8. Skill Stack & Read Order

**Before building any presentation, read in this order:**

1. `html-engine/themes/fourth-executive.html` — **READ FIRST.** Source of truth for CSS variables, backgrounds, and layout patterns. Uses `{{FOURTH_LOGO_WHITE}}` and `{{FOURTH_IQ_ICON}}` placeholders.
2. `references/logo-data-uris.md` — **Read ONLY when copying logo URIs into `<img>` tags.** ~166KB of base64. Copy → paste → move on. Do NOT hold in working memory.
3. This file — workflow, design rules, PPTX conversion map
4. `html-engine/STYLE_PRESETS.md` — CSS custom properties (Phase 1 only)
5. `html-engine/components/midnight-components.html` — Reusable components (Phase 1 only)
6. `references/brand-essentials.md` — color palette, fonts, tone
7. `references/layout-catalog.md` — layout selection with decision logic

**Context management:** Build entire HTML with `{{FOURTH_LOGO_WHITE}}` / `{{FOURTH_IQ_ICON}}` placeholders first. Then, as the final step, read `references/logo-data-uris.md` and do a find-replace. Never read it early and hold it in memory.

---

## 9. v5/v6 Visual Design System

### 9.1 Container Variety

| Container | When | Visual Effect |
|---|---|---|
| Glass card (`apply_glass_card`) | Sidebar cards, recommendation rows | Semi-transparent, rounded, glow, shadow |
| Accent strip (`_add_accent_strip`) | Commitment items, inline highlights | Teal left bar + 6% white-fill body |
| Metric slab (`_add_metric_slab`) | Hero stats, premium number callouts | Teal-to-deep-blue diagonal gradient, 72pt value |
| Floating badge (`_add_floating_badge`) | Status indicators, labels, tags | Auto-width pill with solid fill |
| Progress bar (`_add_progress_bar_shape`) | Gap metrics, completion status | Track (20% alpha) + fill (solid) |
| Data card row | Gap slide rows | 4% white fill + status-colored bottom border |
| Split panel | Mutual commitments | Two tinted columns (deep blue / sky blue) |
| Icon box | Feature cards, three-column layouts | 48x48px rounded container with Lucide icon |

**Rule:** No more than 3 glass cards on any single slide.

**Stat Row Data Model [MANDATORY]:** Every stat card MUST include all 4 fields: `value`, `label`, `change` (period-over-period delta), `status` (good/watch/action). A card with only value and label is INCOMPLETE.

### 9.2 Status Differentiation

| Status | Color | Hex | Use |
|---|---|---|---|
| `good` | Teal | `00B69F` | On track, positive change, target met |
| `watch` | Amber | `FFB700` | Needs attention, slight miss |
| `action` | Red | `D81632` | Critical gap, immediate action needed |

### 9.3 Scale Drama

| Element | Size | Context |
|---|---|---|
| KPI hero number | 144pt | `add_kpi_slide` |
| Outcome stat | 96pt | `add_outcome_slide` |
| Stat card value | 36-48pt | `add_stat_row_slide` (auto-scaled by char count) |
| Section number bg | 200pt | Section break variant 1 (5% opacity watermark) |
| Metric label | 28pt | KPI slide with +150 hundredths letter spacing |

### 9.4 Interactive Elements

Alpine.js components available for information density. Full component table and CDN setup: `@references/interactive-components.md`

**Rule:** Never add interactivity for decoration. Every interactive element must compress 2+ views into one slide.

---

## 10. Quality Checklist

Run before delivering any presentation.

### Design Quality
- [ ] Every numeric claim uses KPI or chart format (NOT bullets)
- [ ] No more than 2 consecutive slides share a background treatment
- [ ] All bullets 8 words or fewer; no slide has more than 4 bullets
- [ ] At least 1 section break per 5 content slides
- [ ] Title and closing slides use DARK backgrounds (`.bg-title` / `.bg-closing`), NOT light teal gradients
- [ ] Fourth logo (image, not text) on title and closing slides
- [ ] Watermark logo on every slide (8% opacity); backdrop logo on most content slides (2.5-3% opacity, rotating position)
- [ ] CSS `:root` matches v6 spec (`--bg-primary: #0A1929`, `--fourth-hot-red: #D81632`, `--fourth-purple: #9678B6`)
- [ ] No slide uses old vignette gradient as full background
- [ ] Category labels on content and KPI slides
- [ ] Container variety: no more than 3 glass cards per slide
- [ ] No emoji/Unicode as icons — all icons are Lucide SVG via `<i data-lucide="...">`
- [ ] Lucide CDN in `<head>`; `lucide.createIcons()` at end of `<body>`
- [ ] Stat row cards include all 4 fields: value, label, change delta, status
- [ ] Content-to-Layout decision table followed — no improvised hybrid layouts
- [ ] Status colors consistent: teal=good, amber=watch, red=action

### Brand + Structural Quality
- [ ] Colors from Fourth palette only; Poppins font throughout; min 14pt text
- [ ] iQ spelled correctly (lowercase i, uppercase Q); "Powered by iQ" on closing
- [ ] No pure black (#000000) — use Midnight Navy (#002747); no Teal text on white backgrounds
- [ ] Logo IMAGE (base64 from `references/logo-data-uris.md`) on title and closing — ALWAYS required
- [ ] One key idea per slide; insight-driven titles; active voice; no jargon
- [ ] Narrative arc: Hook → Problem → Solution → Evidence → Action

---

## 11. Premium Execution Standards

### Text Overflow Limits

| Element | Max Length |
|---|---|
| Stat card value | 6 chars |
| Stat card label | 20 chars |
| KPI hero number | 6 chars |
| Outcome stat_value | 6 chars |
| Checkmark item | 50 chars |
| Sidebar card title | 25 chars |
| Sidebar card body | 80 chars |
| Roadmap item title | 40 chars |
| Recommendation title | 45 chars |
| Accent strip text | 60 chars |
| Floating badge text | 15 chars |

If content exceeds limits: rewrite shorter. Do NOT pass through and hope for the best.

### Spacing and Other Standards

- **Item spacing:** Use safe step values — 18pt→0.60", 16pt→0.55", 14pt→0.50", 12pt→0.42". Never assume single-line.
- **Tables:** Borderless with teal header accent line (2pt bottom border only), no cell grid lines, semi-transparent alternating row fills. Never visible grid lines or solid blue headers.
- **Background variety:** Auto-rotation handles dark variant and section break composition. Content author handles dark/light rhythm — never 4+ consecutive dark slides.

---

## 12. Layout Grid Specifications

Zone diagrams, field constraints, and Python examples for every slide type.

**See: `@references/layout-grid-specs.md`**

Covers: KPI Hero, Outcome, Stat Row, Dark Content, Gap, Recommendation, Mutual Commitments, Roadmap.

---

## 13. v6 Theme Changes (delta from v5)

- **Background palette**: `--bg-primary` shifted from mid-blue `#0C2B46` to near-black `#0A1929` ("Fourth Midnight"). Old Deep Blue `#0C4A7D` remains in brand palette but is NOT the slide background.
- **Glow rotation**: v5 used teal-only. v6 rotates teal → sunrise → purple → sky blue (`FourthBrand.GLOW_COLORS[counter % 4]`). HTML classes: `.glow-teal`, `.glow-sunrise`, `.glow-purple`, `.glow-sky`.
- **Corrected colors**: Hot Red `#D9373B` → `#D81632`; Purple `#9279B2` → `#9678B6`; Sunrise Orange `#FAA51A` added.
- **Glass cards**: Denser fill `rgba(15,42,63,0.55)` (was `rgba(255,255,255,0.10)`); border `rgba(111,180,227,0.15)` (Sky Blue tint).
- **Accent shift**: Sky Blue (`#6FB4E3`) is now primary accent (headings, links). Teal stays for status-good and accent lines.

---

## 14. Reference Files

| File | Purpose |
|---|---|
| `references/brand-essentials.md` | Color palette, fonts, tone, iQ rules |
| `references/layout-catalog.md` | Prescriptive layout selection with When/When Not/Background/Typography |
| `references/layout-grid-specs.md` | Zone diagrams, field constraints, Python examples for all slide types |
| `references/script-api-reference.md` | Full API tables for fourth_pptx_core.py, fourth_ooxml.py, fourth_pptx_data.py |
| `references/icon-catalog.md` | Lucide CDN setup, usage pattern, EBR/QBR icon mapping |
| `references/interactive-components.md` | Alpine.js component table, CDN setup, main deck vs appendix guidance |
| `references/fourth-html-template.md` | HTML presentation structure spec |
| `references/logo-data-uris.md` | Base64 logo URIs — read ONLY when writing `<img>` tags |
| `html-engine/themes/fourth-executive.html` | Fourth brand-aligned HTML theme (Phase 1, default) |
| `html-engine/themes/midnight-executive.html` | Generic dark HTML theme (Phase 1, alternate) |
| `html-engine/STYLE_PRESETS.md` | CSS custom properties and style presets |
| `html-engine/components/midnight-components.html` | Reusable HTML slide components |
| `scripts/fourth_ooxml.py` | OoxmlEffects — OOXML XML injection |
| `scripts/fourth_pptx_core.py` | PresentationBuilder, BackgroundManager, v5 helpers |
| `scripts/fourth_pptx_data.py` | ChartBuilder, TableBuilder, DataFormatter |
| `assets/backgrounds/` | 16 pre-rendered background PNGs |
| `assets/logos/` | 4 Fourth logo variants |
| `assets/template/` | Official PPTX template file |
