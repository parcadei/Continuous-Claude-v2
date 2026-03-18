"""
Landing Page Scaffold Generator

Generates a complete, production-ready HTML landing page scaffold with all 9 sections,
the full CSS component system, responsive design, and accessibility features.

Usage:
    python scaffold_page.py --name "Product Name" --output output.html

    # With customization
    python scaffold_page.py \
        --name "HotSchedules" \
        --primary-color "#2563EB" \
        --dark-bg "#1A1A2E" \
        --page-type lead-capture \
        --sections hero,proof,problem,features,how,testimonials,faq,final-cta \
        --output hotschedules-landing.html

Or import and use programmatically:
    from scaffold_page import generate_page
    html = generate_page(name="Product", primary_color="#2563EB")
"""

import argparse
import textwrap
from pathlib import Path


# ─── CSS Component System ────────────────────────────────────────────────────
# This is the full production CSS from references/component-library.md

def get_css(primary: str = "#2563EB", primary_dark: str = "#1D4ED8",
            primary_light: str = "#DBEAFE", dark_bg: str = "#1A1A2E") -> str:
    return f"""
:root {{
  --color-primary: {primary};
  --color-primary-dark: {primary_dark};
  --color-primary-light: {primary_light};
  --color-text: #1A1A2E;
  --color-text-muted: #6B7280;
  --color-bg: #FFFFFF;
  --color-bg-alt: #F8F9FA;
  --color-bg-dark: {dark_bg};
  --color-border: #E5E7EB;
  --color-success: #059669;
  --color-white: #FFFFFF;
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-2xl: 5rem;
  --space-3xl: 7.5rem;
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-size-hero: clamp(2rem, 5vw, 3.5rem);
  --font-size-h2: clamp(1.5rem, 3vw, 2.25rem);
  --font-size-h3: 1.25rem;
  --font-size-body: 1.125rem;
  --font-size-small: 0.875rem;
  --line-height: 1.7;
  --max-width: 1200px;
  --max-width-narrow: 720px;
  --border-radius: 8px;
  --border-radius-lg: 12px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 30px rgba(0,0,0,0.12);
}}
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
html{{scroll-behavior:smooth;-webkit-text-size-adjust:100%}}
body{{font-family:var(--font-family);font-size:var(--font-size-body);line-height:var(--line-height);color:var(--color-text);background:var(--color-bg);-webkit-font-smoothing:antialiased}}
img{{max-width:100%;height:auto;display:block}}
a{{text-decoration:none;color:inherit}}
h1,h2,h3{{line-height:1.2;font-weight:700;color:var(--color-text)}}
.container{{width:100%;max-width:var(--max-width);margin:0 auto;padding:0 var(--space-md)}}
.narrow{{max-width:var(--max-width-narrow)}}
.text-center{{text-align:center}}
section{{padding:var(--space-2xl) 0}}

/* Hero */
.hero{{padding:var(--space-3xl) 0 var(--space-2xl);min-height:85vh;display:flex;align-items:center}}
.hero-grid{{display:grid;grid-template-columns:1fr;gap:var(--space-xl);align-items:center}}
.hero-headline{{font-size:var(--font-size-hero);letter-spacing:-0.02em;margin-bottom:var(--space-sm)}}
.hero-subheadline{{font-size:1.25rem;color:var(--color-text-muted);margin-bottom:var(--space-lg);max-width:540px}}
.hero-cta-group{{display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-xs)}}

/* Proof Bar */
.proof-bar{{padding:var(--space-lg) 0;background:var(--color-bg-alt)}}
.proof-label{{font-size:var(--font-size-small);color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em;text-align:center;margin-bottom:var(--space-md)}}
.proof-logos{{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:var(--space-lg)}}
.proof-metrics{{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--space-xl)}}
.proof-metric{{text-align:center}}
.metric-number{{display:block;font-size:2rem;font-weight:800;color:var(--color-primary)}}
.metric-label{{font-size:var(--font-size-small);color:var(--color-text-muted)}}
.logo-placeholder{{width:120px;height:40px;background:var(--color-border);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:var(--font-size-small);color:var(--color-text-muted);opacity:0.6}}

/* Problem */
.problem-section .bridge-text{{font-size:1.15rem;margin-top:var(--space-md)}}

/* Features */
.features-grid{{display:grid;grid-template-columns:1fr;gap:var(--space-lg)}}
.feature-card{{padding:var(--space-lg);background:var(--color-bg);border-radius:var(--border-radius-lg);border:1px solid var(--color-border);transition:box-shadow 0.2s}}
.feature-card:hover{{box-shadow:var(--shadow-md)}}
.feature-icon{{font-size:2.5rem;margin-bottom:var(--space-sm)}}
.feature-title{{font-size:var(--font-size-h3);margin-bottom:var(--space-xs)}}
.feature-description{{color:var(--color-text-muted);font-size:1rem}}

/* How It Works */
.steps-grid{{display:grid;grid-template-columns:1fr;gap:var(--space-lg)}}
.step{{text-align:center}}
.step-number{{width:56px;height:56px;border-radius:50%;background:var(--color-primary);color:var(--color-white);display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;margin-bottom:var(--space-sm)}}
.step-title{{font-size:var(--font-size-h3);margin-bottom:var(--space-xs)}}
.step-description{{color:var(--color-text-muted);font-size:1rem}}

/* Testimonials */
.testimonials-grid{{display:grid;grid-template-columns:1fr;gap:var(--space-lg)}}
.testimonial-card{{padding:var(--space-lg);background:var(--color-bg);border-radius:var(--border-radius-lg);border-left:4px solid var(--color-primary);box-shadow:var(--shadow-sm)}}
.testimonial-quote{{font-size:1.05rem;font-style:italic;margin-bottom:var(--space-md);line-height:1.6}}
.testimonial-attribution{{display:flex;align-items:center;gap:var(--space-sm)}}
.testimonial-avatar{{width:48px;height:48px;border-radius:50%;background:var(--color-primary-light);color:var(--color-primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:var(--font-size-small);flex-shrink:0}}
.testimonial-name{{font-style:normal;font-weight:600;display:block}}
.testimonial-role{{font-size:var(--font-size-small);color:var(--color-text-muted)}}

/* Pricing */
.pricing-grid{{display:grid;grid-template-columns:1fr;gap:var(--space-lg);align-items:start}}
.pricing-card{{padding:var(--space-xl);background:var(--color-bg);border-radius:var(--border-radius-lg);border:2px solid var(--color-border);text-align:center;position:relative}}
.pricing-card.recommended{{border-color:var(--color-primary);box-shadow:var(--shadow-lg);transform:scale(1.03)}}
.recommended-badge{{position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:var(--color-primary);color:var(--color-white);padding:4px 16px;border-radius:20px;font-size:var(--font-size-small);font-weight:600}}
.plan-name{{font-size:var(--font-size-h3);margin-bottom:var(--space-xs)}}
.price-amount{{font-size:2.5rem;font-weight:800;color:var(--color-text)}}
.price-period{{font-size:1rem;color:var(--color-text-muted)}}
.plan-features{{list-style:none;text-align:left;margin:var(--space-md) 0}}
.plan-features li{{padding:var(--space-xs) 0;border-bottom:1px solid var(--color-border);font-size:0.95rem}}
.plan-features li::before{{content:"✓ ";color:var(--color-success);font-weight:700}}

/* FAQ */
.faq-list{{display:flex;flex-direction:column}}
.faq-item{{border-bottom:1px solid var(--color-border);padding:var(--space-md) 0}}
.faq-question{{font-weight:600;font-size:1.05rem;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}}
.faq-question::after{{content:"+";font-size:1.5rem;color:var(--color-primary);transition:transform 0.2s}}
.faq-item[open] .faq-question::after{{content:"−"}}
.faq-answer{{padding-top:var(--space-sm);color:var(--color-text-muted)}}

/* Final CTA */
.final-cta-section{{background:var(--color-bg-dark);color:var(--color-white);padding:var(--space-3xl) 0}}
.final-cta-section h2,.final-headline{{color:var(--color-white)}}
.final-headline{{font-size:var(--font-size-h2);margin-bottom:var(--space-sm)}}
.final-subtext{{font-size:1.125rem;opacity:0.85;margin-bottom:var(--space-lg)}}

/* Form */
.form-card{{background:var(--color-bg);border-radius:var(--border-radius-lg);padding:var(--space-xl);box-shadow:var(--shadow-lg);max-width:480px;margin:0 auto}}
.form-headline{{font-size:var(--font-size-h3);margin-bottom:var(--space-md);text-align:center}}
.lp-form{{display:flex;flex-direction:column;gap:var(--space-sm)}}
.form-group{{display:flex;flex-direction:column;gap:4px}}
.form-group label{{font-size:var(--font-size-small);font-weight:600;color:var(--color-text)}}
.form-group input,.form-group select,.form-group textarea{{padding:12px 16px;font-size:1rem;font-family:var(--font-family);border:2px solid var(--color-border);border-radius:var(--border-radius);transition:border-color 0.2s;width:100%;background:var(--color-bg)}}
.form-group input:focus,.form-group select:focus{{outline:none;border-color:var(--color-primary);box-shadow:0 0 0 3px var(--color-primary-light)}}

/* CTA Buttons */
.cta-primary{{display:inline-flex;align-items:center;justify-content:center;padding:16px 32px;font-size:1.125rem;font-weight:600;color:var(--color-white);background:var(--color-primary);border:none;border-radius:var(--border-radius);cursor:pointer;transition:background 0.2s,transform 0.1s,box-shadow 0.2s;min-height:48px;text-align:center;line-height:1.2}}
.cta-primary:hover{{background:var(--color-primary-dark);transform:translateY(-1px);box-shadow:var(--shadow-md)}}
.cta-primary:focus-visible{{outline:3px solid var(--color-primary);outline-offset:2px}}
.cta-large{{padding:20px 48px;font-size:1.25rem}}
.cta-full-width{{width:100%}}
.cta-secondary{{display:inline-flex;align-items:center;justify-content:center;padding:14px 28px;font-size:1rem;font-weight:600;color:var(--color-primary);background:transparent;border:2px solid var(--color-primary);border-radius:var(--border-radius);cursor:pointer;transition:background 0.2s,color 0.2s;min-height:48px}}
.cta-secondary:hover{{background:var(--color-primary);color:var(--color-white)}}

/* Microcopy */
.microcopy{{font-size:var(--font-size-small);color:var(--color-text-muted);margin-top:var(--space-xs)}}
.microcopy-light{{color:rgba(255,255,255,0.7)}}

/* Section headlines */
.section-headline{{font-size:var(--font-size-h2);margin-bottom:var(--space-sm)}}
.section-subheadline{{font-size:var(--font-size-body);color:var(--color-text-muted);margin-bottom:var(--space-xl)}}

/* Image placeholder */
.image-placeholder{{width:100%;aspect-ratio:16/10;background:linear-gradient(135deg,var(--color-primary-light),var(--color-bg-alt));border-radius:var(--border-radius-lg);display:flex;align-items:center;justify-content:center;color:var(--color-text-muted);font-size:var(--font-size-small);border:2px dashed var(--color-border)}}

/* Accessibility */
.skip-link{{position:absolute;top:-100%;left:var(--space-sm);background:var(--color-primary);color:var(--color-white);padding:var(--space-xs) var(--space-sm);border-radius:var(--border-radius);z-index:100;font-size:var(--font-size-small)}}
.skip-link:focus{{top:var(--space-sm)}}

/* Animations */
.fade-in{{opacity:0;transform:translateY(20px);transition:opacity 0.6s ease,transform 0.6s ease}}
.fade-in.visible{{opacity:1;transform:translateY(0)}}

/* Responsive */
@media(min-width:768px){{
  .features-grid,.testimonials-grid{{grid-template-columns:repeat(2,1fr)}}
  .pricing-grid{{grid-template-columns:repeat(2,1fr)}}
  .steps-grid{{grid-template-columns:repeat(3,1fr)}}
}}
@media(min-width:1024px){{
  .hero-grid{{grid-template-columns:1.2fr 1fr}}
  .features-grid,.testimonials-grid{{grid-template-columns:repeat(3,1fr)}}
  .pricing-grid{{grid-template-columns:repeat(3,1fr)}}
}}
"""


