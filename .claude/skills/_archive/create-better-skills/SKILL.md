---
name: skill-creator
description: Guide for creating effective skills for Claude Code (CLI/IDE) and Claude.ai (web/desktop app). Use when users want to create or update skills that extend Claude's capabilities with specialized knowledge, workflows, or tool integrations. Covers platform differences, script execution, discovery optimization, and quality assurance.
license: Complete terms in LICENSE.txt
---

# Skill Creator

This skill provides comprehensive guidance for creating effective skills that work across Claude Code and Claude.ai platforms.

## Platform Overview

Skills work on both **Claude Code** (CLI/IDE) and **Claude.ai** (web/desktop app) with some platform-specific differences:

### Claude Code (CLI/IDE)
- **Discovery**: Automatic via metadata matching
- **Installation**: Extract to `.claude/skills/` directory
- **API Requirements**: Beta headers for programmatic use
- **Best for**: Development workflows, automation, team distribution

### Claude.ai (Web/Desktop App)
- **Discovery**: Upload via web interface
- **Installation**: Upload skill zip file
- **API Requirements**: None (web-based)
- **Best for**: Conversational workflows, ad-hoc tasks, individual use

**Key Assumption**: Scripts included in skill packages execute when properly referenced in SKILL.md, regardless of platform. Test and adjust as needed.

---

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks—they transform Claude from a general-purpose agent into a specialized agent equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. **Specialized workflows** - Multi-step procedures for specific domains
2. **Tool integrations** - Instructions for working with specific file formats or APIs
3. **Domain expertise** - Company-specific knowledge, schemas, business logic
4. **Bundled resources** - Scripts, references, and assets for complex and repetitive tasks

### Token Optimization Benefits

Skills dramatically reduce token usage through progressive disclosure:
- **~98% token savings** compared to manual instructions
- **Metadata only** (~100 words) until skill activates
- **Full instructions** (<5k words) loaded when needed
- **Resources loaded** only as Claude determines necessary

**Example**: Excel skill saves ~50k tokens per conversation by bundling proven helper scripts instead of regenerating spreadsheet logic each time.

---

## Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

### SKILL.md (required)

**Metadata Quality**: The `name` and `description` in YAML frontmatter determine when Claude will discover and use the skill. Be specific about what the skill does and when to use it.

**Writing Style**: Use third-person perspective ("This skill should be used when..." not "Use this skill when...") and imperative/infinitive form (verb-first instructions, not second person).

**Good example:**
```yaml
---
name: fourth-excel-templates
description: Generate Fourth-branded Excel reports with company formatting, formulas, and chart styles. Use when users request financial reports, budget templates, or data dashboards following Fourth brand standards.
---
```

### Bundled Resources (optional)

#### Scripts (`scripts/`)

Executable code for tasks requiring deterministic reliability or repeatedly rewritten logic.

**When to include:**
- Same code is rewritten repeatedly
- Deterministic reliability needed
- Complex Excel formulas, PDF manipulation, data processing

**Examples:**
- `scripts/excel_helper.py` - Spreadsheet generation with custom formatting
- `scripts/rotate_pdf.py` - PDF rotation operations
- `scripts/data_processor.py` - ETL transformations

**How scripts execute:**
- Claude reads SKILL.md instructions
- When instructed, loads and executes the script
- Scripts run with appropriate interpreter (Python, Node, Bash)
- Outputs returned to Claude for further processing

**Best practices:**
- Include shebang line (`#!/usr/bin/env python3`)
- Add error handling and validation
- Document dependencies in script comments
- Keep scripts focused on single responsibility

#### References (`references/`)

Documentation and reference material loaded into context as needed to inform Claude's thinking.

**When to include:**
- Documentation Claude should reference while working
- Content too detailed for SKILL.md
- Information needed occasionally, not every time

**Examples:**
- `references/brand_guidelines.md` - Company branding rules
- `references/api_docs.md` - API specifications
- `references/schema.md` - Database table structures
- `references/policies.md` - Company policies

