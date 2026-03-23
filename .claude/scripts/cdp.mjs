#!/usr/bin/env node
// CDP CLI — Chrome DevTools Protocol wrapper for AI agents
// Replaces chrome-devtools-mcp (Tier 2) with a stateless CLI
// All output is JSON to stdout. Connects to Chrome via CDP at localhost:9222.
//
// Connection strategy (in order):
//   1. Connect to Chrome already running with --remote-debugging-port=9222
//   2. Launch Chrome with YOUR default profile (preserves logins/cookies)
//   3. Fall back to clean profile at %TEMP%\chrome-cdp (if default profile is locked)
//
// For persistent authenticated access, add to your Chrome shortcut Target:
//   "C:\...\chrome.exe" --remote-debugging-port=9222
//
// Usage:
//   node cdp.mjs <command> [args...]
//
// Commands:
//   navigate <url>              Navigate to URL
//   snapshot [-i]               Accessibility tree (-i = interesting only)
//   screenshot [path] [--full]  Take screenshot (default: screenshot.png)
//   eval <expression>           Evaluate JavaScript
//   title                       Get page title
//   url                         Get current URL
//   perf                        Performance timing metrics
//   network                     List captured network requests
//   console                     List console messages
//   a11y                        Accessibility audit
//   lighthouse <url>            Run Lighthouse audit (requires lighthouse CLI)
//   tabs                        List all open tabs/pages
//   help                        Show this help

import { chromium } from 'playwright-core';
import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const cmd = process.argv[2];
const args = process.argv.slice(3);

function out(data) {
  console.log(JSON.stringify(data));
}

function ok(data) {
  out({ success: true, ...data });
}

function fail(error) {
  out({ success: false, error: String(error) });
}

function help() {
  ok({
    commands: {
      'navigate <url>': 'Navigate to URL, wait for load',
      'snapshot [-i]': 'Accessibility tree snapshot (-i = interesting only)',
      'screenshot [path] [--full]': 'Take screenshot (default: screenshot.png)',
      'eval <expression>': 'Evaluate JavaScript in page context',
      'title': 'Get page title',
      'url': 'Get current URL',
      'perf': 'Performance timing metrics (TTFB, DOM, LCP, resources)',
      'network': 'List captured network requests via Resource Timing API',
      'console': 'List console messages captured during this command',
      'a11y': 'Accessibility audit (images, labels, headings, lang)',
      'lighthouse <url>': 'Run Lighthouse audit via CLI (JSON output)',
      'tabs': 'List all open browser tabs',
      'help': 'Show available commands',
    },
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return 'chrome.exe'; // fall back to PATH
}

async function launchChrome() {
  const chromePath = findChrome();
  const port = CDP_URL.match(/:(\d+)/)?.[1] || '9222';

  // Strategy 1: Try to restart user's Chrome with debug port
  // This preserves credentials, cookies, and login sessions
  process.stderr.write('CDP CLI: No Chrome on port ' + port + '. Launching with your profile...\n');

  const child = spawn(chromePath, [
    '--remote-debugging-port=' + port,
    '--no-first-run',
    '--no-default-browser-check',
  ], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  // Wait for Chrome to become reachable (up to 10 seconds)
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const browser = await chromium.connectOverCDP(CDP_URL);
      const contexts = browser.contexts();
      if (contexts.length) {
        process.stderr.write('CDP CLI: Connected to Chrome (your profile, with credentials)\n');
        return browser;
      }
      await browser.close();
    } catch { /* not ready yet */ }
  }

  // Strategy 2: If user's profile is locked (Chrome already running without debug port),
  // fall back to a clean profile
  process.stderr.write('CDP CLI: Default profile locked. Launching clean profile (no credentials)...\n');
  const userDataDir = join(process.env.TEMP || '/tmp', 'chrome-cdp');

  const child2 = spawn(chromePath, [
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--no-default-browser-check',
  ], {
    detached: true,
    stdio: 'ignore',
  });
  child2.unref();

  for (let i = 0; i < 16; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const browser = await chromium.connectOverCDP(CDP_URL);
      const contexts = browser.contexts();
      if (contexts.length) {
        process.stderr.write('CDP CLI: Connected (clean profile, no credentials)\n');
        return browser;
      }
      await browser.close();
    } catch { /* not ready yet */ }
  }
  throw new Error(
    'Could not launch Chrome on port ' + port + '. ' +
    'For authenticated access, add --remote-debugging-port=9222 to your Chrome shortcut.'
  );
}

