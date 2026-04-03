# How to Talk to Claude

**You don't need to memorize slash commands.** Just describe what you want naturally.

## The Skill Activation System

When you send a message, a hook injects context that tells **Claude** which skills and agents are relevant. Claude infers from a rule-based system and decides which tools to use.

### What Claude Sees

```
> "Fix the login bug in auth.py"

🎯 SKILL ACTIVATION CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ CRITICAL SKILLS (REQUIRED):
  → create_handoff

📚 RECOMMENDED SKILLS:
  → fix
  → debug

🤖 RECOMMENDED AGENTS (token-efficient):
  → debug-agent
  → scout

ACTION: Use Skill tool BEFORE responding
ACTION: Use Task tool with agent for exploration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### How It Works

The skill activation system uses two matching strategies:

| Strategy            | What It Matches                                   | Confidence                                   |
| ------------------- | ------------------------------------------------- | -------------------------------------------- |
| **Keywords**        | Simple words like "fix", "debug", "broken"        | Medium (validated to reduce false positives) |
| **Intent Patterns** | Regex patterns like `"fix.*?(bug\|error\|issue)"` | High (strong signal)                         |

**Priority Levels:**

- ⚠️ **CRITICAL** - Must use (e.g., handoffs before ending session)
- 📚 **RECOMMENDED** - Should use (e.g., workflow skills)
- 💡 **SUGGESTED** - Consider using (e.g., optimization tools)
- 📌 **OPTIONAL** - Nice to have (e.g., documentation helpers)

**Ambiguous Match Filtering:**

Some keywords (like "test", "plan", "research") can appear in casual conversation. The system flags these for validation:

```
❓ AMBIGUOUS MATCHES (validate before activating):
   The following skills matched on keywords that may be used
   in a non-technical context. Consider if they're needed:

   • test [skill]
     Matched: "test" (keyword match)
     Purpose: Testing workflow - unit tests ∥ integration tests → E2E tests
     → Skip if the user is NOT asking for this functionality

   VALIDATION: Before activating these, ask yourself:
   "Is the user asking for this skill's capability, or just
    using the word in everyday language?"
```

This reduces false positives by 80% compared to naive keyword matching.

### Context Warnings

When your context usage hits thresholds, you'll see tiered warnings:

| Context % | Warning Level | Action                                             |
| --------- | ------------- | -------------------------------------------------- |
| 70-79%    | Notice        | "Consider handoff when you reach a stopping point" |
| 80-89%    | Warning       | "Recommend: /create_handoff then /clear soon"      |
| 90%+      | **CRITICAL**  | "Run /create_handoff NOW before auto-compact!"     |

These ensure you preserve state before Claude Code's automatic compaction.

## Natural Language Examples

| What You Say                          | What Activates                            |
| ------------------------------------- | ----------------------------------------- |
| "Fix the broken login"                | `/fix` workflow → debug-agent, scout      |
| "Build a user dashboard"              | `/build` workflow → plan-agent, kraken    |
| "I want to understand this codebase"  | `/explore` + scout agent                  |
| "What could go wrong with this plan?" | `/premortem`                              |
| "Help me figure out what I need"      | `/discovery-interview`                    |
| "Done for today"                      | `create_handoff` (critical)               |
| "Resume where we left off"            | `resume_handoff`                          |
| "Research auth patterns"              | oracle agent + nia/perplexity             |
| "How does this function work?"        | tldr-code → call graph, CFG, DFG          |
| "Find all usages of this API"         | scout agent + ast-grep                    |
| "Run all tests"                       | `/test` workflow → arbiter                |
| "Check code quality"                  | `qlty-check`                              |
| "Search for 'TODO'"                   | morph-search (20x faster than grep)       |
| "Refactor this module"                | `/refactor` workflow                      |
| "Ready to release"                    | `/release` workflow → security, E2E, docs |

## Why This Approach?

### More Discoverable

You don't need to know that `/premortem` exists. Just say "what could go wrong?" and the system suggests it.

### Context-Aware

The system knows when you're 90% through context and **blocks** to require a handoff. Guardrails prevent state loss.

### Reduces Cognitive Load

Instead of remembering 109 skills:

- Describe intent naturally
- Get curated suggestions
- Confirm or adjust

### Still Supports Power Users

You can still type `/fix`, `/build`, etc. directly. The system recognizes both patterns.

## Skill vs Workflow vs Agent

| Type         | Purpose                          | Example                                                         |
| ------------ | -------------------------------- | --------------------------------------------------------------- |
| **Skill**    | Single-purpose tool or reference | `commit`, `tldr-code`, `qlty-check`                             |
| **Workflow** | Multi-step process               | `/fix` (scout → premortem → spark → arbiter)                    |
| **Agent**    | Specialized sub-session          | scout (exploration), oracle (research), kraken (implementation) |

The activation system suggests all three based on your intent.

## Configuration

Skills and agents are defined in `.claude/skills/skill-rules.json`:

```json
{
  "skills": {
    "fix": {
      "type": "workflow",
      "enforcement": "suggest",
      "priority": "high",
      "description": "Bug investigation and resolution workflow",
      "promptTriggers": {
        "keywords": ["/fix", "fix the bug", "broken", "not working"],
        "intentPatterns": ["fix.*?(bug|error|issue)", "(broken|not working)"]
      }
    }
  }
}
```

### Add Your Own Triggers

To make a skill activate on custom phrases:

1. Edit `.claude/skills/skill-rules.json`
2. Add keywords or regex patterns to `promptTriggers`
3. The hook picks them up automatically (no restart needed)

## Pattern Inference (Advanced)

For complex tasks, the system runs **pattern inference** using the Agentica module to detect if your work matches known agent patterns (swarm, hierarchical, pipeline, etc.):

```
==================================================
AGENTICA PATTERN INFERENCE
==================================================

