#!/usr/bin/env node
/* eslint-disable no-console */

const DEFAULT_URL = process.env.EXPRESS_SERVER_URL || "http://localhost:3000";

function parseArgs(argv) {
  const out = { url: DEFAULT_URL };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") out.url = argv[++i];
  }
  return out;
}

async function main() {
  if (typeof fetch !== "function") {
    throw new Error("This script requires Node 18+ (global fetch).");
  }

  const { url } = parseArgs(process.argv.slice(2));
  const res = await fetch(`${url.replace(/\/$/, "")}/health`);
  const text = await res.text();

  if (!res.ok) {
    console.error(text);
    process.exit(1);
  }

  console.log(text);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