# ─── Section Templates ────────────────────────────────────────────────────────

SECTIONS = {
    "hero": """
  <!-- ═══ HERO ═══ -->
  <section id="hero" class="hero">
    <div class="container hero-grid">
      <div class="hero-content">
        <h1 class="hero-headline">[Your 6-12 Word Headline Here]</h1>
        <p class="hero-subheadline">[15-25 word subheadline that extends the headline and explains how]</p>
        <div class="hero-cta-group">
          <a href="#form" class="cta-primary">[Action Verb + Value]</a>
          <p class="microcopy">[Risk reducer: "No credit card required"]</p>
        </div>
      </div>
      <div class="hero-visual">
        <div class="image-placeholder" role="img" aria-label="Hero image showing the outcome">
          <span>Hero Image: Show the outcome, not the product</span>
        </div>
      </div>
    </div>
  </section>""",

    "proof": """
  <!-- ═══ SOCIAL PROOF BAR ═══ -->
  <section class="proof-bar">
    <div class="container">
      <p class="proof-label">Trusted by leading brands</p>
      <div class="proof-logos">
        <div class="logo-placeholder" aria-label="Company 1">Logo 1</div>
        <div class="logo-placeholder" aria-label="Company 2">Logo 2</div>
        <div class="logo-placeholder" aria-label="Company 3">Logo 3</div>
        <div class="logo-placeholder" aria-label="Company 4">Logo 4</div>
        <div class="logo-placeholder" aria-label="Company 5">Logo 5</div>
      </div>
    </div>
  </section>""",

    "problem": """
  <!-- ═══ PROBLEM ═══ -->
  <section id="problem" class="problem-section fade-in">
    <div class="container narrow text-center">
      <h2 class="section-headline">[Name the Pain]</h2>
      <p>[Paragraph 1: Describe the specific painful scenario your audience faces]</p>
      <p>[Paragraph 2: Show the consequences and compounding frustration]</p>
      <p class="bridge-text"><strong>There's a better way.</strong></p>
    </div>
  </section>""",

    "features": """
  <!-- ═══ FEATURES / SOLUTION ═══ -->
  <section id="features" class="features-section bg-alt fade-in">
    <div class="container text-center">
      <h2 class="section-headline">[Solution-Oriented Headline]</h2>
      <p class="section-subheadline">[One supporting line]</p>
      <div class="features-grid">

        <div class="feature-card">
          <div class="feature-icon" aria-hidden="true">⚡</div>
          <h3 class="feature-title">[Benefit Headline 1]</h3>
          <p class="feature-description">[FAB: Feature → Advantage → Benefit]</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" aria-hidden="true">📊</div>
          <h3 class="feature-title">[Benefit Headline 2]</h3>
          <p class="feature-description">[FAB: Feature → Advantage → Benefit]</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon" aria-hidden="true">🛡️</div>
          <h3 class="feature-title">[Benefit Headline 3]</h3>
          <p class="feature-description">[FAB: Feature → Advantage → Benefit]</p>
        </div>

      </div>
    </div>
  </section>""",

    "how": """
  <!-- ═══ HOW IT WORKS ═══ -->
  <section id="how-it-works" class="how-section fade-in">
    <div class="container text-center">
      <h2 class="section-headline">How It Works</h2>
      <div class="steps-grid">

        <div class="step">
          <div class="step-number">1</div>
          <h3 class="step-title">[Low-Friction Start]</h3>
          <p class="step-description">[One sentence emphasizing ease]</p>
        </div>

        <div class="step">
          <div class="step-number">2</div>
          <h3 class="step-title">[Core Value Moment]</h3>
          <p class="step-description">[One sentence showing the magic]</p>
        </div>

        <div class="step">
          <div class="step-number">3</div>
          <h3 class="step-title">[Outcome Achieved]</h3>
          <p class="step-description">[One sentence painting the result]</p>
        </div>

      </div>
    </div>
  </section>""",

    "testimonials": """
  <!-- ═══ TESTIMONIALS ═══ -->
  <section id="testimonials" class="testimonials-section bg-alt fade-in">
    <div class="container text-center">
      <h2 class="section-headline">What Our Customers Say</h2>
      <div class="testimonials-grid">

        <blockquote class="testimonial-card">
          <p class="testimonial-quote">"[Quote leading with specific result or metric]"</p>
          <footer class="testimonial-attribution">
            <div class="testimonial-avatar">JD</div>
            <div>
              <cite class="testimonial-name">Jane Doe</cite>
              <span class="testimonial-role">VP Operations, Acme Corp</span>
            </div>
          </footer>
        </blockquote>

        <blockquote class="testimonial-card">
          <p class="testimonial-quote">"[Quote about a different benefit or outcome]"</p>
          <footer class="testimonial-attribution">
            <div class="testimonial-avatar">JS</div>
            <div>
              <cite class="testimonial-name">John Smith</cite>
              <span class="testimonial-role">Director of Ops, Beta Inc</span>
            </div>
          </footer>
        </blockquote>

        <blockquote class="testimonial-card">
          <p class="testimonial-quote">"[Quote about ease of adoption or ROI]"</p>
          <footer class="testimonial-attribution">
            <div class="testimonial-avatar">MJ</div>
            <div>
              <cite class="testimonial-name">Maria Johnson</cite>
              <span class="testimonial-role">GM, Gamma Foods</span>
            </div>
          </footer>
        </blockquote>

      </div>
    </div>
  </section>""",

    "pricing": """
  <!-- ═══ PRICING ═══ -->
  <section id="pricing" class="pricing-section fade-in">
    <div class="container text-center">
      <h2 class="section-headline">Simple, Transparent Pricing</h2>
      <div class="pricing-grid">

        <div class="pricing-card">
          <h3 class="plan-name">Starter</h3>
          <div class="plan-price">
            <span class="price-amount">$XX</span>
            <span class="price-period">/month</span>
          </div>
          <p style="color:var(--color-text-muted);margin-bottom:var(--space-sm)">[Who this is for]</p>
          <ul class="plan-features">
            <li>[Feature 1]</li>
            <li>[Feature 2]</li>
            <li>[Feature 3]</li>
          </ul>
          <a href="#form" class="cta-secondary" style="margin-top:auto">Get Started</a>
        </div>

        <div class="pricing-card recommended">
          <div class="recommended-badge">Most Popular</div>
          <h3 class="plan-name">Professional</h3>
          <div class="plan-price">
            <span class="price-amount">$XX</span>
            <span class="price-period">/month</span>
          </div>
          <p style="color:var(--color-text-muted);margin-bottom:var(--space-sm)">[Who this is for]</p>
          <ul class="plan-features">
            <li>Everything in Starter, plus:</li>
            <li>[Feature 4]</li>
            <li>[Feature 5]</li>
          </ul>
          <a href="#form" class="cta-primary" style="margin-top:auto">Start Free Trial</a>
        </div>

        <div class="pricing-card">
          <h3 class="plan-name">Enterprise</h3>
          <div class="plan-price">
            <span class="price-amount">Custom</span>
          </div>
          <p style="color:var(--color-text-muted);margin-bottom:var(--space-sm)">[Who this is for]</p>
          <ul class="plan-features">
            <li>Everything in Pro, plus:</li>
            <li>[Feature 6]</li>
            <li>[Feature 7]</li>
          </ul>
          <a href="#form" class="cta-secondary" style="margin-top:auto">Contact Sales</a>
        </div>

      </div>
    </div>
  </section>""",

    "faq": """
  <!-- ═══ FAQ ═══ -->
  <section id="faq" class="faq-section bg-alt fade-in">
    <div class="container narrow">
      <h2 class="section-headline text-center">Frequently Asked Questions</h2>
      <div class="faq-list">

        <details class="faq-item" open>
          <summary class="faq-question">[Objection phrased as a question]</summary>
          <div class="faq-answer">
            <p>[Reassurance first, then explanation. 2-3 sentences.]</p>
          </div>
        </details>

        <details class="faq-item">
          <summary class="faq-question">[Pricing or commitment question]</summary>
          <div class="faq-answer">
            <p>[Clear, honest answer]</p>
          </div>
        </details>

        <details class="faq-item">
          <summary class="faq-question">[Switching or setup question]</summary>
          <div class="faq-answer">
            <p>[Emphasize ease and support]</p>
          </div>
        </details>

        <details class="faq-item">
          <summary class="faq-question">[Security or data question]</summary>
          <div class="faq-answer">
            <p>[Trust-building answer with specifics]</p>
          </div>
        </details>

        <details class="faq-item">
          <summary class="faq-question">[Support or help question]</summary>
          <div class="faq-answer">
            <p>[Responsive, helpful answer]</p>
          </div>
        </details>

      </div>
    </div>
  </section>""",

    "form": """
  <!-- ═══ FORM ═══ -->
  <section id="form" class="form-section fade-in">
    <div class="container narrow">
      <div class="form-card">
        <h2 class="form-headline">[Value-Oriented: "Get Your Free Demo"]</h2>
        <form action="#" method="POST" class="lp-form" novalidate>
          <div class="form-group">
            <label for="name">Your Name</label>
            <input type="text" id="name" name="name" required autocomplete="name" placeholder="Jane Smith">
          </div>
          <div class="form-group">
            <label for="email">Work Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" placeholder="jane@company.com">
          </div>
          <button type="submit" class="cta-primary cta-full-width">[Action Verb + Value]</button>
          <p class="microcopy text-center">We'll never share your email. <a href="#" style="color:var(--color-primary)">Privacy Policy</a></p>
        </form>
      </div>
    </div>
  </section>""",

    "final-cta": """
  <!-- ═══ FINAL CTA ═══ -->
  <section id="final-cta" class="final-cta-section">
    <div class="container narrow text-center">
      <h2 class="final-headline">[Restate the Key Benefit — Different Phrasing]</h2>
      <p class="final-subtext">[One line with urgency or scarcity]</p>
      <a href="#form" class="cta-primary cta-large">[Same CTA Copy as Hero]</a>
      <p class="microcopy microcopy-light">[Risk reducer repeated]</p>
    </div>
  </section>""",
}


