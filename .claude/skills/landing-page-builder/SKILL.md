---
name: landing-page-builder
description: Build high-converting landing pages from a brief, product description, or conversation. Use when users ask to create, build, design, or generate a landing page, squeeze page, lead capture page, sales page, or product page. Also triggers on "build me a page," "I need a landing page for," "create an LP," "design a conversion page," or any request to turn a product/service into a web page that captures leads or drives action. Outputs a production-ready single-file HTML page built on research-backed conversion principles. Works with the landing-page-score skill for post-build quality verification.
---

# Landing Page Builder

Build conversion-optimized landing pages from a brief. Outputs a single-file HTML page with all 9 conversion sections, responsive design, optimized copy, and performance best practices baked in. Every build decision is grounded in the same research that powers the landing-page-score rubric — pages built with this skill are designed to score 85+.

## When to Use This Skill

Use this skill when:
- A user wants to create a landing page for a product, service, event, or offer
- A user provides a brief, product description, or ad copy and needs a page built around it
- A user says "build me a page," "I need a landing page," "create an LP," or similar
- A user wants to turn an existing homepage or product page into a focused conversion page
- A user wants a lead capture page, squeeze page, sales page, or click-through page
- A user provides ad copy or campaign assets and needs a matching landing page (message match)

## How It Works

The builder follows a 5-phase workflow. Each phase has clear inputs, outputs, and quality gates.

```
Phase 1: Discovery → Phase 2: Copy → Phase 3: Build → Phase 4: Self-Score → Phase 5: Deliver
```

---

## Phase 1: Discovery Interview

Before writing a single line of HTML, gather the inputs that determine page structure, copy angle, and conversion strategy. This interview drives everything downstream.

### Required Inputs

Gather these through conversation. If the user provides a brief or product description, extract as many as possible before asking follow-ups.

| Input | Why It Matters | Example |
|-------|---------------|---------|
| **Offer** | The specific thing being offered on this page | "Free 14-day trial of scheduling software" |
| **Target audience** | Who is the visitor? Role, industry, pain level | "Restaurant GMs frustrated with manual scheduling" |
| **Primary pain point** | The #1 problem this offer solves | "Spending 6+ hours per week building schedules manually" |
| **Key outcome** | The transformation the visitor gets | "Cut scheduling time by 80% and reduce labor costs" |
| **Traffic source** | Where visitors come from (determines message match) | "Google Ads for 'restaurant scheduling software'" |
| **Conversion action** | What counts as a conversion | "Start free trial (email + name)" |
| **3-5 key features** | Product capabilities to highlight | "AI auto-scheduling, shift swaps, labor forecasting" |
| **Social proof available** | What trust assets exist | "500+ restaurant clients, 4.8 star rating, logos" |
| **Objections to handle** | What makes prospects hesitate | "Switching cost, learning curve, contract lock-in" |
| **Brand constraints** | Colors, fonts, tone, logo, compliance | "Blue/white palette, professional tone, logo provided" |

### Page Type Selection

Based on the offer and conversion action, select the page type — this determines section count and depth:

| Page Type | When to Use | Sections | Form Fields |
|-----------|-------------|----------|-------------|
| **Lead Capture** | Email/demo request, gated content | All 9 | 2-3 (name, email, company) |
| **Squeeze Page** | Single-purpose email capture | 3-4 (Hero, Proof, CTA, minimal FAQ) | 1 (email only) |
| **Sales Page** | Long-form persuasion, complex offer | All 9, expanded | 2-3 or click-through to checkout |
| **Click-Through** | Pre-sell before checkout/pricing page | All 9, no form | CTA links to external page |
| **Event/Webinar** | Registration page | 7 (skip Pricing, expand How It Works) | 2-3 (name, email, company) |

### Narrative Framework Selection

Choose based on audience awareness level and offer complexity:

| Framework | Best For | Structure |
|-----------|----------|-----------|
| **PAS** (Problem-Agitate-Solution) | Audiences aware of their problem but not your solution | Problem → Agitate → Solution |
| **BAB** (Before-After-Bridge) | Transformation-focused offers (SaaS, coaching) | Before state → After state → Bridge (your product) |
| **AIDA** (Attention-Interest-Desire-Action) | Broad audiences, e-commerce, well-known categories | Hook → Value → Emotional connection → CTA |

