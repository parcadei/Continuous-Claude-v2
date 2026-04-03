/**
 * Project State Management
 *
 * Tracks project-level state that's shared across all sessions.
 * Used for passing context to forked skills.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname } from "path";
const PROJECT_STATE_VERSION = "1.0";
export function getProjectStatePath(projectDir) {
  return join(projectDir, ".claude", "cache", "project-state.json");
}
export function loadProjectState(projectDir) {
  const path = getProjectStatePath(projectDir);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      // Corrupted file, start fresh
    }
  }
  return {
    version: PROJECT_STATE_VERSION,
    activePlan: null,
    activeSpec: null,
    updatedAt: new Date().toISOString(),
  };
}
export function saveProjectState(projectDir, state) {
  const path = getProjectStatePath(projectDir);
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  state.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(state, null, 2));
}
export function setActivePlan(projectDir, planPath) {
  const state = loadProjectState(projectDir);
  state.activePlan = planPath;
  saveProjectState(projectDir, state);
}
export function setActiveSpec(projectDir, specPath) {
  const state = loadProjectState(projectDir);
  state.activeSpec = specPath;
  saveProjectState(projectDir, state);
}
/**
 * Find the latest file in a directory matching a pattern.
 * Uses filename timestamps (YYYY-MM-DD) or mtime as fallback.
 */
export function findLatestFile(dir, pattern = /\.md$/) {
  if (!existsSync(dir)) return null;
  try {
    const files = readdirSync(dir)
      .filter((f) => pattern.test(f))
      .map((f) => {
        const fullPath = join(dir, f);
        const stat = statSync(fullPath);
        // Try to extract date from filename (YYYY-MM-DD format)
        const dateMatch = f.match(/^(\d{4}-\d{2}-\d{2})/);
        const fileDate = dateMatch
          ? new Date(dateMatch[1]).getTime()
          : stat.mtimeMs;
        return { path: fullPath, date: fileDate };
      })
      .sort((a, b) => b.date - a.date);
    return files.length > 0 ? files[0].path : null;
  } catch {
    return null;
  }
}
/**
 * Get the active plan, falling back to the latest plan file.
 */
export function getActivePlanOrLatest(projectDir) {
  const state = loadProjectState(projectDir);
  if (state.activePlan && existsSync(state.activePlan)) {
    return state.activePlan;
  }
  // Fallback: find latest plan
  const planDirs = [
    join(projectDir, "thoughts", "shared", "plans"),
    join(projectDir, "plans"),
    join(projectDir, "specs"),
  ];
  for (const dir of planDirs) {
    const latest = findLatestFile(dir);
    if (latest) return latest;
  }
  return null;
}
/**
 * Get the active spec, falling back to the latest spec file.
 */
export function getActiveSpecOrLatest(projectDir) {
  const state = loadProjectState(projectDir);
  if (state.activeSpec && existsSync(state.activeSpec)) {
    return state.activeSpec;
  }
  // Fallback: find latest spec
  const specDirs = [
    join(projectDir, "thoughts", "shared", "specs"),
    join(projectDir, "specs"),
  ];
  for (const dir of specDirs) {
    const latest = findLatestFile(dir);
    if (latest) return latest;
  }
  return null;
}
