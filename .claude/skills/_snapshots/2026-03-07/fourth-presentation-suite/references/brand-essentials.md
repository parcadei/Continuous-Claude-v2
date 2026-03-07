# Fourth Brand Essentials

Quick reference for Fourth's visual identity, typography, tone, and content rules.
Load this file before generating any branded presentation content.

---

## How to Use This Reference

> **Fourth brand guidelines define the COLOR PALETTE, FONT FAMILY, LOGO RULES, and TONE OF VOICE.**
> They do NOT dictate layout, composition, visual variety, or slide architecture.
>
> For design decisions -- which layout to use, how to vary backgrounds, when charts beat bullets --
> follow the **SKILL.md design principles**. They are the primary design driver.
>
> Think of brand guidelines as a **loose constraint**: stay within these colors and fonts,
> but let the design principles determine what goes on the slide and how it looks.

---

## Color System

### Primary Palette

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Deep Blue | `#0C4A7D` | 12, 74, 125 | Primary brand, headers, key elements. Trust/professionalism. |
| Teal Green | `#00B69F` | 0, 182, 159 | Accents, CTAs, highlights, AI/iQ intelligence. |
| Sky Blue | `#6FB4E3` | 111, 180, 227 | Supporting elements, backgrounds, vignette accent. |

### Secondary Palette

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Midnight Navy | `#002747` | 0, 39, 71 | Use as black for text. AVOID as background. |
| Dark Gray | `#373E42` | 55, 62, 66 | Body text, secondary content. |
| Cool Grey | `#CFD1D1` | 207, 209, 209 | Highlighting. Use Navy text on this (NOT white). |
| Soft White | `#F5F5F5` | 245, 245, 245 | Slide backgrounds. |
| White | `#FFFFFF` | 255, 255, 255 | Slide backgrounds, text on dark. |

### Tertiary Palette (use sparingly)

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Hot Red | `#D81632` | 216, 22, 50 | Alerts, warnings, emphasis. |
| Purple | `#9678B6` | 150, 120, 182 | Differentiation, secondary accent. |
| Sunrise Orange | `#FAA51A` | 250, 165, 26 | Minimal use, special highlights. |

### Accessibility Contrast Ratios

| Combination | Ratio | Level | Notes |
|-------------|-------|-------|-------|
| Deep Blue on White | 12.7:1 | AAA | Ideal for all text |
| Midnight Navy on White | Strong | AAA | Ideal for body text |
| Dark Gray on White | 10.8:1 | AAA | Good for body text |
| Teal on White | 2.4:1 | Fail | ACCENTS ONLY -- never for text |

**Minimum contrast requirements:**
- Body text: 4.5:1 minimum
- Large text (18pt+ or 14pt bold): 3:1 minimum
- Teal Green MUST NOT be used for text on white backgrounds

### Vignette Gradient

The signature Fourth gradient used on title slides and section breaks:

```
Angle: 25 degrees
Flow: Teal (#00B69F) -> Sky Blue (#6FB4E3) -> Deep Blue (#0C4A7D)
```

CSS representation:
```css
background: linear-gradient(25deg, #00B69F 0%, #6FB4E3 40%, #0C4A7D 100%);
```

### Color Usage Rules

1. **Primary brand color** is Deep Blue -- use for headers, borders, key UI.
2. **Teal** is the accent color -- CTAs, icons, iQ branding, highlights.
3. **Midnight Navy** replaces pure black -- use `#002747` for text, never `#000000`.
4. **Never use Midnight Navy as a background** -- it overwhelms.
5. **Cool Grey backgrounds require Navy text**, not white text.
6. **Chart colors** cycle: Deep Blue, Teal, Sky Blue, Purple, Hot Red (in that order).
7. **Gradient** is reserved for title slides, section breaks, and closing slides.

---

## Typography

### Font Family

**Poppins** -- geometric sans-serif from Google Fonts.

Weights used:
- 300 (Light) -- rarely, decorative only
- 400 (Regular) -- body text, captions
- 500 (Medium) -- occasional emphasis
- 600 (Semibold) -- all headings
- 700 (Bold) -- strong emphasis, rare

### Type Scale (Presentations)

