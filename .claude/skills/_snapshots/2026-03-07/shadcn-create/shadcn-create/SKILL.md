---
name: shadcn-create
description: Interactive UI theming via Shadcn/create platform with Claude in Chrome browser automation
allowed-tools: [mcp__claude-in-chrome__*, mcp__shadcn__*, Bash, Read, Write, WebFetch]
---

# Shadcn/create Platform Skill

Comprehensive skill for Shadcn/ui theming, component management, and design system creation.

## Quick Reference

| Need | Tool | Reference |
|------|------|-----------|
| Visual theme exploration | Claude in Chrome | This file |
| Component research | Shadcn MCP | references/mcp-tools.md |
| Install components | CLI | references/components.md |
| Add blocks/layouts | CLI | references/blocks.md |
| **Compose wizards/forms** | **Patterns** | **references/patterns-forms.md** |
| **Build dashboards** | **Patterns** | **references/patterns-composition.md** |
| **Data tables/charts** | **Patterns** | **references/patterns-data.md** |
| **Handle edge cases** | **Patterns** | **references/patterns-edge.md** |

---

## Activation Triggers

| Trigger | Context |
|---------|---------|
| "configure shadcn theme" | Visual theme exploration |
| "set up shadcn for project" | Project initialization |
| "explore shadcn options" | Comparing design options |
| "add shadcn components" | Component installation |
| "shadcn blocks" | Block installation |
| "design system" | Creating consistent design language |

---

## Prerequisites

### Shadcn MCP Server (Optional but Recommended)

```bash
# Enable MCP for component research
npx shadcn registry:mcp
```

Add to `.mcp.json`:
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn", "registry:mcp"]
    }
  }
}
```

### Claude in Chrome (For Visual Exploration)

Required for interactive browser-based theme exploration. Falls back to WebFetch for basic page info when unavailable.

---

## Decision: Browser vs MCP vs CLI

```yaml
Use Claude in Chrome when:
  - Exploring visual themes interactively
  - Comparing color/radius/style options visually
  - First-time project theming decisions
  - User wants to see options before deciding

Use Shadcn MCP when:
  - Researching component APIs/props
  - Getting usage examples
  - Generating CLI add commands
  - Searching across component catalog

Use CLI directly when:
  - Theme already decided
  - Adding known components
  - Installing blocks
  - Automating component installation

Use WebFetch fallback when:
  - Claude in Chrome unavailable
  - Need basic page structure info
  - Verifying platform options
```

---

## Platform Layout: ui.shadcn.com/create

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Theme Toggle | Share | Create Project                  │
├──────────┬──────────────────────────────┬──────────────────────┤
│          │                              │                      │
│  LEFT    │       CENTER                 │      RIGHT           │
│  SIDEBAR │       PREVIEW                │      SIDEBAR         │
│          │                              │                      │
│  Blocks  │   Live component             │   Preset             │
│  (30+)   │   preview with               │   Component Library  │
│  ──────  │   current theme              │   Style              │
│  Comps   │                              │   Base Color         │
│  (60+)   │                              │   Theme              │
│  - Button│                              │   Icon Library       │
│  - Card  │                              │   Font               │
│  - Badge │                              │   Radius             │
│  - etc   │                              │   Menu Color         │
│          │                              │   Menu Accent        │
│          │                              │   ──────────         │
│          │                              │   Try Random | Reset │
└──────────┴──────────────────────────────┴──────────────────────┘
```

---

## Visual Styles (5 Options)

New in 2024: Pre-configured style presets that define overall aesthetic.

| Style | Description | Best For |
|-------|-------------|----------|
| **Vega** | Classic shadcn/ui look | General purpose |
| **Nova** | Compact, reduced padding | Dense interfaces, dashboards |
| **Maia** | Soft/rounded, generous spacing | Consumer apps, friendly UX |
| **Lyra** | Boxy/sharp, monospace-friendly | Technical, code-focused |
| **Mira** | Dense, information-heavy | Admin panels, data apps |

