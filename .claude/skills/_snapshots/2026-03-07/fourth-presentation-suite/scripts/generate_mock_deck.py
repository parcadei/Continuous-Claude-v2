"""Generate a full mock EBR deck — Torchy's Tacos Q2 2025.

16-slide showcase of every v4 slide type with realistic mock data.
Run from the fourth-presentation-suite/scripts/ directory:

    python generate_mock_deck.py

Output: ../mock_ebr_torchys.pptx
"""

import sys
import os

# Ensure scripts dir is on path for sibling imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fourth_pptx_core import PresentationBuilder


def main():
    builder = PresentationBuilder()

    # ── 1. Title ─────────────────────────────────────────────────────────
    builder.add_title_slide(
        title="Quarterly Business Review",
        subtitle="Torchy's Tacos  |  Q2 2025",
    )

    # ── 2. Content (Agenda) — dark bg with numbered items ────────────────
    builder.add_content_slide(
        title="Today's Agenda",
        bullets=[
            "Platform usage and adoption",
            "Labor performance and savings",
            "AI forecasting deep-dive",
            "Opportunities and next steps",
        ],
        category_label="AGENDA",
        bg='dark',
        numbered=True,
    )

    # ── 3. Section Break — Performance Overview ──────────────────────────
    builder.add_section_break(
        title="Performance Overview",
        subtitle="Usage, labor efficiency, and cost savings",
    )

    # ── 4. Stat Row — 4 KPIs ────────────────────────────────────────────
    builder.add_stat_row_slide(
        label="KEY METRICS",
        headline="Q2 2025 Performance Snapshot",
        stats=[
            {
                'value': '346K',
                'label': 'Total Logins',
                'change': '+12% QoQ',
                'status': 'good',
            },
            {
                'value': '97%',
                'label': 'Approval Rate',
                'change': '+2.1%',
                'status': 'good',
            },
            {
                'value': '$18.42',
                'label': 'Sales Per Labor Hour',
                'change': '+$1.37',
                'status': 'good',
            },
            {
                'value': '94%',
                'label': 'Shift Fill Rate',
                'change': '-1.2%',
                'status': 'watch',
            },
        ],
        sparkline_data=[
            [310, 325, 338, 346],         # Total Logins trend
            [94, 95, 96.5, 97],           # Approval Rate trend
            [16.2, 17.1, 17.85, 18.42],   # SPLH trend
            [96, 95.5, 95, 94],           # Shift Fill Rate (declining)
        ],
    )

    # ── 5. Outcome (with chart) — SPLH Trend ────────────────────────────
    builder.add_outcome_slide(
        label="LABOR EFFICIENCY",
        stat_value="+23%",
        stat_label="Labor Cost Reduction",
        headline="SPLH Trending Up Across All Regions",
        body="Consistent improvement driven by AI-powered scheduling",
        why_it_matters="Every $1 SPLH increase = $420K annual savings at Torchy's volume",
        chart_data={
            'categories': ['Jan', 'Feb', 'Mar', 'Apr'],
            'series': [{'name': 'SPLH ($)', 'values': [16.20, 17.10, 17.85, 18.42]}],
            'title': 'Sales Per Labor Hour',
        },
    )

    # ── 6. Dark Content (sidebar) — AI Forecasting Deep-Dive ────────────
    builder.add_dark_content_slide(
        label="WORKFORCE INTELLIGENCE",
        headline="AI Forecasting Drives Precision Scheduling",
        body=[
            "Demand signals integrated from POS + weather + events",
            "15-minute interval labor plans vs. daily blocks",
            "Manager override rate down 34% since launch",
        ],
        sidebar_cards=[
            {
                'title': 'Forecast Accuracy',
                'body': '92.4% accuracy on 7-day labor demand. Industry average is 78%.',
            },
            {
                'title': 'Schedule Optimization',
                'body': 'AI fills 89% of shifts within 2 hours of posting. Overtime down 18%.',
            },
            {
                'title': 'Manager Adoption',
                'body': '94% of GMs use AI-suggested schedules. Training NPS: +72.',
            },
        ],
    )

    # ── 7. Section Break — Opportunities ─────────────────────────────────
    builder.add_section_break(
        title="Opportunities",
        subtitle="Where we see room for improvement",
    )

    # ── 8. Gap Slide — 4 Gap Rows ────────────────────────────────────────
    builder.add_gap_slide(
        label="GAP ANALYSIS",
        headline="Areas for Improvement",
        gaps=[
            {
                'area': 'Schedule Adherence',
                'current': '87%',
                'best_practice': '95%',
                'gap': '-8 pts',
                'status': 'action',
            },
            {
                'area': 'Labor Cost %',
                'current': '29.1%',
                'best_practice': '26%',
                'gap': '+3.1 pts',
                'status': 'watch',
            },
            {
                'area': 'Forecast Accuracy',
                'current': '92.4%',
                'best_practice': '95%',
                'gap': '-2.6 pts',
                'status': 'watch',
            },
            {
                'area': 'Turnover Rate',
                'current': '62%',
                'best_practice': '45%',
                'gap': '+17 pts',
                'status': 'action',
            },
        ],
    )

    # ── 9. Pull Quote ────────────────────────────────────────────────────
    builder.add_pull_quote(
        quote=(
            "Fourth's AI scheduling has completely changed how we think about "
            "labor. We went from guessing to knowing — and our P&L shows it."
        ),
        attribution="Jerry Phillips",
        role="VP Operations, Torchy's Tacos",
    )

    # ── 10. Outcome (with chart) — Sales Projection ─────────────────────
    builder.add_outcome_slide(
        label="FINANCIAL IMPACT",
        stat_value="$2.1M",
        stat_label="Annualized Savings",
        headline="Sales Projection Supports Expansion",
        body="Six-month forecast shows sustained revenue growth",
        why_it_matters="Labor savings fund 3 new store openings in H2 2025",
        chart_data={
            'categories': ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            'series': [
                {
                    'name': 'Projected ($M)',
                    'values': [15.2, 15.8, 16.4, 16.1, 16.9, 17.3],
                },
            ],
            'title': 'Monthly Revenue Projection',
        },
    )

    # ── 11. Section Break — Next Steps ───────────────────────────────────
    builder.add_section_break(
        title="Next Steps",
        subtitle="Roadmap, recommendations, and commitments",
    )

    # ── 12. Recommendation ───────────────────────────────────────────────
    builder.add_recommendation_slide(
        label="RECOMMENDATIONS",
        headline="Three Actions to Accelerate Results",
        actions=[
            {
                'title': 'Deploy Schedule Adherence Alerts',
                'description': (
                    'Real-time push notifications when locations deviate '
                    'from planned schedules by more than 10%'
                ),
                'timeline': 'Q3 2025',
            },
            {
                'title': 'Expand AI Forecasting to Catering',
                'description': (
                    'Extend demand prediction to catering and event '
                    'orders — currently manual, high-waste category'
                ),
                'timeline': 'Q3 2025',
            },
            {
                'title': 'Pilot Retention Risk Scoring',
                'description': (
                    'Use tenure, schedule patterns, and engagement '
                    'data to flag flight-risk employees 30 days early'
                ),
                'timeline': 'Q4 2025',
            },
        ],
    )

    # ── 13. Roadmap ──────────────────────────────────────────────────────
    builder.add_roadmap_slide(
        label="ROADMAP RELEVANCE",
        headline="What's Coming That Matters to You",
        pills=[
            {'text': 'AI/ML', 'style': 'solid'},
            {'text': 'Scheduling', 'style': 'solid'},
            {'text': 'Analytics', 'style': 'outline'},
        ],
        items=[
            {
                'title': 'Intelligent Break Scheduling',
                'description': (
                    'ML-optimized break timing that balances compliance, '
                    'coverage, and employee preference'
                ),
                'relevant': (
                    "Torchy's has 12% break-compliance gaps in TX locations"
                ),
                'timeline': 'Q3 2025',
            },
            {
                'title': 'Cross-Location Labor Sharing',
                'description': (
                    'Automated shift-offer routing across nearby locations '
                    'when demand spikes or no-shows occur'
                ),
                'relevant': (
                    '23 Torchy\'s locations within 15-mile clusters in DFW and Austin'
                ),
                'timeline': 'Q4 2025',
            },
            {
                'title': 'Predictive Turnover Dashboard',
                'description': (
                    'Real-time flight-risk scoring with recommended '
                    'interventions per employee'
                ),
                'relevant': (
                    'Current 62% turnover costs Torchy\'s ~$2.8M/year in replacement'
                ),
                'timeline': 'Q1 2026',
            },
        ],
    )

    # ── 14. Mutual Commitments ───────────────────────────────────────────
    builder.add_mutual_commitments_slide(
        label="NEXT STEPS",
        headline="Mutual Commitments",
        fourth_items=[
            "Deploy schedule adherence alerts by Aug 15",
            "Complete catering forecast pilot at 5 locations",
            "Deliver retention risk scoring POC",
            "Quarterly optimization review with Ops team",
        ],
        client_items=[
            "Provide catering sales data for 12 months",
            "Assign GM champions at 5 pilot locations",
            "Share turnover exit-interview data",
            "Schedule Q3 EBR for September 18",
        ],
        client_name="Torchy's Tacos",
        next_review_date="September 18, 2025",
        contact_name="Sarah Mitchell",
        contact_email="sarah.mitchell@fourth.com",
    )

    # ── 15. KPI (hero) ───────────────────────────────────────────────────
    builder.add_kpi_slide(
        metric_value="15%",
        metric_label="Uplift in Sales Per Labor Hour",
        context="vs. 8% QSR industry average  |  Powered by Fourth iQ",
        category_label="IMPACT",
    )

    # ── 16. Closing ──────────────────────────────────────────────────────
    builder.add_closing_slide(
        title="Thank You",
        subtitle="Torchy's Tacos  |  Quarterly Business Review",
        contact_info="sarah.mitchell@fourth.com  |  fourth.com",
    )

    # ── Save ─────────────────────────────────────────────────────────────
    output_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'mock_ebr_torchys.pptx',
    )
    builder.save(output_path)
    print(f"Generated: {output_path}")
    print(f"Slides: {len(builder.presentation.slides)}")


if __name__ == '__main__':
    main()
