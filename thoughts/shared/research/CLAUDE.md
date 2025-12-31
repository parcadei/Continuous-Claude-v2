# Research Documents - Codebase Analysis

The `research/` directory contains comprehensive documentation of existing code, patterns, and architecture.

## Purpose

Research documents:
- Answer specific questions about the codebase
- Document how systems currently work
- Capture architectural patterns and conventions
- Provide historical context for decision-making
- Enable informed planning before implementation

## Format & Naming

**Filename**: `YYYY-MM-DD-ENG-XXXX-description.md`
- `YYYY-MM-DD` - Research completion date
- `ENG-XXXX` - Ticket number (optional)
- `description` - Research topic in kebab-case

## Document Structure

1. **YAML Frontmatter** - date, researcher, git_commit, branch, topic, tags
2. **Research Question** - Original query that sparked research
3. **Summary** - High-level answer
4. **Detailed Findings** - By component/area with file:line refs
5. **Code References** - Specific file:line for navigation
6. **Architecture Documentation** - Current patterns found
7. **Historical Context** - From thoughts/ directory
8. **Related Research** - Links to other research docs
9. **Open Questions** - Areas needing further investigation

## Usage

```bash
# Create research
/research

# Reference in plans
Related research: thoughts/shared/research/YYYY-MM-DD-description.md
```

## Guidelines

- Document what IS, not what SHOULD BE
- Use `file:line` references exclusively (avoid code blocks)
- Cross-reference freely to other docs
- No evaluations or recommendations
- Be specific about component connections
- Include temporal context (commit, branch, date)
