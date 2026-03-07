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
| CLI commands + URL params | CLI | **references/cli-reference.md** |
| CSS vars, semantic colors, theme switching | Theme | **references/theme-customization.md** |
| Troubleshooting, React 19 fixes | Debug | **references/troubleshooting.md** |
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

| Style | Description | Best For |
|-------|-------------|----------|
| **Vega** | Classic shadcn/ui look | General purpose |
| **Nova** | Compact, reduced padding | Dense interfaces, dashboards |
| **Maia** | Soft/rounded, generous spacing | Consumer apps, friendly UX |
| **Lyra** | Boxy/sharp, monospace-friendly | Technical, code-focused |
| **Mira** | Dense, information-heavy | Admin panels, data apps |

## Component Library Choice

| Library | Description | Default |
|---------|-------------|---------|
| **Radix UI** | Full accessibility, battle-tested | Yes |
| **Base UI** | Alternative, same abstractions | No |

Select in right sidebar → "Component Library" row.

## Base Colors (5 Options)

| Color | Character | Use Case |
|-------|-----------|----------|
| **Neutral** | Warm gray, subtle yellow undertone | Friendly, approachable |
| **Stone** | Warm gray, brown undertone | Earthy, organic |
| **Zinc** | Pure gray, no undertones | Technical, terminal |
| **Gray** | Cool gray, slight blue undertone | Professional, clean |
| **Slate** | Cool gray, stronger blue undertone | Modern, corporate |

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

> Full CLI commands and URL parameter reference: `references/cli-reference.md`

---

## Common Theme Presets

### Technical/Terminal
```yaml
Style: Lyra | Base: Zinc | Radius: Small | Theme: Dark
URL: ?baseColor=zinc&radius=small&style=lyra&template=vite
```

### Modern SaaS
```yaml
Style: Vega | Base: Slate | Radius: Default | Theme: Light/dark toggle
URL: ?baseColor=slate&radius=default&style=vega&template=vite
```

### Friendly/Consumer
```yaml
Style: Maia | Base: Neutral | Radius: Medium | Theme: Light
URL: ?baseColor=neutral&radius=medium&style=maia&template=vite
```

### Data-Dense/Admin
```yaml
Style: Nova or Mira | Base: Slate | Radius: Small | Theme: Dark
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
  1. Search via MCP: mcp__shadcn__search_items_in_registries
  2. Get details: mcp__shadcn__view_items_in_registries
  3. Generate command: mcp__shadcn__get_add_command_for_items
  4. Execute via Bash
  5. Verify: mcp__shadcn__get_audit_checklist
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

## Shadcn MCP Quick Reference

**Note:** MCP tools return `bunx` (Bun) commands — adapt for npm (`npx`) or pnpm (`pnpm dlx`).

```yaml
mcp__shadcn__get_project_registries()          # Show configured registries
mcp__shadcn__list_items_in_registries(...)     # List all available items
mcp__shadcn__search_items_in_registries(...)   # Search by query
mcp__shadcn__view_items_in_registries(...)     # Component details
mcp__shadcn__get_item_examples_from_registries # Usage examples
mcp__shadcn__get_add_command_for_items(...)    # Generate CLI command
mcp__shadcn__get_audit_checklist()             # Post-install verification
```

Full 7-tool reference: `references/mcp-tools.md`

---

## Blocks Overview

30+ production-ready blocks (dashboards, sidebars, calendars, auth, forms, marketing).
Full catalog: `references/blocks.md`. Install: `npx shadcn@latest add dashboard-01`

---

## Components Overview

60+ components. Full catalog: `references/components.md`.

### New Components (2024-2025)

| Component | Description |
|-----------|-------------|
| `button-group` | Grouped button actions |
| `empty` | Empty state placeholder |
| `field` | Form field composition |
| `input-group` | Input with prefix/suffix |
| `kbd` | Keyboard shortcut display |
| `spinner` | Loading spinner |

---

## Composition Patterns

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

---

## Verification Checklist

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

> CSS variable values + theme customization: `references/theme-customization.md`
> Troubleshooting guide: `references/troubleshooting.md`

---

## GIF Recording for Demos

```yaml
mcp__claude-in-chrome__gif_creator:
  filename: "shadcn-theme-exploration.gif"
  # Capture: navigate → select style → cycle colors → adjust radius → get command
```

---

*Skill for Shadcn/ui theming, component installation, and UI composition patterns.*
