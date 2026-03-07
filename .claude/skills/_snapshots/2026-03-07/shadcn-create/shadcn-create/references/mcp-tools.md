# Shadcn MCP Tools Reference

Complete reference for all 7 Shadcn MCP server tools.

## Prerequisites

### Enable MCP Server

```bash
# Enable MCP for any registry (zero-config)
npx shadcn registry:mcp
```

### Configure Claude Code

Add to `.mcp.json` or `claude_desktop_config.json`:

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

---

## Tool Reference

### 1. get_project_registries

**Purpose:** Get configured registry names from project's `components.json`

```yaml
Input: None
Output:
  success: { registries: ["@shadcn", "@custom"] }
  error: { message: "components.json not found" }

Use When: Starting work on existing Shadcn project
Prerequisite: Project must have components.json (run `shadcn init` first)

Example:
  mcp__shadcn__get_project_registries()
  → ["@shadcn"]
```

---

### 2. list_items_in_registries

**Purpose:** List all available items from specified registries

```yaml
Input:
  registries: string[]  # Required: ["@shadcn"] or ["@shadcn", "@custom"]
  limit: number         # Optional: Max items to return
  offset: number        # Optional: Pagination offset

Output:
  success: { items: ComponentItem[], total: number }
  error: { message: "Registry not found" }

Use When: Exploring available components, building catalogs
Note: Returns ALL item types (components, blocks, hooks, pages)

Example:
  mcp__shadcn__list_items_in_registries({
    registries: ["@shadcn"],
    limit: 50
  })
```

**Item Structure:**
```typescript
interface ComponentItem {
  name: string;           // "button"
  type: string;           // "registry:ui" | "registry:component" | "registry:block"
  description?: string;
  registryDependencies?: string[];
  dependencies?: string[];
}
```

---

### 3. search_items_in_registries

**Purpose:** Fuzzy search for components by name or keyword

```yaml
Input:
  registries: string[]  # Required: ["@shadcn"]
  query: string         # Required: Search term
  limit: number         # Optional: Max results
  offset: number        # Optional: Pagination

Output:
  success: { items: ComponentItem[], total: number }
  error: { message: "Invalid query" }

Use When: Finding specific components, exploring options
Note: Supports fuzzy matching ("btn" finds "button")

Examples:
  # Find button components
  mcp__shadcn__search_items_in_registries({
    registries: ["@shadcn"],
    query: "button"
  })

  # Find form-related
  mcp__shadcn__search_items_in_registries({
    registries: ["@shadcn"],
    query: "form"
  })

  # Search with no results
  mcp__shadcn__search_items_in_registries({
    registries: ["@shadcn"],
    query: "nonexistent"
  })
  → { items: [], total: 0 }
```

---

### 4. view_items_in_registries

**Purpose:** Get detailed component info including source code

```yaml
Input:
  items: string[]  # Required: ["@shadcn/button", "@shadcn/card"]

Output:
  success: {
    items: [{
      name: string,
      type: string,
      description: string,
      files: FileContent[],
      dependencies: string[],
      registryDependencies: string[]
    }]
  }
  error: { message: "Component not found" }

Use When:
  - Understanding component structure
  - Reviewing props and variants
  - Checking dependencies before install

Example:
  mcp__shadcn__view_items_in_registries({
    items: ["@shadcn/button", "@shadcn/card", "@shadcn/dialog"]
  })
```

**FileContent Structure:**
```typescript
interface FileContent {
  path: string;      // "components/ui/button.tsx"
  content: string;   // Full source code
  type: string;      // "registry:ui"
}
```

---

### 5. get_item_examples_from_registries

**Purpose:** Find usage examples and demos with complete code

```yaml
Input:
  registries: string[]  # Required: ["@shadcn"]
  query: string         # Required: Pattern like "button-demo", "form-validation"

Output:
  success: {
    examples: [{
      name: string,
      code: string,      # Complete implementation
      dependencies: string[]
    }]
  }
  error: { message: "No examples found" }

Use When:
  - Learning component usage
  - Finding implementation patterns
  - Getting working code to adapt

Example Queries:
  - "button-demo"        → Button variations
  - "form-validation"    → Form with validation
  - "card-example"       → Card layouts
  - "dialog-confirm"     → Confirmation dialogs
  - "table-pagination"   → Paginated tables

Example:
  mcp__shadcn__get_item_examples_from_registries({
    registries: ["@shadcn"],
    query: "button-demo"
  })
```

