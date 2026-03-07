# Fourth HTML Presentation Template

Specification for generating self-contained HTML presentations using Fourth brand identity.
Zero external dependencies except Google Fonts (Poppins).

---

## Overview

When generating HTML presentation output, produce a single `.html` file that:

- Contains all CSS inline (no external stylesheets)
- Contains all JS inline (no external scripts)
- Loads only Google Fonts for Poppins
- Uses scroll-snap for slide navigation
- Implements intersection-observer-based reveal animations
- Is fully responsive (desktop, tablet, mobile)
- Respects `prefers-reduced-motion`

---

## CSS Custom Properties

All Fourth brand values as CSS custom properties. Include these in every generated file.

```css
:root {
    /* Fourth Brand Colors */
    --fourth-deep-blue: #0C4A7D;
    --fourth-teal: #00B69F;
    --fourth-sky-blue: #6FB4E3;
    --fourth-midnight: #002747;
    --fourth-dark-gray: #373E42;
    --fourth-cool-grey: #CFD1D1;
    --fourth-soft-white: #F5F5F5;
    --fourth-white: #FFFFFF;
    --fourth-hot-red: #D9373B;
    --fourth-purple: #9279B2;
    --fourth-sunrise-orange: #FAA51A;

    /* Typography */
    --font-display: 'Poppins', sans-serif;
    --font-body: 'Poppins', sans-serif;

    /* Type Scale */
    --text-h1: clamp(2rem, 4vw, 3rem);       /* ~48pt */
    --text-h2: clamp(1.5rem, 3vw, 2.25rem);  /* ~36pt */
    --text-h3: clamp(1.25rem, 2.5vw, 1.5rem);/* ~24pt */
    --text-h4: clamp(1.1rem, 2vw, 1.25rem);  /* ~20pt */
    --text-body: clamp(0.95rem, 1.5vw, 1.125rem); /* ~18pt */
    --text-small: clamp(0.8rem, 1.2vw, 0.875rem); /* ~14pt */
    --text-caption: 0.75rem;                  /* ~12pt */

    /* Spacing */
    --slide-padding: clamp(2rem, 5vw, 4rem);
    --content-max-width: 1200px;
    --gap-sm: 0.5rem;
    --gap-md: 1rem;
    --gap-lg: 2rem;
    --gap-xl: 3rem;

    /* Animation */
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
    --duration-fast: 0.3s;
    --duration-normal: 0.6s;
    --duration-slow: 1s;

    /* Gradient */
    --fourth-vignette: linear-gradient(25deg, #00B69F 0%, #6FB4E3 40%, #0C4A7D 100%);

    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0, 39, 71, 0.08);
    --shadow-md: 0 4px 12px rgba(0, 39, 71, 0.12);
    --shadow-lg: 0 8px 30px rgba(0, 39, 71, 0.16);
}
```

---

## Font Loading

Include in the `<head>` of every generated file:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

## Slide Container Architecture

### HTML Structure

```html
<html lang="en">
<body>
    <main class="presentation">
        <section class="slide title-slide" id="slide-1">...</section>
        <section class="slide content-slide" id="slide-2">...</section>
        <section class="slide section-break" id="slide-3">...</section>
        <!-- more slides -->
    </main>
    <nav class="slide-nav" aria-label="Slide navigation">
        <button class="nav-dot active" data-slide="1"></button>
        <button class="nav-dot" data-slide="2"></button>
        <!-- one per slide -->
    </nav>
    <div class="progress-bar"><div class="progress-fill"></div></div>
</body>
</html>
```

### Core Slide CSS

```css
html {
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
}

.presentation {
    width: 100%;
}

.slide {
    min-height: 100vh;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: var(--slide-padding);
    position: relative;
    overflow: hidden;
}

.slide-inner {
    max-width: var(--content-max-width);
    width: 100%;
}
```

---

## Slide Type Classes

### `.title-slide`

