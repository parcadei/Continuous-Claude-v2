# MCP & Plugin Guidance

## Activation
- MCP tool invocation
- `/skill:mcp-guidance` explicit
- Design/docs/github context

## Iron Law
Native tools for simple tasks. MCP/plugins when native insufficient.

---

## MCP Servers

### Context7
**Purpose:** Library docs, API research, coding patterns

**Triggers:**
- "docs for X" | "how to use Y"
- External lib detected
- Import errors
- Unfamiliar library/framework

**Usage:**
```yaml
Flow: resolve-library-id → get-docs(topic)
Rule: Research BEFORE implementing unfamiliar libs
Cost: Light (100-500 tokens)
```

**Examples:**
- "React hooks docs" → resolve-library-id("react") → get-docs(topic:"hooks")
- Import error → resolve-library-id(package) → verify patterns

---

### GitHub
**Purpose:** GitHub operations

**Triggers:**
- PR/issue creation or review
- Repo exploration
- Code search across repos
- Remote repository operations

**Usage:**
```yaml
Tools: gh_* for all GitHub tasks
Rule: Prefer over manual git for remote ops
Cost: Light-Medium
```

**Examples:**
- Create PR → gh pr create
- Search code → gh search code
- List issues → gh issue list

---

### Shadcn
**Purpose:** UI component library

**Triggers:**
- "need button/form/component"
- UI design requests
- Component scaffolding
- Design system work

**Usage:**
```yaml
Pair: frontend-design plugin for creative work
Rule: Use for consistent design system
Cost: Light
```

**Examples:**
- "Add a dialog component" → shadcn add dialog
- "Build a form" → shadcn components + patterns

---

### claude-in-chrome (Built-in)
**Purpose:** Browser automation, visual testing

**Triggers:**
- Visual verification needed
- Interactive debugging
- Screenshot capture
- Live page inspection

**Usage:**
```yaml
Rule: Use for review/debugging workflows
Cost: Medium
Status: Built-in, may be disabled
```

**Examples:**
- Verify UI changes → screenshot current page
- Debug layout → inspect elements
- Test interaction → click/type actions

---

## Plugins (Separate from MCPs)

### Frontend-Design Plugin
**Purpose:** Creative, distinctive UI design

**Use for:**
- Production-grade interfaces
- Avoiding generic AI aesthetics
- Bold, memorable designs

**Pairs with:** Shadcn for component library

**Key principle:** Bold aesthetic direction > safe defaults

---

### Document Plugins (docx/pdf/xlsx)
**Purpose:** Office document generation

**Use for:**
- Reports → docx
- Spreadsheets → xlsx
- PDFs → pdf

---

### Workspace-Tools Plugin
**Purpose:** Workspace utilities

**Use for:** General dev workspace operations

---

## Decision Matrix

### Native First
Use native tools when:
- Simple file ops
- Basic git commands (local)
- Single-file edits
- Standard code changes

### Use MCP When
| Need | MCP |
|------|-----|
| External lib research | Context7 |
| GitHub remote ops | GitHub |
| UI components | Shadcn |
| Visual verification | claude-in-chrome |

### Use Plugins When
| Need | Plugin |
|------|--------|
| Creative UI design | frontend-design |
| Document generation | docx/pdf/xlsx |

---

## Token Economics

```yaml
Budget:
  Native: 0 tokens
  Light MCP: 100-500 tokens
  Medium MCP: 500-2K tokens
  Heavy MCP: 2K+ tokens

Rules:
  - >50% context → stop MCP, use native fallback
  - Batch similar MCP calls
  - Cache results within session
  - Start with least expensive option
```

---

## Failure Recovery

```yaml
Context7:
  Lib not found → Try broader terms
  Docs incomplete → Use WebSearch fallback

GitHub:
  Auth failed → Check GITHUB_TOKEN
  Rate limit → Wait or reduce calls

Shadcn:
  Component not found → Check available components
  Integration issues → Manual implementation

claude-in-chrome:
  Not responding → May be disabled
  Tab invalid → Refresh tabs_context
```

---
*SuperClaude v4.1.0 | MCP & Plugin guidance | On-demand skill*
