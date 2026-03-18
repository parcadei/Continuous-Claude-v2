---
name: landing-page-score
description: Score and audit any landing page against a research-backed conversion rubric. Use when users ask to review, score, audit, critique, evaluate, or improve a landing page — whether they provide a URL, screenshot, HTML file, wireframe, copy doc, or describe the page verbally. Also triggers when users mention "landing page," "conversion rate," "CRO audit," "page score," "LP review," or ask why a page isn't converting. Covers design, messaging, CTA, trust signals, forms, performance, mobile, and post-conversion. Returns a 0-100 score with letter grade and prioritized fix list.
---

# Landing Page Score

Score any landing page against a research-backed conversion optimization rubric. Returns a 0-100 composite score, letter grade, category breakdowns, and a prioritized action plan.

## When to Use This Skill

Use this skill when:
- A user asks to review, score, audit, or critique a landing page
- A user provides a URL, screenshot, HTML, wireframe, or copy document for a landing page
- A user asks why their page isn't converting or how to improve conversion rates
- A user wants to compare two landing pages
- A user is building a new landing page and wants a pre-launch quality check
- A user mentions "CRO," "conversion optimization," "page performance," or "LP audit"

## Input Acceptance

This skill works with multiple input types. Adapt your evaluation based on what's available:

| Input Type | What You Can Score | What You Can't Score |
|------------|-------------------|---------------------|
| Live URL (via browser) | All 8 categories | Post-conversion flow (unless you submit the form) |
| Screenshot/image | Visual design, layout, CTA visibility, trust signals | Performance, mobile responsiveness, form functionality |
| HTML file | Design, copy, structure, forms, CTA | Real-world performance, third-party integrations |
| Copy document | Messaging, headline, CTA copy, value proposition | Visual design, layout, performance |
| Verbal description | High-level structure and messaging strategy | Detailed scoring (provide directional guidance instead) |

When a category cannot be evaluated from the available input, mark it "NOT SCORABLE" and explain what you'd need to evaluate it. Adjust the total score denominator accordingly.

## The Scoring Rubric

### Overview

8 categories. Each scored 0-100 internally, then weighted by conversion impact. Weights are derived from A/B testing research showing relative impact on conversion rates.

| # | Category | Weight | Why This Weight |
|---|----------|--------|-----------------|
| 1 | Headline & Value Proposition | 25% | Headline quality alone can drive +307% conversion lift. Single largest lever. |
| 2 | CTA Design & Copy | 18% | CTA specificity drives +90-332% CTR improvement. Second-largest lever. |
| 3 | Trust & Social Proof | 15% | 90% of buyers say social proof influences decisions. PayPal saw +34% signups from trust signals alone. |
| 4 | Message Match & Narrative | 12% | Ad-to-page congruence is the #1 bounce rate driver. Poor match = immediate exit. |
| 5 | Visual Design & Layout | 10% | Visual hierarchy guides attention to conversion elements. F/Z-pattern compliance matters. |
| 6 | Form Optimization | 8% | Each unnecessary field drops conversion ~11%. But only applies to pages with forms. |
| 7 | Mobile & Performance | 7% | 1-second delay = 7% conversion loss. 60%+ traffic is mobile. Table stakes, not differentiator. |
| 8 | Post-Conversion & Measurement | 5% | Thank-you page, confirmation flow, and tracking setup. Often invisible but compounds over time. |

**Total: 100%**

### Scoring Scale

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | A | Elite. Minor polish only. Ship it. |
| 80-89 | B | Strong. 2-3 targeted improvements will push to A. |
| 70-79 | C | Decent foundation but leaving conversions on the table. Prioritized fixes needed. |
| 60-69 | D | Significant gaps. Multiple categories underperforming. Needs structured rework. |
| 0-59 | F | Fundamental problems. Recommend rebuild with this rubric as blueprint. |

---

## Category 1: Headline & Value Proposition (25%)

The headline is the single most impactful element. A well-crafted headline can increase conversions by 307% vs. a generic one. Pages written at 5th-7th grade reading level convert 56% higher than professional-level writing.

### Sub-Criteria

