# Style Presets Reference

Curated visual styles for Frontend Slides. Each preset includes specific font choices, color palettes, and animation approaches to ensure distinctive, non-generic designs.

---

## Dark Themes

### 1. Neon Cyber

**Vibe:** Futuristic, techy, confident, cutting-edge

**Typography:**
- Display: `Clash Display` (700) — Bold, geometric, modern
- Body: `Satoshi` (400/500) — Clean, technical, readable

**Colors:**
```css
:root {
    --bg-primary: #0a0f1c;
    --bg-secondary: #111827;
    --text-primary: #ffffff;
    --text-secondary: #94a3b8;
    --accent: #00ffcc;
    --accent-secondary: #ff00aa;
    --glow: rgba(0, 255, 204, 0.4);
}
```

**Signature Elements:**
- Particle system background (canvas)
- Neon glow on accent elements
- Custom cursor with trail
- Grid pattern overlay
- Glitch text effect on titles

**Animation Style:**
- Medium speed (0.5-0.8s)
- Slide up + fade entrances
- Staggered reveals

---

### 2. Midnight Executive

**Vibe:** Premium, trustworthy, sophisticated, corporate

**Typography:**
- Display: `Libre Baskerville` (700) — Classic, authoritative
- Body: `Source Sans 3` (400/600) — Professional, highly readable

**Colors:**
```css
:root {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --accent: #3b82f6;
    --accent-secondary: #818cf8;
    --gold: #fbbf24;
}
```

**Signature Elements:**
- Subtle gradient backgrounds
- Thin gold accent lines
- Data visualizations
- Minimal decorative elements
- Focus on whitespace

**Animation Style:**
- Fast, subtle (0.3-0.5s)
- Fade only, minimal movement
- Professional restraint

---

### 3. Deep Space

**Vibe:** Inspiring, vast, contemplative, visionary

**Typography:**
- Display: `Space Grotesk` (700) — Geometric, space-age
- Body: `DM Sans` (400/500) — Modern, friendly

**Colors:**
```css
:root {
    --bg-primary: #030712;
    --bg-secondary: #111827;
    --text-primary: #f9fafb;
    --text-secondary: #6b7280;
    --accent: #818cf8;
    --accent-secondary: #c084fc;
    --stars: rgba(255, 255, 255, 0.1);
}
```

**Signature Elements:**
- Starfield background (CSS or canvas)
- Radial gradient "spotlight" effects
- Floating elements
- Large, impactful typography
- Generous vertical spacing

**Animation Style:**
- Slow, cinematic (0.8-1.2s)
- Scale + fade entrances
- Parallax scrolling

---

### 4. Terminal Green

**Vibe:** Developer-focused, hacker aesthetic, retro-tech

**Typography:**
- Display: `JetBrains Mono` (700) — Monospace, code-like
- Body: `JetBrains Mono` (400) — Consistent monospace

**Colors:**
```css
:root {
    --bg-primary: #0d1117;
    --bg-secondary: #161b22;
    --text-primary: #c9d1d9;
    --text-secondary: #8b949e;
    --accent: #39d353;
    --accent-dim: rgba(57, 211, 83, 0.2);
    --border: #30363d;
}
```

**Signature Elements:**
- Scan line overlay effect
- Blinking cursor
- Code blocks and syntax highlighting
- ASCII art decorations
- Terminal-style borders

**Animation Style:**
- Typewriter text reveals
- Quick, snappy transitions (0.2-0.3s)
- Character-by-character reveals

---

## Light Themes

### 5. Paper & Ink

**Vibe:** Editorial, literary, thoughtful, refined

**Typography:**
- Display: `Cormorant Garamond` (700) — Elegant, editorial
- Body: `Source Serif 4` (400) — Classic, readable

**Colors:**
```css
:root {
    --bg-primary: #faf9f7;
    --bg-secondary: #f5f3ef;
    --text-primary: #1a1a1a;
    --text-secondary: #666666;
    --accent: #c41e3a;
    --border: #e5e2db;
}
```