---

## Phase 2: Copy Generation

Generate all page copy before touching HTML. Copy is the #1 conversion lever — headline quality alone can drive +307% conversion lift. Write everything at a 6th-7th grade reading level (Flesch-Kincaid 60-70).

Load `references/copy-formulas.md` for headline templates, CTA patterns, microcopy libraries, and section-by-section copy guidance.

### Copy Generation Sequence

Write copy for all 9 sections in order. For each section, follow the pattern:

1. **Draft** using the formulas in `references/copy-formulas.md`
2. **Check** against the landing-page-score rubric criteria for that category
3. **Refine** until the copy would score 4-5 on every sub-criterion

### Section 1: Hero

The hero must communicate the full value proposition in under 5 seconds. Every element is visible above the fold.

**Headline**: 6-12 words. Use a proven formula:
- `[Outcome] without [Pain]`
- `[Outcome] in [Timeframe]`
- `The [better way] to [task]`
- `Stop [pain]. Start [outcome].`

**Subheadline**: 15-25 words. Extends (never repeats) the headline. Explains "how."

**Primary CTA**: Action verb + specific value + risk reducer.
- Pattern: `[Action Verb] + [Specific Value]` — e.g., "Start My Free Trial"
- Add microcopy: "No credit card required. Cancel anytime."

**Hero visual direction**: Describe what the image should show (outcome, not product).

### Section 2: Social Proof Bar

Immediately below the hero. Fast-processing trust signals.
- 3-5 customer logos OR
- Metric: "Trusted by X+ [audience type]" OR
- Star rating + review count

### Section 3: Problem

Name the visitor's pain in their language. Use the agitate step from PAS.
- 2-3 short paragraphs max
- Specific, not generic: "You spend 6 hours every week rebuilding schedules" not "Scheduling is hard"
- End with a bridge to the solution

### Section 4: Solution / Features

3 key features, each translated through the FAB model:
- **Feature**: What it does
- **Advantage**: Why that matters vs. alternatives
- **Benefit**: How it changes the visitor's life

Each feature gets: icon/visual + headline (benefit-focused) + 1-2 sentence description.

### Section 5: How It Works

3-step process that makes the product feel simple and achievable:
- Step 1: Getting started (low friction)
- Step 2: Core value moment
- Step 3: Outcome achieved

Number each step. Keep descriptions to one sentence.

### Section 6: Testimonials

2-3 customer quotes. Each follows the structure:
- Quote leads with specific result/metric
- 1-2 sentences, first-person voice
- Attribution: Name, Title, Company (photo if available)

### Section 7: Pricing (if applicable)

Clear tiers. Highlight recommended option. Include:
- Feature comparison
- "Most Popular" badge on middle tier
- Annual discount if applicable

If not applicable, skip and note in the build.

### Section 8: FAQ

5-7 questions addressing top objections from the discovery interview.
- Each answer: 2-3 sentences max
- Lead with the reassurance, then explain
- Include: pricing, commitment, switching, data security, support

### Section 9: Final CTA

Repeat the primary CTA with urgency layer:
- Restate the key benefit (different phrasing from hero)
- Add mild urgency: timeframe, scarcity, or exclusivity
- Include same risk-reducing microcopy as hero CTA

---

## Phase 3: Build the HTML

Generate a single-file HTML page. Load `references/component-library.md` for the CSS component system and `references/section-blueprints.md` for the HTML structure of each section.

Alternatively, run `scripts/scaffold_page.py` to generate the base HTML structure, then populate with copy.

### Technical Requirements

Every page must meet these specs (directly from the performance scoring rubric):

