/**
 * Cross-project relevance detection for ROADMAP contamination guard.
 *
 * When a user plans work for Project B while in Project A's directory,
 * this module detects the mismatch and prevents contamination of
 * Project A's ROADMAP.md.
 *
 * Used by:
 * - post-plan-roadmap.ts (blocks cross-project plan writes)
 * - session-start-continuity.ts (detects contaminated ROADMAP focus)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ProjectIdentity {
  dirName: string;
  registryName: string | null;
  packageName: string | null;
  keywords: string[];        // lowercased words from all sources
  otherProjects: string[];   // names of OTHER registered projects
}

export interface RelevanceResult {
  relevant: boolean;
  confidence: 'high' | 'low';
  reason: string;
}

interface RegistryProject {
  name: string;
  path: string;
  [key: string]: unknown;
}

interface Registry {
  projects: RegistryProject[];
}

/**
 * Build a ProjectIdentity for the given project directory.
 *
 * Reads project-registry.json and package.json to gather identity
 * keywords for the current project, plus names of all other projects
 * to detect cross-project references.
 */
export function getProjectIdentity(projectDir: string): ProjectIdentity {
  const resolvedDir = path.resolve(projectDir);
  const dirName = path.basename(resolvedDir);

  const identity: ProjectIdentity = {
    dirName,
    registryName: null,
    packageName: null,
    keywords: [],
    otherProjects: [],
  };

  // Collect keywords from directory name
  const dirKeywords = dirName.toLowerCase().split(/[-_\s]+/).filter(w => w.length > 1);
  const keywordSet = new Set<string>(dirKeywords);

  // Try to read project-registry.json
  const registry = readRegistry(resolvedDir);
  if (registry) {
    for (const project of registry.projects) {
      const projectPath = path.resolve(project.path);
      if (projectPath === resolvedDir) {
        // This is our project
        identity.registryName = project.name;
        // Add registry name words as keywords
        const nameWords = project.name.toLowerCase().split(/[-_\s]+/).filter(w => w.length > 1);
        for (const w of nameWords) keywordSet.add(w);
      } else {
        // This is another project
        identity.otherProjects.push(project.name);
      }
    }
  }

  // Try to read package.json for name field
  try {
    const pkgPath = path.join(resolvedDir, 'package.json');
    const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);
    if (pkg.name && typeof pkg.name === 'string') {
      identity.packageName = pkg.name;
      // Add package name words as keywords (strip scope)
      const cleanName = pkg.name.replace(/^@[^/]+\//, '');
      const pkgWords = cleanName.toLowerCase().split(/[-_\s]+/).filter((w: string) => w.length > 1);
      for (const w of pkgWords) keywordSet.add(w);
    }
  } catch {
    // No package.json or parse error -- continue without it
  }

  // Add the registry name itself as a keyword if present
  if (identity.registryName) {
    keywordSet.add(identity.registryName.toLowerCase());
  }

  identity.keywords = [...keywordSet];
  return identity;
}

/**
 * Determine if content is relevant to the given project.
 *
 * Fail-open design: returns relevant=true unless there is strong evidence
 * that the content is about a different project.
 *
 * Detection logic:
 * 1. Short/empty content -> relevant (fail-open)
 * 2. No registry data -> relevant (fail-open)
 * 3. Content mentions another project but NOT this one -> not relevant
 * 4. Otherwise -> relevant (fail-open)
 */
export function isContentRelevantToProject(content: string, identity: ProjectIdentity): RelevanceResult {
  // Fail-open: short or empty content
  if (!content || content.length < 50) {
    return { relevant: true, confidence: 'low', reason: 'content too short' };
  }

  // Fail-open: no other projects to compare against
  if (identity.otherProjects.length === 0) {
    return { relevant: true, confidence: 'low', reason: 'no registry to compare against' };
  }

  const contentLower = content.toLowerCase();

  // Check each other project
  for (const otherName of identity.otherProjects) {
    const otherLower = otherName.toLowerCase();

    // Does the content mention this other project?
    if (!contentLower.includes(otherLower)) {
      continue;
    }

    // Other project is mentioned. Does the content ALSO mention THIS project?
    let thisProjectMentioned = false;

    // Check registry name
    if (identity.registryName && contentLower.includes(identity.registryName.toLowerCase())) {
      thisProjectMentioned = true;
    }

    // Check keywords (at least one substantive keyword match)
    if (!thisProjectMentioned) {
      for (const kw of identity.keywords) {
        // Skip very short keywords that would false-positive
        if (kw.length < 3) continue;
        if (contentLower.includes(kw)) {
          thisProjectMentioned = true;
          break;
        }
      }
    }

    // Other project mentioned but this project is not -> cross-project content
    if (!thisProjectMentioned) {
      const thisName = identity.registryName || identity.dirName;
      return {
        relevant: false,
        confidence: 'high',
        reason: `content mentions "${otherName}" but not "${thisName}"`,
      };
    }
  }

  // No cross-project signals detected
  return { relevant: true, confidence: 'low', reason: 'no cross-project signals' };
}

/**
 * Read and parse project-registry.json from multiple candidate paths.
 * Returns null if not found or unparseable.
 */
function readRegistry(projectDir: string): Registry | null {
  const candidates = [
    path.join(projectDir, '.claude', 'project-registry.json'),
    'C:/Users/david.hayes/continuous-claude/.claude/project-registry.json',
  ];

  for (const candidate of candidates) {
    try {
      const content = fs.readFileSync(candidate, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.projects)) {
        return parsed as Registry;
      }
    } catch {
      // File not found or parse error -- try next candidate
    }
  }

  return null;
}
