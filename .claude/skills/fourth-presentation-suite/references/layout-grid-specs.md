# Layout Grid Specifications

Construction blueprints for complex slide types. Zone diagrams, content constraints, and example code. Use these when building PPTX slides to get spacing right first time.

---

## KPI Hero Slide

**Zones:**
```
+-----------------------+
| [category_label]      |  Zone A: 0.6"-0.8"
+-----------------------+
|    144pt HERO NUMBER  |  Zone B: 0.8"-3.2"
|       (centered)      |  Glow effect on text box
+-----------------------+
| 28pt Metric Label     |  Zone C: 3.3"-4.1"
| (+150 hundredths spc) |  Cool Grey, letter-spaced
+-----------------------+
|   [Progress Ring]     |  Zone D: 4.2"-6.6"
|   or Comparison Bar   |  Percentages get ring,
|                       |  non-% get bar
+-----------------------+
| Context line 14pt     |  Zone E: 6.5"-7.0"
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| category_label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| metric_value | 6 chars | 144pt Bold White + glow |
| metric_label | 30 chars | 28pt Regular Cool Grey + letter spacing |
| context | 60 chars | 14pt Cool Grey |

**Example:**
```python
builder.add_kpi_slide(
    metric_value='15%',
    metric_label='Uplift in Sales Per Labor Hour',
    context='vs. 8% QSR industry average  |  Powered by Fourth iQ',
    category_label='IMPACT',
)
```

---

## Outcome Slide

**Zones:**
```
+-----------+-----------+
| 96pt Stat | Headline  |  Zone A: 1.1"-2.9"
| Teal bar  | Body      |
+-----------+-----------+
| CHART (full width)    |  Zone B: 3.0"-5.85"
+-----------------------+
| >> Callout            |  Zone C: 6.0"-6.7"
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| stat_value | 6 chars | 96pt Bold White |
| stat_label | 25 chars | 18pt Cool Grey |
| headline | 50 chars (2 lines) | 36pt Bold White |
| body | 120 chars | 14pt Cool Grey |
| chart_data.categories | 3-6 items | -- |
| why_it_matters | 100 chars | 14pt White |

**Example:**
```python
builder.add_outcome_slide(
    label='LABOR EFFICIENCY',
    stat_value='+23%',
    stat_label='Labor Cost Reduction',
    headline='SPLH Trending Up Across All Regions',
    body='Consistent improvement driven by AI-powered scheduling',
    why_it_matters='Every $1 SPLH increase = $420K annual savings at volume',
    chart_data={
        'categories': ['Jan', 'Feb', 'Mar', 'Apr'],
        'series': [{'name': 'SPLH ($)', 'values': [16.20, 17.10, 17.85, 18.42]}],
        'title': 'Sales Per Labor Hour',
    },
)
```

---

## Stat Row Slide

