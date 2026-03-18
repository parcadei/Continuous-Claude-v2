"""
Landing Page Score Calculator

Computes weighted composite scores from sub-criterion ratings.
Use this script to ensure consistent, reproducible scoring across audits.

Usage:
    python score_calculator.py --input scores.json --output report.json

Or import and use programmatically:
    from score_calculator import calculate_composite_score, generate_report
"""

import json
import sys
import argparse
from typing import Optional

# Category weights (sum to 1.0)
CATEGORY_WEIGHTS = {
    "headline_value_prop": 0.25,
    "cta_design_copy": 0.18,
    "trust_social_proof": 0.15,
    "message_match_narrative": 0.12,
    "visual_design_layout": 0.10,
    "form_optimization": 0.08,
    "mobile_performance": 0.07,
    "post_conversion_measurement": 0.05,
}

# Sub-criterion weights within each category
SUB_CRITERIA = {
    "headline_value_prop": {
        "clarity_of_outcome": 0.30,
        "benefit_vs_feature": 0.25,
        "specificity_proof": 0.20,
        "headline_formula": 0.15,
        "readability": 0.10,
    },
    "cta_design_copy": {
        "button_copy": 0.30,
        "visual_prominence": 0.25,
        "placement_strategy": 0.20,
        "singular_focus": 0.15,
        "risk_reduction": 0.10,
    },
    "trust_social_proof": {
        "proof_variety": 0.25,
        "testimonial_quality": 0.25,
        "credibility_indicators": 0.20,
        "proof_placement": 0.15,
        "claim_specificity": 0.15,
    },
    "message_match_narrative": {
        "ad_to_page_congruence": 0.30,
        "narrative_structure": 0.25,
        "section_sequence": 0.20,
        "audience_specificity": 0.15,
        "objection_handling": 0.10,
    },
    "visual_design_layout": {
        "visual_hierarchy": 0.25,
        "above_fold_content": 0.25,
        "whitespace_breathing": 0.20,
        "imagery_visuals": 0.15,
        "consistency_professionalism": 0.15,
    },
    "form_optimization": {
        "field_count": 0.30,
        "layout_labels": 0.25,
        "friction_reduction": 0.20,
        "cta_button_copy": 0.15,
        "privacy_reassurance": 0.10,
    },
    "mobile_performance": {
        "mobile_responsiveness": 0.25,
        "page_load_speed": 0.25,
        "core_web_vitals": 0.20,
        "image_optimization": 0.15,
        "third_party_scripts": 0.15,
    },
    "post_conversion_measurement": {
        "thank_you_page": 0.25,
        "tracking_analytics": 0.25,
        "confirmation_flow": 0.20,
        "lead_qualification": 0.15,
        "nurture_sequence": 0.15,
    },
}

CATEGORY_DISPLAY_NAMES = {
    "headline_value_prop": "Headline & Value Proposition",
    "cta_design_copy": "CTA Design & Copy",
    "trust_social_proof": "Trust & Social Proof",
    "message_match_narrative": "Message Match & Narrative",
    "visual_design_layout": "Visual Design & Layout",
    "form_optimization": "Form Optimization",
    "mobile_performance": "Mobile & Performance",
    "post_conversion_measurement": "Post-Conversion & Measurement",
}

GRADE_THRESHOLDS = [
    (90, "A"),
    (80, "B"),
    (70, "C"),
    (60, "D"),
    (0,  "F"),
]


def score_to_grade(score: float) -> str:
    """Convert a 0-100 score to a letter grade."""
    for threshold, grade in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return "F"


def calculate_category_score(
    category: str,
    sub_scores: dict[str, int],
) -> float:
    """
    Calculate a category's 0-100 score from sub-criterion ratings (1-5).

    Args:
        category: Category key from CATEGORY_WEIGHTS
        sub_scores: Dict of sub-criterion key -> rating (1-5)

    Returns:
        Category score on 0-100 scale
    """
    weights = SUB_CRITERIA[category]
    weighted_sum = 0.0
    total_weight = 0.0

    for criterion, weight in weights.items():
        if criterion in sub_scores:
            score = sub_scores[criterion]
            if not 1 <= score <= 5:
                raise ValueError(
                    f"Score for {criterion} must be 1-5, got {score}"
                )
            weighted_sum += score * weight
            total_weight += weight

    if total_weight == 0:
        return 0.0

    # Normalize to account for missing sub-criteria
    raw = weighted_sum / total_weight
    # Convert 1-5 scale to 0-100
    return (raw - 1) * 25


