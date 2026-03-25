#!/usr/bin/env node
/**
 * Package Install Security Guard (PreToolUse:Bash)
 *
 * Intercepts package install commands and blocks dangerous installs.
 * Protects against supply-chain attacks like:
 * - Typosquatting (requets -> requests)
 * - Known malicious versions (litellm 1.82.7/1.82.8)
 * - Suspiciously new packages (<24h = block, <7d = warn)
 *
 * Exit 0 = allow, Exit 2 = block
 *
 * Override: prefix command with SKIP_PACKAGE_GUARD=1
 */

import { readFileSync } from 'fs';
import https from 'https';
import http from 'http';
import { outputContinue } from './shared/output.js';
import { checkTyposquat } from './shared/typosquat-detect.js';
import maliciousPackages from './shared/malicious-packages.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PreToolUseInput {
  session_id: string;
  tool_name: string;
  tool_input: {
    command?: string;
    description?: string;
  };
}

interface PackageInfo {
  name: string;
  version: string | undefined;
}

type Ecosystem = 'pypi' | 'npm' | 'cargo' | 'go' | 'gem' | 'composer' | null;

interface MaliciousCheckResult {
  blocked: boolean;
  reason?: string;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Install command patterns
//
// Each entry: [regex to match the command prefix, ecosystem, extractArgs fn key]
//
// For npm/yarn/pnpm/bun install: bare "install" (no package arg) is NOT
// a targeted install. We require at least one package-looking argument.
// ---------------------------------------------------------------------------

const INSTALL_PATTERNS: Array<{
  regex: RegExp;
  ecosystem: Exclude<Ecosystem, null>;
  /** Number of leading tokens to skip when extracting package names */
  skipTokens: number;
}> = [
  // Python
  { regex: /^pip\s+install\b/, ecosystem: 'pypi', skipTokens: 2 },
  { regex: /^uv\s+pip\s+install\b/, ecosystem: 'pypi', skipTokens: 3 },
  { regex: /^uv\s+add\b/, ecosystem: 'pypi', skipTokens: 2 },
  { regex: /^poetry\s+add\b/, ecosystem: 'pypi', skipTokens: 2 },

  // JavaScript / Node
  { regex: /^npm\s+install\b/, ecosystem: 'npm', skipTokens: 2 },
  { regex: /^npm\s+i\b/, ecosystem: 'npm', skipTokens: 2 },
  { regex: /^yarn\s+add\b/, ecosystem: 'npm', skipTokens: 2 },
  { regex: /^pnpm\s+(add|install)\b/, ecosystem: 'npm', skipTokens: 2 },
  { regex: /^bun\s+(add|install)\b/, ecosystem: 'npm', skipTokens: 2 },

  // Rust
  { regex: /^cargo\s+(add|install)\b/, ecosystem: 'cargo', skipTokens: 2 },

  // Go
  { regex: /^go\s+get\b/, ecosystem: 'go', skipTokens: 2 },

  // Ruby
  { regex: /^gem\s+install\b/, ecosystem: 'gem', skipTokens: 2 },

  // PHP
  { regex: /^composer\s+require\b/, ecosystem: 'composer', skipTokens: 2 },
];

// Flags that take a value argument (the next token is NOT a package name)
const FLAGS_WITH_VALUE = new Set([
  '-r', '--requirement', '-c', '--constraint', '-e', '--editable',
  '-t', '--target', '-f', '--find-links', '-i', '--index-url',
  '--extra-index-url', '--prefix', '--root', '--src',
  // npm/yarn
  '--registry',
]);

// Flags that are standalone (no value follows)
const STANDALONE_FLAGS = /^-/;

// ---------------------------------------------------------------------------
// Exported detection functions
// ---------------------------------------------------------------------------

/**
 * Determine if a command is a package install command with named packages.
 * Returns false for bare installs (npm install, yarn install) and
 * requirements-file installs (pip install -r requirements.txt).
 */
export function isPackageInstallCommand(command: string): boolean {
  const trimmed = stripEnvPrefix(command).trim();

  for (const { regex } of INSTALL_PATTERNS) {
    if (regex.test(trimmed)) {
      // Check that there is at least one package-looking argument
      const pkgs = extractPackageNames(command);
      return pkgs.length > 0;
    }
  }
  return false;
}

/**
 * Identify the package ecosystem from a command string.
 */
export function parseEcosystem(command: string): Ecosystem {
  const trimmed = stripEnvPrefix(command).trim();
  for (const { regex, ecosystem } of INSTALL_PATTERNS) {
    if (regex.test(trimmed)) {
      return ecosystem;
    }
  }
  return null;
}

/**
 * Extract package names (and optional versions) from an install command.
 */
export function extractPackageNames(command: string): PackageInfo[] {
  const trimmed = stripEnvPrefix(command).trim();
  const ecosystem = parseEcosystem(command);
  if (!ecosystem) return [];

  // Find matching pattern to know how many leading tokens to skip
  let skipTokens = 2;
  for (const pattern of INSTALL_PATTERNS) {
    if (pattern.regex.test(trimmed)) {
      skipTokens = pattern.skipTokens;
      break;
    }
  }

  const tokens = tokenize(trimmed);
  const packages: PackageInfo[] = [];

  let i = skipTokens;
  let skipNext = false;

  while (i < tokens.length) {
    const token = tokens[i];

    if (skipNext) {
      skipNext = false;
      i++;
      continue;
    }

    // If this is a flag that consumes the next token, skip both
    if (FLAGS_WITH_VALUE.has(token)) {
      skipNext = true;
      i++;
      continue;
    }

    // Skip standalone flags (--save-dev, --global, -U, etc.)
    if (STANDALONE_FLAGS.test(token)) {
      i++;
      continue;
    }

    // This should be a package name
    const parsed = parsePackageToken(token, ecosystem);
    if (parsed) {
      packages.push(parsed);
    }

    i++;
  }

  return packages;
}

/**
 * Check if the command has the SKIP_PACKAGE_GUARD=1 override.
 */
export function checkOverride(command: string): boolean {
  return /\bSKIP_PACKAGE_GUARD=1\b/.test(command);
}

/**
 * Check if a package+version is in the malicious packages blocklist.
 */
export function checkMaliciousPackage(
  name: string,
  version: string | undefined,
  ecosystem: Exclude<Ecosystem, null>
): MaliciousCheckResult {
  const ecosystemKey = ecosystem === 'pypi' ? 'pypi' : 'npm';

  // Only pypi and npm have blocklist entries currently
  if (ecosystemKey !== 'pypi' && ecosystemKey !== 'npm') {
    return { blocked: false };
  }

  const registry = (maliciousPackages as Record<string, Record<string, any>>)[ecosystemKey];
  if (!registry) return { blocked: false };

  const entry = registry[name.toLowerCase()];
  if (!entry) return { blocked: false };

  // blocked_all = true means ALL versions are blocked
  if (entry.blocked_all === true) {
    return {
      blocked: true,
      reason: entry.reason || `Package "${name}" is entirely blocked`,
    };
  }

  // Check specific version blocks
  if (entry.blocked_versions && Array.isArray(entry.blocked_versions)) {
    if (version && entry.blocked_versions.includes(version)) {
      return {
        blocked: true,
        reason: entry.reason || `Version ${version} of "${name}" is known malicious`,
      };
    }

    // No version specified but package has known-bad versions -> warn
    if (!version && entry.blocked_versions.length > 0) {
      return {
        blocked: false,
        warning: `Package "${name}" has known malicious versions: ${entry.blocked_versions.join(', ')}. Ensure you are installing a safe version.`,
      };
    }
  }

  return { blocked: false };
}

// ---------------------------------------------------------------------------
// Registry age check (PyPI / npm)
// ---------------------------------------------------------------------------

interface AgeCheckResult {
  ageHours: number | null;
  blocked: boolean;
  warning?: string;
  error?: string;
}

async function checkPackageAge(
  name: string,
  ecosystem: Exclude<Ecosystem, null>
): Promise<AgeCheckResult> {
  if (ecosystem !== 'pypi' && ecosystem !== 'npm') {
    return { ageHours: null, blocked: false };
  }

  try {
    const publishDate = await fetchPublishDate(name, ecosystem);
    if (!publishDate) {
      return { ageHours: null, blocked: false };
    }

    const ageMs = Date.now() - publishDate.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (ageHours < 24) {
      return {
        ageHours,
        blocked: true,
        warning: `Package "${name}" was published less than 24 hours ago (${Math.round(ageHours)}h). This is suspicious for supply-chain attacks.`,
      };
    }

    if (ageHours < 168) { // 7 days
      const ageDays = Math.round(ageHours / 24);
      return {
        ageHours,
        blocked: false,
        warning: `Package "${name}" was published ${ageDays} day(s) ago. Proceed with caution.`,
      };
    }

    return { ageHours, blocked: false };
  } catch {
    // Fail-open for network issues
    return { ageHours: null, blocked: false, error: 'Registry check failed (network)' };
  }
}

function fetchPublishDate(
  name: string,
  ecosystem: 'pypi' | 'npm'
): Promise<Date | null> {
  return new Promise((resolve) => {
    const url = ecosystem === 'pypi'
      ? `https://pypi.org/pypi/${encodeURIComponent(name)}/json`
      : `https://registry.npmjs.org/${encodeURIComponent(name)}`;

    const timer = setTimeout(() => {
      resolve(null);
    }, 5000);

    const req = https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        clearTimeout(timer);
        try {
          const json = JSON.parse(data);
          if (ecosystem === 'pypi') {
            // PyPI: info.version -> releases[version][0].upload_time_iso_8601
            const version = json?.info?.version;
            const releases = json?.releases?.[version];
            if (releases && releases.length > 0) {
              resolve(new Date(releases[0].upload_time_iso_8601));
              return;
            }
          } else {
            // npm: time[latest-version]
            const latest = json?.['dist-tags']?.latest;
            const timeEntry = json?.time?.[latest];
            if (timeEntry) {
              resolve(new Date(timeEntry));
              return;
            }
          }
          resolve(null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      clearTimeout(timer);
      resolve(null);
    });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip env var prefixes like "FOO=bar BAZ=1 " from a command. */
function stripEnvPrefix(command: string): string {
  return command.replace(/^(\s*[A-Za-z_][A-Za-z0-9_]*=[^\s]*\s+)*/, '');
}

/** Simple tokenizer that respects quotes. */
function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote: string | null = null;

  for (const ch of command) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === ' ' || ch === '\t') {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current) tokens.push(current);
  return tokens;
}

/**
 * Parse a single token into a PackageInfo.
 * Handles npm-style @scope/name@version and pip-style name==version.
 */
function parsePackageToken(
  token: string,
  ecosystem: Exclude<Ecosystem, null>
): PackageInfo | null {
  // Skip tokens that look like file paths or URLs
  if (token.includes('/') && !token.startsWith('@') && ecosystem !== 'go' && ecosystem !== 'composer') {
    return null;
  }

  if (ecosystem === 'pypi') {
    // pip: name==version, name>=version, name~=version, name[extras]==version
    const match = token.match(/^([a-zA-Z0-9_.-]+)(?:\[.*?\])?(?:[=<>~!]+(.+))?$/);
    if (match) {
      return { name: match[1], version: match[2] || undefined };
    }
  } else if (ecosystem === 'npm') {
    // npm: @scope/name@version or name@version
    if (token.startsWith('@')) {
      // Scoped package: @scope/name or @scope/name@version
      const lastAt = token.lastIndexOf('@');
      if (lastAt > 0) {
        // Could be @scope/name@version
        const name = token.slice(0, lastAt);
        const version = token.slice(lastAt + 1);
        if (name.includes('/')) {
          return { name, version: version || undefined };
        }
      }
      // @scope/name without version
      return { name: token, version: undefined };
    } else {
      // Unscoped: name or name@version
      const atIdx = token.indexOf('@');
      if (atIdx > 0) {
        return { name: token.slice(0, atIdx), version: token.slice(atIdx + 1) || undefined };
      }
      return { name: token, version: undefined };
    }
  } else if (ecosystem === 'go') {
    // go get: github.com/user/repo@version
    const atIdx = token.indexOf('@');
    if (atIdx > 0) {
      return { name: token.slice(0, atIdx), version: token.slice(atIdx + 1) };
    }
    return { name: token, version: undefined };
  } else if (ecosystem === 'composer') {
    // composer: vendor/package:version or vendor/package
    const colonIdx = token.indexOf(':');
    if (colonIdx > 0) {
      return { name: token.slice(0, colonIdx), version: token.slice(colonIdx + 1) };
    }
    return { name: token, version: undefined };
  } else {
    // cargo, gem, etc.
    return { name: token, version: undefined };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function outputDeny(reason: string): void {
  const output = {
    permissionDecision: 'deny',
    reason,
  };
  console.log(JSON.stringify(output));
  process.exit(2);
}

function outputAllowWithAdvisory(advisory: string): void {
  const output = {
    hookSpecificOutput: {
      additionalContext: advisory,
    },
  };
  console.log(JSON.stringify(output));
}

function outputAllowOk(): void {
  outputContinue();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

async function main() {
  let input: PreToolUseInput;
  try {
    input = JSON.parse(readStdin());
  } catch {
    outputContinue();
    return;
  }

  // Only process Bash tool calls
  if (input.tool_name !== 'Bash') {
    outputContinue();
    return;
  }

  const command = input.tool_input.command as string | undefined;
  if (!command) {
    outputContinue();
    return;
  }

  // Fast path: not a package install -> passthrough immediately
  if (!isPackageInstallCommand(command)) {
    outputContinue();
    return;
  }

  // Check override
  if (checkOverride(command)) {
    outputContinue();
    return;
  }

  const ecosystem = parseEcosystem(command);
  if (!ecosystem) {
    outputContinue();
    return;
  }

  const packages = extractPackageNames(command);
  if (packages.length === 0) {
    outputContinue();
    return;
  }

  const advisories: string[] = [];

  for (const pkg of packages) {
    // 1. Typosquat check (only for pypi and npm)
    if (ecosystem === 'pypi' || ecosystem === 'npm') {
      const typo = checkTyposquat(pkg.name, ecosystem);
      if (typo.isTyposquat) {
        outputDeny(
          `PACKAGE SECURITY: Suspected typosquat. "${pkg.name}" looks like "${typo.similarTo}". ${typo.reason}. Package: ${pkg.name}. To override: prefix command with SKIP_PACKAGE_GUARD=1`
        );
        return; // exit(2) already called in outputDeny
      }
    }

    // 2. Malicious package blocklist check (pypi and npm)
    if (ecosystem === 'pypi' || ecosystem === 'npm') {
      const malCheck = checkMaliciousPackage(pkg.name, pkg.version, ecosystem);
      if (malCheck.blocked) {
        outputDeny(
          `PACKAGE SECURITY: Known malicious package/version. ${malCheck.reason}. Package: ${pkg.name}${pkg.version ? '@' + pkg.version : ''}. To override: prefix command with SKIP_PACKAGE_GUARD=1`
        );
        return;
      }
      if (malCheck.warning) {
        advisories.push(malCheck.warning);
      }
    }

    // 3. Package age check (pypi and npm only)
    if (ecosystem === 'pypi' || ecosystem === 'npm') {
      const ageResult = await checkPackageAge(pkg.name, ecosystem);
      if (ageResult.blocked) {
        outputDeny(
          `PACKAGE SECURITY: ${ageResult.warning} Package: ${pkg.name}. To override: prefix command with SKIP_PACKAGE_GUARD=1`
        );
        return;
      }
      if (ageResult.warning) {
        advisories.push(`PACKAGE ADVISORY: ${ageResult.warning}`);
      }
    }
  }

  // All checks passed
  if (advisories.length > 0) {
    outputAllowWithAdvisory(advisories.join('\n'));
  } else {
    outputAllowOk();
  }
}

// Only run main() when executed as a standalone script, not when imported
// by vitest or other test runners. Vitest sets VITEST=true and
// VITEST_WORKER_ID in the environment.
if (!process.env.VITEST) {
  main().catch(() => {
    // Fail-open: if the hook itself crashes, allow the command
    outputContinue();
  });
}
