---
name: weekly-report
description: Generate AI Enablement Team weekly status reports by collecting data from GitHub repos, NeonDB memory, local ROADMAP files, and handoff documents via MCP tools, then pushing structured content to the Railway-hosted dashboard. Use when asked to create a weekly report, status update, or generate a report for the team. This skill handles all external service integration — GitHub API, PostgreSQL memory, dashboard API.
---

# Weekly Report Generator (Claude Code — Data Half)

This skill collects work data from external services via the `ai-reporting` MCP server, generates the **9 data-driven sections** of the weekly report, and pushes them as a **draft**. The user then takes the `report_id` to Claude Desktop to add editorial sections and publish.

**Important:** This is half of a complementary workflow:
- **Claude Code** (this skill) → data-driven sections (deep-dives, metrics, roadmap, integrations, adoption)
- **Claude Desktop** (`weekly-report-writer` skill) → editorial sections (title, highlights, summary, projects RAG, impact, decisions) + publish

## Section Ownership

### This skill generates (9 sections):

| # | Type | Title | Eyebrow | Data Source |
|---|------|-------|---------|-------------|
| 4 | deep-dive | Continuous Claude | Project Deep-Dive | git + ROADMAP |
| 5 | deep-dive | Spark Platform | Project Deep-Dive | git + ROADMAP |
| 6 | deep-dive | Marketing Brain | Project Deep-Dive | git + ROADMAP |
| 7 | integrations | Enterprise Integrations | Connected Systems | codebase analysis |
| 9 | metrics-dashboard | Full Metrics | By the Numbers | computed from collectors |
| 10 | adoption | Feature Adoption | Usage Tracking | computed |
| 11 | deep-dive | AI Architectural Guide | Project Deep-Dive | git + ROADMAP |
| 12 | deep-dive | RFP Builder | Project Deep-Dive | git + ROADMAP |
| 13 | roadmap | Roadmap | Looking Ahead | ROADMAP.md files |

### Also pushes (via `push_report_data`):
- **8 metrics** — `get_section_schema("metric")`
- **5 projects** — `get_section_schema("project")`

### Desktop handles (6 sections — DO NOT generate these):
| # | Type | Title |
|---|------|-------|
| 0 | title | AI Enablement Team |
| 1 | highlights | This Week's Highlights |
| 2 | summary | Executive Summary |
| 3 | projects | Active Projects |
| 8 | impact | Impact & Progress |
| 14 | decisions | Decisions Needed |

Desktop also pushes **5 highlights** and **publishes** the report.

## Prerequisites

- MCP server `ai-reporting` registered and running (local stdio or Railway HTTP)
- Dashboard API accessible at `DASHBOARD_URL`
- `GITHUB_TOKEN` and `GITHUB_OWNER` env vars set for remote git/roadmap/handoff collection
- `DATABASE_URL` set for direct memory queries (when local recall script unavailable)

## Workflow

Execute these 6 phases in sequence.

### Phase 1: Collect Data

1. Call `mcp__ai-reporting__collect_all_data` with `period_days=7`
2. Call `mcp__ai-reporting__get_previous_report` to fetch last week's report
3. Summarize to the user:
   - "Collected X commits across Y repos, Z roadmap items, N memory insights, M handoff sessions"
   - Note any collectors that returned errors (graceful degradation)

Store collected data and previous report for Phase 3.

### Phase 2: Interview (Data Gaps Only)

Ask the user only about data-driven gaps — NOT editorial content:

1. **Project corrections** — "Any project status changes not captured in git/ROADMAP?"
2. **Metrics notes** — "Any business metrics corrections? (adoption numbers, capabilities, etc.)"

Do NOT ask about highlights, executive summary, strategic context, or decisions — Desktop handles those.

### Phase 3: Generate Data Content

For each of the 9 data-driven sections:

1. Call `mcp__ai-reporting__get_section_schema` for the expected JSON structure
2. Write section content using collected data + user corrections + previous report for continuity
3. Call `mcp__ai-reporting__validate_section` to verify the JSON
4. If validation fails, fix and re-validate (max 2 retries)

Also generate:
- **8 metrics** — call `get_section_schema("metric")` for schema
- **5 projects** — call `get_section_schema("project")` for schema

#### Content Writing Guidelines

- **Deep Dives:** 2-3 tabs per project, 3-5 features per tab. Lucide icon names. Status: live/in-progress/coming/planned.
- **Integrations:** Connected systems, API status, data flow descriptions.
- **Metrics Dashboard:** Trend direction, target, benchmark, driver, significance per metric.
- **Adoption:** Feature usage data, adoption trends, user counts.
- **Roadmap:** Completed, in-progress, planned, blocked items from ROADMAP.md files.
- **Metrics deltas:** Compare with previous report values for `previousValue` fields.

### Phase 4: Review Gate

Present a summary before pushing:

```
Data Report Summary: [period_label]
Sections: 9 data-driven | Metrics: 8 | Projects: 5
Deep dives: Continuous Claude, Spark, Marketing Brain, AI Arch Guide, RFP Builder
Integrations: [count] systems
Roadmap: [completed/in-progress/planned counts]

Ready to push as draft?
```

Wait for approval. If changes needed, regenerate the relevant sections.

### Phase 5: Push as Draft (DO NOT Publish)

1. `mcp__ai-reporting__create_report` with period label -> get `report_id`
2. For each of the 9 sections: `mcp__ai-reporting__push_section` with `report_id`, section data, sort order
3. `mcp__ai-reporting__push_report_data` with metrics and projects JSON (NO highlights — Desktop handles those)

**DO NOT call `publish_report`.** The report stays as a draft for Desktop to complete.

### Phase 6: Handoff to Desktop

Output the following for the user:

```
Draft report created: [report_id]
Dashboard: https://ai-reporting-dashboard-production.up.railway.app/reports/[report_id]

Pushed:
  - 9 data-driven sections (deep-dives, integrations, metrics, adoption, roadmap)
  - 8 metrics
  - 5 projects

Next: Open Claude Desktop and run the weekly-report-writer skill.
It will find this draft automatically via get_draft_report() and add:
  - Title, Highlights, Executive Summary, Active Projects, Impact, Decisions
  - 5 highlights
  - Then publish the report
```

## Period Label Format

`"[Month] [Year] · Week [N]"` — e.g. `"February 2026 · Week 7"`. Use ISO week number.

## Error Recovery

- Collector fails -> skip it, note in summary, continue with available data
- Validation fails after 2 retries -> show error, ask for manual content
- Dashboard push fails -> show HTTP error, offer retry or save content locally
- MCP server unavailable -> instruct user to check `ai-reporting` MCP registration

## Lucide Icons Reference

`shield-check`, `brain`, `zap`, `bot`, `puzzle`, `rocket`, `megaphone`, `file-text`, `book-open`, `folder-kanban`