def calculate_composite_score(
    category_scores: dict[str, float],
    excluded_categories: Optional[list[str]] = None,
) -> float:
    """
    Calculate the weighted composite score from category scores.

    Redistributes weight from excluded categories proportionally.

    Args:
        category_scores: Dict of category key -> 0-100 score
        excluded_categories: Categories to exclude (weight redistributed)

    Returns:
        Composite score on 0-100 scale
    """
    excluded = set(excluded_categories or [])

    # Calculate total weight of included categories
    included_weight = sum(
        w for k, w in CATEGORY_WEIGHTS.items() if k not in excluded
    )

    if included_weight == 0:
        return 0.0

    composite = 0.0
    for category, weight in CATEGORY_WEIGHTS.items():
        if category in excluded:
            continue
        if category in category_scores:
            # Redistribute weight proportionally
            adjusted_weight = weight / included_weight
            composite += category_scores[category] * adjusted_weight

    return round(composite, 1)


def generate_report(scores_data: dict) -> dict:
    """
    Generate a full scoring report from raw sub-criterion scores.

    Args:
        scores_data: {
            "page_name": str,
            "page_url": str (optional),
            "excluded_categories": list[str] (optional),
            "categories": {
                "category_key": {
                    "sub_criterion_key": int (1-5),
                    ...
                },
                ...
            },
            "notes": {
                "category_key": str (optional per-category notes),
                ...
            }
        }

    Returns:
        Full report dict with scores, grades, and metadata
    """
    excluded = scores_data.get("excluded_categories", [])
    categories = scores_data.get("categories", {})
    notes = scores_data.get("notes", {})

    category_results = {}
    for cat_key, sub_scores in categories.items():
        cat_score = calculate_category_score(cat_key, sub_scores)
        category_results[cat_key] = {
            "name": CATEGORY_DISPLAY_NAMES.get(cat_key, cat_key),
            "score": round(cat_score, 1),
            "grade": score_to_grade(cat_score),
            "weight": CATEGORY_WEIGHTS.get(cat_key, 0),
            "sub_scores": sub_scores,
            "notes": notes.get(cat_key, ""),
        }

    cat_scores_flat = {k: v["score"] for k, v in category_results.items()}
    composite = calculate_composite_score(cat_scores_flat, excluded)

    report = {
        "page_name": scores_data.get("page_name", "Untitled"),
        "page_url": scores_data.get("page_url", ""),
        "composite_score": composite,
        "grade": score_to_grade(composite),
        "categories": category_results,
        "excluded_categories": excluded,
        "scoring_version": "1.0",
    }

    return report


def format_markdown_report(report: dict) -> str:
    """Format a report dict as a Markdown string."""
    lines = []
    name = report["page_name"]
    url = report.get("page_url", "")

    title = f"# Landing Page Score: {name}"
    if url:
        title += f"\n**URL**: {url}"
    lines.append(title)
    lines.append("")
    lines.append(
        f"## Overall: {report['composite_score']}/100 — Grade {report['grade']}"
    )
    lines.append("")

    # Category table
    lines.append("### Category Scores")
    lines.append("")
    lines.append("| # | Category | Score | Grade | Weight |")
    lines.append("|---|----------|-------|-------|--------|")

    for i, (cat_key, cat_data) in enumerate(
        sorted(
            report["categories"].items(),
            key=lambda x: CATEGORY_WEIGHTS.get(x[0], 0),
            reverse=True,
        ),
        1,
    ):
        excluded_marker = " *(excluded)*" if cat_key in report.get("excluded_categories", []) else ""
        lines.append(
            f"| {i} | {cat_data['name']}{excluded_marker} | "
            f"{cat_data['score']}/100 | {cat_data['grade']} | "
            f"{cat_data['weight']*100:.0f}% |"
        )

    lines.append("")

    # Detailed breakdowns
    lines.append("### Detailed Breakdowns")
    lines.append("")
    for cat_key, cat_data in report["categories"].items():
        if cat_key in report.get("excluded_categories", []):
            continue
        lines.append(f"#### {cat_data['name']} — {cat_data['score']}/100 ({cat_data['grade']})")
        lines.append("")
        for sub_key, sub_score in cat_data["sub_scores"].items():
            display_name = sub_key.replace("_", " ").title()
            weight = SUB_CRITERIA.get(cat_key, {}).get(sub_key, 0)
            lines.append(f"- **{display_name}**: {sub_score}/5 (weight: {weight*100:.0f}%)")
        if cat_data.get("notes"):
            lines.append(f"\n*Notes*: {cat_data['notes']}")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Landing Page Score Calculator")
    parser.add_argument("--input", required=True, help="Path to scores JSON file")
    parser.add_argument("--output", help="Path to save report JSON (optional)")
    parser.add_argument("--markdown", action="store_true", help="Output as Markdown")
    args = parser.parse_args()

    with open(args.input) as f:
        scores_data = json.load(f)

    report = generate_report(scores_data)

    if args.markdown:
        print(format_markdown_report(report))
    else:
        output = json.dumps(report, indent=2)
        if args.output:
            with open(args.output, "w") as f:
                f.write(output)
            print(f"Report saved to {args.output}")
        else:
            print(output)


if __name__ == "__main__":
    main()
