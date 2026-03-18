# Component Library

Load this during Phase 3 (Build). Contains the complete CSS component system for landing pages. Copy these styles into the `<style>` block of the single-file HTML output.

---

## Table of Contents

1. [Base Reset & Variables](#1-base-reset--variables)
2. [Layout System](#2-layout-system)
3. [Typography](#3-typography)
4. [Buttons & CTAs](#4-buttons--ctas)
5. [Forms](#5-forms)
6. [Cards](#6-cards)
7. [Proof & Trust Elements](#7-proof--trust-elements)
8. [Section Utilities](#8-section-utilities)
9. [Image Placeholders](#9-image-placeholders)
10. [Animations](#10-animations)

---

## 1. Base Reset & Variables

```css
:root {
  /* === CUSTOMIZE THESE PER PROJECT === */
  --color-primary: #2563EB;        /* CTA buttons, accents */
  --color-primary-dark: #1D4ED8;   /* CTA hover state */
  --color-primary-light: #DBEAFE;  /* Light accent backgrounds */
  --color-text: #1A1A2E;           /* Primary text */
  --color-text-muted: #6B7280;     /* Secondary text, labels */
  --color-bg: #FFFFFF;             /* Page background */
  --color-bg-alt: #F8F9FA;         /* Alternating section background */
  --color-bg-dark: #1A1A2E;        /* Final CTA section, dark sections */
  --color-border: #E5E7EB;         /* Borders, dividers */
  --color-success: #059669;        /* Checkmarks, positive indicators */
  --color-white: #FFFFFF;

  /* === SPACING (8px base) === */
  --space-xs: 0.5rem;    /* 8px */
  --space-sm: 1rem;      /* 16px */
  --space-md: 1.5rem;    /* 24px */
  --space-lg: 2rem;      /* 32px */
  --space-xl: 3rem;      /* 48px */
  --space-2xl: 5rem;     /* 80px */
  --space-3xl: 7.5rem;   /* 120px */

  /* === TYPOGRAPHY === */
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                 "Helvetica Neue", Arial, sans-serif;
  --font-size-hero: clamp(2rem, 5vw, 3.5rem);
  --font-size-h2: clamp(1.5rem, 3vw, 2.25rem);
  --font-size-h3: 1.25rem;
  --font-size-body: 1.125rem;
  --font-size-small: 0.875rem;
  --line-height: 1.7;

  /* === LAYOUT === */
  --max-width: 1200px;
  --max-width-narrow: 720px;
  --border-radius: 8px;
  --border-radius-lg: 12px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 30px rgba(0,0,0,0.12);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-body);
  line-height: var(--line-height);
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

a {
  text-decoration: none;
  color: inherit;
}
```

---

## 2. Layout System

```css
.container {
  width: 100%;
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--space-md);
}

.narrow {
  max-width: var(--max-width-narrow);
}

.text-center {
  text-align: center;
}

/* Hero grid: 60/40 on desktop, stacked on mobile */
.hero-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-xl);
  align-items: center;
}

/* Feature grid: 3 columns desktop, 1 column mobile */
.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

/* Steps grid: 3 columns desktop, 1 column mobile */
.steps-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

/* Testimonials grid */
.testimonials-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
}

/* Pricing grid */
.pricing-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
  align-items: start;
}

/* Proof bar logos */
.proof-logos {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: var(--space-lg);
}

.proof-metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-xl);
}

/* === TABLET (768px+) === */
@media (min-width: 768px) {
  .features-grid,
  .testimonials-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .pricing-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .steps-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* === DESKTOP (1024px+) === */
@media (min-width: 1024px) {
  .hero-grid {
    grid-template-columns: 1.2fr 1fr;
  }

  .features-grid,
  .testimonials-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .pricing-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## 3. Typography

```css
h1, h2, h3 {
  line-height: 1.2;
  font-weight: 700;
  color: var(--color-text);
}

.hero-headline {
  font-size: var(--font-size-hero);
  letter-spacing: -0.02em;
  margin-bottom: var(--space-sm);
}

.hero-subheadline {
  font-size: 1.25rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-lg);
  max-width: 540px;
}

.section-headline {
  font-size: var(--font-size-h2);
  margin-bottom: var(--space-sm);
}

.section-subheadline {
  font-size: var(--font-size-body);
  color: var(--color-text-muted);
  margin-bottom: var(--space-xl);
}

.proof-label {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
  margin-bottom: var(--space-md);
}

.microcopy {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
}

.microcopy-light {
  color: rgba(255,255,255,0.7);
}
```

---

## 4. Buttons & CTAs

```css
.cta-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16px 32px;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-white);
  background: var(--color-primary);
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
  min-height: 48px;
  min-width: 48px;
  text-align: center;
  line-height: 1.2;
}

.cta-primary:hover {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.cta-primary:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

.cta-primary:active {
  transform: translateY(0);
}

.cta-large {
  padding: 20px 48px;
  font-size: 1.25rem;
}

.cta-full-width {
  width: 100%;
}

.cta-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 2px solid var(--color-primary);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  min-height: 48px;
}

.cta-secondary:hover {
  background: var(--color-primary);
  color: var(--color-white);
}

.hero-cta-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
}
```

---

## 5. Forms

```css
.form-card {
  background: var(--color-bg);
  border-radius: var(--border-radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-lg);
  max-width: 480px;
  margin: 0 auto;
}

.form-headline {
  font-size: var(--font-size-h3);
  margin-bottom: var(--space-md);
  text-align: center;
}

.lp-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: var(--font-size-small);
  font-weight: 600;
  color: var(--color-text);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px 16px;
  font-size: 1rem;
  font-family: var(--font-family);
  border: 2px solid var(--color-border);
  border-radius: var(--border-radius);
  transition: border-color 0.2s;
  width: 100%;
  background: var(--color-bg);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-group input:invalid:not(:placeholder-shown) {
  border-color: #DC2626;
}
```

---

## 6. Cards

```css
.feature-card {
  padding: var(--space-lg);
  background: var(--color-bg);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--color-border);
  transition: box-shadow 0.2s;
}

.feature-card:hover {
  box-shadow: var(--shadow-md);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-sm);
}

.feature-title {
  font-size: var(--font-size-h3);
  margin-bottom: var(--space-xs);
}

.feature-description {
  color: var(--color-text-muted);
  font-size: 1rem;
}

/* Testimonial cards */
.testimonial-card {
  padding: var(--space-lg);
  background: var(--color-bg);
  border-radius: var(--border-radius-lg);
  border-left: 4px solid var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.testimonial-quote {
  font-size: 1.05rem;
  font-style: italic;
  margin-bottom: var(--space-md);
  line-height: 1.6;
}

.testimonial-attribution {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.testimonial-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--font-size-small);
  flex-shrink: 0;
}

.testimonial-name {
  font-style: normal;
  font-weight: 600;
  display: block;
}

.testimonial-role {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
}

/* Pricing cards */
.pricing-card {
  padding: var(--space-xl);
  background: var(--color-bg);
  border-radius: var(--border-radius-lg);
  border: 2px solid var(--color-border);
  text-align: center;
  position: relative;
}

.pricing-card.recommended {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-lg);
  transform: scale(1.03);
}

.recommended-badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary);
  color: var(--color-white);
  padding: 4px 16px;
  border-radius: 20px;
  font-size: var(--font-size-small);
  font-weight: 600;
}

.plan-name {
  font-size: var(--font-size-h3);
  margin-bottom: var(--space-xs);
}

.plan-price {
  margin-bottom: var(--space-sm);
}

.price-amount {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-text);
}

