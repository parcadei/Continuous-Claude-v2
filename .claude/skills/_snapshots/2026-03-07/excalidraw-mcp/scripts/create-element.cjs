#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");

const DEFAULT_URL = process.env.EXPRESS_SERVER_URL || "http://localhost:3000";

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/create-element.cjs (--data <json> | --file <path>) [--url <canvasUrl>]",
      "",
      "Examples:",
      '  node scripts/create-element.cjs --data \'{"type":"rectangle","x":100,"y":100,"width":300,"height":200}\'',
      "  node scripts/create-element.cjs --file element.json",
    ].join("\n"),
  );
  process.exit(2);
}

function parseArgs(argv) {
  const out = { url: DEFAULT_URL, data: null, file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") out.url = argv[++i];
    else if (a === "--data") out.data = argv[++i];
    else if (a === "--file") out.file = argv[++i];
  }
  return out;
}

function readJson({ data, file }) {
  if (data) return JSON.parse(data);
  if (file) return JSON.parse(fs.readFileSync(file, "utf8"));
  usage();
}

async function main() {
  if (typeof fetch !== "function") {
    throw new Error("This script requires Node 18+ (global fetch).");
  }

  const args = parseArgs(process.argv.slice(2));
  const payload = readJson(args);

  const baseUrl = args.url.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/api/elements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success !== true) {
    throw new Error(
      `Failed to create element: ${res.status} ${res.statusText} ${json?.error ? `- ${json.error}` : ""}`,
    );
  }

  process.stdout.write(JSON.stringify(json.element, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