### Style Selection

```yaml
Location: Right sidebar → "Style" row
Action: Click to see dropdown
Note: Style affects padding, margins, and overall feel
```

---

## Component Library Choice

Shadcn now supports two underlying primitive libraries:

| Library | Description | Default |
|---------|-------------|---------|
| **Radix UI** | Full accessibility, battle-tested | Yes |
| **Base UI** | Alternative, same abstractions | No |

Select in right sidebar → "Component Library" row.

---

## Base Colors (5 Options)

| Color | Character | Use Case |
|-------|-----------|----------|
| **Neutral** | Warm gray, subtle yellow undertone | Friendly, approachable |
| **Stone** | Warm gray, brown undertone | Earthy, organic |
| **Zinc** | Pure gray, no undertones | Technical, terminal |
| **Gray** | Cool gray, slight blue undertone | Professional, clean |
| **Slate** | Cool gray, stronger blue undertone | Modern, corporate |

---

## Border Radius (5 Options)

| Radius | Value | Use Case |
|--------|-------|----------|
| **None** | 0px | Sharp, brutalist |
| **Small** | 4px (0.25rem) | Technical, terminal |
| **Default** | 8px (0.5rem) | Balanced |
| **Medium** | 12px (0.75rem) | Friendly |
| **Large** | 16px (1rem) | Soft, approachable |

---

## Browser Automation Workflow

### Phase 1: Session Setup

```yaml
1. Get tab context:
   mcp__claude-in-chrome__tabs_context_mcp()

2. Navigate to platform:
   mcp__claude-in-chrome__navigate_to_url({
     url: "https://ui.shadcn.com/create",
     tabId: <active_tab_id>
   })

3. Wait for load (SPA hydration):
   Wait 2-3 seconds or check with javascript_tool
```

### Phase 2: Theme Configuration

```yaml
Configure Style:
  Location: Right sidebar → "Style" row
  Options: Vega | Nova | Maia | Lyra | Mira

Toggle Dark Mode:
  Location: Header, sun/moon icon
  Action: Click theme toggle button

Configure Base Color:
  Location: Right sidebar → "Base Color" row
  Options: Neutral | Stone | Zinc | Gray | Slate

Configure Radius:
  Location: Right sidebar → "Radius" row
  Options: None | Small | Default | Medium | Large
```

### Phase 3: Component Preview

```yaml
Browse Components:
  Location: Left sidebar → 60+ components listed
  Action: Click component name to preview

Preview Updates:
  - Center panel shows component with current theme
  - All theme changes reflect immediately
  - Multiple components can be viewed in sequence
```

### Phase 4: Extract Configuration

```yaml
Method 1: URL Parameters
  - Current URL contains encoded settings
  - Parse: baseColor, theme, radius, style, template

Method 2: Create Project Button
  1. Click "Create Project" button (header)
  2. Modal: Framework + Package manager selection
  3. Copy generated command

Method 3: Screenshot
  - For documentation or user confirmation
```

---

## URL Parameter Reference

```
https://ui.shadcn.com/create?
  baseColor=zinc       # Base gray scale
  &theme=zinc          # Color theme (matches base)
  &radius=small        # Border radius preset
  &style=vega          # Visual style (NEW)
  &template=vite       # Framework template
```

| Parameter | Values |
|-----------|--------|
| baseColor | neutral, stone, zinc, gray, slate |
| theme | matches baseColor |
| radius | none, small, default, medium, large |
| style | vega, nova, maia, lyra, mira |
| template | nextjs, tanstack, vite |

---

## CLI Commands

### New Project

```bash
# Full preset URL approach
npx shadcn@latest create --preset "https://ui.shadcn.com/create?baseColor=zinc&radius=small&style=vega&template=vite"

# With pnpm
pnpm dlx shadcn@latest create --preset "<URL>"

# With bun
bunx shadcn@latest create --preset "<URL>"
```

### Existing Project

