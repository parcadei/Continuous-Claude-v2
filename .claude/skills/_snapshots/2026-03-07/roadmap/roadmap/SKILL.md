# /roadmap - ROADMAP Management

<roadmap-command>

## Purpose
Manual management of ROADMAP.md sections. Use when automation hasn't captured planned items or to manually set current focus.

## Commands

### `/roadmap show`
Display current ROADMAP state with section summaries.

### `/roadmap add <item>`
Add an item to the Planned section.

**Example:**
```
/roadmap add Implement user authentication
/roadmap add "Dark mode support" --priority high
```

### `/roadmap focus <item>`
Set the Current Focus to the specified item. If item is in Planned, it gets promoted.

**Example:**
```
/roadmap focus ROADMAP Source of Truth Implementation
```

### `/roadmap complete <item>`
Move an item from Current Focus to Completed. If no item specified, completes the current goal.

**Example:**
```
/roadmap complete
/roadmap complete "User authentication"
```

## Implementation

### For `/roadmap show`:
```bash
cat ROADMAP.md
```

### For `/roadmap add <item>`:
1. Read ROADMAP.md
2. Find `## Planned` section
3. Add `- [ ] <item>` after the header
4. Write updated content

### For `/roadmap focus <item>`:
1. Read ROADMAP.md
2. If current goal exists, move to Completed with today's date
3. Set new Current Focus:
   ```markdown
   ## Current Focus

   **<item>**
   - Started: YYYY-MM-DD
   ```
4. If item was in Planned, remove it
5. Write updated content

### For `/roadmap complete [item]`:
1. Read ROADMAP.md
2. Find current goal (or match provided item)
3. Add to Completed section with date: `- [x] <item> (YYYY-MM-DD)`
4. Clear Current Focus to placeholder
5. Write updated content

## Section Format

```markdown
# Project Roadmap

## Current Focus

**<Goal Title>**
- <Description or key info>
- Started: YYYY-MM-DD

## Completed
- [x] <item> (YYYY-MM-DD)

## Planned
- [ ] <item> (priority)
```

## ROADMAP Location
Search order:
1. `$CLAUDE_PROJECT_DIR/ROADMAP.md`
2. Recursive upward from current directory
3. `~/.claude/ROADMAP.md` (fallback)

</roadmap-command>
