#!/usr/bin/env node
/**
 * PRD/Tasks → ROADMAP Sync Hook
 *
 * Syncs ai-dev-tasks workflow with ROADMAP.md:
 *
 * 1. PRD Created → Adds to ROADMAP "Planned" section
 * 2. Tasks Started → Moves to ROADMAP "Current" section
 * 3. Tasks Completed → Moves to ROADMAP "Completed" section
 *
 * Triggers: PostToolUse (Write|Edit) for files matching:
 *   - prd-*.md, PRD-*.md
 *   - tasks-*.md, TASKS-*.md
 *
 * Hook: PostToolUse (Write|Edit)
 */

import * as fs from 'fs';
import * as path from 'path';

interface PostToolUseInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
  };
  tool_result?: string;
}

interface HookOutput {
  result: 'continue' | 'block';
  message?: string;
}

interface PRDMetadata {
  title: string;
  status: string;
  priority: string;
  version: string;
  created: string;
}

interface TaskProgress {
  featureName: string;
  prdFile: string | null;
  total: number;
  completed: number;
  percentage: number;
  isComplete: boolean;
}

interface RoadmapItem {
  title: string;
  description?: string;
  priority?: string;
  progress?: string;
  started?: string;
  completed?: string;
  source?: string;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 100);
  });
}

function isPRDFile(filePath: string): boolean {
  const basename = path.basename(filePath).toLowerCase();
  return basename.startsWith('prd-') && basename.endsWith('.md');
}

function isTasksFile(filePath: string): boolean {
  const basename = path.basename(filePath).toLowerCase();
  return basename.startsWith('tasks-') && basename.endsWith('.md');
}

function extractPRDMetadata(content: string): PRDMetadata {
  const result: PRDMetadata = {
    title: 'Untitled PRD',
    status: 'Draft',
    priority: 'Normal',
    version: '1.0',
    created: new Date().toISOString().split('T')[0],
  };

  const lines = content.split('\n');

  for (const line of lines) {
    const stripped = line.trim();

    // Title from # heading
    if (stripped.startsWith('# ') && result.title === 'Untitled PRD') {
      result.title = stripped.slice(2).trim();
    }

    // Metadata fields
    if (stripped.toLowerCase().startsWith('**status:**')) {
      result.status = stripped.replace(/^\*\*status:\*\*/i, '').trim();
    }
    if (stripped.toLowerCase().startsWith('**priority:**')) {
      result.priority = stripped.replace(/^\*\*priority:\*\*/i, '').trim();
    }
    if (stripped.toLowerCase().startsWith('**version:**')) {
      result.version = stripped.replace(/^\*\*version:\*\*/i, '').trim();
    }
    if (stripped.toLowerCase().startsWith('**created:**')) {
      result.created = stripped.replace(/^\*\*created:\*\*/i, '').trim();
    }
  }

  return result;
}

function extractTaskProgress(content: string, filePath: string): TaskProgress {
  const basename = path.basename(filePath);
  const featureMatch = basename.match(/tasks?-(.+)\.md/i);
  const featureName = featureMatch ? featureMatch[1].replace(/-/g, ' ') : 'Unknown Feature';

  // Find associated PRD
  const dir = path.dirname(filePath);
  const prdPattern = basename.replace(/^tasks?-/i, 'prd-');
  const prdPath = path.join(dir, prdPattern.replace('tasks-', 'PRD-'));
  const prdFile = fs.existsSync(prdPath) ? prdPath : null;

  // Count tasks
  const taskPattern = /^-\s*\[([ x])\]/gm;
  let match;
  let total = 0;
  let completed = 0;

  while ((match = taskPattern.exec(content)) !== null) {
    total++;
    if (match[1].toLowerCase() === 'x') {
      completed++;
    }
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    featureName,
    prdFile,
    total,
    completed,
    percentage,
    isComplete: total > 0 && completed === total,
  };
}

