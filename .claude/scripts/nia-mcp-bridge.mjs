#!/usr/bin/env node
// Minimal Nia MCP stdio-to-HTTP bridge
// Reads JSON-RPC from stdin, POSTs to Nia, writes response to stdout
import { createInterface } from 'readline';

const NIA_URL = 'https://apigcp.trynia.ai/mcp';
const API_KEY = process.env.NIA_API_KEY;

if (!API_KEY) {
  process.stderr.write('NIA_API_KEY environment variable not set\n');
  process.exit(1);
}

const reqHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
};

let sessionId = null;
let pending = 0;
let stdinClosed = false;

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  pending++;
  try {
    const hdrs = { ...reqHeaders };
    if (sessionId) hdrs['Mcp-Session-Id'] = sessionId;

    const res = await fetch(NIA_URL, {
      method: 'POST',
      headers: hdrs,
      body: trimmed
    });

    const sid = res.headers.get('mcp-session-id');
    if (sid) sessionId = sid;

    if (res.ok) {
      const text = await res.text();
      if (text.trim()) process.stdout.write(text + '\n');
    } else {
      const errText = await res.text();
      process.stderr.write(`HTTP ${res.status}: ${errText}\n`);
    }
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
  }
  pending--;
  if (stdinClosed && pending === 0) process.exit(0);
});

rl.on('close', () => {
  stdinClosed = true;
  if (pending === 0) process.exit(0);
});