**Zones:**
```
+-----------------------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline 36pt         |
+-----------------------+
| [Card] [Card] [Card]  |  Zone B: 3.0"-6.2"
| 36-48pt status cards  |  (max 4 cards, centered)
| accent bar on top     |  teal/amber/red by status
| [sparkline]           |  mini trend line (optional)
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars | 36pt Bold White |
| stats[].value | 6 chars | Auto-scaled: <=3 chars 48pt, <=5 chars 40pt, 6+ chars 36pt |
| stats[].label | 20 chars | 12pt Cool Grey |
| stats[].change | 10 chars | 12pt Teal/Red |
| stats[].status | good/watch/action | Accent bar + card tint color |
| sparkline_data[] | 2+ floats per card | Teal freeform line, auto-normalized |

**Example:**
```python
builder.add_stat_row_slide(
    label='KEY METRICS',
    headline='Q2 2025 Performance Snapshot',
    stats=[
        {'value': '346K', 'label': 'Total Logins', 'change': '+12% QoQ', 'status': 'good'},
        {'value': '97%', 'label': 'Approval Rate', 'change': '+2.1%', 'status': 'good'},
        {'value': '$18.42', 'label': 'Sales Per Labor Hour', 'change': '+$1.37', 'status': 'good'},
        {'value': '94%', 'label': 'Shift Fill Rate', 'change': '-1.2%', 'status': 'watch'},
    ],
    sparkline_data=[
        [310, 325, 338, 346],
        [94, 95, 96.5, 97],
        [16.2, 17.1, 17.85, 18.42],
        [96, 95.5, 95, 94],
    ],
)
```

---

## Dark Content Slide

**Zones:**
```
+-----------+-----------+
| [eyebrow]             |  Zone A: 0.8"-2.5"
| Headline 36pt         |
| ---- teal accent ---- |
+-----------+-----------+
| Body text | [Card 1]  |  Zone B: 2.9"-7.0"
| bullets   | [Card 2]  |  Left 7": body
| or prose  | [Card 3]  |  Right 4": glass cards
+-----------+-----------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars (2 lines) | 36pt Bold White (hl_h=1.0") |
| body | 300 chars or 4 bullets | 18pt Cool Grey |
| sidebar_cards[].title | 25 chars | 14pt Bold White |
| sidebar_cards[].body | 80 chars (3-4 lines) | 14pt Cool Grey |

**Sidebar auto-fit:** `card_h = (SLIDE_HEIGHT - body_top - MARGIN_BOTTOM - (n-1) * 0.2") / n`

**Example:**
```python
builder.add_dark_content_slide(
    label='WORKFORCE INTELLIGENCE',
    headline='AI Forecasting Drives Precision Scheduling',
    body=[
        'Demand signals integrated from POS + weather + events',
        '15-minute interval labor plans vs. daily blocks',
        'Manager override rate down 34% since launch',
    ],
    sidebar_cards=[
        {'title': 'Forecast Accuracy', 'body': '92.4% accuracy on 7-day labor demand. Industry average is 78%.'},
        {'title': 'Schedule Optimization', 'body': 'AI fills 89% of shifts within 2 hours of posting. Overtime down 18%.'},
        {'title': 'Manager Adoption', 'body': '94% of GMs use AI-suggested schedules. Training NPS: +72.'},
    ],
)
```

---

## Gap Slide

**Zones:**
```
+-----------------------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline 36pt         |
+-----------------------+
| Area Name (16pt bold) |  Zone B: 2.2"-6.5"
| Current: X | Target: Y|  Card-per-row layout
| [====progress bar====]|  max 6 rows
| [GAP badge] [STATUS]  |  Progress bar + floating badges
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars | 36pt Bold White |
| gaps[].area | 30 chars | 16pt Bold White |
| gaps[].current | 15 chars | 11pt Cool Grey |
| gaps[].best_practice | 15 chars | 11pt Cool Grey |
| gaps[].gap | 15 chars | 10pt Bold White (floating badge) |
| gaps[].status | good/watch/action | Badge + border color |

**Example:**
```python
builder.add_gap_slide(
    label='GAP ANALYSIS',
    headline='Areas for Improvement',
    gaps=[
        {'area': 'Schedule Adherence', 'current': '87%', 'best_practice': '95%', 'gap': '-8 pts', 'status': 'action'},
        {'area': 'Labor Cost %', 'current': '29.1%', 'best_practice': '26%', 'gap': '+3.1 pts', 'status': 'watch'},
        {'area': 'Forecast Accuracy', 'current': '92.4%', 'best_practice': '95%', 'gap': '-2.6 pts', 'status': 'watch'},
        {'area': 'Turnover Rate', 'current': '62%', 'best_practice': '45%', 'gap': '+17 pts', 'status': 'action'},
    ],
)
```

---

## Recommendation Slide

**Zones:**
```
+-----------------------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline 36pt         |
+-----------------------+
| (1) Title        [Q1] |  Zone B: 2.4"-6.8"
|     Description        |  Glass cards, max 5 rows
| (2) Title        [Q2] |  Numbered circles + pill
|     Description        |  timeline badges right
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars | 36pt Bold White |
| actions[].title | 40 chars | 18pt Bold White |
| actions[].description | 80 chars | 14pt Cool Grey |
| actions[].timeline | 10 chars | 10pt Bold White (pill badge) |

**Example:**
```python
builder.add_recommendation_slide(
    label='RECOMMENDATIONS',
    headline='Three Actions to Accelerate Results',
    actions=[
        {'title': 'Deploy Schedule Adherence Alerts', 'description': 'Real-time push notifications when locations deviate from planned schedules by more than 10%', 'timeline': 'Q3 2025'},
        {'title': 'Expand AI Forecasting to Catering', 'description': 'Extend demand prediction to catering and event orders -- currently manual, high-waste category', 'timeline': 'Q3 2025'},
        {'title': 'Pilot Retention Risk Scoring', 'description': 'Use tenure, schedule patterns, and engagement data to flag flight-risk employees 30 days early', 'timeline': 'Q4 2025'},
    ],
)
```

---

## Mutual Commitments Slide

**Zones:**
```
+-----------+-----------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline (centered)   |
+-----------+-----------+
| FOURTH     | CLIENT   |  Zone B: 2.0"-5.6"
| COMMITS TO | COMMITS  |  Split-panel: deep blue
| [teal bar] | [sky bar]|  tint left, sky blue
| >> item    | >> item  |  tint right
| >> item    | >> item  |  Check circles + accent
| >> item    | >> item  |  strips per item
+-----------+-----------+
| NEXT REVIEW: date     |  Zone C: 6.0"-7.0"
| contact info          |  Compact footer bar
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 40 chars | 36pt Bold White (centered) |
| fourth_items[] | 50 chars each (>50 wraps, warn) | 14pt White, check circles, accent strips |
| client_items[] | 50 chars each (>50 wraps, warn) | 14pt White, check circles, accent strips |
| client_name | 20 chars | 12pt Bold Teal UPPERCASE + letter spacing |
| next_review_date | 15 chars | 14pt Bold Teal |
| contact_name | 30 chars | 14pt Cool Grey |
| contact_email | 40 chars | 14pt Cool Grey |

**Example:**
```python
builder.add_mutual_commitments_slide(
    label='NEXT STEPS',
    headline='Mutual Commitments',
    fourth_items=[
        'Deploy schedule adherence alerts by Aug 15',
        'Complete catering forecast pilot at 5 locations',
        'Deliver retention risk scoring POC',
        'Quarterly optimization review with Ops team',
    ],
    client_items=[
        'Provide catering sales data for 12 months',
        'Assign GM champions at 5 pilot locations',
        'Share turnover exit-interview data',
        'Schedule Q3 EBR for September 18',
    ],
    client_name="Torchy's Tacos",
    next_review_date='September 18, 2025',
    contact_name='Sarah Mitchell',
    contact_email='sarah.mitchell@fourth.com',
)
```

---

## Roadmap Slide

**Zones:**
```
+-----------------------+
| [eyebrow]             |  Zone A: 0.8"-2.0"
| Headline 36pt         |
+-----------------------+
| [pill] [pill] [pill]  |  Zone B: 2.2"-2.6"
+-----------------------+
| >> Title     [Q1 '26] |  Zone C: 2.75"-6.4"
|    Desc + "Relevant.." |  Left-accent cards, max 4
| >> Title     [Q2 '26] |  Teal left bar + outline pill
|    Desc + "Relevant.." |
+-----------------------+
```

| Field | Max Length | Font |
|---|---|---|
| label | 25 chars | 12pt SemiBold Teal UPPERCASE |
| headline | 60 chars | 36pt Bold White |
| pills[].text | 15 chars | 10pt Bold White (pill badge) |
| pills[].style | solid/outline | Teal fill or outline |
| items[].title | 40 chars | 16pt Bold White |
| items[].description | 80 chars | 14pt Cool Grey |
| items[].relevant | 80 chars | 12pt "Relevant because:" Teal + Grey |
| items[].timeline | 10 chars | Outline pill badge |

**Example:**
```python
builder.add_roadmap_slide(
    label='ROADMAP RELEVANCE',
    headline="What's Coming That Matters to You",
    pills=[
        {'text': 'AI/ML', 'style': 'solid'},
        {'text': 'Scheduling', 'style': 'solid'},
        {'text': 'Analytics', 'style': 'outline'},
    ],
    items=[
        {
            'title': 'Intelligent Break Scheduling',
            'description': 'ML-optimized break timing that balances compliance, coverage, and employee preference',
            'relevant': "Torchy's has 12% break-compliance gaps in TX locations",
            'timeline': 'Q3 2025',
        },
        {
            'title': 'Cross-Location Labor Sharing',
            'description': 'Automated shift-offer routing across nearby locations when demand spikes or no-shows occur',
            'relevant': "23 Torchy's locations within 15-mile clusters in DFW and Austin",
            'timeline': 'Q4 2025',
        },
    ],
)
```