function findRoadmapPath(startDir: string): string | null {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    // Hard boundary: never walk outside the project
    const roadmap = path.join(projectDir, 'ROADMAP.md');
    if (fs.existsSync(roadmap)) return roadmap;
    const claudeRoadmap = path.join(projectDir, '.claude', 'ROADMAP.md');
    if (fs.existsSync(claudeRoadmap)) return claudeRoadmap;
    // Return project-root path even if it doesn't exist yet (caller creates on write)
    return roadmap;
  }

  // Fallback: find project root first, then look for ROADMAP within it.
  // This prevents escaping the boundary when a parent dir has ROADMAP.md.
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  // Step 1: Walk up to find the project boundary
  let projectRoot: string | null = null;
  while (current !== root) {
    if (fs.existsSync(path.join(current, '.git')) ||
        fs.existsSync(path.join(current, 'package.json'))) {
      projectRoot = current;
      break;
    }
    current = path.dirname(current);
  }

  // Step 2: Look for ROADMAP only within the bounded project root
  if (projectRoot) {
    const candidate = path.join(projectRoot, 'ROADMAP.md');
    if (fs.existsSync(candidate)) return candidate;
    const claudeCandidate = path.join(projectRoot, '.claude', 'ROADMAP.md');
    if (fs.existsSync(claudeCandidate)) return claudeCandidate;
    // Return path for creation even if it doesn't exist yet
    return candidate;
  }

  return null;
}

function parseRoadmap(content: string): {
  current: RoadmapItem | null;
  completed: RoadmapItem[];
  planned: RoadmapItem[];
  rawSections: Map<string, { start: number; end: number }>;
} {
  const result = {
    current: null as RoadmapItem | null,
    completed: [] as RoadmapItem[],
    planned: [] as RoadmapItem[],
    rawSections: new Map<string, { start: number; end: number }>(),
  };

  const lines = content.split('\n');
  let section: string | null = null;
  let sectionStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim().toLowerCase();

    if (stripped.startsWith('## current')) {
      if (section && sectionStart >= 0) {
        result.rawSections.set(section, { start: sectionStart, end: i });
      }
      section = 'current';
      sectionStart = i;
      continue;
    } else if (stripped.startsWith('## completed')) {
      if (section && sectionStart >= 0) {
        result.rawSections.set(section, { start: sectionStart, end: i });
      }
      section = 'completed';
      sectionStart = i;
      continue;
    } else if (stripped.startsWith('## planned')) {
      if (section && sectionStart >= 0) {
        result.rawSections.set(section, { start: sectionStart, end: i });
      }
      section = 'planned';
      sectionStart = i;
      continue;
    } else if (stripped.startsWith('## ')) {
      if (section && sectionStart >= 0) {
        result.rawSections.set(section, { start: sectionStart, end: i });
      }
      section = null;
      sectionStart = -1;
      continue;
    }

    const line = lines[i].trim();

    if (section === 'current') {
      if (line.startsWith('**') && line.endsWith('**')) {
        result.current = { title: line.replace(/\*\*/g, '').trim() };
      } else if (result.current && line.startsWith('- ')) {
        const text = line.slice(2).trim();
        if (text.toLowerCase().startsWith('started:')) {
          result.current.started = text.replace(/^started:\s*/i, '').trim();
        } else if (text.toLowerCase().startsWith('progress:')) {
          result.current.progress = text.replace(/^progress:\s*/i, '').trim();
        } else if (!result.current.description) {
          result.current.description = text;
        }
      }
    }

    if (section === 'completed') {
      const match = line.match(/^-\s*\[x\]\s*(.+?)(?:\s*\(([^)]+)\))?$/i);
      if (match) {
        result.completed.push({
          title: match[1].trim(),
          completed: match[2] || '',
        });
      }
    }

    if (section === 'planned') {
      const match = line.match(/^-\s*\[\s*\]\s*(.+?)(?:\s*\(([^)]+)\))?$/);
      if (match) {
        result.planned.push({
          title: match[1].trim(),
          priority: match[2] || 'normal',
        });
      }
    }
  }

  // Capture final section
  if (section && sectionStart >= 0) {
    result.rawSections.set(section, { start: sectionStart, end: lines.length });
  }

  return result;
}

function itemExists(items: RoadmapItem[], title: string): boolean {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return items.some(item => {
    const itemNormalized = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return itemNormalized.includes(normalized) || normalized.includes(itemNormalized);
  });
}

function addToPlanned(content: string, item: RoadmapItem): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let addedToPlanned = false;
  let inPlanned = false;

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim().toLowerCase();

    if (stripped.startsWith('## planned')) {
      inPlanned = true;
      result.push(lines[i]);
      // Add new item after header
      const priority = item.priority || 'normal';
      const source = item.source ? ` [${item.source}]` : '';
      result.push(`- [ ] ${item.title}${source} (${priority})`);
      addedToPlanned = true;
      continue;
    } else if (stripped.startsWith('## ') && inPlanned) {
      inPlanned = false;
    }

    result.push(lines[i]);
  }

  // If no planned section exists, create one
  if (!addedToPlanned) {
    result.push('');
    result.push('## Planned');
    const priority = item.priority || 'normal';
    const source = item.source ? ` [${item.source}]` : '';
    result.push(`- [ ] ${item.title}${source} (${priority})`);
  }

  return result.join('\n');
}

