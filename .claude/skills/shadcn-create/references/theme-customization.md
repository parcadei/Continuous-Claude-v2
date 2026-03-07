# Theme Customization Reference

## Tailwind v4 Support

Shadcn supports Tailwind v4 with `@theme` directive and OKLCH colors:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.75);
}

.dark {
  --background: oklch(0.141 0.005 285.75);
  --foreground: oklch(0.985 0 0);
}
```

## CSS Variables Reference

```css
/* globals.css — Zinc + Small radius theme */
:root {
  --radius: 0.25rem; /* Small = 4px */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
}
```

## Semantic Color System

Standard Shadcn only provides `destructive`. Add these for complete state handling:

```css
/* Add to globals.css */
:root {
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 0%;
  --info: 199 89% 48%;
  --info-foreground: 0 0% 100%;
}

.dark {
  --success: 142 69% 58%;
  --success-foreground: 142 76% 10%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 0%;
  --info: 199 89% 68%;
  --info-foreground: 199 89% 10%;
}
```

### Badge Variants for Semantic Colors

```tsx
// Add to components/ui/badge.tsx variants
const badgeVariants = cva("...", {
  variants: {
    variant: {
      // ... existing variants
      success: "bg-success text-success-foreground",
      warning: "bg-warning text-warning-foreground",
      info: "bg-info text-info-foreground",
    }
  }
})
```

| State | Color | Use For |
|-------|-------|---------|
| Success | green | Completions, confirmations, positive changes |
| Warning | amber | Cautions, pending states, attention needed |
| Info | blue | Neutral information, tips, notifications |
| Destructive | red | Errors, danger actions, failures |

## Theme Switching

### Multi-Theme via Data Attribute

```css
/* Per-style radius overrides */
[data-theme="vega"] { --radius: 0.5rem; }
[data-theme="nova"] { --radius: 0.25rem; }
[data-theme="maia"] { --radius: 1rem; }
[data-theme="lyra"] { --radius: 0; }
[data-theme="mira"] { --radius: 0.25rem; }
```

### Theme Provider Pattern

```tsx
// contexts/theme-context.tsx
import { createContext, useContext, useState, useEffect } from "react";

type Theme = "vega" | "nova" | "maia" | "lyra" | "mira";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: "vega", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("vega");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Per-Section Theming

```tsx
// Override theme for specific sections
<div data-theme="nova" className="admin-panel">
  {/* Dense components for admin area */}
</div>

<div data-theme="maia" className="marketing-section">
  {/* Spacious components for marketing */}
</div>
```
