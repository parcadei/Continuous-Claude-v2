# Script API Reference

## fourth_pptx_core.py

**Classes:**
- `FourthBrand` — brand constants (colors, fonts, dimensions)
- `TextFormatter` — heading/body/bullet formatting, 4x6 enforcement
- `BackgroundManager` — solid, gradient, vignette, image backgrounds
- `BackgroundRotation` — track and enforce background variety across slides
- `ImageHandler` — file/base64 image insertion, logo placement
- `PresentationBuilder` — main builder API (all `add_*` methods)
- `PresentationRebrander` — rebrand existing PPTX files

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

**v5 Internal Helpers** (called automatically by slide methods, but available for custom layouts):

| Method | Purpose |
|---|---|
| `_add_floating_badge(slide, left, top, text, bg_color, text_color, font_size_pt)` | Pill-shaped badge with auto-calculated width. Default teal bg, white text, 10pt. |
| `_add_accent_strip(slide, left, top, width, text, accent_color, font_size_pt)` | Full-width container with left accent bar (0.08" teal) + 6% white fill body. |
| `_add_metric_slab(slide, left, top, width, height, value, label, sublabel)` | Premium gradient-filled stat container (teal->deep blue diagonal). 72pt value, 16pt label with letter spacing. |
| `_add_progress_bar_shape(slide, left, top, width, current_pct, height, track_color, fill_color, label)` | Two-shape progress bar (20% alpha track + solid fill). Optional percentage label to the right. |
| `_add_mini_sparkline(slide, left, top, width, height, values, color)` | Freeform-shape trend line from normalized data points. 1.5pt teal line, transparent fill. Needs 2+ values. |

---

## fourth_ooxml.py (v3+v4+v5)

**Class: OoxmlEffects** — Low-level OOXML XML injection for visual effects python-pptx cannot produce. All methods operate on `shape._element.spPr`.

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
`xfrm -> prstGeom -> fill -> ln -> effectLst`. Use `_reorder_spPr_children()`.

---

## fourth_pptx_data.py

**Classes:**
- `ChartBuilder` — bar, column, line, area, pie, donut, scatter, combo charts; plus dark-theme variants
- `TableBuilder` — styled tables, KPI tables, matrix comparison tables; plus dark-theme table
- `DataFormatter` — currency, percentage, number formatting

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

**Instantiation:**
```python
cb = ChartBuilder()
tb = TableBuilder()
```
