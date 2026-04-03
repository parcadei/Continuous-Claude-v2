#!/usr/bin/env node
/**
 * Cross-platform Python runner for Claude Code hooks.
 * Finds the correct Python executable on macOS, Linux, and Windows.
 *
 * Usage: node run-python.mjs <script.py> [args...]
 */
import { spawn, execSync } from "child_process";

const pythonCandidates = ["python3", "python", "py"];
let python = null;

for (const cmd of pythonCandidates) {
  try {
    execSync(`${cmd} --version`, { stdio: "ignore" });
    python = cmd;
    break;
  } catch {}
}

if (!python) {
  console.error(
    "Error: Python not found. Install Python 3 and ensure it is on PATH.",
  );
  process.exit(1);
}

const [, , ...args] = process.argv;
const child = spawn(python, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
