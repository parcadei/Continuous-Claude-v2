# Frontend Slides Themes

Reusable presentation themes for the frontend-slides skill.

## Available Themes

| Theme | File | Vibe |
|-------|------|------|
| **Midnight Executive** | `midnight-executive.html` | Dark, premium corporate with gold/teal accents |

## How to Use a Theme

### Option 1: Copy the Template

1. Copy the theme file to your project
2. Replace `{{PLACEHOLDERS}}` with your content
3. Add/remove slides as needed

### Option 2: Reference When Creating

When asking Claude to create a presentation, specify:

```
Create a presentation using the Midnight Executive theme from my frontend-slides skill
```

Claude will use the theme's CSS variables, components, and patterns.

---

## Midnight Executive Theme

### Color Variables

```css
/* Core */
--bg-primary: #0f172a;       /* Main background */
--bg-secondary: #1e293b;     /* Cards */
--text-primary: #f8fafc;     /* Main text */
--text-secondary: #94a3b8;   /* Body text */

/* Accents */
--accent: #f59e0b;           /* Gold/amber */
--teal: #00B69F;             /* Primary accent */
--purple: #a78bfa;           /* Secondary accent */

/* Semantic */
--success: #22c55e;
--danger: #ef4444;
```

### Typography

| Element | Font | Size |
|---------|------|------|
| Display (h1, h2) | Libre Baskerville | 2.5-4rem |
| Body | Source Sans 3 | 1rem |
| Code | JetBrains Mono | 0.875rem |
| Labels | Source Sans 3 | 0.75rem uppercase |

### Available Components

#### Labels
```html
<p class="label">Default (teal)</p>
<p class="label label-amber">Amber</p>
<p class="label label-purple">Purple</p>
<p class="label label-danger">Danger</p>
```

#### Cards
```html
<div class="card">Basic card</div>
<div class="card card-accent">Accent border</div>

<div class="card-grid">...</div>      <!-- Auto-fit -->
<div class="card-grid-2">...</div>    <!-- 2 columns -->
<div class="card-grid-3">...</div>    <!-- 3 columns -->
```

#### Stats
```html
<div class="stat">42%</div>
<div class="stat stat-amber">$1.2M</div>
<div class="stat stat-danger">-15%</div>
<div class="stat-label">Metric Label</div>
```

#### Icon Boxes
```html
<div class="icon-box">🎯</div>           <!-- Teal -->
<div class="icon-box icon-box-amber">⚡</div>
<div class="icon-box icon-box-purple">🤖</div>
<div class="icon-box icon-box-success">✓</div>
```

#### Highlight Boxes
```html
<div class="highlight-box">Teal gradient</div>
<div class="highlight-box-amber">Amber gradient</div>
<div class="highlight-box-purple">Purple gradient</div>
```

#### Glow Backgrounds
```html
<div class="glow-bg glow-teal" style="top: 10%; right: -20%;"></div>
<div class="glow-bg glow-amber" style="bottom: -10%; left: -15%;"></div>
<div class="glow-bg glow-purple" style="top: 30%; left: 50%;"></div>
```

#### Layouts
```html
<div class="two-col">...</div>    <!-- 2 equal columns -->
<div class="three-col">...</div>  <!-- 3 equal columns -->
```

#### Tables
```html
<table class="matrix-table">  <!-- Centered cells except first column -->
  <thead>...</thead>
  <tbody>
    <tr>
      <td><strong>Feature</strong></td>
      <td><span class="check">✓</span></td>
      <td><span class="cross">✗</span></td>
    </tr>
  </tbody>
</table>
```

### Slide Patterns

#### Title Slide
```html
<section class="slide title-slide" data-slide="0">
    <div class="glow-bg glow-teal" style="top: -20%; left: 50%; transform: translateX(-50%);"></div>
    <div class="slide-content">
        <p class="label reveal">Label</p>
        <h1 class="reveal">Main Heading</h1>
        <p class="subtitle reveal">Subtitle text</p>
        <div class="accent-line reveal" style="margin: 2rem auto;"></div>
        <p class="meta reveal">Author • Date</p>
    </div>
</section>
```

#### Content Slide with Cards
```html
<section class="slide" data-slide="1">
    <div class="glow-bg glow-amber" style="top: 10%; right: -20%;"></div>
    <div class="slide-content">
        <p class="label label-amber reveal">Section</p>
        <h2 class="reveal">Heading</h2>
        <p class="reveal">Intro text.</p>
        <div class="card-grid reveal">
            <div class="card">...</div>
            <div class="card">...</div>
        </div>
    </div>
</section>
```

#### Two-Column Feature Slide
```html
<section class="slide" data-slide="2">
    <div class="slide-content">
        <h2 class="reveal">Heading</h2>
        <div class="two-col">
            <div>
                <div class="feature-item reveal">
                    <div class="icon-box">🎯</div>
                    <div>
                        <h4>Feature</h4>
                        <p>Description</p>
                    </div>
                </div>
            </div>
            <div class="reveal">
                <div class="highlight-box">...</div>
            </div>
        </div>
    </div>
</section>
```

---

## Creating New Themes

To create a new theme:

1. Copy `midnight-executive.html`
2. Rename to `your-theme-name.html`
3. Modify the `:root` CSS variables
4. Adjust component styles as needed
5. Update this README with the new theme

### Key Variables to Change

```css
:root {
    /* Background colors */
    --bg-primary: #...;
    --bg-secondary: #...;

    /* Text colors */
    --text-primary: #...;
    --text-secondary: #...;

    /* Accent colors */
    --accent: #...;
    --teal: #...;

    /* Fonts (update <link> tags too) */
    --font-display: '...', serif;
    --font-body: '...', sans-serif;
}
```
