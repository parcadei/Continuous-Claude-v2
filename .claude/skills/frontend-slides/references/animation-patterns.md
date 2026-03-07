# Animation Patterns Reference

## Effect → Feeling Mapping

| Feeling | Techniques |
|---------|-----------|
| **Dramatic/Cinematic** | Slow fade-ins (1-1.5s), scale transitions (0.9→1), dark + spotlight, parallax, full-bleed images |
| **Techy/Futuristic** | Neon glow (box-shadow + accent), particle canvas, grid patterns, monospace accents, glitch/scramble text, cyan/magenta palette |
| **Playful/Friendly** | Bouncy easing (spring), large border-radius, pastel/bright colors, floating/bobbing, illustrated elements |
| **Professional/Corporate** | Subtle fast anims (200-300ms), clean sans-serif, navy/slate bg, precise spacing, data viz focus |
| **Calm/Minimal** | Very slow subtle motion, high whitespace, muted palette, serif type, generous padding |
| **Editorial/Magazine** | Strong type hierarchy, pull quotes, image-text interplay, grid-breaking, black + one accent |

## Entrance Animations

```css
/* Fade + Slide Up (most common) */
.reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s var(--ease-out-expo),
                transform 0.6s var(--ease-out-expo);
}
.visible .reveal { opacity: 1; transform: translateY(0); }

/* Scale In */
.reveal-scale {
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.6s, transform 0.6s var(--ease-out-expo);
}

/* Slide from Left */
.reveal-left {
    opacity: 0;
    transform: translateX(-50px);
    transition: opacity 0.6s, transform 0.6s var(--ease-out-expo);
}

/* Blur In */
.reveal-blur {
    opacity: 0;
    filter: blur(10px);
    transition: opacity 0.8s, filter 0.8s var(--ease-out-expo);
}
```

## Background Effects

```css
/* Gradient Mesh */
.gradient-bg {
    background:
        radial-gradient(ellipse at 20% 80%, rgba(120, 0, 255, 0.3) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(0, 255, 200, 0.2) 0%, transparent 50%),
        var(--bg-primary);
}

/* Grid Pattern */
.grid-bg {
    background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 50px 50px;
}

/* Noise Texture — use inline SVG data URI */
.noise-bg {
    background-image: url("data:image/svg+xml,...");
}
```

## Interactive Effects

```javascript
/* 3D Tilt on Hover */
class TiltEffect {
    constructor(element) {
        this.element = element;
        this.element.style.transformStyle = 'preserve-3d';
        this.element.style.perspective = '1000px';
        this.bindEvents();
    }

    bindEvents() {
        this.element.addEventListener('mousemove', (e) => {
            const rect = this.element.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            this.element.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
        });
        this.element.addEventListener('mouseleave', () => {
            this.element.style.transform = 'rotateY(0) rotateX(0)';
        });
    }
}
```

## Stagger Delays (CSS)

```css
.reveal:nth-child(1) { transition-delay: 0.1s; }
.reveal:nth-child(2) { transition-delay: 0.2s; }
.reveal:nth-child(3) { transition-delay: 0.3s; }
.reveal:nth-child(4) { transition-delay: 0.4s; }
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Fonts not loading | Check Fontshare/Google Fonts URL; verify names match in CSS |
| Animations not triggering | Verify Intersection Observer running; check `.visible` class is added |
| Scroll snap not working | `scroll-snap-type` on html/body + `scroll-snap-align: start` on each slide |
| Mobile issues | Disable heavy effects at 768px; test touch events; reduce particle count |
| Performance issues | Use `will-change` sparingly; prefer `transform`/`opacity`; throttle handlers |