---

### 6. get_add_command_for_items

**Purpose:** Generate CLI command to install components

```yaml
Input:
  items: string[]  # Required: ["@shadcn/button", "@shadcn/card"]

Output:
  success: { command: "bunx shadcn@latest add @shadcn/button @shadcn/card" }
  error: { message: "Invalid item format" }

Use When: Ready to install components
Note: Generates command only - execute via Bash
Important: MCP returns `bunx` (Bun) commands. For npm/pnpm users:
  - bunx → npx (npm)
  - bunx → pnpm dlx (pnpm)

Example:
  mcp__shadcn__get_add_command_for_items({
    items: ["@shadcn/button", "@shadcn/card"]
  })
  → { command: "bunx shadcn@latest add @shadcn/button @shadcn/card" }

Then execute (adapt to your package manager):
  Bash (bun): bunx shadcn@latest add @shadcn/button @shadcn/card
  Bash (npm): npx shadcn@latest add button card
  Bash (pnpm): pnpm dlx shadcn@latest add button card
```

---

### 7. get_audit_checklist

**Purpose:** Post-creation verification checklist

```yaml
Input: None

Output:
  success: {
    checklist: [
      "Verify components.json exists",
      "Check Tailwind config includes shadcn preset",
      "Confirm CSS variables in globals.css",
      "Test component imports",
      "Verify cn() utility available"
    ]
  }

Use When: After adding components, before committing
Purpose: Ensure installation completeness
```

---

## Common Workflows

### Discovery → Installation

```yaml
1. Search for components:
   mcp__shadcn__search_items_in_registries({
     registries: ["@shadcn"],
     query: "form"
   })

2. View component details:
   mcp__shadcn__view_items_in_registries({
     items: ["@shadcn/form", "@shadcn/input", "@shadcn/button"]
   })

3. Get examples:
   mcp__shadcn__get_item_examples_from_registries({
     registries: ["@shadcn"],
     query: "form-validation"
   })

4. Generate install command:
   mcp__shadcn__get_add_command_for_items({
     items: ["@shadcn/form", "@shadcn/input", "@shadcn/button"]
   })

5. Execute (Bash):
   npx shadcn@latest add form input button

6. Verify:
   mcp__shadcn__get_audit_checklist()
```

### Catalog Building

```yaml
1. List all available:
   mcp__shadcn__list_items_in_registries({
     registries: ["@shadcn"],
     limit: 100
   })

2. Group by type (filter in code):
   - registry:ui → Base components
   - registry:component → Compound components
   - registry:block → Page sections
   - registry:hook → React hooks
```

---

## Error Handling

### Registry Not Found
```yaml
Cause: Invalid registry name or not configured
Fix: Use "@shadcn" for official registry
Fallback: Run `shadcn init` to configure project
```

### Component Not Found
```yaml
Cause: Typo in component name or component doesn't exist
Fix: Use search first to find correct name
Fallback: Check ui.shadcn.com/docs/components
```

### components.json Missing
```yaml
Cause: Project not initialized with Shadcn
Fix: Run `npx shadcn@latest init`
Note: Required for get_project_registries
```

---

## Fallback Strategies

When MCP tools are unavailable:

| Tool | Fallback |
|------|----------|
| search | `shadcn add --help` or ui.shadcn.com |
| view | Read from node_modules or GitHub |
| examples | ui.shadcn.com/blocks or GitHub examples |
| add command | Direct CLI: `npx shadcn@latest add <name>` |
| audit | Manual checklist from skill |

---

## Token Costs

| Tool | Estimated Tokens |
|------|------------------|
| get_project_registries | ~50 |
| list_items (limit 50) | ~500 |
| search_items | ~200 |
| view_items (3 components) | ~2000 |
| get_item_examples | ~1500 |
| get_add_command | ~50 |
| get_audit_checklist | ~100 |

**Optimization:** Use search before view to minimize token usage.
