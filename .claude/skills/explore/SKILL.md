---
name: explore
description: Explore codebase structure and understand architecture
user-invocable: true
---

# Explore

Explore codebase structure, understand architecture, find patterns.

## Usage

```
/explore                  # General exploration
/explore <path>          # Explore specific directory
/explore <pattern>       # Find files matching pattern
```

## Exploration Modes

### Directory Structure
```bash
find . -type d -maxdepth 3 | head -50
tree -L 2 -d
```

### File Patterns
```bash
find . -name "*.ts" -type f | head -30
find . -name "*test*" -type f
```

### Code Search
```bash
grep -r "pattern" --include="*.ts"
ast-grep --pattern '$FUNC($$$)' src/
```

## What to Look For

**Entry Points:**
- main.ts, index.ts, app.ts
- package.json scripts
- CLI entry points

**Architecture:**
- Directory structure conventions
- Module organization
- Dependency patterns

**Patterns:**
- Error handling
- Logging
- Testing setup
- Configuration

## Output Format

```markdown
## Codebase Overview

### Structure
- `src/` - Main source code
- `tests/` - Test files
- `scripts/` - Build/utility scripts

### Key Files
- `src/index.ts` - Entry point
- `src/config.ts` - Configuration

### Patterns Observed
- [Pattern 1]
- [Pattern 2]

### Questions for Further Investigation
- [Question 1]
```

## References

For search patterns: `cat ref/search-patterns.md`
For architecture checklists: `cat ref/architecture.md`