**Best practices:**
- If files are large (>10k words), include grep search patterns in SKILL.md
- Avoid duplication between SKILL.md and references
- Move detailed content to references, keep SKILL.md lean
- Use descriptive filenames that indicate content

#### Assets (`assets/`)

Files used within the output Claude produces, not loaded into context.

**When to include:**
- Templates, images, icons needed for output
- Boilerplate code to be copied/modified
- Brand resources (fonts, logos, color palettes)

**Examples:**
- `assets/template.xlsx` - Excel template with Fourth branding
- `assets/logo.png` - Company logo for presentations
- `assets/slides.pptx` - PowerPoint template
- `assets/frontend-template/` - React boilerplate

**Best practices:**
- Keep assets optimized (compressed images, minimal templates)
- Use relative paths in scripts
- Document asset usage in SKILL.md

### Progressive Disclosure Design Principle

Skills use a three-level loading system to manage context efficiently:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words recommended)
3. **Bundled resources** - As needed by Claude (loaded on demand)

**Token optimization calculation:**
```
Without skill: 50,000 tokens per conversation (manual instructions + regenerated code)
With skill:    1,000 tokens per conversation (metadata + selective resource loading)
Savings:       98% reduction in token usage
```

---

## Skill Discovery & Activation

### How Claude Discovers Skills

**Claude Code**: Automatic discovery based on metadata matching
- Claude analyzes user query
- Matches against skill descriptions in `.claude/skills/`
- Loads relevant skills automatically

**Claude.ai**: Upload and manual activation
- Upload skill zip via web interface
- Claude accesses skill when conversational context matches
- May require explicit mention ("use my Excel template skill")

### Writing Effective Metadata for Discovery

**Name Guidelines:**
- Use lowercase with hyphens: `fourth-excel-templates`
- Be specific and descriptive
- Match user's mental model

**Description Guidelines (Critical):**
- **Length**: 1-3 sentences, ~50-150 words
- **Structure**: What + When + Capabilities
- **Keywords**: Include terms users will actually say
- **Specificity**: "Excel financial reports" not "file operations"

**Good example:**
```yaml
name: fourth-presentation-builder
description: Expert guidance for creating Fourth-branded PowerPoint presentations (PPTX files only) using official brand guidelines, templates, colors, typography, and layout principles. Use when users request presentations, slides, decks, or PowerPoint files following Fourth brand standards.
```

**Bad example:**
```yaml
name: presentations
description: Helps with presentations.
```

### Common Trigger Patterns

Include these patterns in descriptions to improve discovery:

- **File formats**: "Excel spreadsheets", "PPTX presentations", "PDF documents"
- **Actions**: "create", "generate", "build", "analyze", "format"
- **Domains**: "brand guidelines", "financial reports", "API integration"
- **User phrases**: "when users request", "for queries about", "when asked to"

---

## Skill Creation Process

Follow these steps in order, skipping only when clearly not applicable.

### Step 1: Understanding the Skill with Concrete Examples

**Goal**: Clearly understand concrete examples of how the skill will be used.

**Questions to ask:**
- "What functionality should this skill support?"
- "Can you give 3-5 examples of how this skill would be used?"
- "What would a user say that should trigger this skill?"
- "What outputs should the skill generate?"

**Example: Building fourth-excel-templates skill**
- User request: "Create Q4 budget template with Fourth branding"
- User request: "Generate P&L report in our standard format"
- User request: "Build sales dashboard with Fourth colors and logo"

**Best practices:**
- Get 3-5 concrete examples before proceeding
- Avoid overwhelming users with too many questions at once
- Validate examples with user before building

**Conclude this step** when there is clear sense of the functionality the skill should support.

### Step 2: Planning the Reusable Skill Contents

**Goal**: Identify what scripts, references, and assets would be helpful for repeated execution.

For each concrete example, analyze:
1. What needs to be done from scratch each time?
2. What can be reused (scripts, templates, documentation)?
3. What would make execution faster and more reliable?

**Example 1: fourth-excel-templates**

User query: "Create Q4 budget template with Fourth branding"

Analysis:
- Excel generation requires same formatting rules each time
- Fourth brand colors, fonts, logo placement is consistent
- Budget structure follows standard format

