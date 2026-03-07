---
name: paper-design
description: Visual UI design and iteration on Paper.design's HTML/CSS-native canvas via MCP. This skill should be used when users request visual mockups, UI design exploration, design system visualization, component prototyping, or visual-first workflows before code generation. Supports creating artboards, writing HTML to canvas, extracting JSX with Tailwind classes, taking screenshots, and iterating on designs visually. Triggers on requests like "design this in Paper", "show me a mockup", "create a visual design", "design system sticker sheet", or "verify this code visually".
version: 1.1.0
triggers:
  - paper
  - visual design
  - design in paper
  - mockup
  - design system visualization
  - visual iteration
  - show me visually
  - design first
  - sticker sheet
---

# Paper.design MCP Integration

Visual UI design and iteration using Paper.design's HTML/CSS-native canvas. Every element on Paper's canvas is real HTML with real CSS, real flexbox, and real font rendering -- making LLM-driven design work exceptionally high quality because the DOM is a native representation for language models.

## When to Use This Skill

This skill activates when:
- A visual mockup or UI prototype is requested before writing production code
- Design exploration benefits from seeing layouts, typography, and color in context
- A design system needs visual specification (color swatches, type scale, spacing grid)
- Generated code needs visual verification without running a dev server
- Marketing or presentation assets require pixel-perfect visual design

**Paper vs alternatives:**

| Tool | Best For | Not For |
|------|----------|---------|
| **Paper.design** | UI mockups, visual iteration, design systems, marketing assets | Architecture diagrams, flowcharts, system diagrams |
| **Excalidraw** | Architecture diagrams, flowcharts, whiteboard sketches | Pixel-perfect UI, production mockups |
| **Direct code** | Simple components, bug fixes, known patterns | Complex visual exploration |

## Prerequisites

1. **Paper Desktop App** must be running (auto-starts MCP server on launch)
2. **MCP server** registered as `paper` at `http://127.0.0.1:29979/mcp`
3. **Free tier**: 100 MCP calls/week, 200MB/file. **Pro** ($20/mo): 1M calls/week.

### Preflight

Call `get_basic_info` first. If it returns an error, the Paper app is not running or no file is open.

## MCP Tools Reference

### Read Tools (11)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `get_basic_info` | File metadata, artboard list, dimensions, loaded fonts | First call in any workflow |
| `get_selection` | Currently selected nodes (IDs, names, types, size) | User says "use this" or "modify selected" |
| `get_node_info` | Node details (visibility, text content, parent, children) | Inspecting specific elements |
| `get_children` | Direct children of a node | Navigating hierarchy |
| `get_tree_summary` | Full node tree with depth limit | Understanding page structure |
| `get_screenshot` | Base64 screenshot (1x or 2x scale) | Visual verification at checkpoints |
| `get_jsx` | JSX export with Tailwind classes or inline styles | **Primary output** -- extracting code from designs |
| `get_computed_styles` | CSS values for nodes (batch) | Design token extraction, style auditing |
| `get_fill_image` | Base64 image data from fills | Asset extraction |
| `get_font_family_info` | Font availability (local + Google Fonts) | Verify fonts before writing typography |
| `get_guide` | Guided workflows (e.g., Figma import) | Onboarding, discovering Paper features |

### Write Tools (9)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `create_artboard` | New artboard, auto-positioned to avoid overlap | Starting any new design |
| `write_html` | Parse HTML into design nodes (insert-children or replace) | **Primary creation tool** -- building designs |
| `set_text_content` | Batch text updates across multiple nodes | Content swaps (e.g., Notion data into mockup) |
| `rename_nodes` | Batch layer renaming | Organizing layers before export |
| `duplicate_nodes` | Deep clone with descendant ID mapping | Creating variations, repeated elements |
| `update_styles` | CSS modifications on nodes (batch) | Theming, color changes, spacing tweaks |
| `delete_nodes` | Remove nodes and descendants | Cleanup |
| `start_working_on_nodes` | Show "working" indicator on artboard | Before modifying existing designs |
| `finish_working_on_nodes` | Clear working indicator | **Always call when done** |

### Additional Capabilities

- **Shader library**: GPU-accelerated effects (mesh gradients, liquid metal, halftone, grain). For presentation/marketing only -- not portable to React.
- **AI image generation**: Built-in Flux 2 and OpenAI Image Edit, accessible through the Paper UI.

## Core Workflows

### 1. Visual-First Design

Design a UI visually before writing production code.

**Steps:**
1. Call `get_basic_info` to understand canvas state
2. Call `get_font_family_info` to verify font availability
3. Call `create_artboard` with target dimensions (1440x900 desktop, 390x844 mobile)
4. Build incrementally with `write_html` -- one visual group per call (nav, hero, card, footer)
5. Call `get_screenshot` after every 2-3 modifications to review
6. Iterate: `update_styles` / `write_html` based on feedback
7. Call `get_jsx` with `format: "tailwind"` to extract production code
8. Call `finish_working_on_nodes` when complete

**Example:**

Input: "Design a dark hero section for a creative studio"

Process:
1. `get_font_family_info(["Instrument Serif", "DM Sans"])` -- verify fonts
2. `create_artboard({ name: "Hero - Desktop", styles: { width: "1440px", height: "900px", backgroundColor: "#0C0C0C" } })`
3. `write_html` -- nav bar with logo + links
4. `write_html` -- oversized serif headline with italic emphasis
5. `write_html` -- body text + CTA buttons
6. `get_screenshot` -- review checkpoint
7. `write_html` -- stats strip at bottom
8. `get_screenshot` -- final review
9. `get_jsx({ format: "tailwind" })` -- extract code

