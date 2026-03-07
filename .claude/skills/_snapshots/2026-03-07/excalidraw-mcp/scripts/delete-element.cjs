#!/usr/bin/env node
/* eslint-disable no-console */

const DEFAULT_URL = process.env.EXPRESS_SERVER_URL || "http://localhost:3000";

function usage() {
  console.error("Usage: node scripts/delete-element.cjs --id <id> [--url <canvasUrl>]");
  process.exit(2);
}

function parseArgs(argv) {
  const out = { url: DEFAULT_URL, id: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") out.url = argv[++i];
    else if (a === "--id") out.id = argv[++i];
  }
  return out;
}

async function main() {
  if (typeof fetch !== "function") {
    throw new Error("This script requires Node 18+ (global fetch).");
  }

  const args = parseArgs(process.argv.slice(2));
  if (!args.id) usage();

  const baseUrl = args.url.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/api/elements/${encodeURIComponent(args.id)}`, {
    method: "DELETE",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success !== true) {
    throw new Error(
      `Failed to delete element: ${res.status} ${res.statusText} ${json?.error ? `- ${json.error}` : ""}`,
    );
  }

  console.log(`Deleted ${args.id}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

