#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");

const DEFAULT_URL = process.env.EXPRESS_SERVER_URL || "http://localhost:3000";

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/update-element.cjs --id <id> (--data <json> | --file <path>) [--url <canvasUrl>]",
      "",
      "Examples:",
      '  node scripts/update-element.cjs --id abc --data \'{"x":200,"y":250,"backgroundColor":"#ffeeee"}\'',
      "  node scripts/update-element.cjs --id abc --file updates.json",
    ].join("\n"),
  );
  process.exit(2);
}

function parseArgs(argv) {
  const out = { url: DEFAULT_URL, id: null, data: null, file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") out.url = argv[++i];
    else if (a === "--id") out.id = argv[++i];
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
  if (!args.id) usage();
  const payload = readJson(args);

  const baseUrl = args.url.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/api/elements/${encodeURIComponent(args.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.success !== true) {
    throw new Error(
      `Failed to update element: ${res.status} ${res.statusText} ${json?.error ? `- ${json.error}` : ""}`,
    );
  }

  process.stdout.write(JSON.stringify(json.element, null, 2) + "\n");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

