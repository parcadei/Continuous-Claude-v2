---
name: date-logic-management
description: Parse natural language date expressions into exact ISO 8601 timestamps using deterministic system date utilities
---

# Date Logic Management Skill

**Version:** 1.0.0
**Purpose:** Parse natural language date expressions into exact ISO 8601 timestamps using system date commands.

---

## When to Use This Skill

**Trigger Patterns** — invoke whenever a user query contains:

- "last week", "this week", "next week"
- "yesterday", "today", "tomorrow"
- "last [day name]" (e.g., "last Tuesday", "last Friday")
- "this month", "last month", "next month"
- "Q1", "Q2", "Q3", "Q4"
- Any date-dependent query (M365, calendar, tasks, documents)

---

## Core Rule

**NEVER let the LLM do date math. Always use system date utilities via Bash tool.**

---

## Output Format

Return structured JSON in this exact shape:

```json
{
  "start_iso": "2025-10-27T00:00:00Z",
  "end_iso": "2025-10-31T23:59:59Z",
  "description": "Work week: Monday, October 27 - Friday, October 31, 2025",
  "duration_days": 5,
  "week_type": "work",
  "date_expression": "last week",
  "calculation_method": "system_date_utility"
}
```

**Fields:**
- `start_iso` / `end_iso`: ISO 8601, always `00:00:00Z` / `23:59:59Z`
- `week_type`: `"work"` (Mon-Fri) | `"calendar"` (Mon-Sun) | `"single"` (one day)
- `calculation_method`: Always `"system_date_utility"` (or `"absolute_date"` for explicit dates)

---

## Workflow

### Step 1: Identify Date Expression

Parse the natural language expression from the user query. Default interpretation for "last week" is work week (Mon-Fri).

### Step 2: Run Bash Date Command

Use the appropriate pattern from [references/examples.md](references/examples.md). Never calculate manually.

### Step 3: Format as JSON

Build the JSON output with all required fields. Compute `duration_days` from the date range.

### Step 4: Confirm with User

```
I've calculated "last week":

Work Week (Mon-Fri):
- Monday, October 27, 2025 00:00 UTC
- to Friday, October 31, 2025 23:59 UTC
- Duration: 5 days

Is this correct?
- Reply "Yes" to proceed
- Reply "Calendar week" for Mon-Sun (7 days)
- Reply "No" to specify different dates
```

### Step 5: Pass to Next Skill

Once confirmed, pass the JSON to the requesting skill (M365, Google Calendar, etc.).

---

## Date Expression Quick Reference

| Expression | Interpretation | Bash Pattern |
|-----------|---------------|-------------|
| "yesterday" | Previous day | `date -d "yesterday"` |
| "today" | Current day | `date -d "today"` |
| "tomorrow" | Next day | `date -d "tomorrow"` |
| "last week" | Prev Mon-Fri (default) | Current Monday − 7 days, +4 for Friday |
| "this week" | Current Mon-Fri | Last Monday, +4 for Friday |
| "last Tuesday" | Tuesday of last week | Last week Monday + 1 day |
| "this month" | 1st to last of month | First day of month → last day |
| "last month" | Previous month | First day − 1 month → last day of prev |
| "Q1" | Jan 1 – Mar 31 | Current year + quarter months |
| "Q2" | Apr 1 – Jun 30 | |
| "Q3" | Jul 1 – Sep 30 | |
| "Q4" | Oct 1 – Dec 31 | |

See [references/examples.md](references/examples.md) for the full bash commands for each pattern.

---

## Ambiguity Handling

### "last week" — Work Week vs Calendar Week

**Default:** Work week (Mon-Fri, 5 days)

If user says "full week" → recalculate with Sunday as end day and return calendar week JSON.

### "last [day]" — Day of Last Week vs Most Recent

**Always:** Day of **last week**, not the most recent occurrence.

```
Today: Thursday, November 5, 2025
User: "last Tuesday"
→ Return: Tuesday, October 28, 2025 (last week)
→ NOT: November 4, 2025 (most recent Tuesday)
```

If user wants the most recent: "most recent Tuesday" or "the last Tuesday that happened."

### Day Offsets from Last Week Monday

- Monday: +0 days
- Tuesday: +1 day
- Wednesday: +2 days
- Thursday: +3 days
- Friday: +4 days
- Saturday: +5 days
- Sunday: +6 days

---

## Error Handling

### Unclear Expression

```
User: "meetings from sometime last week"

Response: "Did you mean:
- Last week (work week: Mon-Fri)
- Last week (full week: Mon-Sun)
- A specific day last week (e.g., last Tuesday)

Please clarify."
```

### Failed Date Command

```
Error: date: invalid date 'xyz'

Response: "Couldn't parse '[expression]'. Please use:
yesterday, today, tomorrow / last week / last [day] / this month / Q1-Q4"
```

### Absolute Date Provided

```
User: "meetings on October 28, 2025"
→ Parse directly, no bash needed, set week_type: "single", calculation_method: "absolute_date"
```

---

## Integration

This skill runs **first** whenever any date-dependent query is made.

```
User: "Show me meetings from last week"
  ↓
1. Date Logic Management → calculates dates → confirms with user
  ↓
2. M365 Skill → uses start_iso / end_iso for API calls
```

**Skills that depend on this:**
- M365 Skill (meetings, emails, documents)
- Google Calendar Skill
- Todoist / Task Management Skills
- Any skill requiring date ranges

---

## Iron Laws

1. **ALWAYS** use Bash tool for date calculations
2. **NEVER** do date arithmetic yourself
3. **DEFAULT** to work week (Mon-Fri) for "last week"
4. **"last [day]"** means day of last week, not most recent
5. **ALWAYS** confirm with user before passing to other skills
6. **Return** structured JSON in exact format specified
7. **All timestamps in UTC** (Z suffix)

---

*Date Logic Management Skill v1.0.0 — Deterministic. Accurate. Reliable.*