# ─── Page Type Presets ────────────────────────────────────────────────────────

PAGE_TYPES = {
    "lead-capture": ["hero", "proof", "problem", "features", "how", "testimonials", "form", "faq", "final-cta"],
    "squeeze": ["hero", "proof", "final-cta"],
    "sales": ["hero", "proof", "problem", "features", "how", "testimonials", "pricing", "faq", "final-cta"],
    "click-through": ["hero", "proof", "problem", "features", "how", "testimonials", "faq", "final-cta"],
    "event": ["hero", "proof", "problem", "features", "how", "testimonials", "form", "faq", "final-cta"],
}


def generate_page(
    name: str = "Product",
    primary_color: str = "#2563EB",
    primary_dark: str = "#1D4ED8",
    primary_light: str = "#DBEAFE",
    dark_bg: str = "#1A1A2E",
    page_type: str = "lead-capture",
    sections: list[str] | None = None,
) -> str:
    """Generate a complete HTML landing page scaffold."""

    if sections is None:
        sections = PAGE_TYPES.get(page_type, PAGE_TYPES["lead-capture"])

    css = get_css(primary_color, primary_dark, primary_light, dark_bg)

    section_html = "\n".join(
        SECTIONS[s] for s in sections if s in SECTIONS
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{name} — [Value Proposition]</title>
  <meta name="description" content="[Meta description: 150-160 chars summarizing the offer and benefit]">

  <!-- OG Tags for Social Sharing -->
  <meta property="og:title" content="{name} — [Value Proposition]">
  <meta property="og:description" content="[Same as meta description]">
  <meta property="og:type" content="website">
  <meta property="og:image" content="[URL to OG image — 1200x630px]">

  <style>
{css}
  </style>
</head>
<body>

  <a href="#hero" class="skip-link">Skip to content</a>

  <main>
{section_html}
  </main>

  <footer style="padding:var(--space-lg) 0;text-align:center;font-size:var(--font-size-small);color:var(--color-text-muted);border-top:1px solid var(--color-border)">
    <div class="container">
      <p>&copy; {name} {2026}. All rights reserved. | <a href="#" style="color:var(--color-primary)">Privacy Policy</a> | <a href="#" style="color:var(--color-primary)">Terms</a></p>
    </div>
  </footer>

  <!-- Scroll Animation -->
  <script>
    const observer = new IntersectionObserver((entries) => {{
      entries.forEach(entry => {{
        if (entry.isIntersecting) entry.target.classList.add('visible');
      }});
    }}, {{ threshold: 0.1 }});
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  </script>

  <!-- TODO: Add GA4/GTM tracking snippet here -->

</body>
</html>"""


def main():
    parser = argparse.ArgumentParser(description="Landing Page Scaffold Generator")
    parser.add_argument("--name", default="Product", help="Product/brand name")
    parser.add_argument("--primary-color", default="#2563EB", help="Primary color hex")
    parser.add_argument("--primary-dark", default="#1D4ED8", help="Primary dark hex")
    parser.add_argument("--primary-light", default="#DBEAFE", help="Primary light hex")
    parser.add_argument("--dark-bg", default="#1A1A2E", help="Dark background hex")
    parser.add_argument("--page-type", default="lead-capture",
                       choices=list(PAGE_TYPES.keys()),
                       help="Page type preset")
    parser.add_argument("--sections", default=None,
                       help="Comma-separated section list (overrides page-type)")
    parser.add_argument("--output", default="landing-page.html",
                       help="Output file path")
    args = parser.parse_args()

    sections = args.sections.split(",") if args.sections else None

    html = generate_page(
        name=args.name,
        primary_color=args.primary_color,
        primary_dark=args.primary_dark,
        primary_light=args.primary_light,
        dark_bg=args.dark_bg,
        page_type=args.page_type,
        sections=sections,
    )

    Path(args.output).write_text(html)
    print(f"Generated: {args.output}")
    print(f"Page type: {args.page_type}")
    print(f"Sections: {sections or PAGE_TYPES[args.page_type]}")
    size_kb = len(html.encode()) / 1024
    print(f"Size: {size_kb:.1f}KB")


if __name__ == "__main__":
    main()