```css
.title-slide {
    background: var(--fourth-vignette);
    color: var(--fourth-white);
    text-align: center;
}

.title-slide h1 {
    font-family: var(--font-display);
    font-size: var(--text-h1);
    font-weight: 600;
    line-height: 1.21;
    margin-bottom: var(--gap-md);
}

.title-slide .subtitle {
    font-size: var(--text-body);
    font-weight: 400;
    opacity: 0.9;
}

.title-slide .presenter {
    font-size: var(--text-small);
    font-weight: 400;
    opacity: 0.7;
    margin-top: var(--gap-lg);
}
```

### `.content-slide`

```css
.content-slide {
    background: var(--fourth-white);
    color: var(--fourth-dark-gray);
}

.content-slide h2 {
    font-family: var(--font-display);
    font-size: var(--text-h2);
    font-weight: 600;
    color: var(--fourth-deep-blue);
    margin-bottom: var(--gap-lg);
    line-height: 1.21;
}

.content-slide ul {
    list-style: none;
    padding: 0;
}

.content-slide ul li {
    font-size: var(--text-body);
    line-height: 1.6;
    padding-left: 1.5em;
    position: relative;
    margin-bottom: var(--gap-md);
}

.content-slide ul li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.6em;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--fourth-teal);
}
```

### `.section-break`

```css
.section-break {
    background: var(--fourth-deep-blue);
    color: var(--fourth-white);
    text-align: center;
}

.section-break h2 {
    font-size: var(--text-h2);
    font-weight: 600;
    line-height: 1.21;
}

.section-break .section-subtitle {
    font-size: var(--text-body);
    opacity: 0.8;
    margin-top: var(--gap-md);
}
```

### `.data-slide`

```css
.data-slide {
    background: var(--fourth-white);
}

.data-slide h2 {
    color: var(--fourth-deep-blue);
    font-size: var(--text-h2);
    font-weight: 600;
    margin-bottom: var(--gap-lg);
}

.chart-container {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
}

.data-source {
    font-size: var(--text-caption);
    color: var(--fourth-dark-gray);
    opacity: 0.6;
    margin-top: var(--gap-md);
}
```

### `.quote-slide`

```css
.quote-slide {
    background: var(--fourth-soft-white);
    text-align: center;
}

.quote-mark {
    font-size: 8rem;
    line-height: 1;
    color: var(--fourth-teal);
    opacity: 0.3;
    font-family: Georgia, serif;
}

.quote-text {
    font-family: var(--font-body);
    font-size: var(--text-h3);
    font-weight: 400;
    color: var(--fourth-deep-blue);
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.5;
}

.quote-attribution {
    font-size: var(--text-small);
    color: var(--fourth-dark-gray);
    margin-top: var(--gap-lg);
}
```

### `.closing-slide`

```css
.closing-slide {
    background: var(--fourth-vignette);
    color: var(--fourth-white);
    text-align: center;
}

.closing-slide h2 {
    font-size: var(--text-h1);
    font-weight: 600;
    margin-bottom: var(--gap-lg);
}

.closing-slide .cta-list {
    list-style: none;
    padding: 0;
    font-size: var(--text-body);
    margin-bottom: var(--gap-xl);
}

.closing-slide .cta-list li {
    margin-bottom: var(--gap-sm);
    opacity: 0.9;
}

.powered-by-iq {
    font-size: var(--text-small);
    opacity: 0.7;
    margin-top: var(--gap-xl);
    letter-spacing: 0.05em;
}
```

---

## Animation Patterns

### Reveal Animation

```css
.reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity var(--duration-normal) var(--ease-out-expo),
                transform var(--duration-normal) var(--ease-out-expo);
}

.slide.visible .reveal {
    opacity: 1;
    transform: translateY(0);
}
```

### Staggered Reveals

```css
.slide.visible .reveal:nth-child(1) { transition-delay: 0s; }
.slide.visible .reveal:nth-child(2) { transition-delay: 0.1s; }
.slide.visible .reveal:nth-child(3) { transition-delay: 0.2s; }
.slide.visible .reveal:nth-child(4) { transition-delay: 0.3s; }
.slide.visible .reveal:nth-child(5) { transition-delay: 0.4s; }
.slide.visible .reveal:nth-child(6) { transition-delay: 0.5s; }
.slide.visible .reveal:nth-child(7) { transition-delay: 0.6s; }
.slide.visible .reveal:nth-child(8) { transition-delay: 0.7s; }
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
    .reveal {
        opacity: 1;
        transform: none;
        transition: none;
    }
    html {
        scroll-behavior: auto;
    }
}
```