async function connect() {
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (e) {
    if (e.message.includes('ECONNREFUSED') || e.message.includes('connect')) {
      // Auto-launch Chrome
      browser = await launchChrome();
    } else {
      throw e;
    }
  }

  const contexts = browser.contexts();
  if (!contexts.length) {
    throw new Error('No browser contexts found after connecting to Chrome.');
  }
  const context = contexts[0];
  const pages = context.pages();
  const page = pages[0] || await context.newPage();
  return { browser, context, page };
}

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    help();
    return;
  }

  const { browser, context, page } = await connect();

  try {
    switch (cmd) {
      case 'navigate': {
        const url = args[0];
        if (!url) { fail('Usage: navigate <url>'); break; }
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);
        ok({
          url: page.url(),
          title: await page.title(),
          status: response ? response.status() : null,
        });
        break;
      }

      case 'snapshot': {
        const interestingOnly = args.includes('-i');
        // Use CDP directly since page.accessibility was removed in Playwright 1.49+
        const cdpSession = await page.context().newCDPSession(page);
        const { nodes } = await cdpSession.send('Accessibility.getFullAXTree');
        await cdpSession.detach();

        // Build a simplified tree
        function simplifyNode(node) {
          const result = {};
          if (node.role?.value && node.role.value !== 'none') result.role = node.role.value;
          if (node.name?.value) result.name = node.name.value;
          if (node.value?.value) result.value = node.value.value;
          if (node.description?.value) result.description = node.description.value;
          return result;
        }

        let tree;
        if (interestingOnly) {
          tree = nodes
            .map(simplifyNode)
            .filter(n => n.role && n.role !== 'generic' && n.role !== 'InlineTextBox' && (n.name || n.value));
        } else {
          tree = nodes.map(simplifyNode).filter(n => n.role);
        }

        ok({ nodeCount: tree.length, snapshot: tree });
        break;
      }

      case 'screenshot': {
        const pathArg = args.find(a => !a.startsWith('--')) || 'screenshot.png';
        const fullPage = args.includes('--full');
        await page.screenshot({ path: pathArg, fullPage });
        ok({ path: pathArg, fullPage });
        break;
      }

      case 'eval': {
        const expr = args[0];
        if (!expr) { fail('Usage: eval <expression>'); break; }
        const result = await page.evaluate(expr);
        ok({ result });
        break;
      }

      case 'title': {
        ok({ title: await page.title() });
        break;
      }

      case 'url': {
        ok({ url: page.url() });
        break;
      }

      case 'perf': {
        const timing = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation');
          if (!nav.length) return null;
          const t = nav[0];
          const lcp = performance.getEntriesByType('largest-contentful-paint');
          const resources = performance.getEntriesByType('resource');
          return {
            ttfb: Math.round(t.responseStart - t.requestStart),
            domInteractive: Math.round(t.domInteractive),
            domComplete: Math.round(t.domComplete),
            loadComplete: Math.round(t.loadEventEnd),
            transferSize: t.transferSize || 0,
            resourceCount: resources.length,
            totalResourceSize: resources.reduce((s, r) => s + (r.transferSize || 0), 0),
            lcpTime: lcp.length ? Math.round(lcp[lcp.length - 1].startTime) : null,
          };
        });
        if (timing) {
          ok({ url: page.url(), ...timing });
        } else {
          fail('No navigation timing data available');
        }
        break;
      }

      case 'network': {
        const resources = await page.evaluate(() => {
          return performance.getEntriesByType('resource').map(r => ({
            name: r.name,
            type: r.initiatorType,
            duration: Math.round(r.duration),
            size: r.transferSize || 0,
            status: r.responseStatus || null,
          }));
        });
        ok({ url: page.url(), count: resources.length, resources });
        break;
      }

      case 'console': {
        const messages = [];
        const handler = msg => {
          messages.push({ type: msg.type(), text: msg.text() });
        };
        page.on('console', handler);
        await page.evaluate(() => { /* trigger flush */ });
        await page.waitForTimeout(500);
        page.removeListener('console', handler);
        ok({
          url: page.url(),
          count: messages.length,
          messages,
          note: 'Captures messages from this command onward. For full capture, run navigate first.',
        });
        break;
      }

      case 'a11y': {
        const audit = await page.evaluate(() => {
          const issues = [];

          document.querySelectorAll('img:not([alt])').forEach(el => {
            issues.push({ type: 'img-no-alt', html: el.outerHTML.slice(0, 120) });
          });

          document.querySelectorAll('button, a, [role="button"]').forEach(el => {
            const text = (el.textContent || '').trim();
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledBy = el.getAttribute('aria-labelledby');
            const title = el.getAttribute('title');
            if (!text && !ariaLabel && !ariaLabelledBy && !title) {
              issues.push({ type: 'no-accessible-name', tag: el.tagName, html: el.outerHTML.slice(0, 120) });
            }
          });

          document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
            const id = el.id;
            const hasLabel = id && document.querySelector('label[for="' + id + '"]');
            const ariaLabel = el.getAttribute('aria-label');
            const ariaLabelledBy = el.getAttribute('aria-labelledby');
            const placeholder = el.getAttribute('placeholder');
            if (!hasLabel && !ariaLabel && !ariaLabelledBy && !placeholder) {
              issues.push({ type: 'input-no-label', tag: el.tagName, html: el.outerHTML.slice(0, 120) });
            }
          });

          const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(h => ({
            level: parseInt(h.tagName[1]),
            text: h.textContent.trim().slice(0, 60),
          }));
          let prevLevel = 0;
          for (const h of headings) {
            if (h.level > prevLevel + 1 && prevLevel > 0) {
              issues.push({ type: 'heading-skip', detail: 'h' + prevLevel + ' -> h' + h.level, text: h.text });
            }
            prevLevel = h.level;
          }

          if (!document.documentElement.getAttribute('lang')) {
            issues.push({ type: 'missing-lang' });
          }

          return {
            issueCount: issues.length,
            issues,
            headingCount: headings.length,
            headings,
          };
        });

        ok({ url: page.url(), ...audit });
        break;
      }

      case 'lighthouse': {
        const url = args[0] || page.url();
        if (!url || url === 'about:blank') {
          fail('Usage: lighthouse <url>');
          break;
        }
        try {
          const output = execSync(
            `npx lighthouse "${url}" --output=json --chrome-flags="--headless" --only-categories=performance,accessibility,best-practices,seo --quiet`,
            { maxBuffer: 10 * 1024 * 1024, timeout: 120000 }
          );
          const report = JSON.parse(output.toString());
          ok({
            url: report.finalUrl || url,
            scores: {
              performance: Math.round((report.categories.performance?.score || 0) * 100),
              accessibility: Math.round((report.categories.accessibility?.score || 0) * 100),
              bestPractices: Math.round((report.categories['best-practices']?.score || 0) * 100),
              seo: Math.round((report.categories.seo?.score || 0) * 100),
            },
            metrics: {
              fcp: report.audits['first-contentful-paint']?.numericValue,
              lcp: report.audits['largest-contentful-paint']?.numericValue,
              tbt: report.audits['total-blocking-time']?.numericValue,
              cls: report.audits['cumulative-layout-shift']?.numericValue,
              si: report.audits['speed-index']?.numericValue,
            },
          });
        } catch (e) {
          fail('Lighthouse failed: ' + (e.stderr ? e.stderr.toString().slice(0, 200) : e.message));
        }
        break;
      }

      case 'tabs': {
        const allPages = context.pages();
        const tabs = [];
        for (let i = 0; i < allPages.length; i++) {
          let title = '(unavailable)';
          try { title = await allPages[i].title(); } catch { /* skip */ }
          tabs.push({ index: i, url: allPages[i].url(), title });
        }
        ok({ count: tabs.length, tabs });
        break;
      }

      default:
        fail('Unknown command: ' + cmd + '. Run with --help for usage.');
    }
  } catch (e) {
    fail(e.message);
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  fail(e.message);
  process.exit(1);
});
