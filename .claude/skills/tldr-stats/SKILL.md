---
name: tldr-stats
description: Show full session token usage, costs, TLDR savings, and hook activity
---

# TLDR Stats Skill

Show a beautiful dashboard with token usage, actual API costs, TLDR savings, and hook activity.

## When to Use

- See how much TLDR is saving you in real $ terms
- Check total session token usage and costs
- Before/after comparisons of TLDR effectiveness
- Debug whether TLDR/hooks are being used
- See which model is being used

## Instructions

**IMPORTANT:** Run the script AND display the output to the user.

1. Run the stats script:

```bash
python3 $CLAUDE_CC_DIR/.claude/scripts/tldr_stats.py
```

2. **Copy the full output into your response** so the user sees the dashboard directly in the chat. Do not just run the command silently - the user wants to see the stats.

### Sample Output

```
╔══════════════════════════════════════════════════════════════╗
║  📊 Session Stats                                            ║
╚══════════════════════════════════════════════════════════════╝

  You've spent  $96.52  this session

  Tokens Used
        1.2M sent to Claude
      416.3K received back
       97.8K from prompt cache (8% reused)

  TLDR Savings

    You sent:               1.2M
    Without TLDR:           2.5M

    💰 TLDR saved you ~$18.83
    (Without TLDR: $115.35 → With TLDR: $96.52)

    File reads: 1.3M → 20.9K █████████░ 98% smaller

  TLDR Cache
    Re-reading the same file? TLDR remembers it.
    █████░░░░░░░░░░ 37% cache hits
    (35 reused / 60 parsed fresh)

  Hooks: 553 calls (✓ all ok)
  History: █▃▄ ▇▃▇▆ avg 84% compression
  Daemon: 24m up │ 3 sessions
```

## Understanding the Numbers

| Metric                      | What it means                                 |
| --------------------------- | --------------------------------------------- |
| **You've spent**            | Actual $ spent on Claude API this session     |
| **You sent / Without TLDR** | Actual tokens vs what it would have been      |
| **TLDR saved you**          | Money saved by compressing file reads         |
| **File reads X → Y**        | Raw file tokens compressed to TLDR summary    |
| **Cache hits**              | How often TLDR reuses parsed file results     |
| **History sparkline**       | Compression % over recent sessions (█ = high) |

## Visual Elements

- **Progress bars** show savings and cache efficiency at a glance
- **Sparklines** show historical trends (█ = high savings, ▁ = low)
- **Colors** indicate status (green = good, yellow = moderate, red = concern)
- **Emojis** distinguish model types (🎭 Opus, 🎵 Sonnet, 🍃 Haiku)

## Notes

- Token savings vary by file size (big files = more savings)
- Cache hit rate starts low, increases as you re-read files
- Cost estimates use: Opus $15/1M, Sonnet $3/1M, Haiku $0.25/1M
- Stats update in real-time as you work
