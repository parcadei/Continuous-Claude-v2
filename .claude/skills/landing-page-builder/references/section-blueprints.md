# Section Blueprints

Load this during Phase 3 (Build). Contains the HTML structure for each of the 9 sections with responsive behavior, accessibility notes, and integration points.

---

## Table of Contents

1. [Hero Section](#1-hero-section)
2. [Social Proof Bar](#2-social-proof-bar)
3. [Problem Section](#3-problem-section)
4. [Features / Solution](#4-features--solution)
5. [How It Works](#5-how-it-works)
6. [Testimonials](#6-testimonials)
7. [Pricing](#7-pricing)
8. [FAQ](#8-faq)
9. [Final CTA](#9-final-cta)

---

## 1. Hero Section

**Purpose**: Communicate full value proposition in under 5 seconds. Every element visible above the fold.

**Layout**: Two-column on desktop (60/40 text/visual). Single column on mobile (text first, visual below).

```html
<section id="hero" class="hero">
  <div class="container hero-grid">
    <div class="hero-content">
      <h1 class="hero-headline">[6-12 word headline]</h1>
      <p class="hero-subheadline">[15-25 word subheadline]</p>
      <div class="hero-cta-group">
        <a href="#form" class="cta-primary">[Action + Value]</a>
        <p class="microcopy">[Risk reducer]</p>
      </div>
    </div>
    <div class="hero-visual">
      <div class="image-placeholder" role="img" aria-label="[Image description]">
        <span>[What image should show]</span>
      </div>
    </div>
  </div>
</section>
```

**Desktop**: Min-height 90vh. Headline at top-left of content area following Z-pattern. CTA button is the most visually prominent element on the entire page.

**Mobile**: Content stacks vertically. Headline → subheadline → CTA → visual. CTA full-width.

**Key rules**:
- H1 is the only H1 on the page
- CTA contrast ratio: 4.5:1 minimum, ideally 7:1
- Hero visual shows outcome (happy person using result), not product screenshots
- No navigation menu (distraction-free landing page)

---

## 2. Social Proof Bar

**Purpose**: Instant trust. Fast cognitive processing — logos are processed faster than text.

**Layout**: Centered horizontal row. Items evenly spaced.

```html
<section class="proof-bar">
  <div class="container">
    <p class="proof-label">Trusted by leading [industry] brands</p>
    <div class="proof-logos">
      <div class="logo-placeholder" aria-label="[Company 1]">[Logo 1]</div>
      <div class="logo-placeholder" aria-label="[Company 2]">[Logo 2]</div>
      <div class="logo-placeholder" aria-label="[Company 3]">[Logo 3]</div>
      <div class="logo-placeholder" aria-label="[Company 4]">[Logo 4]</div>
      <div class="logo-placeholder" aria-label="[Company 5]">[Logo 5]</div>
    </div>
  </div>
</section>
```

**Alternative (metric-based)**:
```html
<section class="proof-bar">
  <div class="container proof-metrics">
    <div class="proof-metric">
      <span class="metric-number">500+</span>
      <span class="metric-label">Restaurant Groups</span>
    </div>
    <div class="proof-metric">
      <span class="metric-number">4.8/5</span>
      <span class="metric-label">Customer Rating</span>
    </div>
    <div class="proof-metric">
      <span class="metric-number">2M+</span>
      <span class="metric-label">Shifts Scheduled</span>
    </div>
  </div>
</section>
```

**Styling**: Subtle background (#F8F9FA). Compact height (80-100px). Logos grayscale with hover color. Centered, no scroll.

**Mobile**: 2-3 logos visible, rest hidden or wrap to second row. Metrics stack vertically.

---

## 3. Problem Section

**Purpose**: Create emotional resonance. Make the visitor feel understood.

**Layout**: Centered text block, max-width 720px. No images needed — copy does the work.

```html
<section id="problem" class="problem-section">
  <div class="container narrow">
    <h2 class="section-headline">[Problem headline — name the pain]</h2>
    <p>[Paragraph 1: specific pain scenario]</p>
    <p>[Paragraph 2: consequences and frustration]</p>
    <p class="bridge-text"><strong>[Bridge sentence to solution]</strong></p>
  </div>
</section>
```

**Styling**: White background. Extra vertical padding (80-100px). Text centered. Bridge text slightly larger or bold to create transition.

**Mobile**: Same layout, scales naturally with max-width constraint.

---

## 4. Features / Solution

**Purpose**: Show how the product solves the problem just described. 3 features, FAB model.

**Layout**: 3-column grid on desktop, single column on mobile.

```html
<section id="features" class="features-section">
  <div class="container">
    <h2 class="section-headline">[Solution-oriented headline]</h2>
    <p class="section-subheadline">[Optional 1-line supporting text]</p>
    <div class="features-grid">

      <div class="feature-card">
        <div class="feature-icon" aria-hidden="true">[Icon/Emoji]</div>
        <h3 class="feature-title">[Benefit headline]</h3>
        <p class="feature-description">[FAB: what it does → why it matters → how it helps you]</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon" aria-hidden="true">[Icon/Emoji]</div>
        <h3 class="feature-title">[Benefit headline]</h3>
        <p class="feature-description">[FAB description]</p>
      </div>

      <div class="feature-card">
        <div class="feature-icon" aria-hidden="true">[Icon/Emoji]</div>
        <h3 class="feature-title">[Benefit headline]</h3>
        <p class="feature-description">[FAB description]</p>
      </div>

    </div>
  </div>
</section>
```

**Styling**: Light background (#F8F9FA). Cards with subtle shadow or border. Icon at top, large enough to be decorative but not dominant (48-64px). Equal card heights via CSS Grid.

**Mobile**: Cards stack vertically with full width.

---

## 5. How It Works

**Purpose**: Make adoption feel easy. 3 steps, numbered, simple.

**Layout**: Horizontal 3-step with connector line (desktop). Vertical numbered list (mobile).

```html
<section id="how-it-works" class="how-section">
  <div class="container">
    <h2 class="section-headline">How It Works</h2>
    <div class="steps-grid">

      <div class="step">
        <div class="step-number">1</div>
        <h3 class="step-title">[Low-friction start]</h3>
        <p class="step-description">[One sentence emphasizing ease]</p>
      </div>

      <div class="step">
        <div class="step-number">2</div>
        <h3 class="step-title">[Core value moment]</h3>
        <p class="step-description">[One sentence showing the magic]</p>
      </div>

      <div class="step">
        <div class="step-number">3</div>
        <h3 class="step-title">[Outcome achieved]</h3>
        <p class="step-description">[One sentence painting the result]</p>
      </div>

    </div>
  </div>
</section>
```

**Styling**: White background. Step numbers in colored circles (primary color, white text). Connector line between steps on desktop (CSS pseudo-element). Center-aligned.

**Mobile**: Vertical stack, step numbers left-aligned, title + description right.

---

## 6. Testimonials

**Purpose**: Third-party proof. Real people, specific results.

**Layout**: 2-3 cards in a row (desktop). Carousel or stack (mobile).

```html
<section id="testimonials" class="testimonials-section">
  <div class="container">
    <h2 class="section-headline">What Our Customers Say</h2>
    <div class="testimonials-grid">

      <blockquote class="testimonial-card">
        <p class="testimonial-quote">"[Quote leading with specific result]"</p>
        <footer class="testimonial-attribution">
          <div class="testimonial-avatar" aria-hidden="true">[Initials]</div>
          <div>
            <cite class="testimonial-name">[Full Name]</cite>
            <span class="testimonial-role">[Title], [Company]</span>
          </div>
        </footer>
      </blockquote>

      <!-- Repeat for 2-3 testimonials -->

    </div>
  </div>
</section>
```

**Styling**: Light background. Cards with left border accent (primary color) or top border. Quote in slightly larger italic text. Avatar circle with initials (placeholder for photo). Star rating optional (above quote).

**Mobile**: Single column stack. Full-width cards.

---

## 7. Pricing

**Purpose**: Clear tiers. Reduce comparison anxiety. Highlight recommended option.

**Layout**: 2-3 tier cards side by side. Recommended tier elevated or bordered.

```html
<section id="pricing" class="pricing-section">
  <div class="container">
    <h2 class="section-headline">Simple, Transparent Pricing</h2>
    <div class="pricing-grid">

      <div class="pricing-card">
        <h3 class="plan-name">[Starter]</h3>
        <div class="plan-price">
          <span class="price-amount">$XX</span>
          <span class="price-period">/month</span>
        </div>
        <p class="plan-description">[One line: who this is for]</p>
        <ul class="plan-features">
          <li>[Feature 1]</li>
          <li>[Feature 2]</li>
          <li>[Feature 3]</li>
        </ul>
        <a href="#form" class="cta-secondary">[CTA]</a>
      </div>

      <div class="pricing-card recommended">
        <div class="recommended-badge">Most Popular</div>
        <h3 class="plan-name">[Professional]</h3>
        <div class="plan-price">
          <span class="price-amount">$XX</span>
          <span class="price-period">/month</span>
        </div>
        <p class="plan-description">[One line: who this is for]</p>
        <ul class="plan-features">
          <li>[Everything in Starter, plus:]</li>
          <li>[Feature 4]</li>
          <li>[Feature 5]</li>
        </ul>
        <a href="#form" class="cta-primary">[CTA]</a>
      </div>

      <div class="pricing-card">
        <h3 class="plan-name">[Enterprise]</h3>
        <div class="plan-price">
          <span class="price-amount">Custom</span>
        </div>
        <p class="plan-description">[One line: who this is for]</p>
        <ul class="plan-features">
          <li>[Everything in Pro, plus:]</li>
          <li>[Feature 6]</li>
          <li>[Feature 7]</li>
        </ul>
        <a href="#form" class="cta-secondary">Contact Sales</a>
      </div>

    </div>
  </div>
</section>
```

**Styling**: White background. Recommended card has primary-color border, slight scale transform (1.05), and "Most Popular" badge. Equal card heights. Feature checkmarks (✓) in green.

**Mobile**: Cards stack vertically. Recommended card first (reorder via CSS).

---

## 8. FAQ

**Purpose**: Handle remaining objections. Build confidence.

**Layout**: Centered, max-width 720px. Accordion or static list.

```html
<section id="faq" class="faq-section">
  <div class="container narrow">
    <h2 class="section-headline">Frequently Asked Questions</h2>
    <div class="faq-list">

      <details class="faq-item">
        <summary class="faq-question">[Question phrased as visitor would ask]</summary>
        <div class="faq-answer">
          <p>[Answer: reassurance first, then explanation. 2-3 sentences.]</p>
        </div>
      </details>

      <!-- Repeat for 5-7 questions -->

    </div>
  </div>
</section>
```

**Styling**: Light background. `<details>` element for native accordion (no JS needed). Question bold, answer with top padding. Subtle border between items. Plus/minus indicator via CSS.

**Mobile**: Same layout, scales naturally.

---

## 9. Final CTA

**Purpose**: Last chance to convert. Urgency + benefit restatement.

**Layout**: Full-width, contrasting background. Centered text + CTA.

```html
<section id="final-cta" class="final-cta-section">
  <div class="container narrow text-center">
    <h2 class="final-headline">[Restate benefit — different phrasing from hero]</h2>
    <p class="final-subtext">[One line with urgency or scarcity]</p>
    <a href="#form" class="cta-primary cta-large">[Same CTA as hero]</a>
    <p class="microcopy microcopy-light">[Risk reducer]</p>
  </div>
</section>
```

**Styling**: Dark or primary-color background. White text. Extra vertical padding (100-120px). CTA button large (cta-large variant). Creates visual contrast from rest of page.

**Mobile**: Same layout, CTA full-width.

---

## Form Section (inserted where needed)

For lead capture pages, the form can appear:
- **In hero** (right column on desktop)
- **Standalone section** (between testimonials and FAQ)
- **Both** (hero inline + standalone for scrollers)

```html
<section id="form" class="form-section">
  <div class="container narrow">
    <div class="form-card">
      <h2 class="form-headline">[Value-oriented: "Get Your Free Demo"]</h2>
      <form action="#" method="POST" class="lp-form" novalidate>
        <div class="form-group">
          <label for="name">Your Name</label>
          <input type="text" id="name" name="name" required autocomplete="name"
                 placeholder="Jane Smith">
        </div>
        <div class="form-group">
          <label for="email">Work Email</label>
          <input type="email" id="email" name="email" required autocomplete="email"
                 placeholder="jane@company.com">
        </div>
        <button type="submit" class="cta-primary cta-full-width">[Action + Value]</button>
        <p class="microcopy">[Privacy reassurance + link]</p>
      </form>
    </div>
  </div>
</section>
```

**Styling**: White card with subtle shadow on light background. Single-column layout. Labels above fields. Input fields full-width with generous padding (12-16px). Submit button same styling as primary CTA.

**Validation**: HTML5 `required` and `type="email"` for basic validation. Custom validation message via CSS `:invalid` styling (border-color change).
