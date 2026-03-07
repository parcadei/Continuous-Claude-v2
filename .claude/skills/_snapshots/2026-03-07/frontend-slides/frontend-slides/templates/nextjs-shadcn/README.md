# Next.js + Shadcn Presentation Template

Full React-based presentations with real Shadcn components, Recharts, and Framer Motion animations.

## When to Use This

| Use Vanilla HTML | Use Next.js + Shadcn |
|------------------|----------------------|
| Quick one-off presentations | Reusable presentation components |
| No build tools available | Complex interactivity needed |
| Single HTML file required | Full Shadcn component library |
| Sharing via email/USB | Deployed as a web app |

## Quick Start

```bash
# Create new project
pnpm dlx shadcn@latest create my-presentation

# Add chart components
pnpm dlx shadcn@latest add card chart

# Add animation library
pnpm add framer-motion

# Run development server
pnpm dev
```

## Project Structure

```
my-presentation/
├── app/
│   ├── page.tsx           # Main presentation
│   ├── layout.tsx         # Theme provider
│   └── globals.css        # Shadcn styles
├── components/
│   ├── ui/                # Shadcn components (auto-generated)
│   │   ├── card.tsx
│   │   ├── chart.tsx
│   │   └── ...
│   ├── slides/            # Your slide components
│   │   ├── title-slide.tsx
│   │   ├── chart-slide.tsx
│   │   └── ...
│   └── presentation/
│       ├── slide-container.tsx
│       ├── progress-bar.tsx
│       └── nav-dots.tsx
└── lib/
    └── chart-config.ts    # Recharts theme config
```

## Example Slide Component

```tsx
// components/slides/chart-slide.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, XAxis, YAxis } from "recharts"
import { motion } from "framer-motion"

const chartData = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
}

export function ChartSlide() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true }}
    >
      <Card className="bg-card/60 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>January - June 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <AreaChart data={chartData}>
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="desktop"
                stackId="a"
                stroke="var(--color-desktop)"
                fill="var(--color-desktop)"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="mobile"
                stackId="a"
                stroke="var(--color-mobile)"
                fill="var(--color-mobile)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  )
}
```

## Example Main Page

```tsx
// app/page.tsx
"use client"

import { useEffect, useState } from "react"
import { TitleSlide } from "@/components/slides/title-slide"
import { ChartSlide } from "@/components/slides/chart-slide"
import { StatsSlide } from "@/components/slides/stats-slide"

const slides = [TitleSlide, ChartSlide, StatsSlide]

export default function Presentation() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        setCurrentSlide(prev => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <main className="bg-background text-foreground">
      {/* Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1 bg-gradient-to-r from-primary to-chart-2 z-50 transition-all"
        style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
      />

      {/* Slides */}
      <div className="snap-y snap-mandatory h-screen overflow-y-auto">
        {slides.map((SlideComponent, index) => (
          <section
            key={index}
            className="snap-start h-screen flex items-center justify-center p-8"
          >
            <div className="max-w-5xl w-full">
              <SlideComponent />
            </div>
          </section>
        ))}
      </div>

      {/* Nav Dots */}
      <nav className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide
                ? "bg-primary scale-125"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
          />
        ))}
      </nav>
    </main>
  )
}
```

## Shadcn Theme Configuration

```css
/* globals.css - Midnight Executive theme */
@layer base {
  :root {
    --background: 222.2 47.4% 11.2%;
    --foreground: 210 40% 98%;
    --card: 222.2 47.4% 14.2%;
    --card-foreground: 210 40% 98%;
    --primary: 173 100% 37%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --border: 217.2 32.6% 17.5%;

    /* Chart colors */
    --chart-1: 173 100% 37%;  /* Teal */
    --chart-2: 263 70% 76%;   /* Purple */
    --chart-3: 38 92% 50%;    /* Amber */
    --chart-4: 142 71% 45%;   /* Green */
    --chart-5: 0 84% 60%;     /* Red */
  }
}
```

## Available Shadcn Components for Presentations

| Component | Use Case |
|-----------|----------|
| `Card` | Slide content containers |
| `Chart` | Area, Bar, Line, Pie, Radar charts |
| `Progress` | Animated progress bars |
| `Tabs` | Switching between chart views |
| `Badge` | Labels and tags |
| `Table` | Data comparisons |
| `Separator` | Visual dividers |

## Deployment

```bash
# Build for production
pnpm build

# Export as static site
# (Add to next.config.js: output: 'export')
pnpm build

# Files will be in /out directory
```

## Comparison: Vanilla vs Next.js

| Feature | Vanilla HTML + Chart.js | Next.js + Shadcn |
|---------|------------------------|------------------|
| Setup time | Instant | 5-10 minutes |
| File size | ~100KB | ~500KB+ |
| Interactivity | Good | Excellent |
| Component reuse | Copy-paste | Import |
| Dark/light mode | Manual | Built-in |
| Build step | None | Required |
| Deployment | Open HTML file | Vercel/Netlify |
