#!/usr/bin/env node
/**
 * Skill Install Registrar Hook
 *
 * PostToolUse:Bash - Detects successful skill installations via `npx skills add`
 * and routes them through the vetting pipeline.
 *
 * - Trusted publishers: fast-path registration (extract_triggers.py + register_skill.py)
 * - Community skills: instructs Claude to run /vet-skill for full evaluation
 *
 * Hook: PostToolUse (Bash matching npx skills add)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

interface PostToolUseInput {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response?: unknown;
}

interface HookOutput {
  result: 'continue' | 'block';
  message?: string;
}

interface SkillLockEntry {
  source: string;
  sourceType: string;
  sourceUrl: string;
  skillPath: string;
  skillFolderHash: string;
  installedAt: string;
  updatedAt: string;
}

interface SkillLockFile {
  version: number;
  skills: Record<string, SkillLockEntry>;
  dismissed?: Record<string, boolean>;
}

interface SkillRulesFile {
  version: string;
  description: string;
  skills: Record<string, unknown>;
  agents?: Record<string, unknown>;
}

interface TrustedPublisher {
  org: string;
  tier?: string;
  reason?: string;
}

interface TrustedPublishersFile {
  publishers: TrustedPublisher[];
}

interface ExtractedTriggers {
  keywords: string[];
  intentPatterns: string[];
  description?: string;
}

const HOME_DIR = process.env.HOME || process.env.USERPROFILE || '';
const SKILLS_DIR = path.join(HOME_DIR, '.claude', 'skills');
const SKILL_RULES_PATH = path.join(SKILLS_DIR, 'skill-rules.json');
const TRUSTED_PUBLISHERS_PATH = path.join(SKILLS_DIR, 'trusted-publishers.json');
const LOCK_FILE_PATH = path.join(HOME_DIR, '.agents', '.skill-lock.json');
const EXTRACT_TRIGGERS_SCRIPT = path.join(SKILLS_DIR, 'vet-skill', 'scripts', 'extract_triggers.py');
const REGISTER_SCRIPT = path.join(SKILLS_DIR, 'vet-skill', 'scripts', 'register_skill.py');

const SKILL_INSTALL_PATTERN = /npx\s+skills?\s+add\b/i;
const SOURCE_EXTRACT_PATTERN = /npx\s+skills?\s+add\s+(?:--[^\s]+\s+)*["']?([^\s"']+)["']?/i;

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 14000);
  });
}

function emitContinue(message?: string): void {
  const output: HookOutput = { result: 'continue' };
  if (message) {
    output.message = message;
  }
  console.log(JSON.stringify(output));
}

/**
 * Extract the tool response as a string, handling various shapes.
 */
function extractResponse(toolResponse: unknown): string {
  if (typeof toolResponse === 'string') {
    return toolResponse;
  }
  if (toolResponse && typeof toolResponse === 'object') {
    const resp = toolResponse as Record<string, unknown>;
    if (typeof resp.output === 'string') return resp.output;
    if (typeof resp.stdout === 'string') return resp.stdout;
  }
  return JSON.stringify(toolResponse || '');
}

/**
 * Check if the command output indicates failure.
 */
function isFailedExecution(response: string): boolean {
  // Check for explicit exit code indicators
  if (/exit\s*code[:\s]+[1-9]\d*/i.test(response)) return true;
  if (/ENOENT|EACCES|EPERM/i.test(response)) return true;
  // Check last 5 lines for error+failed co-occurrence
  const lines = response.trim().split('\n');
  const tail = lines.slice(-5).join(' ');
  if (/error/i.test(tail) && /failed/i.test(tail)) return true;
  return false;
}

/**
 * Extract the org name from a skill source string.
 * e.g., "vercel-labs/agent-skills@web-design-guidelines" -> "vercel-labs"
 */
function extractOrg(source: string): string {
  const slashIndex = source.indexOf('/');
  if (slashIndex === -1) return source;
  return source.substring(0, slashIndex);
}

/**
 * Extract the skill name hint from the source string.
 * e.g., "vercel-labs/agent-skills@web-design-guidelines" -> "web-design-guidelines"
 */
function extractSkillNameHint(source: string): string | null {
  const atIndex = source.indexOf('@');
  if (atIndex === -1) return null;
  const afterAt = source.substring(atIndex + 1);
  // Strip any trailing version-like suffixes
  return afterAt.split('/')[0] || null;
}