---

## Navigation

### Nav Dots

```css
.slide-nav {
    position: fixed;
    right: 1.5rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 100;
}

.nav-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--fourth-deep-blue);
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: background var(--duration-fast) ease;
}

.nav-dot.active {
    background: var(--fourth-teal);
    border-color: var(--fourth-teal);
}
```

### Progress Bar

```css
.progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: var(--fourth-cool-grey);
    z-index: 100;
}

.progress-fill {
    height: 100%;
    background: var(--fourth-teal);
    width: 0%;
    transition: width var(--duration-fast) ease;
}
```

---

## Responsive Rules

```css
/* Tablet */
@media (max-width: 1024px) {
    .two-column { flex-direction: column; }
    .three-column { flex-direction: column; }
}

/* Mobile */
@media (max-width: 640px) {
    .slide-nav { display: none; }
    .slide { padding: var(--gap-lg); }
    .two-column,
    .three-column { gap: var(--gap-lg); }
}
```

---

## JavaScript Controller

### SlidePresentation Class

```javascript
class SlidePresentation {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.dots = document.querySelectorAll('.nav-dot');
        this.progressFill = document.querySelector('.progress-fill');
        this.currentSlide = 0;
        this.totalSlides = this.slides.length;

        this.initIntersectionObserver();
        this.initKeyboardNav();
        this.initDotNav();
        this.initTouchNav();
    }

    initIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    const index = Array.from(this.slides).indexOf(entry.target);
                    this.currentSlide = index;
                    this.updateNav();
                    this.updateProgress();
                }
            });
        }, {
            threshold: 0.5
        });

        this.slides.forEach(slide => observer.observe(slide));
    }

    initKeyboardNav() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowRight':
                case ' ':
                    e.preventDefault();
                    this.goToSlide(this.currentSlide + 1);
                    break;
                case 'ArrowUp':
                case 'ArrowLeft':
                    e.preventDefault();
                    this.goToSlide(this.currentSlide - 1);
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToSlide(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToSlide(this.totalSlides - 1);
                    break;
            }
        });
    }

    initDotNav() {
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });
    }

    initTouchNav() {
        let touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY - touchEndY;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    this.goToSlide(this.currentSlide + 1);
                } else {
                    this.goToSlide(this.currentSlide - 1);
                }
            }
        }, { passive: true });
    }

    goToSlide(index) {
        if (index < 0 || index >= this.totalSlides) return;
        this.slides[index].scrollIntoView({ behavior: 'smooth' });
    }

    updateNav() {
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentSlide);
        });
    }

    updateProgress() {
        const progress = ((this.currentSlide + 1) / this.totalSlides) * 100;
        if (this.progressFill) {
            this.progressFill.style.width = `${progress}%`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SlidePresentation();
});
```

---

## Full Template Skeleton

