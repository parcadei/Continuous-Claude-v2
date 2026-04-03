/**
 * Spec Context Management
 *
 * Shared utilities for managing spec-context.json - the central state
 * that tracks which spec/phase each session is implementing.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { join, dirname } from "path";

export interface AgentScope {
  section: string;
  file_patterns: string[];
  registered_at: string;
  parent_session?: string;
}

export interface SessionContext {
  active_spec: string | null;
  current_phase: string | null;
  activated_at: string;
  edit_count: number;
  last_checkpoint: number;
  agents: Record<string, AgentScope>;
}

export interface SpecContext {
  version: string;
  sessions: Record<string, SessionContext>;
}

const SPEC_CONTEXT_VERSION = "1.0";
const CHECKPOINT_INTERVAL = 5;

export function getSpecContextPath(projectDir: string): string {
  return join(projectDir, ".claude", "cache", "spec-context.json");
}

export function loadSpecContext(projectDir: string): SpecContext {
  const path = getSpecContextPath(projectDir);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      // Corrupted file, start fresh
    }
  }
  return { version: SPEC_CONTEXT_VERSION, sessions: {} };
}

export function saveSpecContext(
  projectDir: string,
  context: SpecContext,
): void {
  const path = getSpecContextPath(projectDir);
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(context, null, 2));
}

export function getSessionContext(
  projectDir: string,
  sessionId: string,
): SessionContext | null {
  const context = loadSpecContext(projectDir);
  return context.sessions[sessionId] || null;
}

export function createEmptySessionContext(): SessionContext {
  return {
    active_spec: null,
    current_phase: null,
    activated_at: new Date().toISOString(),
    edit_count: 0,
    last_checkpoint: 0,
    agents: {},
  };
}

export function setSessionSpec(
  projectDir: string,
  sessionId: string,
  specPath: string,
  phase?: string,
): void {
  const context = loadSpecContext(projectDir);
  const existing = context.sessions[sessionId] || createEmptySessionContext();

  context.sessions[sessionId] = {
    ...existing,
    active_spec: specPath,
    current_phase: phase || existing.current_phase,
    activated_at: new Date().toISOString(),
    edit_count: 0,
    last_checkpoint: 0,
  };

  saveSpecContext(projectDir, context);
}

export function setSessionPhase(
  projectDir: string,
  sessionId: string,
  phase: string,
): void {
  const context = loadSpecContext(projectDir);
  if (context.sessions[sessionId]) {
    context.sessions[sessionId].current_phase = phase;
    saveSpecContext(projectDir, context);
  }
}

export function registerAgent(
  projectDir: string,
  sessionId: string,
  parentSessionId: string | undefined,
  scope: Omit<AgentScope, "registered_at" | "parent_session">,
): void {
  const context = loadSpecContext(projectDir);

  // Find parent's spec context
  const parentContext = parentSessionId
    ? context.sessions[parentSessionId]
    : null;

  // Create agent's session entry
  context.sessions[sessionId] = {
    active_spec: parentContext?.active_spec || null,
    current_phase: scope.section,
    activated_at: new Date().toISOString(),
    edit_count: 0,
    last_checkpoint: 0,
    agents: {},
  };

  // Also register in parent's agents list if parent exists
  if (parentSessionId && context.sessions[parentSessionId]) {
    context.sessions[parentSessionId].agents[sessionId] = {
      ...scope,
      registered_at: new Date().toISOString(),
      parent_session: parentSessionId,
    };
  }

  saveSpecContext(projectDir, context);
}

export function unregisterAgent(projectDir: string, sessionId: string): void {
  const context = loadSpecContext(projectDir);

  // Find and remove from parent's agents list
  for (const [parentId, session] of Object.entries(context.sessions)) {
    if (session.agents[sessionId]) {
      delete session.agents[sessionId];
    }
  }

  // Remove the session itself
  delete context.sessions[sessionId];

  saveSpecContext(projectDir, context);
}

export function incrementEditCount(
  projectDir: string,
  sessionId: string,
): {
  count: number;
  needsCheckpoint: boolean;
} {
  const context = loadSpecContext(projectDir);
  const session = context.sessions[sessionId];

  if (!session) {
    return { count: 0, needsCheckpoint: false };
  }

  session.edit_count++;
  const editsSinceCheckpoint = session.edit_count - session.last_checkpoint;
  const needsCheckpoint = editsSinceCheckpoint >= CHECKPOINT_INTERVAL;

  if (needsCheckpoint) {
    session.last_checkpoint = session.edit_count;
  }

  saveSpecContext(projectDir, context);

  return { count: session.edit_count, needsCheckpoint };
}

export function clearSession(projectDir: string, sessionId: string): void {
  const context = loadSpecContext(projectDir);
  delete context.sessions[sessionId];
  saveSpecContext(projectDir, context);
}

// Spec file utilities

export function findSpecFile(
  projectDir: string,
  specName: string,
): string | null {
  const specDirs = [
    join(projectDir, "thoughts", "shared", "specs"),
    join(projectDir, "thoughts", "shared", "plans"),
    join(projectDir, "specs"),
    join(projectDir, "plans"),
  ];

  for (const dir of specDirs) {
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir) as string[];

    // Exact match first
    const exact = files.find((f) => f === specName || f === `${specName}.md`);
    if (exact) return join(dir, exact);

    // Partial match
    const partial = files.find(
      (f) =>
        f.toLowerCase().includes(specName.toLowerCase()) && f.endsWith(".md"),
    );
    if (partial) return join(dir, partial);
  }

  // Check if it's already a full path
  if (specName.endsWith(".md") && existsSync(join(projectDir, specName))) {
    return join(projectDir, specName);
  }

  return null;
}

export function extractSpecRequirements(
  specContent: string,
  section?: string,
): string {
  // If a section is specified, extract just that section
  if (section) {
    const sectionRegex = new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`, "i");
    const match = specContent.match(sectionRegex);
    if (match) {
      return extractCriteria(match[0]);
    }
  }

  // Otherwise extract key sections
  return extractCriteria(specContent);
}

function extractCriteria(content: string): string {
  const sections = [
    "## Requirements",
    "## Functional Requirements",
    "## Must Have",
    "## Success Criteria",
    "## Acceptance Criteria",
    "### Success Criteria",
    "### Acceptance Criteria",
  ];

  const extracted: string[] = [];

  for (const section of sections) {
    const regex = new RegExp(
      `${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?(?=\\n## |\\n### |$)`,
      "i",
    );
    const match = content.match(regex);
    if (match) {
      extracted.push(match[0].slice(0, 600));
    }
  }

  // Also extract checkbox items
  const checkboxes = content.match(/- \[ \] .+/g) || [];
  if (checkboxes.length > 0) {
    extracted.push(
      "Acceptance Criteria:\n" + checkboxes.slice(0, 10).join("\n"),
    );
  }

  if (extracted.length > 0) {
    return extracted.join("\n\n").slice(0, 1500);
  }

  // Fallback: first 800 chars
  return content.slice(0, 800);
}

export function extractAcceptanceCriteria(
  specContent: string,
  section?: string,
): string[] {
  const content = section
    ? extractSpecRequirements(specContent, section)
    : specContent;

  const criteria: string[] = [];

  // Checkbox items
  const checkboxes = content.match(/- \[ \] .+/g) || [];
  criteria.push(...checkboxes);

  // Numbered items in success/acceptance sections
  const numbered = content.match(/^\d+\.\s+.+$/gm) || [];
  criteria.push(...numbered);

  return [...new Set(criteria)].slice(0, 15);
}
