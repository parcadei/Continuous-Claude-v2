# Shadcn Components Catalog

Complete catalog of 60+ shadcn/ui components organized by category.

---

## Component Categories

### Form Controls

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| `button` | Clickable button with variants | - |
| `button-group` | Grouped buttons (NEW) | button |
| `checkbox` | Checkbox input | - |
| `input` | Text input field | - |
| `input-group` | Input with addons (NEW) | input |
| `input-otp` | One-time password input | - |
| `label` | Form label | - |
| `native-select` | Native HTML select (NEW) | - |
| `radio-group` | Radio button group | - |
| `select` | Custom select dropdown | - |
| `slider` | Range slider | - |
| `switch` | Toggle switch | - |
| `textarea` | Multi-line text input | - |

### Form Systems

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| `form` | Form with validation | react-hook-form, zod |
| `field` | Form field wrapper (NEW) | label, input |

### Overlays & Modals

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| `alert-dialog` | Confirmation dialog | button |
| `dialog` | Modal dialog | - |
| `drawer` | Slide-out panel | - |
| `popover` | Floating content | - |
| `sheet` | Side panel | - |
| `tooltip` | Hover tooltip | - |

### Navigation

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| `breadcrumb` | Breadcrumb navigation | - |
| `command` | Command palette (cmdk) | - |
| `context-menu` | Right-click menu | - |
| `dropdown-menu` | Dropdown menu | - |
| `menubar` | Horizontal menu bar | - |
| `navigation-menu` | Site navigation | - |
| `pagination` | Page navigation | button |
| `sidebar` | Navigation sidebar | - |
| `tabs` | Tab navigation | - |

### Data Display

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| `avatar` | User avatar | - |
| `badge` | Status badge | - |
| `card` | Content card | - |
| `chart` | Data visualization | recharts |
| `data-table` | Advanced table | @tanstack/react-table |
| `table` | Basic table | - |
| `typography` | Text styles | - |

### Feedback

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| `alert` | Alert message | - |
| `empty` | Empty state (NEW) | - |
| `progress` | Progress bar | - |
| `skeleton` | Loading placeholder | - |
| `sonner` | Toast notifications | sonner |
| `spinner` | Loading spinner (NEW) | - |
| `toast` | Toast messages | - |

### Layout

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| `accordion` | Collapsible sections | - |
| `aspect-ratio` | Fixed aspect ratio | - |
| `carousel` | Image/content carousel | embla-carousel-react |
| `collapsible` | Collapsible content | - |
| `resizable` | Resizable panels | react-resizable-panels |
| `scroll-area` | Custom scrollbar | - |
| `separator` | Visual divider | - |

### Utility

| Component | Description | Dependencies |
|-----------|-------------|--------------|
| `calendar` | Date picker calendar | date-fns, react-day-picker |
| `date-picker` | Date selection | calendar |
| `combobox` | Searchable select | command, popover |
| `hover-card` | Hover preview | - |
| `item` | List item (NEW) | - |
| `kbd` | Keyboard shortcut (NEW) | - |
| `toggle` | Toggle button | - |
| `toggle-group` | Toggle button group | toggle |

---

## New Components (2024-2025)

Recently added components marked as "NEW":

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

---

## Installation

### Single Component

```bash
npx shadcn@latest add button
```

### Multiple Components

```bash
npx shadcn@latest add button card badge dialog
```

### Common Bundles

```bash
# Forms bundle
npx shadcn@latest add form input label button select checkbox radio-group switch textarea

# Navigation bundle
npx shadcn@latest add tabs navigation-menu breadcrumb dropdown-menu command

# Data display bundle
npx shadcn@latest add table card badge avatar skeleton

# Feedback bundle
npx shadcn@latest add alert toast progress dialog
```

---

## Component Dependencies

### External Dependencies

| Component | npm Package |
|-----------|-------------|
| `calendar` | date-fns, react-day-picker |
| `carousel` | embla-carousel-react |
| `chart` | recharts |
| `command` | cmdk |
| `data-table` | @tanstack/react-table |
| `form` | react-hook-form, zod |
| `resizable` | react-resizable-panels |
| `sonner` | sonner |

### Registry Dependencies

Components that depend on other shadcn components:

| Component | Requires |
|-----------|----------|
| `combobox` | command, popover |
| `date-picker` | calendar, popover |
| `form` | label, button |
| `pagination` | button |
| `data-table` | table, checkbox, button |

---

## Component Anatomy

### Basic Component Structure

```tsx
// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground...",
        destructive: "bg-destructive...",
        outline: "border border-input...",
        secondary: "bg-secondary...",
        ghost: "hover:bg-accent...",
        link: "text-primary underline-offset-4...",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

---

## Variant Patterns

### Common Variants

Most components support these variant patterns:

| Variant Type | Options |
|--------------|---------|
| `variant` | default, destructive, outline, secondary, ghost, link |
| `size` | sm, default, lg, icon |

### Custom Variants

Add custom variants using class-variance-authority:

```tsx
const badgeVariants = cva("...", {
  variants: {
    variant: {
      default: "...",
      // Add custom variants
      success: "bg-green-500/20 text-green-400",
      warning: "bg-yellow-500/20 text-yellow-400",
    }
  }
})
```

---

## Usage Examples

### Button with Icon

```tsx
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

<Button>
  <Mail className="mr-2 h-4 w-4" />
  Send Email
</Button>
```

### Form with Validation

```tsx
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input placeholder="email@example.com" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

### Dialog with Form

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here.
      </DialogDescription>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button type="submit">Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Accessibility

All components follow WAI-ARIA guidelines:

| Component | Aria Support |
|-----------|--------------|
| Dialog | role="dialog", aria-modal |
| Tabs | role="tablist", aria-selected |
| Menu | role="menu", aria-expanded |
| Alert | role="alert" |
| Progress | role="progressbar", aria-valuenow |

### Keyboard Navigation

| Component | Keys |
|-----------|------|
| Dialog | Escape to close, Tab to navigate |
| Menu | Arrow keys, Enter to select |
| Tabs | Arrow keys to switch |
| Command | Up/Down to navigate, Enter to select |

---

## MCP Integration

### Search Components

```yaml
mcp__shadcn__search_items_in_registries({
  registries: ["@shadcn"],
  query: "button"
})
```

### View Component Code

```yaml
mcp__shadcn__view_items_in_registries({
  items: ["@shadcn/button"]
})
```

### Get Installation Command

```yaml
mcp__shadcn__get_add_command_for_items({
  items: ["@shadcn/button", "@shadcn/card"]
})
→ "npx shadcn@latest add button card"
```

---

## Theming Components

Components use CSS variables for theming:

```css
/* Base colors applied to all components */
--primary: oklch(0.21 0.006 285.75);
--primary-foreground: oklch(0.985 0 0);
--secondary: oklch(0.96 0.003 285.75);
--destructive: oklch(0.577 0.245 27.32);
--muted: oklch(0.96 0.003 285.75);
--accent: oklch(0.96 0.003 285.75);
--border: oklch(0.92 0.004 285.75);
--ring: oklch(0.871 0.006 285.75);
```

---

*Reference: ui.shadcn.com/docs/components*