function updateProgress(content: string, title: string, progress: TaskProgress): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inCurrent = false;
  let foundTitle = false;
  let progressUpdated = false;

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    const lower = stripped.toLowerCase();

    if (lower.startsWith('## current')) {
      inCurrent = true;
      result.push(lines[i]);
      continue;
    } else if (lower.startsWith('## ') && inCurrent) {
      inCurrent = false;
    }

    if (inCurrent) {
      // Check if this is our feature
      if (stripped.startsWith('**') && stripped.includes(title.split(' ')[0])) {
        foundTitle = true;
        result.push(lines[i]);
        continue;
      }

      // Update progress line if found
      if (foundTitle && stripped.toLowerCase().startsWith('- progress:')) {
        result.push(`- Progress: ${progress.completed}/${progress.total} tasks (${progress.percentage}%)`);
        progressUpdated = true;
        continue;
      }
    }

    result.push(lines[i]);
  }

  // If we found the title but no progress line, add one
  if (foundTitle && !progressUpdated) {
    // Find where to insert progress (after the current item header)
    const newResult: string[] = [];
    let inserted = false;
    inCurrent = false;

    for (let i = 0; i < result.length; i++) {
      newResult.push(result[i]);
      const stripped = result[i].trim();
      const lower = stripped.toLowerCase();

      if (lower.startsWith('## current')) {
        inCurrent = true;
        continue;
      }

      if (inCurrent && !inserted && stripped.startsWith('**') && stripped.includes(title.split(' ')[0])) {
        newResult.push(`- Progress: ${progress.completed}/${progress.total} tasks (${progress.percentage}%)`);
        inserted = true;
      }
    }

    return newResult.join('\n');
  }

  return result.join('\n');
}

function moveToCompleted(content: string, title: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inCurrent = false;
  let skipUntilNextSection = false;
  let completedInsertIndex = -1;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    const lower = stripped.toLowerCase();

    if (lower.startsWith('## current')) {
      inCurrent = true;
      result.push(lines[i]);
      continue;
    } else if (lower.startsWith('## completed')) {
      inCurrent = false;
      skipUntilNextSection = false;
      completedInsertIndex = result.length + 1;
      result.push(lines[i]);
      // Insert completed item
      result.push(`- [x] ${title} (${today})`);
      continue;
    } else if (lower.startsWith('## ') && inCurrent) {
      inCurrent = false;
      skipUntilNextSection = false;
    }

    // Skip current section content if it matches our title
    if (inCurrent) {
      if (stripped.startsWith('**') && stripped.toLowerCase().includes(title.toLowerCase().split(' ')[0])) {
        skipUntilNextSection = true;
        // Add placeholder
        result.push('');
        result.push('_No current goal. Run /init-project or start a new PRD._');
        result.push('');
        continue;
      }
      if (skipUntilNextSection) {
        continue;
      }
    }

    result.push(lines[i]);
  }

  return result.join('\n');
}

function promoteToCurrent(content: string, item: RoadmapItem): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inCurrent = false;
  let inPlanned = false;
  let removedFromPlanned = false;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    const lower = stripped.toLowerCase();

    if (lower.startsWith('## current')) {
      inCurrent = true;
      result.push(lines[i]);
      result.push('');
      result.push(`**${item.title}**`);
      result.push(`- Started: ${today}`);
      if (item.source) {
        result.push(`- Source: ${item.source}`);
      }
      result.push(`- Progress: 0/? tasks (0%)`);
      result.push('');
      continue;
    } else if (lower.startsWith('## planned')) {
      inCurrent = false;
      inPlanned = true;
      result.push(lines[i]);
      continue;
    } else if (lower.startsWith('## ')) {
      inCurrent = false;
      inPlanned = false;
    }

    // Skip "no current goal" placeholder
    if (inCurrent && stripped.includes('No current goal')) {
      continue;
    }

    // Remove item from planned
    if (inPlanned && !removedFromPlanned && stripped.includes(item.title.split(' ')[0])) {
      removedFromPlanned = true;
      continue;
    }

    result.push(lines[i]);
  }

  return result.join('\n');
}