Complete HTML file structure for reference. When generating presentations, follow this structure.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{PRESENTATION_TITLE}} | Fourth</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* === RESET === */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* === CSS CUSTOM PROPERTIES === */
        :root {
            --fourth-deep-blue: #0C4A7D;
            --fourth-teal: #00B69F;
            --fourth-sky-blue: #6FB4E3;
            --fourth-midnight: #002747;
            --fourth-dark-gray: #373E42;
            --fourth-cool-grey: #CFD1D1;
            --fourth-soft-white: #F5F5F5;
            --fourth-white: #FFFFFF;
            --fourth-hot-red: #D9373B;
            --fourth-purple: #9279B2;
            --font-display: 'Poppins', sans-serif;
            --font-body: 'Poppins', sans-serif;
            --text-h1: clamp(2rem, 4vw, 3rem);
            --text-h2: clamp(1.5rem, 3vw, 2.25rem);
            --text-h3: clamp(1.25rem, 2.5vw, 1.5rem);
            --text-h4: clamp(1.1rem, 2vw, 1.25rem);
            --text-body: clamp(0.95rem, 1.5vw, 1.125rem);
            --text-small: clamp(0.8rem, 1.2vw, 0.875rem);
            --text-caption: 0.75rem;
            --slide-padding: clamp(2rem, 5vw, 4rem);
            --content-max-width: 1200px;
            --gap-sm: 0.5rem;
            --gap-md: 1rem;
            --gap-lg: 2rem;
            --gap-xl: 3rem;
            --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
            --duration-fast: 0.3s;
            --duration-normal: 0.6s;
            --fourth-vignette: linear-gradient(25deg, #00B69F 0%, #6FB4E3 40%, #0C4A7D 100%);
            --shadow-md: 0 4px 12px rgba(0, 39, 71, 0.12);
        }

        /* === BASE === */
        html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }
        body { font-family: var(--font-body); color: var(--fourth-dark-gray); background: var(--fourth-white); }

        /* === SLIDES === */
        .slide {
            min-height: 100vh;
            scroll-snap-align: start;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: var(--slide-padding);
            position: relative;
            overflow: hidden;
        }
        .slide-inner { max-width: var(--content-max-width); width: 100%; }

        /* === TITLE SLIDE === */
        .title-slide { background: var(--fourth-vignette); color: var(--fourth-white); text-align: center; }
        .title-slide h1 { font-size: var(--text-h1); font-weight: 600; line-height: 1.21; margin-bottom: var(--gap-md); }
        .title-slide .subtitle { font-size: var(--text-body); opacity: 0.9; }
        .title-slide .presenter { font-size: var(--text-small); opacity: 0.7; margin-top: var(--gap-lg); }

        /* === CONTENT SLIDE === */
        .content-slide { background: var(--fourth-white); }
        .content-slide h2 { font-size: var(--text-h2); font-weight: 600; color: var(--fourth-deep-blue); margin-bottom: var(--gap-lg); line-height: 1.21; }
        .content-slide ul { list-style: none; padding: 0; }
        .content-slide ul li { font-size: var(--text-body); line-height: 1.6; padding-left: 1.5em; position: relative; margin-bottom: var(--gap-md); }
        .content-slide ul li::before { content: ''; position: absolute; left: 0; top: 0.6em; width: 8px; height: 8px; border-radius: 50%; background: var(--fourth-teal); }

        /* === SECTION BREAK === */
        .section-break { background: var(--fourth-deep-blue); color: var(--fourth-white); text-align: center; }
        .section-break h2 { font-size: var(--text-h2); font-weight: 600; line-height: 1.21; }
        .section-break .section-subtitle { font-size: var(--text-body); opacity: 0.8; margin-top: var(--gap-md); }

        /* === TWO COLUMN === */
        .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap-xl); align-items: center; }

        /* === THREE COLUMN === */
        .three-column { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--gap-xl); text-align: center; }
        .column-icon { font-size: 2.5rem; color: var(--fourth-teal); margin-bottom: var(--gap-md); }
        .column-title { font-size: var(--text-h4); font-weight: 600; color: var(--fourth-deep-blue); margin-bottom: var(--gap-sm); }

        /* === QUOTE SLIDE === */
        .quote-slide { background: var(--fourth-soft-white); text-align: center; }
        .quote-mark { font-size: 8rem; line-height: 1; color: var(--fourth-teal); opacity: 0.3; font-family: Georgia, serif; }
        .quote-text { font-size: var(--text-h3); color: var(--fourth-deep-blue); max-width: 800px; margin: 0 auto; line-height: 1.5; }
        .quote-attribution { font-size: var(--text-small); color: var(--fourth-dark-gray); margin-top: var(--gap-lg); }

        /* === DATA SLIDE === */
        .data-slide { background: var(--fourth-white); }
        .data-slide h2 { color: var(--fourth-deep-blue); font-size: var(--text-h2); font-weight: 600; margin-bottom: var(--gap-lg); }
        .chart-container { width: 100%; max-width: 800px; margin: 0 auto; }
        .data-source { font-size: var(--text-caption); color: var(--fourth-dark-gray); opacity: 0.6; margin-top: var(--gap-md); }

        /* === CLOSING SLIDE === */
        .closing-slide { background: var(--fourth-vignette); color: var(--fourth-white); text-align: center; }
        .closing-slide h2 { font-size: var(--text-h1); font-weight: 600; margin-bottom: var(--gap-lg); }
        .closing-slide .cta-list { list-style: none; padding: 0; font-size: var(--text-body); margin-bottom: var(--gap-xl); }
        .closing-slide .cta-list li { margin-bottom: var(--gap-sm); opacity: 0.9; }
        .powered-by-iq { font-size: var(--text-small); opacity: 0.7; margin-top: var(--gap-xl); letter-spacing: 0.05em; }

        /* === ANIMATIONS === */
        .reveal { opacity: 0; transform: translateY(30px); transition: opacity var(--duration-normal) var(--ease-out-expo), transform var(--duration-normal) var(--ease-out-expo); }
        .slide.visible .reveal { opacity: 1; transform: translateY(0); }
        .slide.visible .reveal:nth-child(1) { transition-delay: 0s; }
        .slide.visible .reveal:nth-child(2) { transition-delay: 0.1s; }
        .slide.visible .reveal:nth-child(3) { transition-delay: 0.1s; }
        .slide.visible .reveal:nth-child(4) { transition-delay: 0.2s; }
        .slide.visible .reveal:nth-child(5) { transition-delay: 0.3s; }
        .slide.visible .reveal:nth-child(6) { transition-delay: 0.4s; }
        .slide.visible .reveal:nth-child(7) { transition-delay: 0.5s; }
        .slide.visible .reveal:nth-child(8) { transition-delay: 0.6s; }

        @media (prefers-reduced-motion: reduce) {
            .reveal { opacity: 1; transform: none; transition: none; }
            html { scroll-behavior: auto; }
        }

        /* === NAVIGATION === */
        .slide-nav { position: fixed; right: 1.5rem; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 0.5rem; z-index: 100; }
        .nav-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--fourth-deep-blue); background: transparent; cursor: pointer; padding: 0; transition: background var(--duration-fast) ease; }
        .nav-dot.active { background: var(--fourth-teal); border-color: var(--fourth-teal); }
        .progress-bar { position: fixed; top: 0; left: 0; width: 100%; height: 3px; background: var(--fourth-cool-grey); z-index: 100; }
        .progress-fill { height: 100%; background: var(--fourth-teal); width: 0%; transition: width var(--duration-fast) ease; }

        /* === RESPONSIVE === */
        @media (max-width: 1024px) {
            .two-column, .three-column { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
            .slide-nav { display: none; }
            .slide { padding: var(--gap-lg); }
        }
    </style>
</head>
<body>

<div class="progress-bar"><div class="progress-fill"></div></div>

<main class="presentation">

    <!-- SLIDE 1: Title -->
    <section class="slide title-slide" id="slide-1">
        <div class="slide-inner">
            <h1 class="reveal">{{PRESENTATION_TITLE}}</h1>
            <p class="subtitle reveal">{{SUBTITLE}}</p>
            <p class="presenter reveal">{{PRESENTER}} -- {{DATE}}</p>
        </div>
    </section>

    <!-- SLIDE 2: Agenda -->
    <section class="slide content-slide" id="slide-2">
        <div class="slide-inner">
            <h2 class="reveal">Agenda</h2>
            <ol class="reveal" style="list-style: decimal; padding-left: 1.5em; font-size: var(--text-body); line-height: 2;">
                <li>{{AGENDA_ITEM_1}}</li>
                <li>{{AGENDA_ITEM_2}}</li>
                <li>{{AGENDA_ITEM_3}}</li>
                <li>{{AGENDA_ITEM_4}}</li>
            </ol>
        </div>
    </section>

    <!-- SLIDE 3: Section Break -->
    <section class="slide section-break" id="slide-3">
        <div class="slide-inner">
            <h2 class="reveal">{{SECTION_TITLE}}</h2>
            <p class="section-subtitle reveal">{{SECTION_SUBTITLE}}</p>
        </div>
    </section>

    <!-- SLIDE 4: Content (Single Column) -->
    <section class="slide content-slide" id="slide-4">
        <div class="slide-inner">
            <h2 class="reveal">{{CONTENT_TITLE}}</h2>
            <ul>
                <li class="reveal">{{BULLET_1}}</li>
                <li class="reveal">{{BULLET_2}}</li>
                <li class="reveal">{{BULLET_3}}</li>
                <li class="reveal">{{BULLET_4}}</li>
            </ul>
        </div>
    </section>

    <!-- SLIDE 5: Two Column -->
    <section class="slide content-slide" id="slide-5">
        <div class="slide-inner">
            <h2 class="reveal">{{TWO_COL_TITLE}}</h2>
            <div class="two-column">
                <div class="reveal">
                    <h3 style="font-size: var(--text-h4); font-weight: 600; color: var(--fourth-deep-blue); margin-bottom: var(--gap-md);">{{LEFT_HEADING}}</h3>
                    <p style="font-size: var(--text-body);">{{LEFT_CONTENT}}</p>
                </div>
                <div class="reveal">
                    <h3 style="font-size: var(--text-h4); font-weight: 600; color: var(--fourth-deep-blue); margin-bottom: var(--gap-md);">{{RIGHT_HEADING}}</h3>
                    <p style="font-size: var(--text-body);">{{RIGHT_CONTENT}}</p>
                </div>
            </div>
        </div>
    </section>

    <!-- SLIDE 6: Three Column -->
    <section class="slide content-slide" id="slide-6">
        <div class="slide-inner">
            <h2 class="reveal">{{THREE_COL_TITLE}}</h2>
            <div class="three-column">
                <div class="reveal">
                    <div class="column-icon">{{ICON_1}}</div>
                    <div class="column-title">{{COL_1_TITLE}}</div>
                    <p style="font-size: var(--text-body);">{{COL_1_DESC}}</p>
                </div>
                <div class="reveal">
                    <div class="column-icon">{{ICON_2}}</div>
                    <div class="column-title">{{COL_2_TITLE}}</div>
                    <p style="font-size: var(--text-body);">{{COL_2_DESC}}</p>
                </div>
                <div class="reveal">
                    <div class="column-icon">{{ICON_3}}</div>
                    <div class="column-title">{{COL_3_TITLE}}</div>
                    <p style="font-size: var(--text-body);">{{COL_3_DESC}}</p>
                </div>
            </div>
        </div>
    </section>

    <!-- SLIDE 7: Quote -->
    <section class="slide quote-slide" id="slide-7">
        <div class="slide-inner">
            <div class="quote-mark reveal">"</div>
            <p class="quote-text reveal">{{QUOTE_TEXT}}</p>
            <p class="quote-attribution reveal">-- {{QUOTE_AUTHOR}}, {{QUOTE_TITLE}}</p>
        </div>
    </section>

    <!-- SLIDE 8: Closing -->
    <section class="slide closing-slide" id="slide-8">
        <div class="slide-inner">
            <h2 class="reveal">{{CLOSING_TITLE}}</h2>
            <ul class="cta-list">
                <li class="reveal">{{CTA_1}}</li>
                <li class="reveal">{{CTA_2}}</li>
                <li class="reveal">{{CTA_3}}</li>
            </ul>
            <p class="reveal" style="font-size: var(--text-small); opacity: 0.8;">{{CONTACT_INFO}}</p>
            <p class="powered-by-iq reveal">Powered by iQ</p>
        </div>
    </section>

</main>

<!-- Navigation Dots -->
<nav class="slide-nav" aria-label="Slide navigation">
    <button class="nav-dot active" data-slide="0" aria-label="Slide 1"></button>
    <button class="nav-dot" data-slide="1" aria-label="Slide 2"></button>
    <button class="nav-dot" data-slide="2" aria-label="Slide 3"></button>
    <button class="nav-dot" data-slide="3" aria-label="Slide 4"></button>
    <button class="nav-dot" data-slide="4" aria-label="Slide 5"></button>
    <button class="nav-dot" data-slide="5" aria-label="Slide 6"></button>
    <button class="nav-dot" data-slide="6" aria-label="Slide 7"></button>
    <button class="nav-dot" data-slide="7" aria-label="Slide 8"></button>
</nav>

<script>
class SlidePresentation {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.dots = document.querySelectorAll('.nav-dot');
        this.progressFill = document.querySelector('.progress-fill');
        this.currentSlide = 0;
        this.totalSlides = this.slides.length;
        this.initIntersectionObserver();
        this.initKeyboardNav();
        this.initDotNav();
        this.initTouchNav();
    }

    initIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    const index = Array.from(this.slides).indexOf(entry.target);
                    this.currentSlide = index;
                    this.updateNav();
                    this.updateProgress();
                }
            });
        }, { threshold: 0.5 });
        this.slides.forEach(slide => observer.observe(slide));
    }

    initKeyboardNav() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown': case 'ArrowRight': case ' ':
                    e.preventDefault();
                    this.goToSlide(this.currentSlide + 1);
                    break;
                case 'ArrowUp': case 'ArrowLeft':
                    e.preventDefault();
                    this.goToSlide(this.currentSlide - 1);
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToSlide(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToSlide(this.totalSlides - 1);
                    break;
            }
        });
    }

    initDotNav() {
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });
    }

    initTouchNav() {
        let touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        document.addEventListener('touchend', (e) => {
            const diff = touchStartY - e.changedTouches[0].clientY;
            if (Math.abs(diff) > 50) {
                this.goToSlide(this.currentSlide + (diff > 0 ? 1 : -1));
            }
        }, { passive: true });
    }

    goToSlide(index) {
        if (index < 0 || index >= this.totalSlides) return;
        this.slides[index].scrollIntoView({ behavior: 'smooth' });
    }

    updateNav() {
        this.dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentSlide);
        });
    }

    updateProgress() {
        const progress = ((this.currentSlide + 1) / this.totalSlides) * 100;
        if (this.progressFill) this.progressFill.style.width = progress + '%';
    }
}

