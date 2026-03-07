# Date Logic Management — Bash Command Reference

All commands use GNU `date`. Run via Bash tool. Never calculate manually.

---

## Single Day Patterns

### "yesterday"
```bash
date -d "yesterday" +"%Y-%m-%dT00:00:00Z" && date -d "yesterday" +"%Y-%m-%dT23:59:59Z"
```

### "today"
```bash
date -d "today" +"%Y-%m-%dT00:00:00Z" && date -d "today" +"%Y-%m-%dT23:59:59Z"
```

### "tomorrow"
```bash
date -d "tomorrow" +"%Y-%m-%dT00:00:00Z" && date -d "tomorrow" +"%Y-%m-%dT23:59:59Z"
```

---

## Week Patterns

### "last week" (work week: Mon-Fri)
```bash
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")
LAST_WEEK_FRIDAY=$(date -d "$LAST_WEEK_MONDAY +4 days" +"%Y-%m-%d")
echo "${LAST_WEEK_MONDAY}T00:00:00Z"
echo "${LAST_WEEK_FRIDAY}T23:59:59Z"
```

### "last week" (calendar week: Mon-Sun)
```bash
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")
LAST_WEEK_SUNDAY=$(date -d "$LAST_WEEK_MONDAY +6 days" +"%Y-%m-%d")
echo "${LAST_WEEK_MONDAY}T00:00:00Z"
echo "${LAST_WEEK_SUNDAY}T23:59:59Z"
```

### "this week" (work week: Mon-Fri)
```bash
THIS_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
THIS_FRIDAY=$(date -d "$THIS_MONDAY +4 days" +"%Y-%m-%d")
echo "${THIS_MONDAY}T00:00:00Z"
echo "${THIS_FRIDAY}T23:59:59Z"
```

### "last [day name]" — e.g., "last Tuesday"

**CRITICAL:** "last Tuesday" = Tuesday of last week, NOT most recent Tuesday.

```bash
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")

# Tuesday (+1), Wednesday (+2), Thursday (+3), Friday (+4), Saturday (+5), Sunday (+6)
LAST_TUESDAY=$(date -d "$LAST_WEEK_MONDAY +1 day" +"%Y-%m-%d")

echo "${LAST_TUESDAY}T00:00:00Z"
echo "${LAST_TUESDAY}T23:59:59Z"
```

Day offset table:
| Day | Offset |
|-----|--------|
| Monday | +0 |
| Tuesday | +1 |
| Wednesday | +2 |
| Thursday | +3 |
| Friday | +4 |
| Saturday | +5 |
| Sunday | +6 |

---

## Month Patterns

### "this month"
```bash
MONTH_START=$(date -d "$(date +%Y-%m-01)" +"%Y-%m-%dT00:00:00Z")
MONTH_END=$(date -d "$(date +%Y-%m-01) +1 month -1 day" +"%Y-%m-%dT23:59:59Z")
echo "$MONTH_START"
echo "$MONTH_END"
```

### "last month"
```bash
LAST_MONTH_START=$(date -d "$(date +%Y-%m-01) -1 month" +"%Y-%m-%dT00:00:00Z")
LAST_MONTH_END=$(date -d "$(date +%Y-%m-01) -1 day" +"%Y-%m-%dT23:59:59Z")
echo "$LAST_MONTH_START"
echo "$LAST_MONTH_END"
```

---

## Quarter Patterns

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

## Edge Cases

### Year Boundaries

System date handles these automatically:

```bash
# If today is January 5, 2026
# "last week" spans Dec 29, 2025 - Jan 2, 2026

CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
# Returns: 2026-01-05

LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")
# Returns: 2025-12-29 (crosses year boundary correctly)
```

### Leap Years

System date utilities handle leap years automatically. No special logic needed.

### Timezones

All dates returned in UTC (Z suffix). Consuming skill handles timezone conversion.

---

## Verification Script

```bash
echo "Testing 'last week' (work week)..."
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")
LAST_WEEK_FRIDAY=$(date -d "$LAST_WEEK_MONDAY +4 days" +"%Y-%m-%d")
echo "Start: ${LAST_WEEK_MONDAY}T00:00:00Z"
echo "End: ${LAST_WEEK_FRIDAY}T23:59:59Z"

# Verify day names (should be Monday and Friday)
date -d "$LAST_WEEK_MONDAY" +"%A, %B %d, %Y"
date -d "$LAST_WEEK_FRIDAY" +"%A, %B %d, %Y"
```

---

## Complete Interaction Example

```
User: "Show me my meetings from last Tuesday"

[Bash tool]
CURRENT_MONDAY=$(date -d "last monday" +"%Y-%m-%d")
LAST_WEEK_MONDAY=$(date -d "$CURRENT_MONDAY -7 days" +"%Y-%m-%d")
LAST_TUESDAY=$(date -d "$LAST_WEEK_MONDAY +1 day" +"%Y-%m-%d")
# → 2025-10-28

Response to user:
I've calculated "last Tuesday":
- Date: Tuesday, October 28, 2025
- Start: 2025-10-28T00:00:00Z
- End: 2025-10-28T23:59:59Z
Is this correct?

User: "Yes"

Output JSON:
{
  "start_iso": "2025-10-28T00:00:00Z",
  "end_iso": "2025-10-28T23:59:59Z",
  "description": "Tuesday, October 28, 2025",
  "duration_days": 1,
  "week_type": "single",
  "date_expression": "last Tuesday",
  "calculation_method": "system_date_utility"
}

[M365 Skill receives JSON and queries with these exact timestamps]
```