SUGGESTED APPROACH:
  Agent: kraken
  Pattern: Hierarchical multi-phase implementation
  Confidence: 87%

ACTION: Use AskUserQuestion to confirm before spawning:
  "I'll use kraken to implement feature X. Proceed?"
  Options: [Yes, proceed] [Different approach] [Let me explain more]

Alternative approaches available: pipeline, map_reduce
==================================================
```

This helps choose the right orchestration strategy for multi-agent workflows.

## Tips for Best Results

1. **Be specific about your goal**: "Fix the auth bug" is better than "something's wrong"
2. **Mention the domain**: "Build a React component" vs "Build something" → triggers different skills
3. **Use natural language**: "What could break?" is as good as "/premortem"
4. **Trust the suggestions**: If it says "CRITICAL", follow the guidance
5. **Iterate**: Start with "help me approach X" to get workflow suggestions

## Customization

You can adjust enforcement levels in `skill-rules.json`:

| Enforcement | Behavior                                     |
| ----------- | -------------------------------------------- |
| `"block"`   | Must use skill before proceeding (guardrail) |
| `"suggest"` | Shows suggestion but doesn't block           |
| `"warn"`    | Shows warning, allows proceeding             |

Example: Make handoffs mandatory at 85% context instead of 90%:

```json
{
  "create_handoff": {
    "enforcement": "block", // ← Changed from "suggest"
    "priority": "critical"
  }
}
```

Then adjust the threshold in `.claude/hooks/src/skill-activation-prompt.ts` (line 443).

## Behind the Scenes

The complete flow:

1. **You type**: "Fix the broken login"
2. **UserPromptSubmit hook fires**: Reads your message before Claude sees it
3. **Pattern matching**: Checks 109 skills + 49 agents against keywords/intent
4. **Validation**: Filters ambiguous matches (e.g., "test" in casual speech)
5. **Priority sorting**: Groups by CRITICAL → RECOMMENDED → SUGGESTED → OPTIONAL
6. **Context check**: Reads temp file from status.py for usage %
7. **Resource check**: Checks active agent count vs limit
8. **Output injected**: Suggestions appear above Claude's response
9. **Claude responds**: With skill/agent recommendations in context

This happens in **~50ms** and costs **zero tokens** (pre-prompt injection).

---

**Next:** [Quick Start](#quick-start) | [Skills System](#skills-system) | [Workflows](#workflows)