| Criterion | Weight | 5 (Excellent) | 3 (Adequate) | 1 (Poor) |
|-----------|--------|---------------|---------------|----------|
| Clarity of outcome | 30% | Visitor knows exactly what they get within 5 seconds. Passes the "5-second test." | Value is present but takes effort to parse. | Vague, jargon-heavy, or focused on the company rather than the visitor. |
| Benefit vs. feature focus | 25% | Leads with the transformation/outcome for the user. Uses FAB (Feature-Advantage-Benefit) framing. | Mix of features and benefits. Some translation work required by visitor. | Pure feature list. No connection to user's problem or desired outcome. |
| Specificity & proof | 20% | Includes numbers, timeframes, or measurable claims. ("Reduce admin tasks by 40%") | Some specificity but no hard evidence. | Completely generic. ("The best solution for your business.") |
| Headline formula execution | 15% | Uses a proven pattern: [Outcome] without [Pain], [Outcome] in [Timeframe], or similar. 6-12 words. | Reasonable structure but doesn't leverage a conversion-optimized formula. | No discernible structure. Reads like a tagline or internal slogan. |
| Readability | 10% | Flesch-Kincaid grade 6-8. Short sentences. No jargon. Anyone can understand it. | Grade 9-11. Some industry terms but generally accessible. | Grade 12+. Dense, academic, or filled with insider terminology. |

### Subheadline Check
- Does the subheadline extend (not repeat) the headline?
- Is it 15-25 words explaining "how"?
- Does it resolve any ambiguity from the headline?

If no subheadline exists and the headline doesn't fully communicate the value proposition, deduct 10 points from this category.

---

## Category 2: CTA Design & Copy (18%)

CTA copy specificity is the second-largest conversion lever. First-person pronouns ("Get my free trial") lift CTR by 90%. Urgency language can drive +332% conversion. Generic labels like "Submit" or "Learn More" are conversion killers.

### Sub-Criteria

| Criterion | Weight | 5 (Excellent) | 3 (Adequate) | 1 (Poor) |
|-----------|--------|---------------|---------------|----------|
| Button copy | 30% | Action verb + specific value + optional risk reducer. ("Start Free 14-Day Trial") | Action verb present but generic value. ("Get Started") | Generic or passive. ("Submit", "Click Here", "Learn More") |
| Visual prominence | 25% | Most visually prominent element on page. High contrast (4.5:1+ WCAG AA). Generous whitespace. Min 44px height. | Visible but doesn't dominate. Adequate contrast. | Blends into page. Low contrast. Undersized or crowded. |
| Placement strategy | 20% | Above fold + repeated after key sections (proof, features, testimonials). Sticky on mobile. | Present above fold. Maybe one repeat. | Below fold only, or single instance on a long page. |
| Singular focus | 15% | One primary CTA. Secondary CTA (if any) is clearly subordinate visually. No competing actions. | Primary CTA clear but 2-3 secondary options create mild decision fatigue. | Multiple CTAs of equal visual weight. Navigation links compete for attention. |
| Risk reduction | 10% | Microcopy near CTA reduces anxiety: "No credit card required", "Cancel anytime", "Free forever." | Some reassurance present but not adjacent to CTA. | No friction-reducing microcopy. Visitor must guess the commitment level. |

### CTA Copy Formulas That Convert
- Action verb + value: "Get Free Access"
- Action verb + timeframe: "Start 14-Day Trial"
- First-person + outcome: "Build My Dashboard"
- Urgency + value: "Claim Your Spot — Limited to 500"

---

## Category 3: Trust & Social Proof (15%)

90% of buyers say social proof influences their purchasing decisions. Trust signals can lift conversions 34%+ on their own. The absence of proof forces visitors to trust your claims at face value — most won't.

### Sub-Criteria

| Criterion | Weight | 5 (Excellent) | 3 (Adequate) | 1 (Poor) |
|-----------|--------|---------------|---------------|----------|
| Social proof variety | 25% | 3+ types present: logos, testimonials, metrics, case study stats, ratings. Layered throughout page. | 1-2 types. Concentrated in one section. | No social proof, or only a vague claim ("Trusted by thousands"). |
| Testimonial quality | 25% | Real names, photos, titles, specific metrics. First-person voice. 1-2 sentences. Quote leads with the result. | Names present but generic praise. No metrics. ("Great product!") | Anonymous, fabricated-feeling, or absent entirely. |
| Credibility indicators | 20% | Security badges, compliance logos (SOC2, GDPR), payment trust marks, privacy policy link, company address/contact. | Some badges present. Privacy policy exists but buried. | No security indicators. No way to verify legitimacy. |
| Proof placement | 15% | Logos below hero. Testimonials after features. Trust badges near form/CTA. Proof appears before every conversion point. | Proof exists but clustered in one location. Major conversion points lack adjacent proof. | Proof only in footer or completely absent from conversion flow. |
| Specificity of claims | 15% | Quantified results: "Reduced onboarding time by 60%." Named companies. Verifiable metrics. | Directional claims: "Significant improvement." Named companies but no numbers. | Vague or unverifiable: "Industry-leading results." |

