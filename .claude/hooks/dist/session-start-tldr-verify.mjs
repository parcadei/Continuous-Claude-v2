#!/usr/bin/env node

// src/session-start-tldr-verify.ts
import { execSync } from "child_process";
import * as fs from "fs";
function verifyTldr() {
  const tldrPath = "/usr/local/bin/tldr";
  if (!fs.existsSync(tldrPath)) {
    return {
      available: false,
      path: null,
      verified: false,
      error: null
      // Silent if not installed
    };
  }
  try {
    const stats = fs.lstatSync(tldrPath);
    const realPath = fs.existsSync(tldrPath) ? fs.realpathSync(tldrPath) : tldrPath;
    try {
      const helpOutput = execSync(`"${tldrPath}" --help 2>&1`, { encoding: "utf-8", timeout: 5e3 });
      if (helpOutput.includes("Token-efficient code analysis")) {
        return {
          available: true,
          path: realPath,
          verified: true,
          error: null
        };
      } else {
        return {
          available: true,
          path: realPath,
          verified: false,
          error: '/usr/local/bin/tldr is not llm-tldr (missing "Token-efficient code analysis" in --help)'
        };
      }
    } catch (execError) {
      const error = execError instanceof Error ? execError.message : String(execError);
      return {
        available: true,
        path: realPath,
        verified: false,
        error: `Failed to run tldr --help: ${error}`
      };
    }
  } catch (fsError) {
    return {
      available: true,
      path: tldrPath,
      verified: false,
      error: `Failed to access ${tldrPath}: ${fsError instanceof Error ? fsError.message : String(fsError)}`
    };
  }
}
function main() {
  const result = verifyTldr();
  if (result.available && result.verified && !result.error) {
    process.exit(0);
  }
  const verbose = process.env.VERBOSE === "1" || process.argv.includes("--verbose");
  if (!result.available) {
    if (verbose) {
      console.error("[tldr-code] Not installed (no /usr/local/bin/tldr)");
    }
    process.exit(0);
  }
  if (!result.verified) {
    console.error(`[tldr-code] Warning: ${result.error}`);
    process.exit(0);
  }
  process.exit(0);
}
main();