| Level | Weight | Size | Usage |
|-------|--------|------|-------|
| H1 | Semibold (600) | 48pt | Slide titles |
| H2 | Semibold (600) | 36pt | Section headers |
| H3 | Semibold (600) | 24pt | Sub-sections |
| H4 | Semibold (600) | 20pt | Minor headers |
| Body | Regular (400) | 18pt | Main content |
| Body Small | Regular (400) | 14pt | Supporting text |
| Caption | Regular (400) | 12pt | Labels, footnotes |

### Typography Rules

| Rule | Guidance |
|------|----------|
| Line height | 1.21x for presentations (e.g., 48pt title = ~58pt line height) |
| Max line length | 12 words per line |
| Minimum size | 14pt -- nothing smaller on any slide |
| Emphasis | Use Semibold weight. NEVER use italic for emphasis. |
| Links/underline | NEVER underline text. Use bold or color to indicate links. |
| Case | Title Case for H1/H2. Sentence case for body and bullets. |

### Font Loading (HTML)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

## Tone of Voice

Fourth's voice rests on four pillars. Every piece of content should reflect at least two.

### 1. Energetic

- Use active voice, strong verbs, forward momentum
- Avoid passive constructions and hedging
- Words: transform, accelerate, drive, power, unlock, ignite
- Anti-words: might, perhaps, could potentially

**Example:**
- YES: "Fourth transforms how your team operates."
- NO: "Fourth could potentially help improve some operations."

### 2. Insightful

- Data-driven, evidence-led, outcomes-focused
- Lead with proof, not promises
- Quantify claims wherever possible
- Words: data shows, results demonstrate, evidence confirms

**Example:**
- YES: "Teams using Fourth reduce labor costs by 12% on average."
- NO: "Fourth helps you save money."

### 3. Human

- Conversational, empathetic, plain language
- Write for hospitality professionals, not technologists
- Avoid jargon; explain when technical terms are necessary
- Words: your team, people, together, understand

**Example:**
- YES: "Your team deserves tools that just work."
- NO: "Leverage our SaaS platform's enterprise-grade capabilities."

### 4. Confident

- Definitive, clear, proof over hype
- Make bold statements backed by evidence
- No weasel words, no unnecessary qualifiers
- Words: proven, delivers, guarantees, ensures

**Example:**
- YES: "Fourth delivers real-time visibility into every location."
- NO: "Fourth aims to try to provide visibility where possible."

### Tone Application by Slide Type

| Slide Type | Primary Tone | Secondary Tone |
|------------|-------------|----------------|
| Title | Confident | Energetic |
| Problem | Insightful | Human |
| Solution | Energetic | Confident |
| Data/Evidence | Insightful | Confident |
| Testimonial | Human | Insightful |
| Closing/CTA | Energetic | Confident |

---

## iQ Branding

### Capitalization (CRITICAL)

| Correct | Incorrect |
|---------|-----------|
| iQ | IQ |
| iQ | Iq |
| iQ | iq |

**Always:** lowercase `i`, uppercase `Q`.

### Usage Rules

| Rule | Example |
|------|---------|
| Tagline | "Powered by iQ" |
| Never say | "uses iQ", "with iQ", "iQ-enabled" |
| Visual | iQ icon uses Teal accent color |
| Meaning | iQ represents AI intelligence layer |
| Placement | "Powered by iQ" appears on closing slides |

### iQ in Sentences

- Start of sentence: "iQ delivers..." (keep lowercase i even at start)
- Mid-sentence: "Our platform, powered by iQ, transforms..."
- Headlines: "Powered by iQ: The Intelligence Behind Fourth"

---

## Fourth Dimension

"Fourth Dimension" is the brand concept representing the extra dimension of intelligence beyond standard solutions.

### Usage Rules

| Rule | Guidance |
|------|----------|
| Capitalization | Both words capitalized: "Fourth Dimension" |
| Context required | Never use as empty slogan -- always provide meaning |
| Standalone | Avoid using alone without explanation |

### Good Examples

- "Welcome to the Fourth Dimension -- where your operation moves faster than time."
- "The Fourth Dimension of workforce management: intelligence that anticipates."
- "Step into the Fourth Dimension with real-time insights that change everything."

### Bad Examples

- "fourth dimension" (wrong capitalization)
- "The Fourth Dimension." (no context)
- "We're in the fourth dimension now." (vague, lowercase)

---

## Photography Guidelines

### Style Requirements

