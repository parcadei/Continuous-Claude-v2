---
name: research
description: Document codebase as-is with thoughts directory for historical context
model: opus
user-invocable: false
---

# Research Codebase

Conduct comprehensive research to document the codebase AS IT EXISTS.

## CRITICAL: DOCUMENT ONLY

- DO NOT suggest improvements or changes
- DO NOT perform root cause analysis
- DO NOT propose future enhancements
- DO NOT critique implementation
- ONLY describe what exists, where, how it works, how components interact

## Process

### Step 1: Read Mentioned Files First
Use Read tool WITHOUT limit/offset to read entire files BEFORE spawning sub-tasks.

### Step 2: Decompose Research Question
- Break into composable research areas
- Create research plan with TodoWrite
- Identify relevant directories, files, patterns

### Step 3: Spawn Parallel Sub-Agents

**Codebase research:** Use `scout` agent
**Thoughts directory:** Use `thoughts-locator` then `thoughts-analyzer`
**Web research (if asked):** Use `web-search-researcher` - include LINKS
**Linear tickets:** Use `linear-ticket-reader` or `linear-searcher`

### Step 4: Wait and Synthesize
WAIT for ALL sub-agents. Prioritize live codebase over thoughts/ findings.

### Step 5: Gather Metadata
Run `hack/spec_metadata.sh`

### Step 6: Generate Document
Location: `thoughts/shared/research/YYYY-MM-DD-<description>.md`

### Step 7: Add GitHub Permalinks
If on main or pushed, create permalinks.

### Step 8: Present Findings
Concise summary with key file references.

## Path Handling

Remove ONLY "searchable/" from paths:
- `thoughts/searchable/allison/notes.md` → `thoughts/allison/notes.md`
- NEVER change allison/ to shared/ or vice versa

## References

For document template: `cat ref/research-template.md`
For agent types: `cat ref/agents.md`