```bash
# Initialize (interactive prompts)
npx shadcn@latest init

# Initialize with preset code (v4)
npx shadcn@latest init --preset a1Dg5eFl

# Initialize with base primitive selection (v4)
npx shadcn@latest init --base radix  # or base-ui

# Add components
npx shadcn@latest add button card badge

# Add with preview (v4 — zero risk, shows what will change)
npx shadcn@latest add button --dry-run
npx shadcn@latest add button --diff    # shows unified diff
npx shadcn@latest add button --view    # shows file contents

# Add blocks
npx shadcn@latest add dashboard-01

# Project info (v4 — shows framework, installed components, config)
npx shadcn@latest info

# Component docs (v4 — CLI-accessible documentation)
npx shadcn@latest docs button

# Track upstream changes
npx shadcn@latest diff

# Build custom registry
npx shadcn@latest build
```

### v4 Safe Commands (Use Freely)

These are read-only and can be used without risk:

| Command | Purpose |
|---------|---------|
| `shadcn info` | Show project config, installed components, resolved paths |
| `shadcn docs <component>` | CLI-accessible component documentation and links |
| `shadcn add --dry-run` | Preview files and deps without writing anything |
| `shadcn add --diff` | Show unified diff of what would change |
| `shadcn add --view` | Inspect full file contents that would be added |

---

## Shadcn MCP Tools (7 Available)

Complete reference in `references/mcp-tools.md`.

**Note:** MCP tools return `bunx` (Bun) commands. Adapt for your package manager:
- `bunx` → `npx` (npm) or `pnpm dlx` (pnpm)

### Quick Reference

```yaml
# 1. Get project registries
mcp__shadcn__get_project_registries()
→ Returns configured registries from components.json

# 2. List all available items
mcp__shadcn__list_items_in_registries({
  registries: ["@shadcn"],
  limit: 50
})

# 3. Search for components
mcp__shadcn__search_items_in_registries({
  registries: ["@shadcn"],
  query: "button"
})

# 4. View component details
mcp__shadcn__view_items_in_registries({
  items: ["@shadcn/button", "@shadcn/card"]
})

# 5. Get usage examples
mcp__shadcn__get_item_examples_from_registries({
  registries: ["@shadcn"],
  query: "form-validation"
})

# 6. Generate CLI command
mcp__shadcn__get_add_command_for_items({
  items: ["@shadcn/button", "@shadcn/card"]
})
→ "bunx shadcn@latest add @shadcn/button @shadcn/card"
# Note: MCP returns bunx (Bun). Adapt for npm: npx shadcn@latest add button card

# 7. Get audit checklist
mcp__shadcn__get_audit_checklist()
→ Post-installation verification steps
```

---

## Blocks Overview

30+ production-ready blocks. Full catalog in `references/blocks.md`.

### Block Categories

| Category | Examples |
|----------|----------|
| **Dashboards** | dashboard-01 to dashboard-07 |
| **Sidebars** | sidebar-01 to sidebar-07 |
| **Calendars** | calendar-01 to calendar-30 |
| **Authentication** | login-01, signup-01, forgot-password-01 |
| **Forms** | form-01 to form-05 |
| **Marketing** | hero, pricing, features, testimonials |

### Install Block

```bash
npx shadcn@latest add dashboard-01
```

---

## Components Overview

60+ components. Full catalog in `references/components.md`.

### New Components (2024-2025)

| Component | Description |
|-----------|-------------|
| `button-group` | Grouped button actions |
| `empty` | Empty state placeholder |
| `field` | Form field composition |
| `input-group` | Input with prefix/suffix |
| `item` | Generic list item |
| `kbd` | Keyboard shortcut display |
| `native-select` | Browser-native select |
| `spinner` | Loading spinner |

### Common Bundles

```bash
# Forms
npx shadcn@latest add form input label button select checkbox

# Navigation
npx shadcn@latest add tabs navigation-menu breadcrumb dropdown-menu

# Data display
npx shadcn@latest add table card badge avatar skeleton

# Feedback
npx shadcn@latest add alert toast progress dialog sonner
```

