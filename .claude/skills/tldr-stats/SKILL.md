---
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
python3 $CLAUDE_PROJECT_DIR/.claude/scripts/tldr_stats.py
```

2. **Copy the full output into your response** so the user sees the dashboard directly in the chat. Do not just run the command silently - the user wants to see the stats.

### Sample Output

```
╔══════════════════════════════════════════════════════════════╗
║  📊 TLDR Stats Dashboard                                     ║
╚══════════════════════════════════════════════════════════════╝

  Session Cost       $31.90
  TLDR Saved         +$1.56 (would be $33.46)

  ▸ Token Usage
    Input            478.1K  tokens sent to Claude
    Output           150.7K  tokens generated
    Cache Read        55.3K  reused (cheaper)

  ▸ TLDR Savings
    Raw files        205.3K
    After TLDR       101.2K
    Savings        ███████░░░░░░░░ 51%

  ▸ Cache Efficiency
    TLDR Cache     ███████░░░░░░░░ 50% hit rate
                   86 hits / 87 misses

  ▸ Model Usage
    🎭 Opus      539.9K in    1.3K out  $8.20

  ▸ Hook Activity
    ✓ edit-context       42 calls
    ✓ read-enforcer      57 calls
    ✓ search-router      12 calls

  ▸ Historical Trend
    Last 10 sessions  ▄▇▂▆▆▁▁ ▇█  avg 69% saved

  Daemon: 34m uptime │ 6 active sessions │ Opus @ $15.0/1M
```

## Understanding the Numbers

| Metric | What it means |
|--------|---------------|
| **Session Cost** | Actual $ spent on Claude API this session |
| **TLDR Saved** | Money saved by not sending raw file content |
| **Input tokens** | Actual tokens sent to Claude API |
| **Output tokens** | Tokens Claude generated |
| **Cache Read** | Reused from previous turns (cheaper) |
| **Savings %** | How much TLDR compressed your file reads |
| **Cache hit rate** | How often TLDR reuses parsed results |
| **Historical Trend** | Sparkline of savings % over recent sessions |

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
