#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");

const DEFAULT_URL = process.env.EXPRESS_SERVER_URL || "http://localhost:3000";

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/import-elements.cjs --in <file> [--mode batch|sync] [--url <canvasUrl>]",
      "",
      "Modes:",
      "  batch  POST /api/elements/batch    (append; creates elements)",
      "  sync   POST /api/elements/sync     (overwrite; clears then writes)",
    ].join("\n"),
  );
  process.exit(2);
}

function parseArgs(argv) {
  const out = { url: DEFAULT_URL, inFile: null, mode: "batch" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") out.url = argv[++i];
    else if (a === "--in") out.inFile = argv[++i];
    else if (a === "--mode") out.mode = argv[++i];
  }
  return out;
}

function readElementsFromFile(inFile) {
  const raw = fs.readFileSync(inFile, "utf8");
  const data = JSON.parse(raw);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.elements)) return data.elements;
  throw new Error('Input file must be an array, or an object with an "elements" array');
}

async function main() {
  if (typeof fetch !== "function") {
    throw new Error("This script requires Node 18+ (global fetch).");
  }

  const { url, inFile, mode } = parseArgs(process.argv.slice(2));
  if (!inFile) usage();
  if (mode !== "batch" && mode !== "sync") usage();

  const elements = readElementsFromFile(inFile);
  const baseUrl = url.replace(/\/$/, "");

  let endpoint;
  let body;
  if (mode === "batch") {
    endpoint = `${baseUrl}/api/elements/batch`;
    body = { elements };
  } else {
    endpoint = `${baseUrl}/api/elements/sync`;
    body = { elements, timestamp: new Date().toISOString() };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success !== true) {
    throw new Error(`Failed to import elements: ${res.status} ${res.statusText} ${json?.error ? `- ${json.error}` : ""}`);
  }

  const count = json.count ?? json.elements?.length ?? elements.length;
  console.log(`Imported ${count} elements (${mode})`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
