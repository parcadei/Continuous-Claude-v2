#!/usr/bin/env node
/**
 * Browser Functional Tests - Route smoke, performance, a11y, console errors, responsive
 * Adapted from browser-test-suite.mjs with configurable inputs and JSON output.
 *
 * Usage: node browser-functional.mjs [--config path] [--depth quick|standard|comprehensive] [--output path]
 *
 * Requires: playwright-core, Chrome CDP on port 9222
 */
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf('--' + name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const configPath = getArg('config', null);
const depthArg = getArg('depth', null);
const outputPath = getArg('output', null);

// --- Load config ---
let config = {};
if (configPath && existsSync(configPath)) {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
}

const BASE_URL = process.env.TEST_BASE_URL || config.baseUrl || 'http://localhost:3000';
const CDP_URL = process.env.TEST_CDP_URL || config.cdpUrl || 'http://localhost:9222';
const DEPTH = depthArg || config.depth || 'standard';
const SCREENSHOT_DIR = resolve(config.screenshotDir || './test-screenshots');
const ROUTES_DIR = join(SCREENSHOT_DIR, 'routes');
const RESPONSIVE_DIR = join(SCREENSHOT_DIR, 'responsive');

const THRESHOLDS = {
  ttfb: 800,
  domInteractive: 3000,
  loadComplete: 10000,
  ...(config.thresholds?.performance || {}),
};

const ALL_ROUTES = config.routes || [
  { path: '/', name: 'dashboard' },
];

// Depth controls how many routes to test
const QUICK_ROUTE_LIMIT = 3;

const VIEWPORTS = [
  { width: 375, height: 812, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1024, height: 768, name: 'laptop' },
  { width: 1920, height: 1080, name: 'desktop' },
];

// --- Depth matrix ---
function getRoutes() {
  if (DEPTH === 'quick') return ALL_ROUTES.slice(0, QUICK_ROUTE_LIMIT);
  return ALL_ROUTES;
}

function shouldRunPerformance() { return DEPTH !== 'quick'; }
function shouldRunAccessibility() { return true; }
function shouldRunResponsive() { return DEPTH === 'comprehensive'; }
function accessibilityDepth() { return DEPTH === 'quick' ? 'basic' : 'full'; }

// --- Setup dirs ---
[SCREENSHOT_DIR, ROUTES_DIR, RESPONSIVE_DIR].forEach(d => {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
});

// --- Results ---
const results = {
  meta: { baseUrl: BASE_URL, depth: DEPTH, timestamp: new Date().toISOString() },
  routeSmoke: [],
  performance: [],
  accessibility: [],
  consoleErrors: [],
  responsive: [],
};

let browser;
try {
  console.log(`Connecting to Chrome CDP at ${CDP_URL}...`);
  browser = await chromium.connectOverCDP(CDP_URL);
  const ctx = browser.contexts()[0];
  console.log('Connected!\n');

  // Helper: new page per route to avoid SPA redirect conflicts
  async function withPage(url, testFn) {
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2000);
      const result = await testFn(page);
      return { ...result, consoleErrors };
    } catch (e) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        const result = await testFn(page);
        return { ...result, consoleErrors, fallback: true };
      } catch (e2) {
        return { error: e2.message, consoleErrors };
      }
    } finally {
      await page.close().catch(() => {});
    }
  }

  const routes = getRoutes();

  // ===== PART 1: Route Smoke Tests =====
  console.log('=== PART 1: Route Smoke Tests ===\n');
  for (const route of routes) {
    const url = BASE_URL + route.path;
    const result = await withPage(url, async (page) => {
      const title = await page.title();
      const finalUrl = page.url();
      const screenshotPath = join(ROUTES_DIR, route.name + '.png');
      await page.screenshot({ path: screenshotPath });
      return { status: 'OK', title, finalUrl, screenshot: screenshotPath };
    });

    results.routeSmoke.push({ route: route.path, name: route.name, ...result });

    if (result.consoleErrors?.length > 0) {
      results.consoleErrors.push(...result.consoleErrors.map(e => ({ route: route.path, error: e })));
    }

    const status = result.error ? 'FAIL' : 'OK';
    const detail = result.error || `"${result.title}" -> ${result.finalUrl}`;
    console.log(`  [${status}] ${route.path} - ${detail}`);
  }

  // ===== PART 2: Performance Metrics =====
  if (shouldRunPerformance()) {
    console.log('\n=== PART 2: Performance Metrics ===\n');
    for (const route of routes) {
      const url = BASE_URL + route.path;
      const result = await withPage(url, async (page) => {
        const timing = await page.evaluate(() => {
          const entries = performance.getEntriesByType('navigation');
          if (!entries.length) return null;
          const t = entries[0];
          const lcp = performance.getEntriesByType('largest-contentful-paint');
          return {
            ttfb: Math.round(t.responseStart - t.requestStart),
            domInteractive: Math.round(t.domInteractive),
            domComplete: Math.round(t.domComplete),
            loadComplete: Math.round(t.loadEventEnd),
            transferSize: t.transferSize || 0,
            resourceCount: performance.getEntriesByType('resource').length,
            lcpTime: lcp.length ? Math.round(lcp[lcp.length - 1].startTime) : null,
          };
        });
        return { timing };
      });

      if (result.timing) {
        const t = result.timing;
        const warnings = [];
        if (t.ttfb > THRESHOLDS.ttfb) warnings.push(`TTFB ${t.ttfb}ms > ${THRESHOLDS.ttfb}ms`);
        if (t.domInteractive > THRESHOLDS.domInteractive) warnings.push(`DOMi ${t.domInteractive}ms > ${THRESHOLDS.domInteractive}ms`);
        if (t.loadComplete > THRESHOLDS.loadComplete) warnings.push(`Load ${t.loadComplete}ms > ${THRESHOLDS.loadComplete}ms`);

        results.performance.push({ route: route.path, ...t, warnings });
        console.log(`  ${route.path}: TTFB=${t.ttfb}ms DOMi=${t.domInteractive}ms Load=${t.loadComplete}ms LCP=${t.lcpTime || 'N/A'}ms Res=${t.resourceCount}${warnings.length ? ' [!]' : ''}`);
      } else {
        results.performance.push({ route: route.path, error: result.error || 'No timing data' });
        console.log(`  ${route.path}: ${result.error || 'No timing data'}`);
      }
    }
  }

  // ===== PART 3: Accessibility Audit =====
  if (shouldRunAccessibility()) {
    const isBasic = accessibilityDepth() === 'basic';
    console.log(`\n=== PART 3: Accessibility Audit (${isBasic ? 'basic' : 'full'}) ===\n`);

    for (const route of routes) {
      const url = BASE_URL + route.path;
      const result = await withPage(url, async (page) => {
        const a11y = await page.evaluate((basic) => {
          const issues = [];

          // Images without alt
          document.querySelectorAll('img:not([alt])').forEach(el => {
            issues.push({ type: 'img-no-alt', severity: 'error', html: el.outerHTML.slice(0, 120) });
          });

          // Interactive elements without accessible names
          document.querySelectorAll('button, a, [role="button"]').forEach(el => {
            const text = (el.textContent || '').trim();
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledBy = el.getAttribute('aria-labelledby');
            const title = el.getAttribute('title');
            if (!text && !ariaLabel && !ariaLabelledBy && !title) {
              issues.push({ type: 'no-accessible-name', severity: 'error', tag: el.tagName, html: el.outerHTML.slice(0, 120) });
            }
          });

          // Form inputs without labels
          document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
            const id = el.id;
            const hasLabel = id && document.querySelector('label[for="' + id + '"]');
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledBy = el.getAttribute('aria-labelledby');
            const placeholder = el.getAttribute('placeholder');
            if (!hasLabel && !ariaLabel && !ariaLabelledBy && !placeholder) {
              issues.push({ type: 'input-no-label', severity: 'error', tag: el.tagName, html: el.outerHTML.slice(0, 120) });
            }
          });

          // Heading hierarchy
          const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(h => ({
            level: parseInt(h.tagName[1]),
            text: h.textContent.trim().slice(0, 50),
          }));
          let prevLevel = 0;
          for (const h of headings) {
            if (h.level > prevLevel + 1 && prevLevel > 0) {
              issues.push({ type: 'heading-skip', severity: 'warning', detail: 'h' + prevLevel + ' -> h' + h.level + ': "' + h.text + '"' });
            }
            prevLevel = h.level;
          }

          // Full mode additional checks
          if (!basic) {
            // ARIA role validity
            document.querySelectorAll('[role]').forEach(el => {
              const role = el.getAttribute('role');
              const validRoles = ['button', 'link', 'checkbox', 'radio', 'tab', 'tabpanel', 'tablist', 'dialog', 'alert', 'status', 'navigation', 'main', 'banner', 'complementary', 'contentinfo', 'form', 'search', 'region', 'list', 'listitem', 'menu', 'menuitem', 'tree', 'treeitem', 'grid', 'gridcell', 'row', 'rowgroup', 'columnheader', 'rowheader', 'presentation', 'none', 'img', 'figure', 'group', 'heading', 'separator', 'toolbar', 'tooltip', 'progressbar', 'slider', 'spinbutton', 'switch', 'textbox', 'combobox', 'option', 'article', 'cell', 'definition', 'directory', 'document', 'feed', 'log', 'marquee', 'math', 'note', 'table', 'term', 'timer'];
              if (!validRoles.includes(role)) {
                issues.push({ type: 'invalid-aria-role', severity: 'warning', role, html: el.outerHTML.slice(0, 120) });
              }
            });

            // Lang attribute
            if (!document.documentElement.getAttribute('lang')) {
              issues.push({ type: 'missing-lang', severity: 'warning', detail: 'html element missing lang attribute' });
            }

            // Skip links
            const firstLink = document.querySelector('a');
            const hasSkipLink = firstLink && /skip/i.test(firstLink.textContent);
            if (!hasSkipLink) {
              issues.push({ type: 'no-skip-link', severity: 'info', detail: 'No skip navigation link found' });
            }
          }

          return { issues, headingCount: headings.length };
        }, isBasic);
        return a11y;
      });

      if (!result.error) {
        results.accessibility.push({
          route: route.path,
          issueCount: result.issues?.length || 0,
          headingCount: result.headingCount || 0,
          issues: result.issues || [],
        });
        const cnt = result.issues?.length || 0;
        console.log(`  ${route.path}: ${cnt} issues, ${result.headingCount || 0} headings`);
        if (result.issues?.length > 0) {
          const byType = {};
          result.issues.forEach(i => { byType[i.type] = (byType[i.type] || 0) + 1; });
          Object.entries(byType).forEach(([t, c]) => console.log(`    - ${t}: ${c}`));
        }
      } else {
        results.accessibility.push({ route: route.path, error: result.error });
        console.log(`  ${route.path}: ERROR - ${result.error}`);
      }
    }
  }

  // ===== PART 4: Responsive Screenshots (comprehensive only) =====
  if (shouldRunResponsive()) {
    console.log('\n=== PART 4: Responsive Screenshots ===\n');
    const responsiveRoutes = routes.slice(0, 4); // max 4 routes
    for (const route of responsiveRoutes) {
      const url = BASE_URL + route.path;
      const page = await ctx.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(2000);
        for (const vp of VIEWPORTS) {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.waitForTimeout(800);
          const filename = `${route.name}-${vp.width}.png`;
          const filepath = join(RESPONSIVE_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: true });
          results.responsive.push({ route: route.path, viewport: vp.name, width: vp.width, file: filename });
          console.log(`  ${route.name} @ ${vp.width}px -> ${filename}`);
        }
      } catch (e) {
        console.log(`  ${route.name}: ERROR - ${e.message}`);
        results.responsive.push({ route: route.path, error: e.message });
      } finally {
        await page.close().catch(() => {});
      }
    }
  }

} catch (err) {
  console.error('FATAL:', err.message);
  results.fatalError = err.message;
} finally {
  if (browser) await browser.close();
}

// ===== Summary =====
console.log('\n========================================');
console.log('FUNCTIONAL TEST SUMMARY');
console.log('========================================\n');

const smokePass = results.routeSmoke.filter(r => r.status === 'OK').length;
const smokeTotal = results.routeSmoke.length;
console.log(`Route Smoke:     ${smokePass}/${smokeTotal} passed`);

if (results.performance.length) {
  const perfPass = results.performance.filter(r => !r.error && (!r.warnings || r.warnings.length === 0)).length;
  console.log(`Performance:     ${perfPass}/${results.performance.length} within thresholds`);
}

const totalA11y = results.accessibility.reduce((s, r) => s + (r.issueCount || 0), 0);
console.log(`Accessibility:   ${totalA11y} total issues across ${results.accessibility.length} routes`);
console.log(`Console Errors:  ${results.consoleErrors.length} total`);

if (results.responsive.length) {
  console.log(`Responsive:      ${results.responsive.filter(r => !r.error).length} screenshots captured`);
}

// ===== Output =====
const outFile = outputPath || join(SCREENSHOT_DIR, 'functional-results.json');
writeFileSync(outFile, JSON.stringify(results, null, 2));
console.log(`\nResults written to: ${outFile}`);
