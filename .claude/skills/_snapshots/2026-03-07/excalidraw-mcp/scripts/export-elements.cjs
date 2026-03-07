#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_URL = process.env.EXPRESS_SERVER_URL || "http://localhost:3000";

function parseArgs(argv) {
  const out = { url: DEFAULT_URL, outFile: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") out.url = argv[++i];
    else if (a === "--out") out.outFile = argv[++i];
    else if (a === "-o") out.outFile = argv[++i];
  }
  return out;
}

async function main() {
  if (typeof fetch !== "function") {
    throw new Error("This script requires Node 18+ (global fetch).");
  }

  const { url, outFile } = parseArgs(process.argv.slice(2));
  const res = await fetch(`${url.replace(/\/$/, "")}/api/elements`);
  const json = await res.json();

  if (!res.ok || !json || json.success !== true) {
    throw new Error(`Failed to export elements: ${res.status} ${res.statusText}`);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    expressServerUrl: url,
    elements: json.elements || [],
  };

  const text = JSON.stringify(payload, null, 2);
  if (!outFile) {
    process.stdout.write(text + "\n");
    return;
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, text + "\n");
  console.log(`Wrote ${payload.elements.length} elements to ${outFile}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
