/**
 * Tests for shared/project-relevance.ts
 *
 * Cross-project relevance detection for ROADMAP contamination guard.
 * Tests cover both getProjectIdentity and isContentRelevantToProject.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs before importing the module under test
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
  };
});

import {
  getProjectIdentity,
  isContentRelevantToProject,
  ProjectIdentity,
  RelevanceResult,
} from '../shared/project-relevance.js';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_REGISTRY = {
  projects: [
    {
      name: 'continuous-claude',
      path: 'C:/Users/david.hayes/continuous-claude',
      status: 'active',
    },
    {
      name: 'NorthStar Transformation',
      path: 'C:/Users/david.hayes/Projects/northstar-transformation',
      status: 'active',
    },
    {
      name: 'Fourth Connect',
      path: 'C:/Users/david.hayes/Projects/fourth-connect',
      status: 'active',
    },
    {
      name: 'ECG Lead Reactivation Engine',
      path: 'C:/Users/david.hayes/Projects/ECG Lead Reactivation Engine',
      status: 'active',
    },
    {
      name: 'agent-factory',
      path: 'C:/Users/david.hayes/Projects/agent-factory',
      status: 'active',
    },
  ],
};

const MOCK_PACKAGE_JSON = {
  name: 'continuous-claude',
  version: '1.0.0',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockedReadFileSync = vi.mocked(fs.readFileSync);

function setupRegistryMock(projectDir: string, registry: object | null, packageJson: object | null = null) {
  mockedReadFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor, _options?: any) => {
    const p = String(filePath);
    const registryPath = path.join(projectDir, '.claude', 'project-registry.json');
    const fallbackRegistryPath = 'C:/Users/david.hayes/continuous-claude/.claude/project-registry.json';
    const pkgPath = path.join(projectDir, 'package.json');

    if (registry && (p === registryPath || p === fallbackRegistryPath)) {
      return JSON.stringify(registry);
    }
    if (packageJson && p === pkgPath) {
      return JSON.stringify(packageJson);
    }
    throw new Error(`ENOENT: no such file: ${p}`);
  });
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// getProjectIdentity
// =============================================================================

describe('getProjectIdentity', () => {
  it('returns dir basename as dirName', () => {
    setupRegistryMock('C:/Users/david.hayes/continuous-claude', null);
    const identity = getProjectIdentity('C:/Users/david.hayes/continuous-claude');
    expect(identity.dirName).toBe('continuous-claude');
  });

  it('extracts keywords from directory name split on hyphens', () => {
    setupRegistryMock('C:/Users/david.hayes/Projects/northstar-transformation', null);
    const identity = getProjectIdentity('C:/Users/david.hayes/Projects/northstar-transformation');
    expect(identity.keywords).toContain('northstar');
    expect(identity.keywords).toContain('transformation');
  });

  it('reads registry and finds matching project by path', () => {
    setupRegistryMock('C:/Users/david.hayes/continuous-claude', MOCK_REGISTRY);
    const identity = getProjectIdentity('C:/Users/david.hayes/continuous-claude');
    expect(identity.registryName).toBe('continuous-claude');
  });

  it('returns other project names from registry', () => {
    setupRegistryMock('C:/Users/david.hayes/continuous-claude', MOCK_REGISTRY);
    const identity = getProjectIdentity('C:/Users/david.hayes/continuous-claude');
    expect(identity.otherProjects).toContain('NorthStar Transformation');
    expect(identity.otherProjects).toContain('Fourth Connect');
    expect(identity.otherProjects).toContain('ECG Lead Reactivation Engine');
    expect(identity.otherProjects).toContain('agent-factory');
    expect(identity.otherProjects).not.toContain('continuous-claude');
  });

  it('handles missing registry gracefully', () => {
    setupRegistryMock('C:/some/unknown/project', null);
    const identity = getProjectIdentity('C:/some/unknown/project');
    expect(identity.registryName).toBeNull();
    expect(identity.otherProjects).toEqual([]);
    expect(identity.dirName).toBe('project');
  });

  it('reads package.json name field', () => {
    setupRegistryMock('C:/Users/david.hayes/continuous-claude', MOCK_REGISTRY, MOCK_PACKAGE_JSON);
    const identity = getProjectIdentity('C:/Users/david.hayes/continuous-claude');
    expect(identity.packageName).toBe('continuous-claude');
  });

  it('handles Windows paths with mixed separators via path.resolve', () => {
    // path.resolve normalizes separators, so both forward and back slashes work
    setupRegistryMock('C:/Users/david.hayes/continuous-claude', MOCK_REGISTRY);
    const identity = getProjectIdentity('C:\\Users\\david.hayes\\continuous-claude');
    // path.resolve will normalize, so the registry match should still work
    expect(identity.dirName).toBe('continuous-claude');
    // registryName depends on path.resolve normalization matching
    // On Windows, path.resolve('C:\\...') === path.resolve('C:/...')
    expect(identity.registryName).toBe('continuous-claude');
  });

  it('adds registry name as a keyword', () => {
    setupRegistryMock('C:/Users/david.hayes/continuous-claude', MOCK_REGISTRY);
    const identity = getProjectIdentity('C:/Users/david.hayes/continuous-claude');
    expect(identity.keywords).toContain('continuous-claude');
    expect(identity.keywords).toContain('continuous');
    expect(identity.keywords).toContain('claude');
  });

  it('deduplicates keywords', () => {
    setupRegistryMock('C:/Users/david.hayes/continuous-claude', MOCK_REGISTRY, MOCK_PACKAGE_JSON);
    const identity = getProjectIdentity('C:/Users/david.hayes/continuous-claude');
    const uniqueKeywords = [...new Set(identity.keywords)];
    expect(identity.keywords.length).toBe(uniqueKeywords.length);
  });
});

// =============================================================================
// isContentRelevantToProject
// =============================================================================

describe('isContentRelevantToProject', () => {
  // Helper to build a minimal identity for testing
  function makeIdentity(overrides: Partial<ProjectIdentity> = {}): ProjectIdentity {
    return {
      dirName: 'continuous-claude',
      registryName: 'continuous-claude',
      packageName: 'continuous-claude',
      keywords: ['continuous', 'claude', 'continuous-claude'],
      otherProjects: ['NorthStar Transformation', 'Fourth Connect', 'ECG Lead Reactivation Engine'],
      ...overrides,
    };
  }

  it('returns relevant=false when content mentions NorthStar but identity is continuous-claude', () => {
    const identity = makeIdentity();
    const content = 'Plan: Implement the NorthStar Transformation dashboard with new metrics and charts for the enterprise platform.';
    const result = isContentRelevantToProject(content, identity);
    expect(result.relevant).toBe(false);
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('NorthStar Transformation');
  });

  it('returns relevant=false when content mentions Fourth Connect but identity is ECG', () => {
    const identity = makeIdentity({
      dirName: 'ECG Lead Reactivation Engine',
      registryName: 'ECG Lead Reactivation Engine',
      packageName: null,
      keywords: ['ecg', 'lead', 'reactivation', 'engine', 'ecg lead reactivation engine'],
      otherProjects: ['continuous-claude', 'NorthStar Transformation', 'Fourth Connect'],
    });
    const content = 'Plan: Update the Fourth Connect dashboard with new brand components and navigation redesign for the platform.';
    const result = isContentRelevantToProject(content, identity);
    expect(result.relevant).toBe(false);
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('Fourth Connect');
  });

  it('returns relevant=true when content mentions hook development with identity for continuous-claude', () => {
    const identity = makeIdentity();
    const content = 'Plan: Implement the cross-project ROADMAP contamination guard for Continuous Claude hooks. This involves creating a shared utility module and editing three existing hook files.';
    const result = isContentRelevantToProject(content, identity);
    expect(result.relevant).toBe(true);
  });

  it('returns relevant=true when content has no project identifiers (fail-open)', () => {
    const identity = makeIdentity();
    const content = 'Plan: Refactor the authentication system to use JWT tokens instead of session cookies. Add rate limiting to prevent brute force attacks on login endpoints.';
    const result = isContentRelevantToProject(content, identity);
    expect(result.relevant).toBe(true);
    expect(result.confidence).toBe('low');
    expect(result.reason).toBe('no cross-project signals');
  });

  it('returns relevant=true for empty content (fail-open)', () => {
    const identity = makeIdentity();
    const result = isContentRelevantToProject('', identity);
    expect(result.relevant).toBe(true);
    expect(result.confidence).toBe('low');
    expect(result.reason).toBe('content too short');
  });

  it('returns relevant=true for content shorter than 50 chars (fail-open)', () => {
    const identity = makeIdentity();
    const result = isContentRelevantToProject('Short plan about NorthStar', identity);
    expect(result.relevant).toBe(true);
    expect(result.confidence).toBe('low');
    expect(result.reason).toBe('content too short');
  });

  it('returns relevant=true when no other projects in registry (fail-open)', () => {
    const identity = makeIdentity({ otherProjects: [] });
    const content = 'Plan: Implement the NorthStar Transformation dashboard with new metrics and charts for the enterprise platform.';
    const result = isContentRelevantToProject(content, identity);
    expect(result.relevant).toBe(true);
    expect(result.confidence).toBe('low');
    expect(result.reason).toBe('no registry to compare against');
  });

  it('returns relevant=false when identity has empty keywords but other project is mentioned', () => {
    const identity = makeIdentity({
      dirName: 'my-project',
      registryName: null,
      packageName: null,
      keywords: ['my'],  // too short (< 3 chars), will be skipped
      otherProjects: ['NorthStar Transformation'],
    });
    const content = 'Plan: Implement the NorthStar Transformation dashboard with new metrics and charts for the enterprise platform.';
    const result = isContentRelevantToProject(content, identity);
    expect(result.relevant).toBe(false);
    expect(result.confidence).toBe('high');
  });

  it('returns relevant=true when content mentions BOTH this project and another project', () => {
    const identity = makeIdentity();
    const content = 'Plan: Sync the continuous-claude hook system with NorthStar Transformation to share the authentication patterns across both projects.';
    const result = isContentRelevantToProject(content, identity);
    expect(result.relevant).toBe(true);
  });

  it('is case-insensitive when matching project names', () => {
    const identity = makeIdentity();
    const content = 'Plan: Update the northstar transformation platform with new dashboard components and redesigned navigation for better UX.';
    const result = isContentRelevantToProject(content, identity);
    expect(result.relevant).toBe(false);
    expect(result.confidence).toBe('high');
  });

  it('returns relevant=true for null content (fail-open)', () => {
    const identity = makeIdentity();
    const result = isContentRelevantToProject(null as any, identity);
    expect(result.relevant).toBe(true);
    expect(result.confidence).toBe('low');
  });

  it('returns relevant=true for undefined content (fail-open)', () => {
    const identity = makeIdentity();
    const result = isContentRelevantToProject(undefined as any, identity);
    expect(result.relevant).toBe(true);
    expect(result.confidence).toBe('low');
  });
});
