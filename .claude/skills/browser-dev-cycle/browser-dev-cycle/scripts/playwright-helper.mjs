#!/usr/bin/env node
// playwright-helper.mjs - CDP bridge utilities for browser automation
// Usage: node playwright-helper.mjs <command> [args...]
//   navigate <url>        - Navigate to URL
//   screenshot [file]     - Take screenshot (default: screenshot.png)
//   eval <expression>     - Evaluate JavaScript
//   viewport <w> <h>      - Set viewport size
//   title                 - Get page title
//   url                   - Get current URL
//   wait <ms>             - Wait for milliseconds
//   cookies               - Get all cookies as JSON

import { chromium } from 'playwright-core';

const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const [,, command, ...args] = process.argv;

if (!command) {
  console.error('Usage: node playwright-helper.mjs <command> [args...]');
  console.error('Commands: navigate, screenshot, eval, viewport, title, url, wait, cookies');
  process.exit(1);
}

let browser, page;
try {
  browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  page = context.pages()[0];
  if (!page) {
    page = await context.newPage();
  }
} catch (err) {
  console.error(`Failed to connect to CDP at ${CDP_URL}`);
  console.error('Run browser-setup.ps1 first to launch Chrome with CDP.');
  process.exit(1);
}

try {
  switch (command) {
    case 'navigate': {
      const url = args[0];
      if (!url) { console.error('Usage: navigate <url>'); process.exit(1); }
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`Navigated to: ${page.url()}`);
      break;
    }
    case 'screenshot': {
      const file = args[0] || 'screenshot.png';
      await page.screenshot({ path: file, fullPage: args.includes('--full') });
      console.log(`Screenshot saved: ${file}`);
      break;
    }
    case 'eval': {
      const expr = args.join(' ');
      if (!expr) { console.error('Usage: eval <expression>'); process.exit(1); }
      const result = await page.evaluate(expr);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'viewport': {
      const width = parseInt(args[0]) || 1920;
      const height = parseInt(args[1]) || 1080;
      await page.setViewportSize({ width, height });
      console.log(`Viewport set to ${width}x${height}`);
      break;
    }
    case 'title': {
      console.log(await page.title());
      break;
    }
    case 'url': {
      console.log(page.url());
      break;
    }
    case 'wait': {
      const ms = parseInt(args[0]) || 1000;
      await page.waitForTimeout(ms);
      console.log(`Waited ${ms}ms`);
      break;
    }
    case 'cookies': {
      const cookies = await page.context().cookies();
      console.log(JSON.stringify(cookies, null, 2));
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
} finally {
  // Don't close - we're connecting to existing browser
  if (browser) await browser.close();
}