**Solution - Package these resources:**
- `scripts/excel_builder.py` - Script to generate Excel with Fourth formatting
- `assets/fourth_logo.png` - Company logo for header
- `assets/budget_template.xlsx` - Base template with formulas
- `references/brand_colors.md` - Fourth color palette and usage rules

**Example 2: pdf-editor**

User query: "Rotate this PDF 90 degrees"

Analysis:
- PDF rotation requires same code each time
- No branding or templates needed
- Simple, focused task

**Solution:**
- `scripts/rotate_pdf.py` - Script to handle PDF rotation

**Example 3: api-integration**

User query: "Fetch customer data from our API"

Analysis:
- API endpoints and authentication don't change
- Request/response schemas are documented
- Common query patterns repeat

**Solution:**
- `scripts/api_client.py` - Reusable API client with auth
- `references/api_docs.md` - Endpoint documentation
- `references/schemas.md` - Request/response examples

**Deliverable**: Create a list of reusable resources to include: scripts, references, and assets.

### Step 3: Initializing the Skill

**Goal**: Create skill directory structure and base files.

#### Manual Initialization (Recommended)

```bash
# Create skill directory
mkdir -p .claude/skills/your-skill-name

# Create SKILL.md with frontmatter
cat > .claude/skills/your-skill-name/SKILL.md << 'EOF'
---
name: your-skill-name
description: [What the skill does and when to use it - be specific with trigger keywords]
---

# Your Skill Name

[Overview paragraph]

## When to Use This Skill

[Specific trigger scenarios]

## How to Use This Skill

[Step-by-step instructions]

## Bundled Resources

[Document scripts, references, assets]
EOF

# Create resource directories (only if needed)
mkdir -p .claude/skills/your-skill-name/scripts
mkdir -p .claude/skills/your-skill-name/references
mkdir -p .claude/skills/your-skill-name/assets
```

#### Use Skill Template

