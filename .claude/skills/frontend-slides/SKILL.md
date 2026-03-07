---
name: frontend-slides
description: Create stunning, animation-rich HTML presentations from scratch or by converting PowerPoint files. Use when the user wants to build a presentation, convert a PPT/PPTX to web, or create slides for a talk/pitch. Helps non-designers discover their aesthetic through visual exploration rather than abstract choices.
---

# Frontend Slides Skill

Create zero-dependency, animation-rich HTML presentations that run entirely in the browser. This skill helps non-designers discover their preferred aesthetic through visual exploration ("show, don't tell"), then generates production-quality slide decks.

## Core Philosophy

1. **Zero Dependencies** — Single HTML files with inline CSS/JS. No npm, no build tools.
2. **Show, Don't Tell** — People don't know what they want until they see it. Generate visual previews, not abstract choices.
3. **Distinctive Design** — Avoid generic "AI slop" aesthetics. Every presentation should feel custom-crafted.
4. **Production Quality** — Well-commented, accessible, performant code.

---

## Phase 0: Detect Mode

**Mode A: New Presentation** — User wants slides from scratch → Phase 1
**Mode B: PPT Conversion** — User has a .ppt/.pptx file → Phase 4
**Mode C: Enhancement** — User has HTML presentation to improve → read + enhance

---

## Phase 1: Content Discovery (New Presentations)

Ask via AskUserQuestion:

**Q1: Purpose** — "What is this presentation for?"
- Pitch deck / Teaching/Tutorial / Conference talk / Internal presentation

**Q2: Length** — "Approximately how many slides?"
- Short (5-10) / Medium (10-20) / Long (20+)

**Q3: Content** — "Do you have the content ready, or do you need help structuring it?"
- All content ready / Rough notes (needs organizing) / Topic only (needs full outline)

If user has content, ask them to share it (text, bullet points, images, etc.).

---

## Phase 2: Style Discovery (Visual Exploration)

**CRITICAL: This is the "show, don't tell" phase.**

Most people can't articulate design preferences in words. Generate mini-previews and let them react.

### Step 2.1: Mood Selection

**Q: Vibe** — "What feeling should the audience have?"
- "Impressed/Confident" / "Excited/Energized" / "Calm/Focused" / "Inspired/Moved"
- multiSelect: true (up to 2)

### Step 2.2: Generate Style Previews

Generate **3 distinct style previews** in `.claude-design/slide-previews/`:

```
.claude-design/slide-previews/
├── style-a.html   # First style option
├── style-b.html   # Second style option
└── style-c.html   # Third style option
```

Each preview: single title slide, self-contained, animated, ~50-100 lines.

**Mood → Style Options:**

| Mood | Style Options |
|------|---------------|
| Impressed/Confident | "Corporate Elegant", "Dark Executive", "Clean Minimal" |
| Excited/Energized | "Neon Cyber", "Bold Gradients", "Kinetic Motion" |
| Calm/Focused | "Paper & Ink", "Soft Muted", "Swiss Minimal" |
| Inspired/Moved | "Cinematic Dark", "Warm Editorial", "Atmospheric" |

**NEVER use:**
- Purple gradients on white backgrounds
- Inter, Roboto, or system fonts
- Standard blue primary colors
- Predictable hero layouts

**Instead use:**
- Unique font pairings (Clash Display, Satoshi, Cormorant Garamond, DM Sans, etc.)
- Cohesive color themes with personality
- Atmospheric backgrounds (gradients, subtle patterns, depth)
- Signature animation moments

For effect → feeling mappings and animation CSS snippets, see `references/animation-patterns.md`.

### Step 2.3: Present Previews

```
I've created 3 style previews for you to compare:

**Style A: [Name]** — [1 sentence description]
**Style B: [Name]** — [1 sentence description]
**Style C: [Name]** — [1 sentence description]

Open each file to see them in action:
- .claude-design/slide-previews/style-a.html
- .claude-design/slide-previews/style-b.html
- .claude-design/slide-previews/style-c.html

Which style resonates most? What do you like? Anything to change?
```

**Q: Style** — "Which style preview do you prefer?"
- Style A / Style B / Style C / "Mix elements" (ask for specifics)

### Step 2.4: Interactivity Level

**Q: Interactivity** — "Do you need interactive elements?"
- "Static slides only" / "Light interactivity" / "Data-rich dashboard style"

**If Light or Data-rich:** Include Alpine.js CDN, use `components/midnight-components.html`.

**Interactivity triggers:**

| Need | Component |
|------|-----------|
| Multiple ways to view same data | Tabs |
| Details that clutter the slide | Accordion/Collapsible |
| Full tables or roadmaps | Modal |
| Multiple testimonials/case studies | Carousel |
| Time period or metric selection | Dropdown |
| Optional detailed view | Toggle |

---

## Phase 3: Generate Presentation

### HTML Architecture

Follow the full boilerplate in `references/html-template.md`. Key structure:

