#!/usr/bin/env node
// viewport-test.mjs - Capture screenshots at multiple viewport sizes
// Usage: node viewport-test.mjs [url] [output-dir]

import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const url = process.argv[2];
const outputDir = process.argv[3] || './viewport-screenshots';

if (!url) {
  console.error('Usage: node viewport-test.mjs <url> [output-dir]');
  console.error('Example: node viewport-test.mjs https://app.example.com ./screenshots');
  process.exit(1);
}

const viewports = [
  { width: 375, height: 812, name: 'mobile-375', label: 'Mobile (iPhone)' },
  { width: 768, height: 1024, name: 'tablet-768', label: 'Tablet (iPad)' },
  { width: 1024, height: 768, name: 'laptop-1024', label: 'Laptop' },
  { width: 1920, height: 1080, name: 'desktop-1920', label: 'Desktop (1080p)' }
];

let browser;
try {
  browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  let page = context.pages()[0];
  if (!page) page = await context.newPage();

  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Navigate to URL
  console.log(`Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`Page loaded: ${await page.title()}\n`);

  // Capture at each viewport
  for (const vp of viewports) {
    console.log(`Capturing ${vp.label} (${vp.width}x${vp.height})...`);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    // Wait for responsive layout to settle
    await page.waitForTimeout(500);

    const filename = `${vp.name}.png`;
    const filepath = join(outputDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  Saved: ${filepath}`);
  }

  console.log(`\nDone! ${viewports.length} screenshots saved to ${outputDir}/`);
  console.log('Viewports captured:');
  viewports.forEach(vp => console.log(`  - ${vp.label}: ${vp.name}.png`));

} catch (err) {
  console.error(`Error: ${err.message}`);
  if (err.message.includes('connect')) {
    console.error('Run browser-setup.ps1 first to launch Chrome with CDP.');
  }
  process.exit(1);
} finally {
  if (browser) await browser.close();
}
