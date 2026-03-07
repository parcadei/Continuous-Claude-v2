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
  const baseUrl = url.replace(/\/$/, "");

  // Use the sync endpoint as a fast "clear" primitive (clears server storage).
  const res = await fetch(`${baseUrl}/api/elements/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ elements: [], timestamp: new Date().toISOString() }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success !== true) {
    throw new Error(`Failed to clear canvas: ${res.status} ${res.statusText} ${json?.error ? `- ${json.error}` : ""}`);
  }

  console.log("Cleared canvas");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