---

## Common Theme Presets

### Technical/Terminal (Mission Control)
```yaml
Style: Lyra
Base Color: Zinc (pure gray)
Radius: Small (4px)
Theme: Dark only
Font: Inter + JetBrains Mono
URL: ?baseColor=zinc&radius=small&style=lyra&template=vite
```

### Modern SaaS
```yaml
Style: Vega
Base Color: Slate (cool gray)
Radius: Default (8px)
Theme: Light/dark toggle
Font: Inter
URL: ?baseColor=slate&radius=default&style=vega&template=vite
```

### Friendly/Consumer
```yaml
Style: Maia
Base Color: Neutral (warm gray)
Radius: Medium (12px)
Theme: Light primary
Font: System or custom
URL: ?baseColor=neutral&radius=medium&style=maia&template=vite
```

### Data-Dense/Admin
```yaml
Style: Nova or Mira
Base Color: Slate
Radius: Small
Theme: Dark
URL: ?baseColor=slate&radius=small&style=nova&template=vite
```

---

## Workflow Patterns

### Pattern 1: Full Interactive Exploration

```yaml
Goal: User unsure of design direction
Flow:
  1. Navigate to ui.shadcn.com/create
  2. Cycle through Visual Styles (Vega → Nova → Maia → Lyra → Mira)
  3. Select preferred style
  4. Cycle through Base Colors
  5. Adjust Radius
  6. Toggle dark/light mode
  7. Extract final URL/command
```

### Pattern 2: Quick Configuration

```yaml
Goal: User knows general direction
Flow:
  1. Ask: Dark/light? Sharp/rounded? Dense/spacious?
  2. Map to parameters:
     - Dark + Sharp + Dense → zinc + small + nova
     - Light + Rounded + Spacious → neutral + medium + maia
  3. Construct URL directly
  4. Verify with browser preview
```

### Pattern 3: Component-First

```yaml
Goal: Adding components to existing project
Flow:
  1. Search via MCP:
     mcp__shadcn__search_items_in_registries
  2. Get details:
     mcp__shadcn__view_items_in_registries
  3. Generate command:
     mcp__shadcn__get_add_command_for_items
  4. Execute via Bash
  5. Verify:
     mcp__shadcn__get_audit_checklist
```

### Pattern 4: Block-First

```yaml
Goal: Quickly scaffold a page
Flow:
  1. Browse blocks at ui.shadcn.com/blocks
  2. Identify needed block (e.g., dashboard-03)
  3. Install: npx shadcn@latest add dashboard-03
  4. Customize installed components
```

---

## Composition Patterns

Beyond installation - how to compose components into complete UIs.

| Pattern | Reference | Key Components |
|---------|-----------|----------------|
| Multi-step Wizard | patterns-forms.md | Steps, Progress, Form, Button |
| Dashboard Grid | patterns-composition.md | Card, Chart, Grid CSS |
| Expandable Table | patterns-data.md | Table, Collapsible |
| Empty State | patterns-edge.md | Custom with icon, text, CTA |
| Error Hierarchy | patterns-forms.md | FormMessage, Alert, Toast |
| Filter + Data | patterns-data.md | Select, DatePicker, Table |
| Loading States | patterns-edge.md | Skeleton, Spinner |
| Bulk Selection | patterns-data.md | Checkbox, Table, Actions bar |

See `references/patterns-*.md` for implementation details.

---

## Tailwind v4 Support

Shadcn supports Tailwind v4 with `@theme` directive:

```css
/* Modern OKLCH color support */
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

---

## CSS Variables Reference

```css
/* globals.css for Zinc + Small radius theme */
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

---

## Semantic Color System

Standard Shadcn provides `destructive` only. Add these for complete state handling:

### CSS Variables (add to globals.css)