Copy the [Skill Template](#skill-template) from Appendix A and customize.

### Step 4: Edit the Skill

**Goal**: Create clear, actionable instructions and package reusable resources.

#### 4.1 Create Bundled Resources First

Start with the resources identified in Step 2:

**Scripts (`scripts/`):**
```python
#!/usr/bin/env python3
"""
Excel builder for Fourth-branded reports
Dependencies: openpyxl, pandas
"""

def create_fourth_branded_excel(title, data):
    # Implementation here
    pass
```

**References (`references/brand_colors.md`):**
```markdown
# Fourth Brand Colors

## Primary Palette
- Fourth Blue: #0047AB
- Fourth Gray: #6B7280
- White: #FFFFFF

## Usage Guidelines
- Headers: Fourth Blue background, White text
- Data rows: Alternate White and light Gray
```

**Assets:**
- Add `logo.png`, `template.xlsx`, etc.

**Delete unused directories** - Don't include empty `scripts/`, `references/`, or `assets/` folders.

#### 4.2 Update SKILL.md

Answer these questions in SKILL.md:

1. **What is the purpose of the skill?** (2-3 sentences)
2. **When should the skill be used?** (Include trigger patterns)
3. **How should Claude use the skill?** (Step-by-step with resource references)

**Critical: Reference scripts explicitly**

```markdown
## How to Generate Fourth-Branded Excel Reports

1. **Load the Excel builder script**: Read `scripts/excel_builder.py`

2. **Load brand guidelines**: Reference `references/brand_colors.md` for color codes

3. **Execute generation**:
   - Use `create_fourth_branded_excel()` function from the script
   - Apply brand colors from guidelines
   - Insert logo from `assets/fourth_logo.png`
   - Follow template structure from `assets/budget_template.xlsx`

4. **Return the generated Excel file** to the user for download
```

**Writing checklist:**
- ✅ Use imperative/infinitive form (verb-first instructions)
- ✅ Use objective, instructional language
- ✅ Reference all bundled resources with explicit paths
- ✅ Include examples of expected inputs/outputs
- ✅ Keep core instructions under 5k words
- ✅ Move detailed reference material to `references/` files
- ❌ Avoid second person ("you should")
- ❌ Avoid duplicate information across files

#### 4.3 Excel-Specific Best Practices

When creating skills for Excel work:

**In SKILL.md:**
```markdown
## Excel Generation Workflow

1. **Load Excel helper script**: Read `scripts/excel_helper.py`
2. **Review requirements**: Parse user's data and formatting needs
3. **Execute script**: Use helper functions for:
   - Worksheet creation
   - Cell formatting (colors, fonts, borders)
   - Formula insertion
   - Chart generation
4. **Apply branding**: Use assets and guidelines for consistent formatting
5. **Return file**: Generate .xlsx and provide to user for download
```

**In `scripts/excel_helper.py`:**
```python
#!/usr/bin/env python3
"""
Fourth-branded Excel helper functions
Dependencies: openpyxl>=3.1.0
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

FOURTH_BLUE = "0047AB"
FOURTH_GRAY = "6B7280"

def create_branded_workbook(title):
    """Create new workbook with Fourth branding"""
    wb = Workbook()
    ws = wb.active
    ws.title = title
    return wb, ws

def apply_header_style(cell):
    """Apply Fourth brand header styling"""
    cell.font = Font(color="FFFFFF", bold=True, size=12)
    cell.fill = PatternFill(start_color=FOURTH_BLUE,
                           end_color=FOURTH_BLUE,
                           fill_type="solid")
    cell.alignment = Alignment(horizontal="center", vertical="center")
```

### Step 5: Testing & Validation

**Goal**: Ensure skill works reliably before distribution.

#### Quality Checklist

**Metadata:**
- ✅ Name follows lowercase-with-hyphens convention
- ✅ Description is 50-150 words with clear trigger patterns
- ✅ Description includes specific keywords users will say
- ✅ Third-person perspective maintained

**SKILL.md Content:**
- ✅ Instructions are clear and actionable
- ✅ Imperative/infinitive writing style throughout
- ✅ All bundled resources explicitly referenced with paths
- ✅ Examples provided for complex workflows
- ✅ Core instructions under 5k words
- ✅ No duplicate content with references files

**Bundled Resources:**
- ✅ Scripts are executable and tested independently
- ✅ Scripts include error handling and validation
- ✅ References are well-organized and scannable
- ✅ Assets are properly formatted and accessible
- ✅ No unused example files from initialization
- ✅ File paths in SKILL.md match actual structure

**Script Testing:**
```bash
# Test scripts independently before packaging
cd .claude/skills/your-skill-name/scripts
python excel_helper.py --test
```

#### Testing Workflow

**For Claude Code:**
1. Install skill in `.claude/skills/` directory
2. Test discovery with trigger phrases:
   ```bash
   claude -p "Create a budget report with Fourth branding"
   ```
3. Verify skill activates in Claude Code logs
4. Test execution with realistic examples
5. Verify outputs match expected results
6. Check token usage in logs

**For Claude.ai:**
1. Package skill as zip (see Step 6)
2. Upload via web interface
3. Test with conversational requests
4. Verify script execution and file generation
5. Download and validate generated files
6. Adjust metadata if skill doesn't activate as expected

#### Common Issues & Fixes

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Skill doesn't activate | Vague description metadata | Add specific keywords and trigger patterns |
| Scripts fail to execute | Missing dependencies or environment issues | Add dependency checks and error messages to scripts |
| High token usage | SKILL.md too long | Move detailed content to `references/` |
| Resources not found | Wrong file paths in SKILL.md | Verify paths match actual structure |
| Inconsistent outputs | Missing examples in SKILL.md | Add more specific examples and edge cases |

### Step 6: Packaging the Skill

**Goal**: Create distributable zip file for sharing.

#### Package Creation

```bash
# From project root
cd .claude/skills/

# Create zip with skill contents
zip -r your-skill-name.zip your-skill-name/

# Exclude system files
zip -r your-skill-name.zip your-skill-name/ \
  -x "*.DS_Store" "*__pycache__*" "*.pyc" "*.git*"
```

#### Verify Package Contents

```bash
# List contents to verify structure
unzip -l your-skill-name.zip

# Should show:
# your-skill-name/SKILL.md
# your-skill-name/scripts/excel_helper.py
# your-skill-name/references/brand_colors.md
# your-skill-name/assets/logo.png
```

#### Distribution

**Claude Code:**
1. Share `.zip` file with team members
2. Recipients extract to their `.claude/skills/` directory:
   ```bash
   unzip your-skill-name.zip -d ~/.claude/skills/
   ```
3. Skill auto-discovers on next Claude Code session

**Claude.ai:**
1. Upload `.zip` via web interface
2. Skill becomes available for conversational use
3. Test activation with trigger phrases from description

### Step 7: Iterate

**Goal**: Improve skill based on real-world usage.

**Iteration workflow:**
1. Use the skill on real tasks
2. Notice struggles or inefficiencies
3. Identify improvements needed (SKILL.md or bundled resources)
4. Implement changes
5. Re-test with Step 5 checklist
6. Re-package if distributing to others

**Common iteration triggers:**
- Skill doesn't activate when expected → Update description metadata
- Instructions unclear → Add examples and clarify steps
- Missing functionality → Add script or reference
- Scripts fail → Add error handling and environment checks
- Token usage too high → Move content to references
- Inconsistent outputs → Add more specific guidelines

**Best practices:**
- Keep version history notes in skill directory
- Test changes with original examples from Step 1
- Update metadata if scope changes
- Document lessons learned for future skills

**Version tracking example:**
```markdown
<!-- At bottom of SKILL.md -->
---
## Version History
- v1.2 (2025-10-30): Added chart generation to excel_helper.py
- v1.1 (2025-10-15): Improved brand color documentation
- v1.0 (2025-10-01): Initial release
```

---

## Appendices

### A. Skill Template

```markdown
---
name: your-skill-name
description: [1-3 sentences describing what the skill does, when to use it, and key capabilities. Include specific keywords users will say. Use third-person perspective.]
---

# Your Skill Name

[Brief 1-2 sentence overview of the skill's purpose]

## When to Use This Skill

Use this skill when:
- [Specific trigger scenario 1]
- [Specific trigger scenario 2]
- [Specific trigger scenario 3]

## How to Use This Skill

### Core Workflow

1. **[Step 1 Name]**: [Imperative instruction]
   - Load `scripts/example.py` if needed
   - Reference `references/guide.md` for details

2. **[Step 2 Name]**: [Imperative instruction]
   - Execute script function: `function_name(parameters)`
   - Apply guidelines from references

3. **[Step 3 Name]**: [Imperative instruction]
   - Use `assets/template.ext` as base
   - Generate final output

### Bundled Resources

- **`scripts/example.py`**: [What this script does and when to use it]
- **`references/guide.md`**: [What this reference contains and when to load it]
- **`assets/template.ext`**: [What this asset is and how to use it]

### Examples

**Example 1: [Scenario name]**

Input: [Example user request]

Process:
1. Load `scripts/example.py`
2. Execute with parameters: `function(param1, param2)`
3. Apply formatting from `references/guide.md`
4. Return generated file

Output: [Expected result]

## Best Practices

- [Best practice 1]
- [Best practice 2]
- [Best practice 3]

## Troubleshooting

| Issue | Solution |
|-------|----------|
| [Common issue 1] | [How to fix] |
| [Common issue 2] | [How to fix] |
```

### B. Example: Excel Skill

```markdown
---
name: fourth-excel-templates
description: Generate Fourth-branded Excel reports with company formatting, colors, fonts, formulas, and logo placement. Use when users request financial reports, budget templates, sales dashboards, or data analysis spreadsheets following Fourth brand standards.
---

# Fourth Excel Templates

Generate professional Excel reports and dashboards using Fourth's brand guidelines and formatting standards.

## When to Use This Skill

Use this skill when users request:
- Financial reports (P&L, budget, forecast)
- Sales dashboards and analytics
- Data templates with Fourth branding
- Spreadsheets requiring consistent formatting

## How to Use This Skill

### Core Workflow

1. **Load Excel builder script**: Read `scripts/excel_builder.py`

2. **Load brand guidelines**: Reference `references/brand_guidelines.md` for:
   - Fourth Blue (#0047AB) and Gray (#6B7280) color codes
   - Typography standards (Calibri, specific sizes)
   - Logo placement rules

3. **Execute generation**:
   - Use `create_fourth_branded_excel(title, data)` function
   - Apply header styling with `apply_header_style(cell)`
   - Insert logo from `assets/fourth_logo.png` in top-right
   - Follow template structure from `assets/budget_template.xlsx` if applicable

4. **Generate charts** (if requested):
   - Use `create_branded_chart(data, chart_type)` function
   - Apply Fourth color palette
   - Position according to brand guidelines

5. **Return Excel file** to user for download

### Bundled Resources

- **`scripts/excel_builder.py`**: Python script with Fourth-branded Excel generation functions using openpyxl
- **`references/brand_guidelines.md`**: Fourth brand colors, typography, and formatting standards
- **`assets/fourth_logo.png`**: Company logo for header placement
- **`assets/budget_template.xlsx`**: Pre-formatted budget template with formulas

### Examples

**Example 1: Q4 Budget Template**

Input: "Create Q4 budget template with Fourth branding"

Process:
1. Load `scripts/excel_builder.py`
2. Execute `create_fourth_branded_excel("Q4 Budget", budget_structure)`
3. Apply header styling with Fourth Blue background
4. Insert logo from `assets/fourth_logo.png` in cell H1
5. Add budget formulas for totals and variances
6. Format currency cells with accounting format

Output: `Q4_Budget_Template.xlsx` with Fourth branding, formulas, and formatting

**Example 2: Sales Dashboard**

Input: "Build sales dashboard with charts showing regional performance"

Process:
1. Load `scripts/excel_builder.py` and `references/brand_guidelines.md`
2. Create workbook with summary and detail tabs
3. Generate regional performance chart using `create_branded_chart()`
4. Apply Fourth color palette to chart series
5. Add logo and format headers

Output: `Sales_Dashboard.xlsx` with branded charts and data visualization

## Best Practices

- Always insert Fourth logo in top-right corner (typically H1 or I1)
- Use Fourth Blue (#0047AB) for headers, Fourth Gray (#6B7280) for alternating rows
- Apply accounting format to currency values
- Include data validation for input cells
- Add print settings for professional output (landscape, fit to page)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logo not displaying | Verify `assets/fourth_logo.png` exists and path is correct |
| Colors incorrect | Reference `brand_guidelines.md` for exact hex codes |
| Formulas not calculating | Check formula syntax and cell references |
| Script fails | Verify openpyxl dependency is installed: `pip install openpyxl` |
```

### C. Example: Simple Skill (No Scripts)

```markdown
---
name: meeting-notes-formatter
description: Format meeting notes into structured summaries with action items, decisions, and key discussion points. Use when users ask to organize, format, or structure meeting notes or transcripts.
---

# Meeting Notes Formatter

Format unstructured meeting notes into clear, actionable summaries.

## When to Use This Skill

Use when users provide:
- Raw meeting transcripts
- Unstructured notes from meetings
- Requests to "clean up" or "organize" meeting notes

## How to Format Meeting Notes

1. **Extract key sections**:
   - Attendees
   - Date and time
   - Main discussion topics

2. **Identify and categorize**:
   - **Decisions**: Clear choices made during meeting
   - **Action Items**: Tasks assigned with owners and due dates
   - **Key Points**: Important information discussed
   - **Open Questions**: Unresolved items needing follow-up

3. **Format output**:
```
# Meeting Summary: [Topic]
**Date**: [Date]
**Attendees**: [Names]

## Decisions Made
- [Decision 1]
- [Decision 2]

## Action Items
- [ ] [Task] - @[Owner] - Due: [Date]
- [ ] [Task] - @[Owner] - Due: [Date]

## Key Discussion Points
- [Point 1]
- [Point 2]

## Open Questions
- [Question 1]
- [Question 2]
```

## Best Practices

- Always include action item owners and due dates
- Use checkbox format for trackable action items
- Group related discussion points together
- Highlight time-sensitive items
```

### D. Platform-Specific Notes

#### Claude Code Specifics

**API Requirements (for programmatic use):**
```python
from anthropic import Anthropic

client = Anthropic(api_key="your-api-key")

# Skills require these beta headers
response = client.beta.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4096,
    betas=[
        "code-execution-2025-08-25",
        "files-api-2025-04-14",
        "skills-2025-10-02"
    ],
    container={"skills": [{"type": "anthropic", "skill_id": "xlsx"}]},
    messages=[{"role": "user", "content": "Create budget template"}]
)
```

**File Download via Files API:**
```python
# Download generated file
file_content = client.beta.files.download(file_id=response.file_id)

# Save to disk
with open("output.xlsx", "wb") as f:
    f.write(file_content)
```

**Performance Expectations:**
- Simple files: 10-30 seconds
- Complex files: 40-120 seconds
- Large presentations/spreadsheets: 1-2 minutes

#### Claude.ai Specifics

**Upload Process:**
1. Navigate to Skills section in settings
2. Upload skill `.zip` file
3. Skill becomes available immediately
4. Test with conversational request

**Activation:**
- Skills activate based on conversation context
- May need explicit mention initially: "Use my Excel template skill"
- After first use, activates automatically for similar requests

**File Handling:**
- Generated files appear in chat as downloadable attachments
- Click to download directly from conversation
- No API required

### E. Troubleshooting Guide

#### Scripts Not Executing

**Symptoms:**
- Script referenced in SKILL.md but doesn't run
- Error messages about missing files
- Script runs but produces errors

**Possible causes:**
1. **Missing dependencies**: Script requires packages not installed
2. **Incorrect paths**: Path in SKILL.md doesn't match actual file
3. **Permissions**: Script not marked as executable
4. **Syntax errors**: Script has bugs or incompatibilities

**Solutions:**
- Add dependency checks to script:
  ```python
  try:
      import openpyxl
  except ImportError:
      print("Install openpyxl: pip install openpyxl")
      exit(1)
  ```
- Verify all paths in SKILL.md match actual structure
- Use relative paths from skill root: `scripts/helper.py`
- Test scripts independently before packaging

#### Skill Not Activating (Claude Code)

**Symptoms:**
- User query should trigger skill but doesn't
- Skill never loads in conversation

**Possible causes:**
1. **Vague description**: Metadata doesn't match user's query
2. **Wrong keywords**: Missing terms users actually say
3. **Not installed**: Skill not in `.claude/skills/` directory

**Solutions:**
- Update description with specific trigger keywords
- Test with exact phrases users will say
- Verify installation: `ls ~/.claude/skills/your-skill-name/`
- Restart Claude Code session after installing skill

#### High Token Usage

**Symptoms:**
- Conversations use more tokens than expected
- Context window fills quickly

**Possible causes:**
1. **SKILL.md too long**: Instructions exceed 5k words
2. **No progressive disclosure**: All content loaded at once
3. **Duplicate information**: Same content in multiple places

**Solutions:**
- Move detailed content to `references/` files
- Keep SKILL.md under 5k words
- Eliminate duplication between SKILL.md and references
- Use scripts for code instead of including inline

---

## Additional Resources

### Official Documentation

- **Claude Code Skills**: https://docs.claude.com/en/docs/claude-code/skills
- **Skills Cookbook**: https://github.com/anthropics/claude-cookbooks/tree/main/skills
- **Files API**: https://docs.anthropic.com/en/docs/build-with-claude/files
- **Code Execution**: https://docs.anthropic.com/en/docs/build-with-claude/code-execution

### Built-in Anthropic Skills

Study these for best practices:
- **xlsx**: Excel/spreadsheet generation
- **pptx**: PowerPoint presentations
- **pdf**: PDF documents
- **docx**: Word documents

### Example Skills in This Project

- **fourth-presentation-builder**: Full-featured PowerPoint skill with brand guidelines
- **fourth-brand-guidelines**: Brand identity reference skill

---

*Version: 2.0 | Updated: 2025-10-30 | Supports Claude Code and Claude.ai with unified script execution model*