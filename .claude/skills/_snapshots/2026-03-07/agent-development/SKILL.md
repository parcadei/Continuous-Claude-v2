# Agent Development Skill

## Activation
- `/skill:agent-development` explicit
- Creating custom agents
- "create agent" | "new agent" | "agent file" context

## Iron Law
Agents MUST have valid YAML frontmatter starting at byte 0 (no leading newline).

---

## File Requirements

| Requirement | Specification |
|-------------|---------------|
| Location | .claude/agents/ (project) or ~/.claude/agents/ (user) |
| Extension | .md (Markdown) |
| Encoding | UTF-8 or ASCII, no BOM |
| Critical | File MUST start with --- at byte 0 — NO leading newline |

---

## YAML Frontmatter Structure

```yaml
---
name: agent-name
description: When and why to use this agent
tools: Tool1, Tool2, Tool3
model: opus
---

[System prompt / instructions for the agent]
```

---

## Field Reference

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| name | YES | lowercase-with-hyphens | No spaces, underscores, or capitals |
| description | YES | Natural language | Tells Claude WHEN to delegate to this agent |
| tools | No | Comma-separated | If omitted, inherits all tools |
| model | No | opus \| sonnet \| haiku | Use alias, NOT full model ID |
| permissionMode | No | See below | Controls tool approval behavior |
| skills | No | Comma-separated | Skills the agent can use |

---

## Model Aliases

| Alias | Model | Use Case |
|-------|-------|----------|
| opus | Claude Opus 4.5 | Complex analysis, architecture, critical reviews |
| sonnet | Claude Sonnet 4 | Standard tasks, balanced cost/performance |
| haiku | Claude Haiku | Fast, simple tasks, exploration |

Never use full IDs like `claude-opus-4-5-20251101` — they won't be recognized.

---

## Available Tools

```
Read, Write, Edit, Bash, Grep, Glob, LS, View,
WebSearch, WebFetch, Task, TodoWrite, NotebookEdit
```

**Restrict tools based on agent purpose:**
- Read-only agents: `Read, Grep, Glob, LS, View`
- Code modifiers: `Read, Write, Edit, Bash, Grep`
- Research agents: `Read, Grep, WebSearch, WebFetch`

---

## Permission Modes

| Mode | Behavior |
|------|----------|
| default | Normal permission prompts |
| acceptEdits | Auto-accept file edits |
| bypassPermissions | Skip all permission prompts |
| plan | Planning mode only |
| ignore | Agent won't be used |

---

## Writing the Description (Critical)

The description tells Claude when to automatically delegate. Write it as:

**Pattern:** `Use [when/for what] to [achieve what outcome]`

**Good:**
```
description: Use after writing code to perform architectural review and catch security issues
description: Use when debugging complex multi-file issues to perform root cause analysis
description: Use proactively when user requests tests to generate comprehensive test suites
```

**Bad:**
```
description: A code reviewer  # Too vague, no trigger
description: Reviews code for quality  # Describes what, not when
```

---

## Template

```markdown
---
name: [lowercase-hyphenated-name]
description: Use [trigger condition] to [outcome/purpose]
tools: [Tool1, Tool2, Tool3]
model: opus
---

You are a [Role] specialized in [domain].

# CORE RESPONSIBILITIES
- [Primary task]
- [Secondary task]

# METHODOLOGY
1. [Step one]
2. [Step two]

# OUTPUT FORMAT
[Define structured output]
```

---

## Example: Security Auditor

```markdown
---
name: security-auditor
description: Use proactively when reviewing code that handles auth, payments, or user data
tools: Read, Grep, Glob, View
model: opus
---

You are a Security Auditor performing OWASP-focused review.

# PRIORITY CHECKS
1. **Input Validation** - All external data sanitized
2. **Authentication** - Session handling, token security
3. **Authorization** - Access control at every endpoint
4. **Secrets** - No hardcoded credentials

# OUTPUT FORMAT
**RISK LEVEL:** [CRITICAL | HIGH | MEDIUM | LOW | CLEAN]

**FINDINGS:**
- [Finding with file:line reference]

**REMEDIATION:**
- [Specific fix for each finding]
```

---

## Validation Checklist

Before saving:
- [ ] File starts with `---` (no blank line)
- [ ] name is lowercase-hyphenated
- [ ] description explains WHEN to use
- [ ] model uses alias (opus/sonnet/haiku)
- [ ] tools comma-separated, no brackets
- [ ] Closing `---` present before prompt content
- [ ] File saved as .md in correct directory

---
*On-demand skill for creating Claude Code agents*