.price-period {
  font-size: 1rem;
  color: var(--color-text-muted);
}

.plan-features {
  list-style: none;
  text-align: left;
  margin: var(--space-md) 0;
}

.plan-features li {
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.95rem;
}

.plan-features li::before {
  content: "✓ ";
  color: var(--color-success);
  font-weight: 700;
}
```

---

## 7. Proof & Trust Elements

```css
.logo-placeholder {
  width: 120px;
  height: 40px;
  background: var(--color-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
  opacity: 0.6;
}

.proof-metric {
  text-align: center;
}

.metric-number {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-primary);
}

.metric-label {
  font-size: var(--font-size-small);
  color: var(--color-text-muted);
}
```

---

## 8. Section Utilities

```css
/* Section spacing */
section {
  padding: var(--space-2xl) 0;
}

.hero {
  padding: var(--space-3xl) 0 var(--space-2xl);
  min-height: 85vh;
  display: flex;
  align-items: center;
}

.proof-bar {
  padding: var(--space-lg) 0;
  background: var(--color-bg-alt);
}

/* Alternating backgrounds */
.bg-alt {
  background: var(--color-bg-alt);
}

/* Dark section (final CTA) */
.final-cta-section {
  background: var(--color-bg-dark);
  color: var(--color-white);
  padding: var(--space-3xl) 0;
}

.final-cta-section .section-headline,
.final-cta-section h2 {
  color: var(--color-white);
}

.final-headline {
  font-size: var(--font-size-h2);
  margin-bottom: var(--space-sm);
  color: var(--color-white);
}

.final-subtext {
  font-size: 1.125rem;
  opacity: 0.85;
  margin-bottom: var(--space-lg);
}

/* FAQ */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.faq-item {
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-md) 0;
}

.faq-question {
  font-weight: 600;
  font-size: 1.05rem;
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.faq-question::after {
  content: "+";
  font-size: 1.5rem;
  color: var(--color-primary);
  transition: transform 0.2s;
}

.faq-item[open] .faq-question::after {
  content: "−";
}

.faq-answer {
  padding-top: var(--space-sm);
  color: var(--color-text-muted);
}

/* Skip link (accessibility) */
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--space-sm);
  background: var(--color-primary);
  color: var(--color-white);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius);
  z-index: 100;
  font-size: var(--font-size-small);
}

.skip-link:focus {
  top: var(--space-sm);
}
```

---

## 9. Image Placeholders

```css
.image-placeholder {
  width: 100%;
  aspect-ratio: 16/10;
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-bg-alt));
  border-radius: var(--border-radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
  border: 2px dashed var(--color-border);
}
```

---

## 10. Animations

Subtle, performance-safe animations. No layout-shifting transitions.

```css
/* Fade-in on scroll (requires JS intersection observer) */
.fade-in {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}
```

**Scroll animation JS** (add before closing `</body>`):

```html
<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
</script>
```

Add `class="fade-in"` to any section or card you want to animate on scroll.
