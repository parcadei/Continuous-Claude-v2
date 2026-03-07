---
name: date-logic-management
description: Parse natural language date expressions into exact ISO 8601 timestamps using deterministic system date utilities
---

# Date Logic Management Skill

**Version:** 1.0.0
**Purpose:** Parse natural language date expressions into exact ISO 8601 timestamps using deterministic system date utilities.

---

## Overview

This skill converts natural language date expressions (e.g., "last week", "yesterday", "last Tuesday") into precise ISO 8601 timestamps using system date commands. It provides 100% accuracy by avoiding LLM-based date arithmetic.

**Key Principle:** Never let the LLM do date math. Always use system date utilities.

---

## When to Use This Skill

**Trigger Patterns:**

You should invoke this skill whenever a user query contains temporal references:

- "last week", "this week", "next week"
- "yesterday", "today", "tomorrow"
- "last [day name]" (e.g., "last Tuesday", "last Friday")
- "this month", "last month", "next month"
- "Q1", "Q2", "Q3", "Q4"
- Any date-related query that requires M365 data

**Example Queries That Need This Skill:**
- "meetings last week"
- "emails from yesterday"
- "documents this month"
- "calendar events last Tuesday"
- "all Q4 reports"

---

## Your Role

1. **Identify** the date expression in user's query
2. **Use system date commands** to calculate exact dates (via Bash tool)
3. **Validate** the calculated dates
4. **Format** as structured JSON output
5. **Confirm** with user before passing to other skills

---

## Date Calculation Method

### Use System Date Utilities (100% Accurate)

**CRITICAL:** Always use the Bash tool to run date commands. Never calculate dates yourself.

### Common Date Patterns

#### 1. "yesterday"

```bash
date -d "yesterday" +"%Y-%m-%dT00:00:00Z" && date -d "yesterday" +"%Y-%m-%dT23:59:59Z"
```

#### 2. "today"

```bash
date -d "today" +"%Y-%m-%dT00:00:00Z" && date -d "today" +"%Y-%m-%dT23:59:59Z"
```

#### 3. "tomorrow"

```bash
date -d "tomorrow" +"%Y-%m-%dT00:00:00Z" && date -d "tomorrow" +"%Y-%m-%dT23:59:59Z"
```

#### 4. "last week" (work week: Mon-Fri)

```bash
# Calculate current Monday
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")

# Go back 7 days to get last week Monday
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")

# Get Friday of last week (work week)
LAST_WEEK_FRIDAY=$(date -d "$LAST_WEEK_MONDAY +4 days" +"%Y-%m-%d")

# Format as ISO 8601
echo "${LAST_WEEK_MONDAY}T00:00:00Z"
echo "${LAST_WEEK_FRIDAY}T23:59:59Z"
```

#### 5. "last week" (calendar week: Mon-Sun)

```bash
# Calculate current Monday
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")

# Go back 7 days to get last week Monday
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")

# Get Sunday of last week (calendar week)
LAST_WEEK_SUNDAY=$(date -d "$LAST_WEEK_MONDAY +6 days" +"%Y-%m-%d")

# Format as ISO 8601
echo "${LAST_WEEK_MONDAY}T00:00:00Z"
echo "${LAST_WEEK_SUNDAY}T23:59:59Z"
```

#### 6. "this week" (work week: Mon-Fri)

```bash
# Get current week Monday
THIS_MONDAY=$(date -d "last monday" +"%Y-%m-%d")

# Get Friday of this week
THIS_FRIDAY=$(date -d "$THIS_MONDAY +4 days" +"%Y-%m-%d")

# Format as ISO 8601
echo "${THIS_MONDAY}T00:00:00Z"
echo "${THIS_FRIDAY}T23:59:59Z"
```

#### 7. "last [day name]" (e.g., "last Tuesday")

**CRITICAL:** "last Tuesday" means Tuesday of last week, NOT most recent Tuesday.

```bash
# Calculate current Monday
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")

# Calculate last week Monday
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")

# For Tuesday: add 1 day
LAST_TUESDAY=$(date -d "$LAST_WEEK_MONDAY +1 day" +"%Y-%m-%d")

# For Wednesday: add 2 days
# For Thursday: add 3 days
# For Friday: add 4 days
# For Saturday: add 5 days
# For Sunday: add 6 days

# Format as ISO 8601
echo "${LAST_TUESDAY}T00:00:00Z"
echo "${LAST_TUESDAY}T23:59:59Z"
```

**Day Offsets:**
- Monday: +0 days
- Tuesday: +1 day
- Wednesday: +2 days
- Thursday: +3 days
- Friday: +4 days
- Saturday: +5 days
- Sunday: +6 days