```css
:root {
  /* Success - green for confirmations, completions */
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;

  /* Warning - amber for cautions, pending states */
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 0%;

  /* Info - blue for neutral information */
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

### Adding Badge Variants

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

### When to Use

| State | Color | Use For |
|-------|-------|---------|
| Success | green | Completions, confirmations, positive changes |
| Warning | amber | Cautions, pending states, attention needed |
| Info | blue | Neutral information, tips, notifications |
| Destructive | red | Errors, danger actions, failures |

---

## Theme Switching

### Multi-Theme via Data Attribute

```css
/* Add to globals.css for per-theme overrides */
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

---

## Verification Checklist

After Shadcn setup:

```yaml
[ ] components.json exists in project root
[ ] CSS variables in globals.css match chosen theme
[ ] --radius value correct for chosen preset
[ ] Style matches selected option (Vega/Nova/Maia/Lyra/Mira)
[ ] Dark mode works (if enabled)
[ ] Components import from @/components/ui/*
[ ] cn() utility available in lib/utils
[ ] Tailwind config has shadcn preset
[ ] Font loaded (Inter by default)
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Components unstyled | CSS variables missing | Run `npx shadcn@latest init` |
| Wrong radius | --radius not set | Add to :root in globals.css |
| Dark mode broken | Theme class missing | Add `dark` class to html element |
| Import errors | Wrong path alias | Check tsconfig paths for `@/` |
| cn() undefined | Utils missing | Run init or add manually |
| MCP tools unavailable | Server not configured | Run `npx shadcn registry:mcp` |
| Browser automation fails | Claude in Chrome not available | Use WebFetch fallback or direct CLI |
| Block dependencies missing | Incomplete install | Reinstall with `--overwrite` flag |
| TypeScript errors | Missing types | Install @types for dependencies |

### React 19 + Static Export Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Radix Dialog.Close not working | React 19 event timing in static export | Use plain button with onClick |
| Modal won't close | Same timing issue | Add onCloseClick prop pattern |
| Hydration errors | Server/client mismatch | Use `suppressHydrationWarning` or dynamic imports |

**Pattern for Dialog Close (React 19 fix):**

```tsx
// DON'T: Radix primitive (may fail in React 19 static export)
<DialogPrimitive.Close asChild>
  <Button><X className="h-4 w-4" /></Button>
</DialogPrimitive.Close>

// DO: Plain button with handler
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  onCloseClick?: () => void;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, onCloseClick, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={cn("...", className)} {...props}>
      {children}
      <button
        onClick={onCloseClick}
        className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    </DialogPrimitive.Content>
  </DialogPortal>
));

// Usage
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent onCloseClick={() => setOpen(false)}>
    {/* content */}
  </DialogContent>
</Dialog>
```

---

## Third-Party Registries

Beyond official @shadcn registry:

| Registry | Focus | URL |
|----------|-------|-----|
| registry.directory | Community index | registry.directory |
| shadcnblocks.com | 1110+ premium blocks | shadcnblocks.com |
| blocks.so | 60+ free blocks | blocks.so |
| magicui.design | 150+ animated | magicui.design |

Install from third-party:
```bash
npx shadcn@latest add @acme/custom-component
```

---

## GIF Recording for Demos

When demonstrating theme exploration with Claude in Chrome:

```yaml
mcp__claude-in-chrome__gif_creator:
  filename: "shadcn-theme-exploration.gif"
  # Capture: navigate → select style → cycle colors → adjust radius → get command
```

---

## See Also

### Tool References
- `references/mcp-tools.md` - Complete 7-tool MCP reference
- `references/blocks.md` - Full blocks catalog with examples
- `references/components.md` - 60+ component catalog

### Composition Patterns
- `references/patterns-forms.md` - Wizards, validation, error hierarchy
- `references/patterns-composition.md` - Dashboards, layouts, cards
- `references/patterns-data.md` - Tables, charts, bulk selection
- `references/patterns-edge.md` - Empty states, loading, overflow

---

*Comprehensive skill for Shadcn/ui theming, component installation, and UI composition patterns.*
