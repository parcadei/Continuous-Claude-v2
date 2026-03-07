# Shadcn Blocks Reference

Complete guide to Shadcn blocks - prebuilt, production-ready component compositions.

---

## What Are Blocks?

Blocks are ready-to-use UI compositions that combine multiple shadcn/ui components. They range from simple component variations to complex dashboard implementations.

```yaml
Simple Block: Button variant with icon
Complex Block: Full dashboard with sidebar, header, charts, tables
```

---

## Block Types

| Type | Description | Example |
|------|-------------|---------|
| `registry:page` | Full page with routing | Dashboard page |
| `registry:component` | Reusable composition | Stats card |
| `registry:block` | Page section | Hero section |
| `registry:hook` | React hook | useMediaQuery |
| `registry:lib` | Utility function | cn() helper |

---

## Installation

```bash
# Install by block name
npx shadcn@latest add dashboard-01

# Install multiple blocks
npx shadcn@latest add dashboard-01 sidebar-01

# Install from URL
npx shadcn@latest add https://example.com/r/my-block.json

# Install from local registry
npx shadcn@latest add ./registry/blocks/my-block.json
```

---

## Block Categories

### Dashboards
Production-ready dashboard layouts with sidebars, headers, and data displays.

| Block | Description | Components Used |
|-------|-------------|-----------------|
| `dashboard-01` | Admin dashboard | Sidebar, Card, Chart, Table |
| `dashboard-02` | Analytics dashboard | Cards, Charts, Tabs |
| `dashboard-03` | E-commerce dashboard | Stats, Orders table |
| `dashboard-04` | Project dashboard | Kanban, Tasks |
| `dashboard-05` | CRM dashboard | Contacts, Pipeline |
| `dashboard-06` | Settings dashboard | Forms, Tabs |
| `dashboard-07` | Profile dashboard | Avatar, Cards |

### Sidebars
Navigation sidebar variations.

| Block | Description | Features |
|-------|-------------|----------|
| `sidebar-01` | Basic sidebar | Icons, labels, collapsible |
| `sidebar-02` | Multi-level | Nested navigation |
| `sidebar-03` | Floating | Overlay sidebar |
| `sidebar-04` | With header | Top actions |
| `sidebar-05` | Minimal | Icon-only mode |
| `sidebar-06` | With footer | User menu, settings |
| `sidebar-07` | Two-level | Primary + secondary nav |

### Calendars
30+ calendar block variations.

| Block | Description |
|-------|-------------|
| `calendar-01` - `calendar-30` | Various calendar layouts |
| Features | Month view, week view, day view, events, scheduling |

### Authentication
Login, signup, and password flows.

| Block | Description |
|-------|-------------|
| `login-01` | Simple login form |
| `login-02` | Login with social |
| `login-03` | Two-column layout |
| `signup-01` | Registration form |
| `signup-02` | Multi-step signup |
| `forgot-password-01` | Password reset |

### Forms
Form patterns and validation examples.

| Block | Description |
|-------|-------------|
| `form-01` | Contact form |
| `form-02` | Settings form |
| `form-03` | Multi-step form |
| `form-04` | With validation |
| `form-05` | File upload |

### Marketing
Landing page sections.

| Block | Description |
|-------|-------------|
| `hero-01` - `hero-10` | Hero sections |
| `pricing-01` - `pricing-05` | Pricing tables |
| `features-01` - `features-08` | Feature grids |
| `testimonials-01` - `testimonials-05` | Social proof |
| `cta-01` - `cta-05` | Call to action |
| `footer-01` - `footer-08` | Page footers |

### Data Display
Tables, charts, and data visualization.

| Block | Description |
|-------|-------------|
| `table-01` | Basic data table |
| `table-02` | Sortable columns |
| `table-03` | With pagination |
| `table-04` | Expandable rows |
| `chart-01` - `chart-10` | Various chart types |

### Cards
Card layout variations.

| Block | Description |
|-------|-------------|
| `card-01` | Stats card |
| `card-02` | User card |
| `card-03` | Product card |
| `card-04` | Article card |
| `card-05` | Notification card |

---