async function handlePRDChange(filePath: string, content: string): Promise<HookOutput> {
  const metadata = extractPRDMetadata(content);
  const fileDir = path.dirname(filePath);

  // Path containment check - don't update ROADMAP for files outside this project
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!path.resolve(filePath).startsWith(path.resolve(projectDir))) {
    return {
      result: 'continue',
      message: 'PRD file is outside current project directory',
    };
  }

  const roadmapPath = findRoadmapPath(fileDir);

  if (!roadmapPath) {
    return {
      result: 'continue',
      message: `PRD detected: "${metadata.title}" - No ROADMAP.md found to sync`,
    };
  }

  const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
  const roadmap = parseRoadmap(roadmapContent);

  // Check if already exists
  const allItems = [
    ...(roadmap.current ? [roadmap.current] : []),
    ...roadmap.completed,
    ...roadmap.planned,
  ];

  if (itemExists(allItems, metadata.title)) {
    return {
      result: 'continue',
      message: `PRD "${metadata.title}" already in ROADMAP`,
    };
  }

  // Add to planned section
  const newItem: RoadmapItem = {
    title: metadata.title,
    priority: metadata.priority.toLowerCase(),
    source: path.basename(filePath),
  };

  const updated = addToPlanned(roadmapContent, newItem);
  fs.writeFileSync(roadmapPath, updated);

  return {
    result: 'continue',
    message: `ROADMAP updated: Added "${metadata.title}" to Planned (from PRD)`,
  };
}

async function handleTasksChange(filePath: string, content: string): Promise<HookOutput> {
  const progress = extractTaskProgress(content, filePath);
  const fileDir = path.dirname(filePath);

  // Path containment check - don't update ROADMAP for files outside this project
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!path.resolve(filePath).startsWith(path.resolve(projectDir))) {
    return {
      result: 'continue',
      message: 'Tasks file is outside current project directory',
    };
  }

  const roadmapPath = findRoadmapPath(fileDir);

  if (!roadmapPath) {
    return {
      result: 'continue',
      message: `Tasks progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`,
    };
  }

  const roadmapContent = fs.readFileSync(roadmapPath, 'utf-8');
  const roadmap = parseRoadmap(roadmapContent);

  // Check if this feature is in planned (needs promotion to current)
  const inPlanned = roadmap.planned.find(item =>
    item.title.toLowerCase().includes(progress.featureName.toLowerCase().split(' ')[0])
  );

  // Check if already current
  const isCurrent = roadmap.current &&
    roadmap.current.title.toLowerCase().includes(progress.featureName.toLowerCase().split(' ')[0]);

  let updated = roadmapContent;
  let message = '';

  if (progress.isComplete) {
    // Move to completed
    const titleToComplete = roadmap.current?.title || progress.featureName;
    updated = moveToCompleted(roadmapContent, titleToComplete);
    message = `ROADMAP updated: "${titleToComplete}" marked complete (100%)`;
  } else if (inPlanned && !roadmap.current) {
    // Promote to current if no current goal
    updated = promoteToCurrent(roadmapContent, {
      title: inPlanned.title,
      source: path.basename(filePath),
    });
    message = `ROADMAP updated: Promoted "${inPlanned.title}" to Current`;
  } else if (isCurrent) {
    // Update progress
    updated = updateProgress(roadmapContent, roadmap.current!.title, progress);
    message = `ROADMAP progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`;
  } else if (inPlanned) {
    message = `Tasks started for planned item "${inPlanned.title}" - will promote when current goal completes`;
  } else {
    message = `Tasks progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`;
  }

  if (updated !== roadmapContent) {
    fs.writeFileSync(roadmapPath, updated);
  }

  return { result: 'continue', message };
}

async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  let data: PostToolUseInput;
  try {
    data = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  // Only handle Write/Edit
  if (!['Write', 'Edit'].includes(data.tool_name)) {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  const filePath = data.tool_input.file_path;
  if (!filePath) {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  // Check if PRD or Tasks file
  let result: HookOutput;

  if (isPRDFile(filePath)) {
    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
    result = await handlePRDChange(filePath, content);
  } else if (isTasksFile(filePath)) {
    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
    result = await handleTasksChange(filePath, content);
  } else {
    result = { result: 'continue' };
  }

  console.log(JSON.stringify(result));
}

main().catch((err) => {
  console.error('[prd-roadmap-sync] Error:', err.message);
  console.log(JSON.stringify({ result: 'continue' }));
});
