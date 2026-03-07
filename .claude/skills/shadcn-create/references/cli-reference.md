# Shadcn CLI Reference

## New Project

```bash
# Full preset URL approach
npx shadcn@latest create --preset "https://ui.shadcn.com/create?baseColor=zinc&radius=small&style=vega&template=vite"

# With pnpm
pnpm dlx shadcn@latest create --preset "<URL>"

# With bun
bunx shadcn@latest create --preset "<URL>"
```

## Existing Project

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

## v4 Safe Commands (Read-Only)

| Command | Purpose |
|---------|---------|
| `shadcn info` | Show project config, installed components, resolved paths |
| `shadcn docs <component>` | CLI-accessible component documentation and links |
| `shadcn add --dry-run` | Preview files and deps without writing anything |
| `shadcn add --diff` | Show unified diff of what would change |
| `shadcn add --view` | Inspect full file contents that would be added |

## Common Component Bundles

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

## URL Parameters

```
https://ui.shadcn.com/create?
  baseColor=zinc       # Base gray scale
  &theme=zinc          # Color theme (matches base)
  &radius=small        # Border radius preset
  &style=vega          # Visual style
  &template=vite       # Framework template
```

| Parameter | Values |
|-----------|--------|
| baseColor | neutral, stone, zinc, gray, slate |
| theme | matches baseColor |
| radius | none, small, default, medium, large |
| style | vega, nova, maia, lyra, mira |
| template | nextjs, tanstack, vite |

## Third-Party Registries

| Registry | Focus | URL |
|----------|-------|-----|
| registry.directory | Community index | registry.directory |
| shadcnblocks.com | 1110+ premium blocks | shadcnblocks.com |
| blocks.so | 60+ free blocks | blocks.so |
| magicui.design | 150+ animated | magicui.design |

```bash
# Install from third-party registry
npx shadcn@latest add @acme/custom-component
```