### Social Proof Hierarchy (by trust impact)
1. Specific metrics with named company ("Acme Corp reduced costs 40%")
2. Customer logos (3-5 recognizable brands)
3. Detailed testimonials with photos + titles
4. User count / scale signal ("50,000+ teams")
5. Star ratings (4.5+)
6. Generic badges and awards

---

## Category 4: Message Match & Narrative (12%)

Message match — the alignment between the ad/source and the landing page — is the primary driver of bounce rate. If a visitor clicks an ad promising "free audit for e-commerce brands" and lands on a generic homepage, they leave. The narrative structure (PAS, BAB, AIDA) determines whether those who stay are compelled to act.

### Sub-Criteria

| Criterion | Weight | 5 (Excellent) | 3 (Adequate) | 1 (Poor) |
|-----------|--------|---------------|---------------|----------|
| Ad-to-page congruence | 30% | Headline echoes exact ad language. Visual style matches. Promise from ad is immediately fulfilled on page. | Same general topic but different framing or emphasis. Visitor has to reconnect the dots. | No visible connection between traffic source and page content. Generic page serves all traffic. |
| Narrative structure | 25% | Clear framework: PAS (Problem-Agitate-Solution), BAB (Before-After-Bridge), or AIDA. Reader is guided from problem awareness to action. | Some story arc present but disjointed. Jumps between problem and solution without building tension. | No narrative. Random arrangement of features, testimonials, and CTAs. |
| Section sequence | 20% | Follows optimal flow: Hero → Proof → Problem → Solution/Features → How It Works → Testimonials → Pricing → FAQ → Final CTA. | Most key sections present but out of optimal order. | Missing 3+ critical sections, or sequence makes no logical sense. |
| Audience specificity | 15% | Copy clearly addresses a defined persona. Language matches their vocabulary. Problems cited are specific to their role/industry. | Somewhat targeted but could apply to multiple audiences. | Completely generic. Could be about any product for any person. |
| Objection handling | 10% | Proactively addresses top 3-5 objections (price, complexity, switching cost, trust). FAQ section handles the rest. | Some objections addressed but gaps remain. FAQ exists but is thin. | No objection handling. Visitor's concerns go unaddressed. |

---

## Category 5: Visual Design & Layout (10%)

Visual hierarchy directs attention to conversion elements. The F-pattern and Z-pattern govern how users scan pages. White space improves comprehension by up to 20%. A cluttered page creates cognitive overload — the silent conversion killer.

### Sub-Criteria

| Criterion | Weight | 5 (Excellent) | 3 (Adequate) | 1 (Poor) |
|-----------|--------|---------------|---------------|----------|
| Visual hierarchy | 25% | Clear size/color/space hierarchy. Eye naturally flows: headline → visual → CTA. Directional cues (arrows, images, whitespace) guide attention. | Hierarchy exists but some competing elements. Occasional confusion about where to look next. | Flat design. Everything same size/weight. No clear visual priority. |
| Above-the-fold content | 25% | Headline, subheadline, hero visual, and primary CTA all visible without scrolling (desktop & mobile). Core value communicated in <5 seconds. | Most elements present above fold but CTA requires scroll, or value proposition is unclear. | CTA below fold. Headline is vague. Visitor must scroll to understand what the page is about. |
| White space & breathing room | 20% | Generous spacing between sections. Content is scannable. No element feels cramped. Text blocks are short (3-4 sentences max). | Adequate spacing but some sections feel dense. Occasional wall of text. | Cramped layout. Elements touching or overlapping. Dense text blocks. Overwhelming at first glance. |
| Imagery & visuals | 15% | Hero image shows outcome, not product. Images support the message. No stock photo feel. Compressed (<200KB hero). | Relevant imagery but generic execution. Stock photos that don't feel specific to the offer. | No imagery, irrelevant visuals, or heavy unoptimized images that slow the page. |
| Consistency & professionalism | 15% | Cohesive color palette (2-3 primary colors). Consistent typography. Aligned elements. Looks like a brand, not a template. | Mostly consistent with minor inconsistencies. Template-based but customized. | Inconsistent fonts, colors, spacing. Looks cobbled together. Damages trust. |

---

## Category 6: Form Optimization (8%)

Every unnecessary form field reduces conversion by approximately 11%. The optimal first-conversion form has 2-3 fields maximum (name + email, or email only). Single-column layouts convert 17% better than multi-column. Labels above fields outperform inline labels.

If the page has no form (e.g., click-through page to checkout), redistribute this 8% weight proportionally across Categories 1-5 and note "No form present — weight redistributed."

### Sub-Criteria