/**
 * Read and parse a JSON file safely. Returns null on any failure.
 */
function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Determine which skills are newly installed by comparing lock file to skill-rules.
 */
function findNewSkills(lockFile: SkillLockFile, skillRules: SkillRulesFile): string[] {
  const registeredSkills = new Set(Object.keys(skillRules.skills || {}));
  const lockSkills = Object.keys(lockFile.skills || {});
  return lockSkills.filter((name) => !registeredSkills.has(name));
}

/**
 * Check if an org is in the trusted publishers list.
 */
function isTrustedPublisher(org: string, publishers: TrustedPublishersFile): boolean {
  if (!publishers.publishers || !Array.isArray(publishers.publishers)) return false;
  return publishers.publishers.some(
    (p) => p.org.toLowerCase() === org.toLowerCase()
  );
}

/**
 * Find the SKILL.md path for a given skill name.
 * Searches common locations under ~/.claude/skills/ and ~/.agents/skills/.
 */
function findSkillMdPath(skillName: string): string | null {
  const candidates = [
    path.join(SKILLS_DIR, skillName, 'SKILL.md'),
    path.join(HOME_DIR, '.agents', 'skills', skillName, 'SKILL.md'),
    path.join(SKILLS_DIR, skillName, 'skill.md'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Extract the description from SKILL.md frontmatter.
 */
function extractDescriptionFromSkillMd(skillMdPath: string): string {
  try {
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    // Try YAML frontmatter: ---\ndescription: ...\n---
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const descMatch = frontmatterMatch[1].match(/description:\s*["']?(.+?)["']?\s*$/m);
      if (descMatch) return descMatch[1].trim();
    }
    // Fallback: first non-heading, non-empty line
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
        return trimmed.substring(0, 120);
      }
    }
    return 'No description available';
  } catch {
    return 'No description available';
  }
}

/**
 * Run the extract_triggers.py script for a skill.
 * Returns parsed trigger data or null on failure.
 */
function runExtractTriggers(skillMdPath: string): ExtractedTriggers | null {
  if (!fs.existsSync(EXTRACT_TRIGGERS_SCRIPT)) {
    console.error('[skill-install-registrar] extract_triggers.py not found at:', EXTRACT_TRIGGERS_SCRIPT);
    return null;
  }

  try {
    const result = execFileSync('python', [EXTRACT_TRIGGERS_SCRIPT, '--skill-path', skillMdPath], {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(result.trim()) as ExtractedTriggers;
  } catch (err) {
    console.error('[skill-install-registrar] extract_triggers.py failed:', err);
    return null;
  }
}

/**
 * Register a skill in skill-rules.json via register_skill.py.
 */
function runRegisterSkill(skillName: string, entryJson: string): boolean {
  if (!fs.existsSync(REGISTER_SCRIPT)) {
    console.error('[skill-install-registrar] register_skill.py not found at:', REGISTER_SCRIPT);
    return false;
  }

  const tempFile = path.join(
    require('os').tmpdir(),
    `skill-entry-${Date.now()}.json`
  );
  fs.writeFileSync(tempFile, entryJson, 'utf-8');

  try {
    execFileSync('python', [
      REGISTER_SCRIPT,
      '--rules-path', SKILL_RULES_PATH,
      '--skill-name', skillName,
      '--entry-file', tempFile,
    ], {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch (err) {
    console.error('[skill-install-registrar] register_skill.py failed:', err);
    return false;
  } finally {
    try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
  }
}

/**
 * Build the skill-rules entry JSON for a trusted skill.
 */
function buildSkillEntry(
  skillName: string,
  description: string,
  triggers: ExtractedTriggers,
  org: string
): string {
  const entry = {
    type: 'domain',
    enforcement: 'suggest',
    priority: 'high',
    description,
    promptTriggers: {
      keywords: triggers.keywords || [],
      intentPatterns: triggers.intentPatterns || [],
    },
    source: {
      registry: 'skills.sh',
      repo: `${org}/unknown`,
      installedAt: new Date().toISOString(),
      trustTier: 'trusted',
      evalScores: null,
    },
  };
  return JSON.stringify(entry);
}

async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    emitContinue();
    return;
  }

  let data: PostToolUseInput;
  try {
    data = JSON.parse(input);
  } catch {
    emitContinue();
    return;
  }

  // Gate: only process Bash tool calls
  if (data.tool_name !== 'Bash') {
    emitContinue();
    return;
  }

  // Gate: check if the command is a skill install
  const command = (data.tool_input?.command as string) || '';
  if (!SKILL_INSTALL_PATTERN.test(command)) {
    emitContinue();
    return;
  }

  // Gate: check for failed execution
  const response = extractResponse(data.tool_response);
  if (isFailedExecution(response)) {
    console.error('[skill-install-registrar] Skill install command appears to have failed, skipping');
    emitContinue();
    return;
  }

  // Extract source from command
  const sourceMatch = command.match(SOURCE_EXTRACT_PATTERN);
  const source = sourceMatch ? sourceMatch[1] : '';
  const org = source ? extractOrg(source) : '';
  const skillNameHint = source ? extractSkillNameHint(source) : null;

  console.error(`[skill-install-registrar] Detected skill install: source="${source}" org="${org}"`);

  // Determine newly installed skills
  let newSkills: string[] = [];

  const lockFile = readJsonFile<SkillLockFile>(LOCK_FILE_PATH);
  const skillRules = readJsonFile<SkillRulesFile>(SKILL_RULES_PATH);

  if (lockFile && skillRules) {
    newSkills = findNewSkills(lockFile, skillRules);
  }

  // Fallback: infer from source argument
  if (newSkills.length === 0 && skillNameHint) {
    newSkills = [skillNameHint];
  }

  if (newSkills.length === 0) {
    console.error('[skill-install-registrar] No new skills detected');
    emitContinue('Skill install detected but no new unregistered skills found.');
    return;
  }

  console.error(`[skill-install-registrar] New skills detected: ${newSkills.join(', ')}`);

  // Check trusted publishers
  const trustedPublishers = readJsonFile<TrustedPublishersFile>(TRUSTED_PUBLISHERS_PATH);
  const isTrusted = trustedPublishers ? isTrustedPublisher(org, trustedPublishers) : false;

  if (isTrusted) {
    // Fast-path: register trusted skills immediately
    const messages: string[] = [];

    const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

    for (const skillName of newSkills) {
      if (!SKILL_NAME_PATTERN.test(skillName)) {
        console.error(`[skill-install-registrar] Invalid skill name: "${skillName}", skipping`);
        continue;
      }

      const skillMdPath = findSkillMdPath(skillName);
      if (!skillMdPath) {
        console.error(`[skill-install-registrar] SKILL.md not found for "${skillName}"`);
        messages.push(`Warning: Could not find SKILL.md for "${skillName}" -- manual registration needed.`);
        continue;
      }

      // Extract triggers
      const triggers = runExtractTriggers(skillMdPath);
      if (!triggers) {
        console.error(`[skill-install-registrar] Failed to extract triggers for "${skillName}"`);
        messages.push(`Warning: Could not extract triggers for "${skillName}" -- run /vet-skill ${skillName} manually.`);
        continue;
      }

      // Get description
      const description = triggers.description || extractDescriptionFromSkillMd(skillMdPath);

      // Build and register entry
      const entryJson = buildSkillEntry(skillName, description, triggers, org);
      const registered = runRegisterSkill(skillName, entryJson);

      if (registered) {
        messages.push(`Trusted skill '${skillName}' registered at tier: trusted (publisher: ${org})`);
        console.error(`[skill-install-registrar] Registered trusted skill: ${skillName}`);
      } else {
        messages.push(`Warning: Failed to register "${skillName}" -- run /vet-skill ${skillName} manually.`);
      }
    }

    emitContinue(messages.join('\n'));
  } else {
    // Community publisher: instruct Claude to vet
    const skillList = newSkills.join(', ');
    const message =
      `New community skill detected: '${skillList}' from '${org}'. ` +
      `Run /vet-skill ${newSkills[0]} to evaluate trigger accuracy and register it in the routing graph.`;

    console.error(`[skill-install-registrar] Community skill detected, recommending /vet-skill`);
    emitContinue(message);
  }
}

main().catch((err) => {
  console.error('[skill-install-registrar] Error:', err);
  emitContinue();
});