- **`:root` CSS vars** — colors, fonts, spacing, easing (easy single-point customization)
- **`.slide`** — each `<section>` is one slide, `min-height: 100vh`, `scroll-snap-align: start`
- **`.reveal`** — fade+slide-up entrance, triggered by `.visible` class via Intersection Observer
- **`SlidePresentation` class** — keyboard nav, touch/swipe, progress bar, nav dots

For animation CSS patterns (entrance, backgrounds, 3D tilt), see `references/animation-patterns.md`.

### File Structure

```
presentation.html          # Self-contained
assets/                    # Images, if any
```

### Required JS Features

1. `SlidePresentation` class — keyboard (arrows, space), touch, mouse wheel, progress bar, nav dots
2. `IntersectionObserver` — adds `.visible` when slide enters viewport
3. Optional: custom cursor, particle canvas, parallax, 3D tilt, magnetic buttons, counters

### Code Quality

- Comments: every section explains what, why, and how to modify
- Accessibility: semantic HTML, keyboard nav, ARIA labels, reduced motion support
- Responsive: mobile-friendly, disable heavy effects at 768px, touch-friendly

---

## Phase 4: PPT Conversion

### Step 4.1: Extract Content

Use `references/pptx-extractor.py` (requires `python-pptx`):

```bash
pip install python-pptx
python references/pptx-extractor.py slides.pptx output/
```

Produces `output/slides.json` + `output/assets/` with all images.

### Step 4.2: Confirm Content Structure

Present extracted content summary to user:
```
I've extracted the following from your PowerPoint:

**Slide 1: [Title]** — [content summary], [N] image(s)
**Slide 2: [Title]** — [content summary], [N] image(s)
...

Does this look correct? Should I proceed with style selection?
```

### Step 4.3: Style Selection

Proceed to Phase 2 (Style Discovery) with extracted content in mind.

### Step 4.4: Generate HTML

Convert extracted content into chosen style, preserving all text, images (referenced from assets/), slide order, and speaker notes (as HTML comments or separate file).

---

## Phase 5: Delivery

1. **Clean up** — Delete `.claude-design/slide-previews/` if it exists
2. **Open** — `open [filename].html` to launch in browser
3. **Provide summary:**

```
Your presentation is ready!

File: [filename].html
Style: [Style Name]
Slides: [count]

Navigation: Arrow keys or Space, scroll/swipe, or click the dots on the right.

To customize: :root CSS variables (colors), Fontshare/Google Fonts link (fonts), .reveal class timings (animations).

Would you like me to make any adjustments?
```

---

## Themes & Component Library

### Available Themes

| Theme | File | Use Case |
|-------|------|----------|
| Midnight Executive | `themes/midnight-executive.html` | Corporate, executive briefings, data-heavy |

Copy the theme file as your starting point, replace placeholder content.

### Interactive Components (Alpine.js)

**File:** `components/midnight-components.html` | **Docs:** `components/README.md`

| Component | Use Case |
|-----------|----------|
| Tabs | Switch between data views |
| Accordion | Expandable detail sections |
| Collapsible | Show/hide optional info |
| Modal | Pop-up detailed content |
| Carousel | Cycle through testimonials/cases |
| Dropdown | Select time period or metric |
| Toggle | On/off data filtering |
| Tooltip | Hover hints |

Supporting: Badges, Alerts, Progress bars, Avatars, Skeleton loaders, Buttons, Cards.

### Charts (Chart.js)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
```

| Type | Best For |
|------|----------|
| Area/Line | Trends over time |
| Bar | Comparisons, category breakdowns |
| Donut/Pie | Proportions, market share |
| Horizontal Bar | Rankings, progress toward goals |

Combine: Tabs + Charts (switch metrics), Dropdown + Charts (change time period), Toggle + Charts (show/hide comparison).

---

## References

| File | Contents |
|------|----------|
| `references/html-template.md` | Full HTML boilerplate, JS class, CDN includes, code quality rules |
| `references/animation-patterns.md` | Effect→feeling mapping, entrance CSS, background CSS, 3D tilt JS, troubleshooting |
| `references/pptx-extractor.py` | Python script for PPTX content extraction |
| `STYLE_PRESETS.md` | Detailed style preset catalog |
| `themes/midnight-executive.html` | Full theme template |
| `components/midnight-components.html` | Interactive component demo |

---

## Example Session Flows

**New Presentation:**
1. User: "I want to create a pitch deck for my AI startup"
2. Ask: purpose, length, content → user shares bullet points
3. Ask: vibe (Impressed + Excited) → generate 3 style previews
4. User picks Style B (Neon Cyber), asks for darker background
5. Generate full presentation → open in browser → iterate on tweaks → deliver

**PPT Conversion:**
1. User: "Convert my slides.pptx to a web presentation"
2. Extract content + images → confirm with user
3. Style selection → generate HTML with preserved assets → deliver

---

## Related Skills

- **frontend-design** — Complex interactive pages beyond slides
- **shadcn-create** — React-based Shadcn component theming