document.addEventListener('DOMContentLoaded', () => new SlidePresentation());
</script>

</body>
</html>
```

---

## Template Variables

When generating a presentation, replace these `{{PLACEHOLDERS}}` with actual content:

| Variable | Description |
|----------|-------------|
| `{{PRESENTATION_TITLE}}` | Main title of the presentation |
| `{{SUBTITLE}}` | Subtitle or context line |
| `{{PRESENTER}}` | Presenter name and title |
| `{{DATE}}` | Presentation date |
| `{{AGENDA_ITEM_N}}` | Numbered agenda items |
| `{{SECTION_TITLE}}` | Section break title |
| `{{SECTION_SUBTITLE}}` | Section break subtitle |
| `{{CONTENT_TITLE}}` | Slide heading |
| `{{BULLET_N}}` | Bullet point text |
| `{{QUOTE_TEXT}}` | Testimonial or pull quote |
| `{{QUOTE_AUTHOR}}` | Quote attribution name |
| `{{QUOTE_TITLE}}` | Quote attribution title/company |
| `{{CLOSING_TITLE}}` | Closing slide heading |
| `{{CTA_N}}` | Call-to-action items |
| `{{CONTACT_INFO}}` | Contact details |

## Generation Notes

- Add or remove `<section class="slide">` blocks as needed for the content
- Update nav dots to match the number of slides
- Charts/data slides: use inline SVG or CSS-based bar charts (no Chart.js dependency)
- Images: use placeholder URLs or base64-encoded images for self-containment
- The skeleton above is a starting point -- adapt slide types and order to match the content

---

*Reference: Fourth HTML Template Spec v1.0*
*For use with the Fourth Presentation Suite skill.*
