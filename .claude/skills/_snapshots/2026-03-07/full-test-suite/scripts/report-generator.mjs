#!/usr/bin/env node
/**
 * Report Generator - Combines functional + design audit results into a graded markdown report
 *
 * Usage: node report-generator.mjs [--functional path] [--design path] [--unit path] [--output path]
 *
 * Input: JSON files from browser-functional.mjs and design-audit.mjs
 * Output: Graded markdown report
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf('--' + name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const functionalPath = getArg('functional', './test-screenshots/functional-results.json');
const designPath = getArg('design', './design-audit-results.json');
const unitPath = getArg('unit', null);
const outputPath = getArg('output', './test-report.md');

// --- Load results ---
let functional = null;
let design = null;
let unit = null;

if (existsSync(functionalPath)) {
  functional = JSON.parse(readFileSync(functionalPath, 'utf8'));
}
if (existsSync(designPath)) {
  design = JSON.parse(readFileSync(designPath, 'utf8'));
}
if (unitPath && existsSync(unitPath)) {
  unit = JSON.parse(readFileSync(unitPath, 'utf8'));
}

// --- Scoring ---
const WEIGHTS = {
  unitTests: 25,
  apiTests: 10,
  routeSmoke: 15,
  performance: 15,
  accessibility: 15,
  designQuality: 20,
};

function grade(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

function scoreRouteSmoke(data) {
  if (!data?.routeSmoke?.length) return { score: 0, detail: 'No route data' };
  const passed = data.routeSmoke.filter(r => r.status === 'OK').length;
  const total = data.routeSmoke.length;
  const score = Math.round((passed / total) * 100);
  return { score, detail: `${passed}/${total} routes loaded`, passed, total };
}

function scorePerformance(data) {
  if (!data?.performance?.length) return { score: 100, detail: 'Skipped (quick mode)' };
  const valid = data.performance.filter(r => !r.error);
  if (valid.length === 0) return { score: 0, detail: 'No performance data collected' };
  const noWarnings = valid.filter(r => !r.warnings || r.warnings.length === 0).length;
  const score = Math.round((noWarnings / valid.length) * 100);
  const avgTtfb = Math.round(valid.reduce((s, r) => s + (r.ttfb || 0), 0) / valid.length);
  return { score, detail: `${noWarnings}/${valid.length} within thresholds, avg TTFB ${avgTtfb}ms`, avgTtfb };
}

function scoreAccessibility(data) {
  if (!data?.accessibility?.length) return { score: 100, detail: 'Skipped' };
  const totalIssues = data.accessibility.reduce((s, r) => s + (r.issueCount || 0), 0);
  const routes = data.accessibility.length;
  // Deduct 5 points per issue, floor at 0
  const score = Math.max(0, 100 - (totalIssues * 5));
  return { score, detail: `${totalIssues} issues across ${routes} routes`, totalIssues };
}

function scoreConsoleErrors(data) {
  if (!data?.consoleErrors) return { score: 100, detail: 'No errors' };
  const count = data.consoleErrors.length;
  // Deduct 10 points per error, floor at 0
  const score = Math.max(0, 100 - (count * 10));
  return { score, detail: `${count} console errors` };
}

function scoreDesignQuality(data) {
  if (!data?.checks?.length) return { score: 100, detail: 'No design data' };
  const total = data.checks.length;
  const passed = data.checks.filter(c => c.pass === true).length;
  const errors = data.checks.filter(c => c.pass === false && c.severity === 'error').length;
  const warnings = data.checks.filter(c => c.pass === false && c.severity === 'warning').length;
  const infos = data.checks.filter(c => c.pass === false && c.severity === 'info').length;
  // Proportional scoring: weight by severity (error=3, warning=2, info=1)
  const SEVERITY_WEIGHT = { error: 3, warning: 2, info: 1 };
  const maxWeight = data.checks.reduce((s, c) => s + (SEVERITY_WEIGHT[c.severity] || 1), 0);
  const penalty = (errors * 3) + (warnings * 2) + (infos * 1);
  const score = Math.max(0, Math.round((1 - penalty / maxWeight) * 100));
  return { score, detail: `${passed}/${total} passed, ${errors} errors, ${warnings} warnings`, passed, total, errors, warnings };
}

function scoreUnit(data) {
  if (!data) return { score: 100, detail: 'No unit test data provided' };
  const passed = data.passed || 0;
  const failed = data.failed || 0;
  const total = passed + failed;
  if (total === 0) return { score: 100, detail: 'No tests' };
  const score = Math.round((passed / total) * 100);
  return { score, detail: `${passed}/${total} passed`, passed, total };
}

// --- Calculate scores ---
const scores = {
  unitTests: scoreUnit(unit),
  routeSmoke: scoreRouteSmoke(functional),
  performance: scorePerformance(functional),
  accessibility: scoreAccessibility(functional),
  consoleErrors: scoreConsoleErrors(functional),
  designQuality: scoreDesignQuality(design),
};

// Weighted total
const weightedScore = Math.round(
  (scores.unitTests.score * WEIGHTS.unitTests +
   scores.routeSmoke.score * WEIGHTS.routeSmoke +
   scores.performance.score * WEIGHTS.performance +
   scores.accessibility.score * WEIGHTS.accessibility +
   scores.designQuality.score * WEIGHTS.designQuality) / 100
);

const overallGrade = grade(weightedScore);

// --- Generate markdown ---
const timestamp = new Date().toISOString().split('T')[0];
const depth = functional?.meta?.depth || design?.meta?.depth || 'unknown';
const baseUrl = functional?.meta?.baseUrl || design?.meta?.baseUrl || 'unknown';

let md = `# Full Test Report

**Date:** ${timestamp}
**Target:** ${baseUrl}
**Depth:** ${depth}
**Overall Grade:** ${overallGrade} (${weightedScore}/100)

---

## Score Breakdown

| Category | Score | Weight | Weighted | Details |
|----------|-------|--------|----------|---------|
| Unit Tests | ${scores.unitTests.score}/100 | ${WEIGHTS.unitTests}% | ${Math.round(scores.unitTests.score * WEIGHTS.unitTests / 100)} | ${scores.unitTests.detail} |
| Route Smoke | ${scores.routeSmoke.score}/100 | ${WEIGHTS.routeSmoke}% | ${Math.round(scores.routeSmoke.score * WEIGHTS.routeSmoke / 100)} | ${scores.routeSmoke.detail} |
| Performance | ${scores.performance.score}/100 | ${WEIGHTS.performance}% | ${Math.round(scores.performance.score * WEIGHTS.performance / 100)} | ${scores.performance.detail} |
| Accessibility | ${scores.accessibility.score}/100 | ${WEIGHTS.accessibility}% | ${Math.round(scores.accessibility.score * WEIGHTS.accessibility / 100)} | ${scores.accessibility.detail} |
| Design Quality | ${scores.designQuality.score}/100 | ${WEIGHTS.designQuality}% | ${Math.round(scores.designQuality.score * WEIGHTS.designQuality / 100)} | ${scores.designQuality.detail} |

`;

// --- Functional details ---
if (functional) {
  md += `## Functional Results\n\n`;

  // Route smoke
  md += `### Route Smoke Tests\n\n`;
  md += `| Route | Status | Title |\n|-------|--------|-------|\n`;
  for (const r of (functional.routeSmoke || [])) {
    const status = r.status === 'OK' ? 'PASS' : 'FAIL';
    md += `| ${r.route} | ${status} | ${r.title || r.error || '-'} |\n`;
  }
  md += '\n';

  // Performance
  if (functional.performance?.length) {
    md += `### Performance\n\n`;
    md += `| Route | TTFB | DOM Interactive | Load | LCP | Resources |\n|-------|------|----------------|------|-----|-----------|\n`;
    for (const r of functional.performance) {
      if (r.error) {
        md += `| ${r.route} | - | - | - | - | ${r.error} |\n`;
      } else {
        const warn = r.warnings?.length ? ' (!)' : '';
        md += `| ${r.route} | ${r.ttfb}ms${warn} | ${r.domInteractive}ms | ${r.loadComplete}ms | ${r.lcpTime || '-'}ms | ${r.resourceCount} |\n`;
      }
    }
    md += '\n';
  }

  // Accessibility
  if (functional.accessibility?.length) {
    md += `### Accessibility\n\n`;
    const totalIssues = functional.accessibility.reduce((s, r) => s + (r.issueCount || 0), 0);
    md += `Total issues: **${totalIssues}**\n\n`;

    if (totalIssues > 0) {
      // Group by type
      const byType = {};
      for (const r of functional.accessibility) {
        for (const issue of (r.issues || [])) {
          byType[issue.type] = (byType[issue.type] || 0) + 1;
        }
      }
      md += `| Issue Type | Count |\n|-----------|-------|\n`;
      for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
        md += `| ${type} | ${count} |\n`;
      }
      md += '\n';
    }
  }

  // Console errors
  if (functional.consoleErrors?.length) {
    md += `### Console Errors (${functional.consoleErrors.length})\n\n`;
    const unique = [...new Set(functional.consoleErrors.map(e => e.error))];
    for (const err of unique.slice(0, 10)) {
      md += `- \`${err.slice(0, 120)}\`\n`;
    }
    if (unique.length > 10) md += `- ... and ${unique.length - 10} more\n`;
    md += '\n';
  }
}

// --- Design details ---
if (design) {
  md += `## Design Audit Results\n\n`;
  md += `Checks run: **${design.meta?.checksRun || 0}** | Passed: **${design.summary?.passed || 0}** | Errors: **${design.summary?.errors || 0}** | Warnings: **${design.summary?.warnings || 0}**\n\n`;

  // Group by category
  const categories = {};
  for (const check of (design.checks || [])) {
    if (!categories[check.category]) categories[check.category] = [];
    categories[check.category].push(check);
  }

  for (const [cat, checks] of Object.entries(categories)) {
    md += `### ${cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
    md += `| Check | Route | Result | Details |\n|-------|-------|--------|---------|\n`;
    for (const c of checks) {
      const icon = c.pass === true ? 'PASS' : c.severity === 'error' ? 'FAIL' : c.severity === 'warning' ? 'WARN' : 'INFO';
      md += `| ${c.id} | ${c.route} | ${icon} | ${(c.detail || c.error || '-').slice(0, 80)} |\n`;
    }
    md += '\n';
  }

  // Design system info (from color-palette check)
  const paletteChecks = (design.checks || []).filter(c => c.id === 'color-palette');
  if (paletteChecks.length > 0) {
    const ds = paletteChecks[0].designSystem;
    if (ds) {
      md += `### Design System Indicators\n\n`;
      md += `- CSS Custom Properties: **${ds.customProperties}**\n`;
      md += `- Has Animations: **${ds.hasAnimations ? 'Yes' : 'No'}**\n`;
      md += `- Prefers Reduced Motion: **${ds.hasReducedMotion ? 'Yes' : 'No'}**\n\n`;
    }
  }
}

// --- Recommendations ---
md += `## Top Recommendations\n\n`;
const recommendations = [];

if (scores.accessibility.score < 80) {
  recommendations.push('Fix accessibility issues (missing labels, heading hierarchy, ARIA) to improve a11y score');
}
if (scores.designQuality.score < 80) {
  recommendations.push('Address design audit errors (focus rings, semantic HTML, contrast) for better design quality');
}
if (scores.performance.score < 80) {
  recommendations.push('Optimize slow routes (high TTFB, slow DOM interactive) for better performance');
}
if (functional?.consoleErrors?.length > 5) {
  recommendations.push(`Fix ${functional.consoleErrors.length} console errors across routes`);
}
if (scores.routeSmoke.score < 100) {
  recommendations.push('Fix broken routes that fail to load');
}

if (recommendations.length === 0) {
  recommendations.push('All categories performing well - focus on maintaining quality');
}

for (let i = 0; i < Math.min(5, recommendations.length); i++) {
  md += `${i + 1}. ${recommendations[i]}\n`;
}

md += `\n---\n*Generated by /full-test skill on ${timestamp}*\n`;

// --- Write output ---
const outFile = resolve(outputPath);
writeFileSync(outFile, md);
console.log(`Report written to: ${outFile}`);
console.log(`\nOverall Grade: ${overallGrade} (${weightedScore}/100)`);
console.log('\nCategory scores:');
for (const [key, val] of Object.entries(scores)) {
  console.log(`  ${key}: ${val.score}/100 - ${val.detail}`);
}

// Also write scores as JSON for programmatic use
const scoresJson = {
  overall: { grade: overallGrade, score: weightedScore },
  categories: scores,
  weights: WEIGHTS,
  timestamp,
  baseUrl,
  depth,
};
writeFileSync(outFile.replace('.md', '-scores.json'), JSON.stringify(scoresJson, null, 2));
