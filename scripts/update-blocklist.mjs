#!/usr/bin/env node
/**
 * update-blocklist.mjs — Auto-update malicious-packages.json from GitHub Advisory API
 *
 * Sources:
 *   A. GitHub Advisory API — type=malware, ecosystem=npm (confirmed malware)
 *   B. GitHub Advisory API — type=reviewed, ecosystem=pip, severity=critical
 *
 * Usage:
 *   node scripts/update-blocklist.mjs                     # Dry run — show what would change
 *   node scripts/update-blocklist.mjs --apply             # Write changes to malicious-packages.json
 *   node scripts/update-blocklist.mjs --apply --rebuild   # Write + rebuild hooks
 *
 * Requires: gh CLI authenticated (gh auth status)
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOCKLIST_PATH = resolve(__dirname, '../.claude/hooks/src/shared/malicious-packages.json');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const REBUILD = args.includes('--rebuild');

// ---------------------------------------------------------------------------
// GitHub Advisory API queries
// ---------------------------------------------------------------------------

function ghApi(endpoint) {
  try {
    const result = execSync(`gh api "${endpoint}" --paginate`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 30000,
    });
    // gh --paginate concatenates JSON arrays, need to handle
    // It outputs one JSON array per page, concatenated. Parse carefully.
    const trimmed = result.trim();
    if (!trimmed) return [];

    // gh --paginate for arrays outputs multiple JSON arrays concatenated
    // e.g., [{...}]\n[{...}]\n — we need to merge them
    try {
      return JSON.parse(trimmed);
    } catch {
      // Try splitting by ]\n[ and merging
      const merged = '[' + trimmed.replace(/\]\s*\[/g, ',') + ']';
      try {
        // If it was already wrapped in outer [], unwrap one level
        const parsed = JSON.parse(merged);
        return Array.isArray(parsed[0]) ? parsed.flat() : parsed;
      } catch {
        console.error('Failed to parse gh api output');
        return [];
      }
    }
  } catch (err) {
    console.error(`gh api failed for ${endpoint}:`, err.message);
    return [];
  }
}

function fetchNpmMalware() {
  console.log('Fetching npm malware advisories from GitHub...');
  return ghApi('/advisories?type=malware&ecosystem=npm&per_page=100');
}

function fetchPypiCritical() {
  console.log('Fetching PyPI critical advisories from GitHub...');
  return ghApi('/advisories?type=reviewed&ecosystem=pip&severity=critical&per_page=100');
}

// ---------------------------------------------------------------------------
// Parse advisories into blocklist entries
// ---------------------------------------------------------------------------

function parseAdvisory(advisory, ecosystem) {
  const ghsaId = advisory.ghsa_id || advisory.id || 'unknown';
  const summary = advisory.summary || '';
  const publishedAt = advisory.published_at || new Date().toISOString();
  const date = publishedAt.split('T')[0];
  const htmlUrl = advisory.html_url || `https://github.com/advisories/${ghsaId}`;

  // Extract affected package names and versions
  const entries = [];

  const vulnerabilities = advisory.vulnerabilities || [];
  for (const vuln of vulnerabilities) {
    const pkg = vuln.package;
    if (!pkg) continue;

    const name = pkg.name;
    if (!name) continue;

    // Extract version range
    const range = vuln.vulnerable_version_range || '';
    const firstPatched = vuln.first_patched_version?.identifier;

    // For malware, we want to block ALL versions (the package itself is malicious)
    const isMalware = advisory.type === 'malware';

    entries.push({
      name: name.toLowerCase(),
      ecosystem,
      isMalware,
      range,
      firstPatched,
      reason: `${summary} (${ghsaId})`,
      date,
      advisory: htmlUrl,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Merge into existing blocklist
// ---------------------------------------------------------------------------

function mergeIntoBlocklist(blocklist, entries) {
  let newPackages = 0;
  let updatedPackages = 0;

  for (const entry of entries) {
    const section = entry.ecosystem; // 'npm' or 'pypi'
    if (!blocklist[section]) blocklist[section] = {};

    const existing = blocklist[section][entry.name];

    if (!existing) {
      // New package
      if (entry.isMalware) {
        blocklist[section][entry.name] = {
          blocked_all: true,
          reason: entry.reason,
          date: entry.date,
          advisory: entry.advisory,
        };
      } else {
        blocklist[section][entry.name] = {
          blocked_versions: [],
          reason: entry.reason,
          date: entry.date,
          advisory: entry.advisory,
        };
      }
      newPackages++;
    } else {
      // Existing package — update if we have new info
      if (entry.isMalware && !existing.blocked_all) {
        existing.blocked_all = true;
        existing.reason = entry.reason;
        existing.date = entry.date;
        existing.advisory = entry.advisory;
        updatedPackages++;
      }
      // Don't overwrite manually curated entries with less specific data
    }
  }

  return { newPackages, updatedPackages };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Verify gh is available
  try {
    execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    console.error('Error: gh CLI not authenticated. Run: gh auth login');
    process.exit(1);
  }

  // Read existing blocklist
  let blocklist;
  try {
    blocklist = JSON.parse(readFileSync(BLOCKLIST_PATH, 'utf-8'));
  } catch {
    console.error(`Error: Could not read ${BLOCKLIST_PATH}`);
    process.exit(1);
  }

  const existingNpm = Object.keys(blocklist.npm || {}).length;
  const existingPypi = Object.keys(blocklist.pypi || {}).length;
  console.log(`Current blocklist: ${existingNpm} npm + ${existingPypi} PyPI = ${existingNpm + existingPypi} packages\n`);

  // Fetch advisories
  const npmAdvisories = fetchNpmMalware();
  const pypiAdvisories = fetchPypiCritical();

  console.log(`  npm malware advisories found: ${npmAdvisories.length}`);
  console.log(`  PyPI critical advisories found: ${pypiAdvisories.length}\n`);

  // Parse into entries
  const npmEntries = npmAdvisories.flatMap(a => parseAdvisory(a, 'npm'));
  const pypiEntries = pypiAdvisories.flatMap(a => parseAdvisory(a, 'pypi'));
  const allEntries = [...npmEntries, ...pypiEntries];

  console.log(`  Parsed entries: ${npmEntries.length} npm + ${pypiEntries.length} PyPI = ${allEntries.length} total\n`);

  // Merge
  const { newPackages, updatedPackages } = mergeIntoBlocklist(blocklist, allEntries);

  const finalNpm = Object.keys(blocklist.npm || {}).length;
  const finalPypi = Object.keys(blocklist.pypi || {}).length;

  console.log('--- Results ---');
  console.log(`  New packages added: ${newPackages}`);
  console.log(`  Existing packages updated: ${updatedPackages}`);
  console.log(`  Final blocklist: ${finalNpm} npm + ${finalPypi} PyPI = ${finalNpm + finalPypi} packages`);

  if (newPackages === 0 && updatedPackages === 0) {
    console.log('\nBlocklist is already up to date.');
    return;
  }

  if (!APPLY) {
    console.log('\nDry run complete. Use --apply to write changes.');
    // Show what would be added
    if (newPackages > 0) {
      console.log('\nNew packages that would be added:');
      for (const entry of allEntries) {
        const section = entry.ecosystem;
        // Check if this is genuinely new (not in original blocklist)
        if (!blocklist[section]?.[entry.name]) continue; // already merged, check original
        console.log(`  ${section}/${entry.name}: ${entry.reason}`);
      }
    }
    return;
  }

  // Write updated blocklist
  writeFileSync(BLOCKLIST_PATH, JSON.stringify(blocklist, null, 2) + '\n');
  console.log(`\nWritten to ${BLOCKLIST_PATH}`);

  if (REBUILD) {
    console.log('\nRebuilding hooks...');
    try {
      execSync('npm run build', {
        cwd: resolve(__dirname, '../.claude/hooks'),
        encoding: 'utf-8',
        stdio: 'inherit',
      });
      console.log('Hooks rebuilt successfully.');
    } catch {
      console.error('Hook rebuild failed. Run manually: cd .claude/hooks && npm run build');
    }

    console.log('\nSyncing to ~/.claude/...');
    try {
      execSync('bash scripts/sync-to-active.sh', {
        cwd: resolve(__dirname, '..'),
        encoding: 'utf-8',
        stdio: 'inherit',
      });
    } catch {
      console.error('Sync failed. Run manually: bash scripts/sync-to-active.sh');
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