## Block Schema

When creating custom blocks:

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-dashboard",
  "type": "registry:block",
  "description": "Custom dashboard layout",
  "categories": ["dashboard", "admin"],
  "dependencies": ["recharts", "date-fns"],
  "registryDependencies": ["card", "chart", "table", "sidebar"],
  "files": [
    {
      "path": "components/my-dashboard.tsx",
      "type": "registry:component"
    },
    {
      "path": "hooks/use-dashboard-data.ts",
      "type": "registry:hook"
    }
  ],
  "cssVars": {
    "light": { "--dashboard-bg": "0 0% 100%" },
    "dark": { "--dashboard-bg": "0 0% 3.9%" }
  }
}
```

### Required Properties

| Property | Description |
|----------|-------------|
| `name` | Block identifier (lowercase, hyphens) |
| `type` | Must be `registry:block` |
| `description` | Brief description |
| `files` | Array of file definitions |
| `categories` | Array of category slugs |

### Optional Properties

| Property | Description |
|----------|-------------|
| `dependencies` | npm packages required |
| `registryDependencies` | shadcn components required |
| `cssVars` | Custom CSS variables |

---

## Usage Patterns

### Installing Dashboard Block

```bash
# Install dashboard with all dependencies
npx shadcn@latest add dashboard-01

# This installs:
# - Main dashboard component
# - Sidebar component
# - Card, Chart, Table components
# - Required hooks and utilities
```

### Customizing Blocks

After installation, blocks live in your codebase:

```
src/
├── components/
│   ├── dashboard-01.tsx    # Main block
│   └── ui/
│       ├── sidebar.tsx     # Dependencies
│       ├── card.tsx
│       └── chart.tsx
```

Customize freely - you own the code.

### Combining Blocks

```tsx
// Combine multiple blocks
import { Dashboard01 } from "@/components/dashboard-01"
import { Sidebar07 } from "@/components/sidebar-07"

export default function AdminPage() {
  return (
    <div className="flex">
      <Sidebar07 />
      <Dashboard01 />
    </div>
  )
}
```

---

## Third-Party Block Registries

### registry.directory

Community-maintained block registries:

```bash
# Install from third-party registry
npx shadcn@latest add @acme/dashboard-pro
```

### Popular Registries

| Registry | Focus |
|----------|-------|
| shadcnblocks.com | 1110+ premium blocks |
| blocks.so | 60+ free blocks |
| magicui.design | 150+ animated components |

---

## Best Practices

### When to Use Blocks

```yaml
Use Blocks When:
  - Starting new feature quickly
  - Need production-ready patterns
  - Want consistent design language
  - Building dashboards or admin panels

Don't Use When:
  - Need highly custom layout
  - Building unique brand experience
  - Block requires heavy modification
```

### Block Selection Strategy

```yaml
1. Browse ui.shadcn.com/blocks
2. Find closest match to requirements
3. Install block and dependencies
4. Customize to fit needs
5. Remove unused code
```

### Performance Considerations

```yaml
- Blocks may include unused components
- Review and remove what you don't need
- Check bundle size after installation
- Tree-shaking removes unused exports
```

---

## MCP Integration

### Search for Blocks

```yaml
mcp__shadcn__search_items_in_registries({
  registries: ["@shadcn"],
  query: "dashboard"
})
```

### View Block Details

```yaml
mcp__shadcn__view_items_in_registries({
  items: ["@shadcn/dashboard-01"]
})
```

### Get Examples

```yaml
mcp__shadcn__get_item_examples_from_registries({
  registries: ["@shadcn"],
  query: "dashboard"
})
```

---

## Troubleshooting

### Block Dependencies Missing

```bash
# Reinstall with dependencies
npx shadcn@latest add dashboard-01 --overwrite
```

### Style Conflicts

```yaml
Cause: Existing Tailwind classes conflict
Fix: Check globals.css for duplicate CSS variables
```

### TypeScript Errors

```yaml
Cause: Missing type definitions
Fix: Install @types packages for dependencies
```

---

*Reference: ui.shadcn.com/blocks, ui.shadcn.com/docs/registry*