**Signature Elements:**
- Drop caps on opening paragraphs
- Pull quotes
- Subtle paper texture
- Elegant horizontal rules
- Classic column layouts

**Animation Style:**
- Gentle fades (0.4-0.6s)
- No dramatic movements
- Refined, understated

---

### 6. Swiss Modern

**Vibe:** Clean, precise, Bauhaus-inspired, geometric

**Typography:**
- Display: `Archivo` (800) — Strong, geometric
- Body: `Nunito` (400/600) — Friendly, rounded

**Colors:**
```css
:root {
    --bg-primary: #ffffff;
    --bg-secondary: #f7f7f7;
    --text-primary: #000000;
    --text-secondary: #555555;
    --accent: #ff3300;
    --grid: rgba(0, 0, 0, 0.05);
}
```

**Signature Elements:**
- Visible grid system
- Asymmetric layouts
- Red accent sparingly
- Bold black typography
- Geometric shapes

**Animation Style:**
- Precise, mechanical (0.3-0.4s)
- Linear or ease-out easing
- Grid-aligned movements

---

### 7. Soft Pastel

**Vibe:** Friendly, approachable, creative, playful

**Typography:**
- Display: `Nunito` (800) — Rounded, warm
- Body: `Nunito` (400/500) — Consistent warmth

**Colors:**
```css
:root {
    --bg-primary: #fef3f2;
    --bg-secondary: #fef9f5;
    --text-primary: #374151;
    --text-secondary: #6b7280;
    --accent: #f472b6;
    --accent-secondary: #a78bfa;
    --accent-tertiary: #34d399;
}
```

**Signature Elements:**
- Rounded corners everywhere
- Blob shapes in background
- Multiple pastel accents
- Soft shadows
- Illustrated icons

**Animation Style:**
- Bouncy spring physics
- Playful overshoots
- Floating/bobbing elements

---

### 8. Warm Editorial

**Vibe:** Human, storytelling, photographic, magazine

**Typography:**
- Display: `Playfair Display` (700) — Elegant, serif headlines
- Body: `Work Sans` (400) — Modern, readable

**Colors:**
```css
:root {
    --bg-primary: #fffbf5;
    --bg-secondary: #f5efe6;
    --text-primary: #2d2a24;
    --text-secondary: #78716c;
    --accent: #b45309;
    --accent-secondary: #0369a1;
}
```

**Signature Elements:**
- Large hero images
- Image overlays with text
- Warm photography
- Pull quotes in accent color
- Handwritten accent fonts

**Animation Style:**
- Cinematic crossfades
- Ken Burns effect on images
- Slow, emotional transitions (0.8-1s)

---

## Specialty Themes

### 9. Brutalist

**Vibe:** Raw, bold, unconventional, attention-grabbing

**Typography:**
- Display: `Anton` or `Bebas Neue` (900) — Massive, compressed
- Body: `IBM Plex Mono` (400) — Industrial

**Colors:**
```css
:root {
    --bg-primary: #ffffff;
    --text-primary: #000000;
    --accent: #ff0000;
    --border: #000000;
}
```

**Signature Elements:**
- Thick black borders
- Asymmetric, chaotic layouts
- Oversized typography
- Raw, unpolished look
- High contrast

**Animation Style:**
- Instant or very fast
- Hard cuts, no easing
- Jarring transitions

---

### 10. Gradient Wave

**Vibe:** Modern SaaS, energetic, approachable tech

**Typography:**
- Display: `Cabinet Grotesk` (800) — Modern, confident
- Body: `Inter` (400/500) — Only allowed for this style

**Colors:**
```css
:root {
    --bg-primary: #0f0f1a;
    --gradient-1: #667eea;
    --gradient-2: #764ba2;
    --gradient-3: #f472b6;
    --text-primary: #ffffff;
    --text-secondary: #a1a1aa;
}
```

**Signature Elements:**
- Animated gradient meshes
- Blob shapes with blur
- Glass-morphism cards
- Floating orbs
- Smooth curves