| Criterion | Weight | 5 (Excellent) | 3 (Adequate) | 1 (Poor) |
|-----------|--------|---------------|---------------|----------|
| Field count | 30% | 1-3 fields for first conversion. Progressive profiling for additional data. Only asks what's necessary for next step. | 4-5 fields. Most are relevant but some could be deferred. | 6+ fields. Asks for phone, company size, budget on first touch. |
| Layout & labels | 25% | Single-column. Labels above fields. Clear required vs. optional indicators. Descriptive labels ("Work Email" not "Email"). | Single-column but inline labels (disappear on focus). Required indicators present. | Multi-column layout. Labels inside fields. No required/optional distinction. |
| Friction reduction | 20% | Autofill enabled. Smart defaults. Dropdowns for predictable answers. Error messages are inline and specific. | Some autofill. Basic validation. Error messages present but generic. | No autofill. Validation only on submit. Cryptic error messages or none. |
| CTA button copy | 15% | Describes the action: "Get My Free Report", "Create Account". Matches the value exchange. | Action-oriented but generic: "Sign Up", "Register". | "Submit" or no label customization. |
| Privacy reassurance | 10% | Adjacent microcopy: "We'll never share your email." Privacy policy linked. GDPR/compliance noted if applicable. | Privacy policy exists in footer. No adjacent reassurance. | No privacy information. Visitor has no idea what happens with their data. |

---

## Category 7: Mobile & Performance (7%)

60%+ of traffic is mobile. A 1-second load delay costs 7% conversion. 3 seconds costs 40%. Core Web Vitals (LCP, INP, CLS) are both ranking factors and conversion factors. This category is table stakes — you can't convert visitors who leave before the page loads.

### Sub-Criteria

| Criterion | Weight | 5 (Excellent) | 3 (Adequate) | 1 (Poor) |
|-----------|--------|---------------|---------------|----------|
| Mobile responsiveness | 25% | Full-width CTA. 16px+ font. 48x48px tap targets. No horizontal scroll. Content reflows cleanly. Sticky CTA on scroll. | Responsive but some elements awkward. Tap targets borderline. CTA not sticky. | Not responsive. Horizontal scrolling required. Tiny text/buttons. Desktop layout on mobile. |
| Page load speed | 25% | LCP <2.5s. Total page weight <2MB. Hero image <200KB. JS <200KB. Lazy loading below fold. | LCP 2.5-4s. Page weight 2-4MB. Some optimization but room for improvement. | LCP >4s. Heavy unoptimized images. Render-blocking scripts. Chat widgets loading synchronously. |
| Core Web Vitals | 20% | LCP <2.5s, INP <200ms, CLS <0.1. All "good" thresholds met. | 1-2 metrics in "needs improvement" range. | Any metric in "poor" range. Layout shifts visible. Interactions feel sluggish. |
| Image optimization | 15% | WebP/AVIF with fallbacks. Responsive srcset. Lazy loading. Compressed to 80-90% quality. | Some optimization but older formats (JPEG/PNG). No srcset. | Uncompressed originals. No lazy loading. 1MB+ hero images. |
| Third-party script management | 15% | Analytics/tracking async. Chat widgets deferred until engagement. No render-blocking third-party scripts. | Most scripts async but 1-2 blocking. Chat widget loads on page load. | Multiple blocking scripts. Heavy analytics. Auto-playing video. Slow third-party resources. |

---

## Category 8: Post-Conversion & Measurement (5%)

The thank-you page is the most underutilized conversion asset. Post-conversion optimization (confirmation emails, lead scoring, nurture sequences) determines whether a conversion becomes revenue. Measurement setup determines whether you can actually improve.

### Sub-Criteria

| Criterion | Weight | 5 (Excellent) | 3 (Adequate) | 1 (Poor) |
|-----------|--------|---------------|---------------|----------|
| Thank-you page strategy | 25% | Sets expectations (what happens next, when). Offers secondary conversion (upsell, referral, content). Includes social proof reinforcement. | Confirms submission. Basic "we'll be in touch." | Generic redirect. No confirmation page. Or worse — stays on form page with no feedback. |
| Tracking & analytics | 25% | GA4 conversion events configured. UTM strategy in place. Form submission tracked as conversion. Scroll depth, CTA clicks tracked. | Basic pageview tracking. Form submission tracked but no micro-conversions. | No analytics. Or analytics present but no conversion tracking configured. |
| Confirmation flow | 20% | Immediate confirmation email (<60 seconds). Clear next steps. Value delivered (download link, access credentials). | Confirmation email sent but delayed or generic. | No confirmation email. Visitor unsure if submission worked. |
| Lead qualification | 15% | Form data feeds into CRM with lead scoring. Behavioral + firmographic scoring model. SQL threshold defined. | Data goes to CRM but no scoring. Manual qualification. | Data goes to a spreadsheet or generic inbox. No qualification process. |
| Nurture sequence | 15% | Triggered email sequence: education (Day 0-1) → proof (Day 2-7) → personalized outreach (Week 2-4). Behavior-based branching. | Basic drip campaign. Same sequence regardless of behavior. | No follow-up beyond confirmation email. |

