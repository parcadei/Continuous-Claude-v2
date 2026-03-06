# Skill Authoring Guide

Detailed examples, templates, and troubleshooting extracted from the skill creation process. Read this file when you need worked examples or platform-specific API details.

---

## A. Skill Template

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

---

## B. Example: Excel Skill (with scripts)

```markdown
---
name: fourth-excel-templates
description: Generate Fourth-branded Excel reports with company formatting, colors, fonts, formulas, and logo placement. Use when users request financial reports, budget templates, sales dashboards, or data analysis spreadsheets following Fourth brand standards.
---

# Fourth Excel Templates

Generate professional Excel reports and dashboards using Fourth's brand guidelines.

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

Output: `Q4_Budget_Template.xlsx` with Fourth branding, formulas, and formatting
```

---

## C. Example: Simple Skill (no scripts)

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

1. **Extract key sections**: Attendees, date/time, main discussion topics

2. **Identify and categorize**:
   - **Decisions**: Clear choices made during meeting
   - **Action Items**: Tasks assigned with owners and due dates
   - **Key Points**: Important information discussed
   - **Open Questions**: Unresolved items needing follow-up

3. **Format output** using this template:

# Meeting Summary: [Topic]
**Date**: [Date]
**Attendees**: [Names]

## Decisions Made
- [Decision 1]

## Action Items
- [ ] [Task] - @[Owner] - Due: [Date]

## Key Discussion Points
- [Point 1]

## Open Questions
- [Question 1]

## Best Practices

- Always include action item owners and due dates
- Use checkbox format for trackable action items
- Group related discussion points together
- Highlight time-sensitive items
```

---

## D. Platform API Details

### Claude Code API Requirements (programmatic use)

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

### File Download via Files API

```python
file_content = client.beta.files.download(file_id=response.file_id)

with open("output.xlsx", "wb") as f:
    f.write(file_content)
```

### Performance Expectations

| File type | Time |
|-----------|------|
| Simple files | 10-30 seconds |
| Complex files | 40-120 seconds |
| Large presentations/spreadsheets | 1-2 minutes |

### Claude.ai Upload Process

1. Navigate to Skills section in settings
2. Upload skill `.zip` or `.skill` file
3. Skill becomes available immediately
4. Test with conversational request

Skills activate based on conversation context. May need explicit mention initially: "Use my Excel template skill". After first use, activates automatically for similar requests.

---

## E. Troubleshooting Guide

### Scripts Not Executing

**Symptoms:** Script referenced in SKILL.md but doesn't run, error messages about missing files, or script runs with errors.

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

### Skill Not Activating (Claude Code)

**Symptoms:** User query should trigger skill but doesn't.

**Solutions:**
- Update description with specific trigger keywords
- Test with exact phrases users will say
- Verify installation: `ls ~/.claude/skills/your-skill-name/`
- Restart Claude Code session after installing skill

### High Token Usage

**Symptoms:** Conversations use more tokens than expected, context fills quickly.

**Solutions:**
- Move detailed content to `references/` files
- Keep SKILL.md under 500 lines (~5k words)
- Eliminate duplication between SKILL.md and references
- Use scripts for code instead of including inline

### Common Issues Quick Reference

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| Skill doesn't activate | Vague description | Add specific keywords and trigger patterns |
| Scripts fail to execute | Missing dependencies | Add dependency checks and error messages |
| High token usage | SKILL.md too long | Move content to `references/` |
| Resources not found | Wrong file paths | Verify paths match actual structure |
| Inconsistent outputs | Missing examples | Add more specific examples and edge cases |
