#!/usr/bin/env node
/**
 * PostToolUse hook (catch-all) that logs MCP server usage to session-activity.
 * Extracts server name from mcp__servername__toolname patterns.
 * Exits immediately (<5ms) for non-MCP tools.
 */
import { readFileSync } from 'fs';
import { logMcpServer } from './shared/session-activity.js';

async function main() {
  try {
    const input = JSON.parse(readFileSync(0, 'utf-8'));
    const toolName: string = input.tool_name || '';

    // Only act on MCP tools (mcp__servername__toolname)
    if (!toolName.startsWith('mcp__')) {
      process.exit(0);
    }

    const parts = toolName.split('__');
    if (parts.length >= 3 && input.session_id) {
      try { logMcpServer(input.session_id, parts[1]); } catch { /* never break */ }
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

main();