---

## How to Run the Audit

### Step 1: Gather Input

Determine the input type and note what categories are fully scorable. See the Input Acceptance table above.

For live URLs, if browser tools are available, navigate to the page and capture:
- Full-page screenshot (desktop and mobile viewport)
- Page source for performance analysis
- Form structure and fields
- All visible copy

### Step 2: Score Each Category

Work through categories 1-8 sequentially. For each sub-criterion:
1. Assign a score of 1-5 based on the rubric descriptions
2. Note specific evidence for the score (quote the actual headline, describe the CTA, etc.)
3. Flag quick wins (high-impact, low-effort fixes)

### Step 3: Calculate Composite Score

```
Category Score = Sum of (sub-criterion score * sub-criterion weight) * 20
                 (converts 1-5 scale to 0-100)

Composite Score = Sum of (category score * category weight)
```

If a category is not scorable, redistribute its weight proportionally across scored categories.

### Step 4: Generate the Report

Structure the output as follows:

```
# Landing Page Score: [Page Name/URL]

## Overall: [Score]/100 — Grade [Letter]

### Quick Summary
[2-3 sentences: What's working. What's not. Biggest opportunity.]

### Category Scores

| Category | Score | Grade | Key Finding |
|----------|-------|-------|-------------|
| 1. Headline & Value Prop | XX/100 | X | [One-line finding] |
| 2. CTA Design & Copy | XX/100 | X | [One-line finding] |
| ... | ... | ... | ... |

### Top 3 Priority Fixes (Biggest Conversion Impact)

1. **[Fix Name]** — Category X
   - Current state: [What's there now]
   - Recommended change: [Specific, actionable recommendation]
   - Expected impact: [Estimated conversion lift based on research benchmarks]
   - Effort: [Low / Medium / High]

2. ...
3. ...

### Detailed Category Breakdowns
[Full sub-criterion scoring with evidence for each category]

### Bonus: Competitive Quick-Wins
[If comparable pages were reviewed or industry benchmarks apply, note them here]
```

### Step 5: Comparison Mode (Optional)

When comparing two pages, score both independently, then add:

```
### Head-to-Head Comparison

| Category | Page A | Page B | Winner | Why |
|----------|--------|--------|--------|-----|
| Headline & VP | 78 | 85 | B | More specific outcome language |
| ... | ... | ... | ... | ... |
| **Overall** | **XX** | **XX** | **X** | [Summary] |
```

---

## Key Benchmarks Reference

These benchmarks contextualize scores and recommendations:

| Metric | Benchmark | Source |
|--------|-----------|--------|
| Average landing page CR | 6.6% (all industries) | Unbounce 2024, 41K pages |
| Top-performing pages | 10-15%+ CR | Industry composite |
| Headline impact | +307% conversion from quality headline | A/B testing meta-analysis |
| CTA first-person pronouns | +90% CTR | CRO research |
| CTA urgency language | +332% conversion | Limited-time offer studies |
| Each form field removed | +11% conversion | Form optimization research |
| Social proof influence | 90% of buyers | Consumer behavior studies |
| Trust signals impact | +34% signups | PayPal case study |
| 1-second load delay | -7% conversion | Performance research |
| Readability (grade 5-7) | +56% conversion vs. grade 12+ | Flesch-Kincaid studies |
| Mobile conversion gap | 20-40% lower than desktop | Cross-device analysis |
| Dynamic personalization | +25.2% mobile conversion | 2025 personalization data |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't access the URL | Ask user for screenshots or copy. Score available categories only. Note limitations. |
| Page is a click-through (no form) | Redistribute Category 6 weight. Note in report. |
| Page serves multiple audiences | Score against the primary persona. Note if personalization/dynamic content would help. |
| User wants to compare 3+ pages | Score each independently first, then create a comparison matrix. |
| Page is pre-launch (wireframe/mockup) | Score structure and copy. Mark design/performance as "pending." Provide directional guidance. |
| Very short page (squeeze page) | Some categories will score lower by nature (narrative, sections). Benchmark against squeeze page standards, not full landing pages. |