| Requirement | Target | Why |
|-------------|--------|-----|
| Single-file HTML | All CSS inline, no external sheets | Zero render-blocking requests |
| System fonts | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | Zero font loading delay |
| Mobile-first | Responsive at 320px, 768px, 1024px, 1440px | 60%+ traffic is mobile |
| Semantic HTML | `<header>`, `<main>`, `<section>`, `<footer>` | Accessibility + SEO |
| CTA min 48x48px | Touch target compliance | WCAG mobile requirement |
| Contrast 4.5:1+ | All text against background | WCAG AA compliance |
| Page weight <100KB | HTML + inline CSS only (no images) | LCP <2.5s target |
| CLS 0 | No layout shifts (everything sized) | Core Web Vital |
| Smooth scroll | CSS `scroll-behavior: smooth` | Modern UX |
| Form validation | HTML5 `required`, `type="email"` | Client-side friction reduction |

### CSS Architecture

Use a minimal, conversion-optimized CSS system:

**Layout**: CSS Grid for page structure, Flexbox for components. Max-width 1200px centered.

**Typography scale**:
- H1: 2.5rem (hero headline)
- H2: 2rem (section headlines)
- H3: 1.25rem (feature/card headlines)
- Body: 1.125rem / 1.7 line-height (optimal readability)
- Small: 0.875rem (microcopy, labels)

**Spacing system**: 8px base unit. Sections separated by 80-120px. Components by 24-48px.

**Color strategy**: Derive from brand constraints. If none provided, use a high-contrast default:
- Background: #FFFFFF
- Text: #1A1A2E
- Primary (CTA): High-saturation accent, 4.5:1+ contrast
- Secondary: Muted version of primary
- Light background: #F8F9FA (alternating sections)

**Mobile breakpoints**:
```css
/* Mobile-first base styles */
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
```

### Section Build Order

Build sections in the 9-step sequence. Each section alternates background color (white / light gray) for visual separation.

1. **Hero** — Full viewport height on desktop. Headline, subheadline, CTA, hero visual placeholder. CTA button is the most visually prominent element.

2. **Social Proof Bar** — Centered row of logos or metric. Subtle background. Compact height (80-100px).

3. **Problem** — Centered text block, max-width 720px. Emotional copy, no images needed.

4. **Solution/Features** — 3-column grid (desktop), single column (mobile). Icon + headline + description per feature.

5. **How It Works** — Numbered 3-step horizontal layout (desktop), vertical (mobile). Step number → title → description.

6. **Testimonials** — Card layout. Quote, attribution, optional star rating. 2-3 cards in a row (desktop).

7. **Pricing** — 2-3 tier cards. Highlighted "recommended" tier. Feature checklist per tier.

8. **FAQ** — Accordion or simple list. Question bold, answer below. Max-width 720px centered.

9. **Final CTA** — Contrasting background (primary color, dark). White text. CTA button with urgency microcopy.

### Form Implementation

For lead capture pages, the form appears either:
- **Inline in hero** (right column on desktop, below headline on mobile) — for squeeze pages
- **Standalone section** between Testimonials and FAQ — for longer pages
- **Sticky on mobile** — CTA button triggers scroll to form or opens modal

Form HTML structure:
```html
<form action="#" method="POST" class="lp-form">
  <label for="name">Your Name</label>
  <input type="text" id="name" name="name" required autocomplete="name">

  <label for="email">Work Email</label>
  <input type="email" id="email" name="email" required autocomplete="email">

  <button type="submit" class="cta-primary">[Action Verb + Value]</button>

  <p class="microcopy">[Risk-reducing statement]</p>
</form>
```

### Image Placeholders

Since Claude generates HTML without real images, use styled placeholder containers:
```html
<div class="image-placeholder" role="img" aria-label="[Description of intended image]">
  <span>[Description]</span>
</div>
```

Style placeholders with brand colors, subtle gradients, and clear labels so the user knows what to replace.

### Accessibility Checklist

Build these into every page:
- Skip-to-content link
- Semantic heading hierarchy (one H1, H2s for sections, H3s for sub-elements)
- ARIA labels on form inputs
- Alt text descriptions on image placeholders
- Keyboard-navigable interactive elements
- Focus-visible styles on CTA buttons
- Sufficient color contrast (4.5:1 minimum)

---