**Animation Style:**
- Smooth, flowing (0.5-0.7s)
- Continuous subtle animations
- Hover reveals

---

## Font Pairing Quick Reference

| Vibe | Display Font | Body Font | Source |
|------|--------------|-----------|--------|
| Techy/Modern | Clash Display | Satoshi | Fontshare |
| Professional | Libre Baskerville | Source Sans 3 | Google |
| Space/Future | Space Grotesk | DM Sans | Google |
| Developer | JetBrains Mono | JetBrains Mono | JetBrains |
| Editorial | Cormorant Garamond | Source Serif 4 | Google |
| Swiss/Minimal | Archivo | Nunito | Google |
| Playful | Nunito | Nunito | Google |
| Magazine | Playfair Display | Work Sans | Google |
| Brutalist | Anton | IBM Plex Mono | Google |
| SaaS Modern | Cabinet Grotesk | Inter | Fontshare/Google |

---

## Animation Easing Reference

```css
:root {
    /* Standard curves */
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
    --ease-out-cubic: cubic-bezier(0.33, 1, 0.68, 1);

    /* Bouncy */
    --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

    /* Smooth */
    --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);

    /* Snappy */
    --ease-snappy: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## Background Effect Snippets

### Particle Field (Canvas)

```javascript
class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.init();
    }

    init() {
        this.resize();
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1
            });
        }
        this.animate();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            // Wrap around edges
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
            // Draw
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 255, 204, 0.5)';
            this.ctx.fill();
        });
        requestAnimationFrame(() => this.animate());
    }
}
```

### Gradient Mesh (CSS)

```css
.gradient-mesh {
    background:
        radial-gradient(at 40% 20%, hsla(280, 100%, 70%, 0.3) 0px, transparent 50%),
        radial-gradient(at 80% 0%, hsla(200, 100%, 60%, 0.3) 0px, transparent 50%),
        radial-gradient(at 0% 50%, hsla(340, 100%, 70%, 0.3) 0px, transparent 50%),
        radial-gradient(at 80% 50%, hsla(180, 100%, 50%, 0.2) 0px, transparent 50%),
        radial-gradient(at 0% 100%, hsla(250, 100%, 60%, 0.3) 0px, transparent 50%),
        radial-gradient(at 80% 100%, hsla(20, 100%, 60%, 0.2) 0px, transparent 50%),
        var(--bg-primary);
}
```

### Animated Starfield (CSS)

```css
.starfield {
    background-image:
        radial-gradient(2px 2px at 20% 30%, white 0%, transparent 50%),
        radial-gradient(2px 2px at 40% 70%, white 0%, transparent 50%),
        radial-gradient(1px 1px at 50% 40%, white 0%, transparent 50%),
        radial-gradient(1px 1px at 60% 60%, white 0%, transparent 50%),
        radial-gradient(2px 2px at 90% 10%, white 0%, transparent 50%);
    background-size: 200% 200%;
    animation: twinkle 15s ease-in-out infinite;
}

@keyframes twinkle {
    0%, 100% { background-position: 0% 0%; }
    50% { background-position: 100% 100%; }
}
```

### Noise Texture (SVG Data URI)

```css
.noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.05;
}
```

---

## DO NOT USE (Generic AI Patterns)

Avoid these overused patterns that create "AI slop":

**Fonts:**
- Inter (except in Gradient Wave style)
- Roboto
- Arial / Helvetica
- System font stacks as display fonts

**Colors:**
- `#6366f1` (generic indigo)
- Purple/violet gradients on white
- Generic blue primary buttons
- Equal distribution of accent colors

**Layouts:**
- Centered everything
- Generic hero with text left, image right
- Standard 3-column features grid
- Rounded rectangle cards with shadows

**Animations:**
- Identical timing on all elements
- No stagger on children
- Linear easing everywhere
- Excessive bounce

**Effects:**
- Drop shadows without intention
- Gratuitous glassmorphism
- Blurs that don't add meaning
- Gradients for no reason