Output: Pixel-perfect hero design on canvas + production-ready JSX with Tailwind classes

### 2. Design System Specification

Visualize and extract design tokens.

**Steps:**
1. `create_artboard` -- large canvas ("Design System", 1440x2000+)
2. `write_html` -- color palette swatches with hex labels
3. `write_html` -- typography scale (display, heading, body, caption)
4. `write_html` -- spacing rhythm samples
5. `write_html` -- component state variants (buttons, inputs, cards)
6. `get_screenshot` -- share visual reference
7. `get_computed_styles` -- batch extract CSS values for Tailwind config

**Example:**

Input: "Create a design system sticker sheet for our app"

Output: Visual token sheet on canvas + extracted CSS values ready for `@theme` block or `tailwind.config`

### 3. Code-to-Design Verification

Verify generated code visually without a dev server.

**Steps:**
1. Generate code via frontend-design skill or direct implementation
2. `write_html` -- push the generated HTML/Tailwind into a Paper artboard
3. `get_screenshot` -- verify layout, spacing, colors match intent
4. If issues found: fix code, `write_html` again, re-verify
5. `get_screenshot` -- final confirmation

**Example:**

Input: "Check if this pricing section looks right" (after code generation)

Output: Visual screenshot confirming layout fidelity, or identified issues to fix

### 4. Notion Content Integration

Design with real content pulled from Notion.

**Steps:**
1. Fetch content via Notion MCP (`notion-fetch`)
2. `create_artboard` + `write_html` -- build layout structure
3. `set_text_content` -- batch-populate with real Notion data
4. `get_screenshot` -- verify with real content
5. `get_jsx` -- export for production

### 5. Marketing & Presentation Design

Create visual assets prioritizing aesthetics over code portability.

**Steps:**
1. `create_artboard` -- set dimensions for target medium
2. `write_html` -- build design (may use Paper's shader effects)
3. `update_styles` -- polish colors, typography, spacing
4. `get_screenshot({ scale: 2 })` -- export as retina image
5. Optionally `get_jsx` -- export as code (shaders will not transfer)

## Integration with Frontend-Design Skill

Paper serves as **Phase 0** (optional) in the frontend-design companion pipeline:

```
Phase 0: Paper.design (visual specification)     [optional]
Phase 1: Concept generation
Phase 2: ui-ux-pro-max (palette/typography)
Phase 3: shadcn/kibo-ui (components)
Phase 4: Implementation
Phase 5: Audit
```

**Activates when:**
- User requests "design first", "show me visually", "mockup in Paper"
- Complex multi-section pages benefit from visual planning
- Design system creation or token specification is needed

**Skip when:**
- Simple component additions or bug fixes
- User wants to go straight to code
- Paper desktop app is not running

**Data flow:**
- `get_jsx` output feeds Phase 1 as structural reference
- `get_computed_styles` output feeds Phase 2 as token input
- `get_screenshot` provides visual verification at any phase

## Best Practices

### Incremental Building
Each `write_html` call should produce roughly ONE visual group -- a nav bar, a headline block, a card, a stats row. Never batch an entire page into a single call. The user sees each element appear in real-time.

### write_html Rules
- Always use inline styles (`style="..."`)
- Use `display: flex` for layout containers (no grid, no tables, no margins)
- All Google Fonts are available by family name
- Set `layer-name` attribute for semantic layer names
- Use `<pre>` or `white-space: pre` for code blocks
- Do not use emojis as icons -- use SVG or omit

### Review Checkpoints
Take `get_screenshot` after every 2-3 modifications. Evaluate:
- **Spacing**: Even rhythm, intentional gaps
- **Typography**: Readable sizes, clear hierarchy
- **Contrast**: Text legible against backgrounds
- **Alignment**: Elements sharing consistent vertical/horizontal lanes
- **Clipping**: No content cut off at edges

### Call Budget Awareness
Free tier: 100 MCP calls/week. A typical design session uses 15-30 calls.
- `create_artboard` + `write_html` + `get_screenshot` = 3 calls per iteration
- Batch operations (`set_text_content`, `update_styles`) conserve calls
- `duplicate_nodes` + `update_styles` is more efficient than re-creating similar elements

### Font Verification
Always call `get_font_family_info` before writing typography for the first time in a session. Using unavailable fonts or weights results in broken rendering.

## Troubleshooting

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| `get_basic_info` returns error | Paper app not running or no file open | Launch Paper and open/create a file |
| Tools not found in session | MCP server added mid-session | Restart Claude Code (MCP servers load at session start) |
| Font renders incorrectly | Font family or weight not available | Call `get_font_family_info` to verify, use available alternative |
| `write_html` content invisible | Missing inline styles or zero-size container | Ensure all containers have explicit dimensions or flex properties |
| Layout broken | Used `display: grid`, margins, or HTML tables | Paper only supports `display: flex` for layout containers |
| Artboards overlap | Created without checking position | `create_artboard` auto-positions; use `relatedNodeId` for variants |
| Free tier limit hit | >100 MCP calls in a week | Upgrade to Pro ($20/mo) or wait for weekly reset |

---

## Version History
- v1.1.0 (2026-02-28): Revised per create-better-skills framework. Corrected tool counts (11 read + 9 write). Added concrete examples, troubleshooting table, write_html rules. Improved metadata description with trigger keywords.
- v1.0.0 (2026-02-28): Initial release with 5 workflows, pipeline integration, best practices.
