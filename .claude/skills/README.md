# Claude Code Skills Integration

**Purpose:** Demonstrate proper Claude Code Skills integration with MCP workflow automation.

---

## Structure

This directory contains Skills in Claude Code's native format:

```
.claude/skills/
├── simple-fetch/
│   ├── SKILL.md        # Claude Code Skills format (YAML + markdown)
│   └── workflow.py     # Executable Python workflow
└── multi-tool-pipeline/
    ├── SKILL.md        # Claude Code Skills format
    └── workflow.py     # Executable Python workflow
```

## Claude Code Skills Format

Each Skill directory contains:

**1. SKILL.md (Required)**

- YAML frontmatter with `name` and `description`
- Markdown instructions for Claude to follow
- References to workflow.py with CLI usage

**2. workflow.py (Implementation)**

- Python script with argparse CLI
- MCP tool orchestration code
- Returns structured results

## How Claude Code Discovers These

**Automatic discovery:**
Claude Code scans `.claude/skills/` and finds:

- simple-fetch
- multi-tool-pipeline

**When triggered:**

1. Claude reads SKILL.md
2. Follows instructions
3. Executes workflow.py with appropriate CLI args
4. Returns results

## Skills vs Scripts

**`.claude/skills/`** (This directory):

- Claude Code Skills format (discoverable by Claude)
- SKILL.md with YAML frontmatter
- Claude Code validation rules

**`../../skills/`** (Parent directory):

- Python CLI workflow scripts
- Can be executed standalone
- Referenced by Skills

**Integration:**

- Skills wrap workflows for Claude Code discovery
- Workflows can be used with or without Skills wrapper
- Best of both: Claude's framework + our execution efficiency

## Generic Examples Included

**simple-fetch:**

- Basic single-tool pattern
- Template for simple workflows
- Demonstrates CLI argument pattern

**multi-tool-pipeline:**

- Multi-tool chaining pattern
- Template for complex workflows
- Shows sequential execution

## Creating Custom Skills

1. Write Python workflow in `../../skills/`
2. Create directory here: `.claude/skills/your-skill-name/`
3. Write SKILL.md with proper format
4. Link or copy workflow as workflow.py
5. Test with Claude Code

## Validation Rules

Skills must pass Claude Code validation:

- `name`: lowercase letters, numbers, hyphens only (max 64 chars)
- `description`: non-empty (max 1024 chars)
- No XML tags
- No reserved words

## Documentation

- Individual SKILL.md files - Specific skill documentation
- ../../skills/SKILLS.md - Workflow system guide
- ../../README.md - Complete project documentation