#### 8. "this month"

```bash
# First day of current month
MONTH_START=$(date -d "$(date +%Y-%m-01)" +"%Y-%m-%dT00:00:00Z")

# Last day of current month
MONTH_END=$(date -d "$(date +%Y-%m-01) +1 month -1 day" +"%Y-%m-%dT23:59:59Z")

echo "$MONTH_START"
echo "$MONTH_END"
```

#### 9. "last month"

```bash
# First day of last month
LAST_MONTH_START=$(date -d "$(date +%Y-%m-01) -1 month" +"%Y-%m-%dT00:00:00Z")

# Last day of last month
LAST_MONTH_END=$(date -d "$(date +%Y-%m-01) -1 day" +"%Y-%m-%dT23:59:59Z")

echo "$LAST_MONTH_START"
echo "$LAST_MONTH_END"
```

#### 10. "Q1", "Q2", "Q3", "Q4"

```bash
# Q1 (Jan-Mar)
Q1_START="$(date +%Y)-01-01T00:00:00Z"
Q1_END="$(date +%Y)-03-31T23:59:59Z"

# Q2 (Apr-Jun)
Q2_START="$(date +%Y)-04-01T00:00:00Z"
Q2_END="$(date +%Y)-06-30T23:59:59Z"

# Q3 (Jul-Sep)
Q3_START="$(date +%Y)-07-01T00:00:00Z"
Q3_END="$(date +%Y)-09-30T23:59:59Z"

# Q4 (Oct-Dec)
Q4_START="$(date +%Y)-10-01T00:00:00Z"
Q4_END="$(date +%Y)-12-31T23:59:59Z"
```

---

## Output Format

**YOU MUST return structured JSON in this exact format:**

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

**Field Definitions:**

- **start_iso**: ISO 8601 timestamp for start (always 00:00:00Z)
- **end_iso**: ISO 8601 timestamp for end (always 23:59:59Z)
- **description**: Human-readable description of the date range
- **duration_days**: Number of days in range (integer)
- **week_type**: "work" (Mon-Fri), "calendar" (Mon-Sun), or "single" (one day)
- **date_expression**: The original natural language expression
- **calculation_method**: Always "system_date_utility"

---

## Workflow

### Step 1: Identify Date Expression

```
User: "Show me meetings from last week"

Identified expression: "last week"
Default interpretation: Work week (Mon-Fri)
```

### Step 2: Use Bash Tool to Calculate

```bash
# Run date commands via Bash tool
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")
LAST_WEEK_FRIDAY=$(date -d "$LAST_WEEK_MONDAY +4 days" +"%Y-%m-%d")
START="${LAST_WEEK_MONDAY}T00:00:00Z"
END="${LAST_WEEK_FRIDAY}T23:59:59Z"
```

### Step 3: Format as JSON

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

### Step 4: Confirm with User

```
I've calculated the date range for "last week":

**Work Week (Mon-Fri):**
- Monday, October 27, 2025 00:00 UTC
- to Friday, October 31, 2025 23:59 UTC
- Duration: 5 days

Is this correct?
- Reply "Yes" to proceed
- Reply "Calendar week" if you want Mon-Sun (7 days)
- Reply "No" to specify different dates
```

### Step 5: Pass to Next Skill

Once user confirms, pass the JSON output to the requesting skill (e.g., M365 Skill).

---

## Ambiguity Handling

### "last week" - Work Week vs Calendar Week

**Default:** Work week (Mon-Fri)

**If user wants calendar week:**
```
User: "I want the full week"
→ Recalculate with Sunday as end day
→ Return calendar week JSON
```

### "last [day]" - Day of Last Week vs Most Recent

**Always:** Day of last week

**Example:**
```
Today: Thursday, November 5, 2025
User: "last Tuesday"
→ Return: Tuesday, October 28, 2025 (Tuesday of last week)
→ NOT: November 4, 2025 (yesterday, most recent Tuesday)
```

If user wants most recent occurrence, they should say "most recent Tuesday" or "the last Tuesday that happened."

---

## Edge Cases

### Year Boundaries

```bash
# If today is January 5, 2026
# "last week" should span Dec 29, 2025 - Jan 2, 2026

CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
# Returns: 2026-01-05

LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")
# Returns: 2025-12-29 (crosses year boundary correctly)
```

### Leap Years

System date utilities handle leap years automatically. No special logic needed.

### Timezones

All dates returned are in UTC (Z suffix). The consuming skill is responsible for timezone conversion if needed.

---

## Error Handling

### If Date Expression is Unclear

