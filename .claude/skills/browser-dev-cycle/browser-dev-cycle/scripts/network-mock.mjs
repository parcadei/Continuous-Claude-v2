#!/usr/bin/env node
// network-mock.mjs - Network interception and mocking via CDP
// Usage:
//   node network-mock.mjs mock <url-pattern> <json-file>   - Mock API with JSON file
//   node network-mock.mjs block <url-pattern>               - Block requests matching pattern
//   node network-mock.mjs record <output.har>               - Record network to HAR
//   node network-mock.mjs replay <input.har>                - Replay from HAR
//   node network-mock.mjs list                              - List recent requests

import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'fs';

const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const [,, command, ...args] = process.argv;

if (!command) {
  console.error('Usage: node network-mock.mjs <command> [args...]');
  console.error('Commands: mock, block, record, replay, list');
  process.exit(1);
}

let browser, page;
try {
  browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  page = context.pages()[0];
  if (!page) throw new Error('No page open');
} catch (err) {
  console.error(`Failed to connect: ${err.message}`);
  console.error('Run browser-setup.ps1 first.');
  process.exit(1);
}

try {
  switch (command) {
    case 'mock': {
      const [pattern, jsonFile] = args;
      if (!pattern || !jsonFile) {
        console.error('Usage: mock <url-pattern> <json-file>');
        process.exit(1);
      }
      const body = readFileSync(jsonFile, 'utf-8');
      await page.route(pattern, route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body
        });
      });
      console.log(`Mocking ${pattern} with ${jsonFile}`);
      console.log('Press Ctrl+C to stop. Routes active until browser closes.');
      // Keep process alive
      await new Promise(() => {});
      break;
    }
    case 'block': {
      const pattern = args[0];
      if (!pattern) { console.error('Usage: block <url-pattern>'); process.exit(1); }
      await page.route(pattern, route => route.abort());
      console.log(`Blocking requests matching: ${pattern}`);
      console.log('Press Ctrl+C to stop.');
      await new Promise(() => {});
      break;
    }
    case 'record': {
      const output = args[0] || 'network.har';
      const requests = [];
      page.on('request', req => {
        requests.push({
          url: req.url(),
          method: req.method(),
          headers: req.headers(),
          timestamp: Date.now()
        });
      });
      page.on('response', async res => {
        const req = requests.find(r => r.url === res.url());
        if (req) {
          req.status = res.status();
          req.responseHeaders = res.headers();
          try { req.body = await res.text(); } catch {}
        }
      });
      console.log(`Recording network to ${output}...`);
      console.log('Press Ctrl+C to save and stop.');
      process.on('SIGINT', () => {
        writeFileSync(output, JSON.stringify({ requests }, null, 2));
        console.log(`\nSaved ${requests.length} requests to ${output}`);
        process.exit(0);
      });
      await new Promise(() => {});
      break;
    }
    case 'list': {
      const requests = [];
      page.on('request', req => {
        requests.push({ method: req.method(), url: req.url() });
      });
      console.log('Listening for requests (10s)...');
      await page.waitForTimeout(10000);
      requests.forEach(r => console.log(`${r.method} ${r.url}`));
      console.log(`\nTotal: ${requests.length} requests`);
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
  if (browser) await browser.close();
}