## Phase 4: Self-Score

Before delivering the page, score it against the landing-page-score rubric. This is the quality gate.

If the `landing-page-score` skill is available, invoke it mentally against the HTML you just built. Check each category:

| Category | Target Score | Key Checks |
|----------|-------------|------------|
| Headline & VP | 85+ | Does the headline pass the 5-second test? Is it 6-12 words? Benefit-focused? |
| CTA Design & Copy | 85+ | Action verb + value? High contrast? Repeated 3+ times? Microcopy present? |
| Trust & Social Proof | 80+ | 2+ proof types? Placed before conversion points? Specific metrics? |
| Message Match | 80+ | Does page match the stated traffic source? Clear narrative arc? |
| Visual Design | 85+ | Above-fold complete? Clear hierarchy? Generous whitespace? |
| Form Optimization | 85+ | 2-3 fields max? Labels above? Privacy reassurance? |
| Mobile & Performance | 90+ | Single-file, system fonts, responsive, <100KB? |
| Post-Conversion | 70+ | Thank-you state? Form confirmation message? |

**Minimum composite: 80/100 (Grade B) before delivery.**

If any category falls below its target:
1. Identify the specific sub-criterion that's dragging the score down
2. Fix it in the HTML/copy
3. Re-score until all targets are met

---

## Phase 5: Deliver

### Output Format

Save the HTML file to the workspace and provide a computer:// link.

**File naming**: `[brand-or-product]-landing-page.html`

### Delivery Message

Keep it concise. Include:
1. Link to the HTML file
2. Self-score summary (composite + any notable category scores)
3. What to customize (image placeholders, form action URL, tracking codes)
4. Suggestion to run `landing-page-score` for formal audit

### What the User Needs to Customize

Flag these clearly:
- **Image placeholders**: Replace with real product/lifestyle images
- **Form action URL**: Point to their form handler (HubSpot, Mailchimp, etc.)
- **Analytics**: Add GA4/GTM snippet
- **Domain-specific**: Privacy policy link, company address, legal disclaimers
- **Favicon and meta tags**: OG tags for social sharing

---

## Bundled Resources

### References (load as needed)

- **`references/copy-formulas.md`**: Headline formulas, CTA templates, microcopy library, section-by-section copywriting patterns. Load during Phase 2.

- **`references/section-blueprints.md`**: HTML structure and CSS for each of the 9 sections. Detailed markup patterns, responsive behavior, and accessibility implementation. Load during Phase 3.

- **`references/component-library.md`**: Reusable CSS components — buttons, forms, cards, trust bars, testimonial blocks, FAQ accordions, pricing tables. Load during Phase 3.

### Scripts

- **`scripts/scaffold_page.py`**: Generates the base HTML structure with all 9 sections pre-scaffolded, CSS system included, ready for copy insertion. Run at the start of Phase 3 to save time.

---

## Integration with Landing Page Score

The builder and scorer are companion skills. The builder constructs pages designed to score well; the scorer verifies they actually do.

**Recommended workflow**:
1. Build with `landing-page-builder`
2. Score with `landing-page-score`
3. Fix any gaps identified by the scorer
4. Re-score until 85+

The builder's Phase 4 self-score is a fast internal check. The formal `landing-page-score` audit is more thorough and should be used for final validation.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| User provides minimal brief | Ask the 10 discovery questions. Minimum viable: offer + audience + pain point + conversion action. |
| No brand constraints | Use the high-contrast default palette. Note it's customizable. |
| User wants WordPress/Webflow output | Build the HTML first as the source of truth, then advise on platform-specific implementation. |
| Complex product with many features | Limit to top 3 features on the page. Link to a features page for the full list. |
| Multiple audiences | Build one page per audience. Shared traffic source = shared page is a conversion killer. |
| User wants to skip discovery | Extract what you can from context, make reasonable inferences, flag assumptions, and proceed. |
| Page feels too long | Switch to squeeze page type — Hero, Proof, CTA only. |
| User provides existing page to rebuild | Score it first with landing-page-score, identify gaps, then rebuild using this skill's workflow. |
