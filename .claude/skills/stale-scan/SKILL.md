---
name: stale-scan
description: Scan for references to archived or deleted components across configuration files. Finds stale references that cause confusion when Claude follows outdated instructions.
allowed-tools: [Bash, Read, Grep, Glob]
metadata:
  keywords: [stale scan, stale references, dead references, stale check, archived, cleanup]
---

# Stale Reference Scanner

Scan configuration and instruction files for references to archived, deleted, or obsolete components. Stale references cause confusion when Claude follows outdated instructions pointing to things that no longer exist.

## When to Use

- "stale scan" -- run a full scan
- "stale references" -- find outdated references
- "dead references" -- find references to removed components
- "stale check" -- quick health check for reference freshness

## Workflow

### Step 1: Build the Search List

Start with the **known archived items**, then dynamically discover more.

#### Known Archived Items

| Item | Type | Why Stale |
|------|------|-----------|
| `Sentinel` | Archived agent | Was a review gate agent, now in agents/archive/ |
| `Warden` | Archived agent | Was a review gate agent, now in agents/archive/ |
| `sync-test-1769821789` | Stale test rule | Test file left behind from sync testing |
| `sync-v2-1769821904` | Stale test rule | Test file left behind from sync testing |
| `sync-v3-1769821990` | Stale test rule | Test file left behind from sync testing |

#### Dynamic Archive Detection

Discover additional archived items automatically:

```bash
# List all archived agents (add each name to the search list)
ls ~/.claude/agents/archive/*.yml ~/.claude/agents/archive/*.json 2>/dev/null | \
  sed 's/.*\///' | sed 's/\.\(yml\|json\|md\)$//'

# Also check the continuous-claude repo archive
ls ~/continuous-claude/.claude/agents/archive/*.yml \
   ~/continuous-claude/.claude/agents/archive/*.json 2>/dev/null | \
  sed 's/.*\///' | sed 's/\.\(yml\|json\|md\)$//'
```

Add every discovered name to the search list alongside the known items above.

### Step 2: Define Scan Targets

Scan these files for stale references:

**Primary targets (active configuration):**

| Path | What It Contains |
|------|-----------------|
| `~/.claude/CLAUDE.md` | Global instructions |
| `~/.claude/RULES.md` | Global constraints |
| `~/.claude/rules/*.md` | All rule files |
| `~/.claude/skills/*/SKILL.md` | All skill definitions |
| `~/.claude/agents/*.yml` | Active agent definitions (non-archive) |

**Secondary targets (repo source):**

| Path | What It Contains |
|------|-----------------|
| `~/continuous-claude/CLAUDE.md` | Repo-level instructions |
| `~/continuous-claude/.claude/CLAUDE.md` | Project instructions |
| `~/continuous-claude/.claude/rules/*.md` | Repo rule files |
| `~/continuous-claude/.claude/skills/*/SKILL.md` | Repo skill definitions |
| `~/continuous-claude/.claude/agents/*.yml` | Repo agent definitions |

Use `$HOME` or absolute paths (e.g., `C:/Users/david.hayes`) on Windows -- never bare `/Users/`.

### Step 3: Execute the Scan

For each item in the search list, use Grep across all scan targets.

**Per-item scan pattern:**

```bash
# Scan primary targets for "Sentinel" (repeat for each archived item)
grep -rn "Sentinel" \
  ~/.claude/CLAUDE.md \
  ~/.claude/RULES.md \
  ~/.claude/rules/ \
  ~/.claude/skills/*/SKILL.md \
  ~/.claude/agents/*.yml \
  2>/dev/null

# Scan secondary targets
grep -rn "Sentinel" \
  ~/continuous-claude/CLAUDE.md \
  ~/continuous-claude/.claude/CLAUDE.md \
  ~/continuous-claude/.claude/rules/ \
  ~/continuous-claude/.claude/skills/*/SKILL.md \
  ~/continuous-claude/.claude/agents/*.yml \
  2>/dev/null
```

Or use the Claude Code Grep tool for each item:

```
Grep pattern="Sentinel" path="~/.claude" glob="*.md"
Grep pattern="Sentinel" path="~/.claude/agents" glob="*.yml"
```

**Exclude from results:**
- The stale-scan SKILL.md itself (it references items by design)
- Files inside `agents/archive/` (they are the archived items)
- The test file `stale-scan-skill.test.ts`

### Step 4: Compile the Report

Present findings in this format:

```
Stale Reference Report
======================
Found N stale references across M files:

| File | Line | Reference | Context | Suggested Fix |
|------|------|-----------|---------|---------------|
| CLAUDE.md | 42 | Sentinel | "Sentinel reviews Architect plans" | Remove or update to current review process |
| RULES.md | 105 | Warden | "Warden reviews Phoenix plans" | Remove -- no review gate agent active |
| rules/sync-test-1769821789.md | 1 | sync-test-1769821789 | Entire file is stale test artifact | Delete entire file |

No stale references found: [list any searched items with zero hits]
```

**For each finding, include:**
- **File**: relative path from `~/.claude/` or `continuous-claude/`
- **Line**: line number where the reference appears
- **Reference**: the archived/stale item name
- **Context**: surrounding text (trimmed to ~60 chars)
- **Suggested Fix**: specific action (remove line, update text, delete file, etc.)

### Step 5: Offer Fixes (User Confirmation Required)

After presenting the report, offer to fix each finding.

**Rules for fixes:**
- Never auto-fix without asking -- always require user confirmation
- Present each fix as a specific action: "Remove line 42 from CLAUDE.md?"
- Group related fixes: "Remove all 3 Sentinel references?"
- For stale test rule files, suggest deletion of the entire file
- For text references, suggest specific replacement text or line removal

**Fix categories:**

| Category | Action | Confirmation |
|----------|--------|--------------|
| Stale rule file | Delete entire file | "Delete rules/sync-test-1769821789.md?" |
| Text reference | Remove or rewrite line | "Remove line 42 from CLAUDE.md?" |
| Agent reference | Update to current agent | "Replace Sentinel with current review process?" |
| Multiple refs | Batch fix | "Fix all N references to [item]?" |

Do not apply any fixes until the user explicitly confirms.

## Edge Cases

- **False positives**: "Sentinel" or "Warden" might appear in legitimate contexts (e.g., documentation about the archive itself). Read the surrounding context before flagging.
- **Partial matches**: Search for exact names. "sentinel" (lowercase) in prose may not be a reference to the agent.
- **Cross-platform paths**: On Windows, use `C:/Users/david.hayes/.claude/` not `~/.claude/` in Bash commands. The Grep tool handles `~` expansion.

## Quick Run

For a fast scan without dynamic detection:

```bash
# One-liner: scan known stale items across primary targets
for item in Sentinel Warden sync-test-1769821789 sync-v2-1769821904 sync-v3-1769821990; do
  echo "=== $item ==="
  grep -rn "$item" ~/.claude/CLAUDE.md ~/.claude/RULES.md ~/.claude/rules/ \
    ~/.claude/skills/*/SKILL.md ~/.claude/agents/*.yml 2>/dev/null | \
    grep -v "stale-scan/SKILL.md" | grep -v "agents/archive/"
done
```