```
User: "meetings from sometime last week"

Response:
"I need a more specific date range. Did you mean:
- Last week (work week: Mon-Fri)
- Last week (full week: Mon-Sun)
- A specific day last week (e.g., last Tuesday)

Please clarify."
```

### If System Date Command Fails

```bash
# If date command returns error
Error: "date: invalid date 'xyz'"

Response:
"I couldn't parse the date expression '[expression]'.
Please provide a date in a format like:
- yesterday, today, tomorrow
- last week, this week, next week
- last [day name] (e.g., last Tuesday)
- this month, last month
- Q1, Q2, Q3, Q4"
```

### If User Provides Absolute Dates

```
User: "meetings on October 28, 2025"

Response: Parse absolute date directly:
{
  "start_iso": "2025-10-28T00:00:00Z",
  "end_iso": "2025-10-28T23:59:59Z",
  "description": "Tuesday, October 28, 2025",
  "duration_days": 1,
  "week_type": "single",
  "date_expression": "October 28, 2025",
  "calculation_method": "absolute_date"
}
```

---

## Testing Your Calculations

### Quick Verification Script

```bash
# Test "last week" calculation
echo "Testing 'last week' (work week)..."
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")
LAST_WEEK_FRIDAY=$(date -d "$LAST_WEEK_MONDAY +4 days" +"%Y-%m-%d")
echo "Start: ${LAST_WEEK_MONDAY}T00:00:00Z"
echo "End: ${LAST_WEEK_FRIDAY}T23:59:59Z"

# Verify day names
date -d "$LAST_WEEK_MONDAY" +"%A, %B %d, %Y"  # Should be Monday
date -d "$LAST_WEEK_FRIDAY" +"%A, %B %d, %Y"  # Should be Friday
```

---

## Integration with Other Skills

This skill is designed to be called FIRST when any date-dependent query is made.

**Example Flow:**

```
User: "Show me meetings from last week"
↓
1. Date Logic Management Skill invoked
   → Calculates dates using system utilities
   → Returns JSON with ISO timestamps
   → Confirms with user
↓
2. M365 Skill invoked
   → Receives date JSON
   → Uses start_iso and end_iso for API calls
   → Returns meeting results
```

**Skills That Should Use This:**
- M365 Skill (meetings, emails, documents)
- Google Calendar Skill
- Todoist/Task Management Skills
- Any skill requiring date ranges

---

## Common Patterns Reference

| User Expression | Interpretation | Calculation Method |
|----------------|---------------|-------------------|
| "yesterday" | Previous day | `date -d "yesterday"` |
| "today" | Current day | `date -d "today"` |
| "tomorrow" | Next day | `date -d "tomorrow"` |
| "last week" | Previous Mon-Fri | Current Monday - 7 days, +4 days for Friday |
| "this week" | Current Mon-Fri | Last Monday, +4 days for Friday |
| "last Tuesday" | Tuesday of last week | Last week Monday + 1 day |
| "this month" | 1st to last of month | First day of month, last day of month |
| "last month" | Previous month | First day -1 month, last day of prev month |
| "Q4" | Oct 1 - Dec 31 | Current year + quarter months |

---

## Important Reminders

1. **ALWAYS use Bash tool** for date calculations
2. **NEVER do date arithmetic** yourself
3. **DEFAULT to work week** (Mon-Fri) for "last week"
4. **"last [day]"** means day of last week, not most recent
5. **ALWAYS confirm** with user before passing to other skills
6. **Return structured JSON** in exact format specified
7. **All timestamps in UTC** (Z suffix)

---

## Example Complete Interaction

```
User: "Show me my meetings from last Tuesday"

YOU (Date Logic Management Skill):
[Uses Bash tool]
$ CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
$ LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")
$ LAST_TUESDAY=$(date -d "$LAST_WEEK_MONDAY +1 day" +"%Y-%m-%d")

Result: 2025-10-28

YOU:
I've calculated "last Tuesday":

**Single Day:**
- Date: Tuesday, October 28, 2025
- Start: 2025-10-28T00:00:00Z
- End: 2025-10-28T23:59:59Z

Is this correct?

USER: "Yes"

YOU:
[Returns JSON]
{
  "start_iso": "2025-10-28T00:00:00Z",
  "end_iso": "2025-10-28T23:59:59Z",
  "description": "Tuesday, October 28, 2025",
  "duration_days": 1,
  "week_type": "single",
  "date_expression": "last Tuesday",
  "calculation_method": "system_date_utility"
}

[M365 Skill receives this JSON and queries meetings with these exact timestamps]
```

---

**Date Logic Management Skill v1.0.0**
**Deterministic. Accurate. Reliable.**