| Aspect | Requirement |
|--------|-------------|
| Setting | Real hospitality environments (restaurants, hotels, kitchens, service areas) |
| People | Diverse, authentic, engaged in genuine interactions |
| Lighting | Natural lighting preferred, warm tones |
| Focus | Human element -- technology empowering people |
| Mood | Positive, active, professional but approachable |

### What to Show

- Staff collaborating, managers reviewing data on tablets
- Real kitchen/service action shots
- Customer-facing hospitality moments
- Technology integrated naturally into workflows

### What to Avoid

- Stock photo "business handshake" cliches
- People obviously posing at computers
- Empty rooms or technology without people
- Dark, moody, or overly stylized imagery

### Case Study Photography

- Feature customer's actual venue photography
- Customer logo displayed in Fourth's lozenge shape
- Headline format: "[Customer] improved [specific outcome]"
- Include real metrics from the customer

---

## Content Rules

### The 4x6 Rule

Every bullet-point slide must follow one of these patterns:

| Pattern | Description |
|---------|-------------|
| 4 bullets x ~6 words each | Concise, scannable, high-impact |
| 6 bullets x ~4 words each | Compact list, quick reference |

Never exceed 6 bullets per slide. If you have more, split across slides.

### Slide Content Principles

1. **One key idea per slide** -- if you have two ideas, use two slides.
2. **Hook -> Problem -> Solution -> Evidence -> Action** -- the narrative arc.
3. **White space is intentional** -- if a slide feels cramped, split it. Better 6 clear slides than 3 cluttered ones.
4. **Everything aligns to something** -- no floating elements. Use consistent margins and grid.
5. **Data over adjectives** -- "12% reduction" beats "significant improvement."

### Writing Checklist

Before finalizing any slide text:

- [ ] Is it active voice?
- [ ] Are bullets under 12 words each?
- [ ] Does it follow the 4x6 rule?
- [ ] Is there only one key idea?
- [ ] Are claims backed by data?
- [ ] Is iQ capitalized correctly?
- [ ] Is the text 14pt or larger?
- [ ] Would a hospitality manager understand it without explanation?

---

## Logo Usage

### Placement by Background

| Background | Logo Version |
|------------|-------------|
| White / Soft White | Standard (Deep Blue + Teal iQ) |
| Deep Blue | Teal within icon |
| Teal | White logo |
| Gradient (vignette) | White logo |

### Placement Rules

| Rule | Guidance |
|------|----------|
| Position | Top-right or bottom-left (consistent within deck) |
| Required on | Title slide and closing slide (minimum) |
| Clear space | Minimum clear space = height of the "F" in Fourth |
| Never modify | No rotation, shadow, outline, or color changes |
| Never stretch | Maintain aspect ratio always |

---

## Quick Reference: Color-Typography Pairings

| Slide Background | Title Color | Body Color | Accent |
|-----------------|-------------|------------|--------|
| White | Deep Blue `#0C4A7D` | Dark Gray `#373E42` | Teal `#00B69F` |
| Soft White | Deep Blue `#0C4A7D` | Dark Gray `#373E42` | Teal `#00B69F` |
| Deep Blue | White `#FFFFFF` | White `#FFFFFF` | Teal `#00B69F` |
| Gradient | White `#FFFFFF` | White `#FFFFFF` | Sky Blue `#6FB4E3` |
| Cool Grey | Midnight Navy `#002747` | Midnight Navy `#002747` | Deep Blue `#0C4A7D` |

---

## Do / Don't Summary

| DO | DON'T |
|----|-------|
| Use Deep Blue as primary brand color | Use Midnight Navy as background |
| Use Teal for accents and CTAs | Use Teal for body text |
| Write "iQ" (lowercase i, uppercase Q) | Write "IQ", "Iq", or "iq" |
| Follow the 4x6 bullet rule | Exceed 6 bullets per slide |
| Use Poppins Semibold for headings | Use italic for emphasis |
| Lead with data and evidence | Make unsubstantiated claims |
| Use active voice | Write in passive voice |
| Provide context for "Fourth Dimension" | Use "Fourth Dimension" as empty slogan |
| Show real people in real hospitality settings | Use generic stock photography |
| Maintain 14pt minimum text size | Use text smaller than 14pt |
| Use `#002747` Midnight Navy instead of black | Use `#000000` pure black |
| Keep one key idea per slide | Cram multiple ideas onto one slide |

---

*Reference: Fourth Brand Essentials v1.0*
*For use with the Fourth Presentation Suite skill.*
