#!/usr/bin/env node
/**
 * Ralph Template Inject Hook
 *
 * PreToolUse hook for Task tool when spawning maestro.
 * Injects ai-dev-tasks template content into the task prompt to ensure
 * the Ralph workflow templates are loaded BEFORE Claude generates any PRD/task content.
 *
 * This ensures Maestro always has access to the correct templates, preventing
 * the common failure mode where templates are forgotten or skipped.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface HookInput {
    event: string;
    tool_name?: string;
    tool_input?: {
        prompt?: string;
        subagent_type?: string;
        description?: string;
    };
}

interface HookOutput {
    result: 'allow' | 'block';
    hookSpecificOutput?: {
        hookEventName: string;
        modifiedInput?: Record<string, unknown>;
        additionalContext?: string;
    };
}

// Ralph-related keywords that trigger template injection
const RALPH_KEYWORDS = [
    'ralph', 'prd', 'feature', 'build', 'implement', 'create',
    'autonomous', 'workflow', 'develop', 'tasks'
];

function shouldInjectTemplates(prompt: string, subagentType: string): boolean {
    // Only inject for maestro agents
    if (subagentType !== 'maestro') {
        return false;
    }

    const lowerPrompt = prompt.toLowerCase();

    // Check for Ralph-related keywords
    return RALPH_KEYWORDS.some(kw => lowerPrompt.includes(kw));
}

function loadTemplate(templatePath: string): string | null {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const fullPath = templatePath.startsWith('~/')
        ? join(homeDir, templatePath.slice(2))
        : templatePath;

    if (existsSync(fullPath)) {
        try {
            return readFileSync(fullPath, 'utf-8');
        } catch {
            return null;
        }
    }
    return null;
}

function buildInjectedPrompt(originalPrompt: string): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';

    // Load both templates
    const prdTemplatePath = join(homeDir, '.claude', 'ai-dev-tasks', 'create-prd.md');
    const tasksTemplatePath = join(homeDir, '.claude', 'ai-dev-tasks', 'generate-tasks.md');

    const prdTemplate = loadTemplate(prdTemplatePath);
    const tasksTemplate = loadTemplate(tasksTemplatePath);

    let injectedContent = '';
    injectedContent += '═'.repeat(60) + '\n';
    injectedContent += '📋 RALPH WORKFLOW TEMPLATES (AUTO-INJECTED)\n';
    injectedContent += '═'.repeat(60) + '\n\n';
    injectedContent += 'You MUST follow these templates exactly.\n';
    injectedContent += 'Deviation will be blocked by the prd-task-template-enforcer hook.\n\n';

    if (prdTemplate) {
        injectedContent += '─'.repeat(40) + '\n';
        injectedContent += 'PRD TEMPLATE (create-prd.md)\n';
        injectedContent += '─'.repeat(40) + '\n';
        injectedContent += prdTemplate + '\n\n';
    }

    if (tasksTemplate) {
        injectedContent += '─'.repeat(40) + '\n';
        injectedContent += 'TASKS TEMPLATE (generate-tasks.md)\n';
        injectedContent += '─'.repeat(40) + '\n';
        injectedContent += tasksTemplate + '\n\n';
    }

    injectedContent += '═'.repeat(60) + '\n';
    injectedContent += 'WORKFLOW REQUIREMENTS:\n';
    injectedContent += '1. Ask clarifying questions BEFORE generating PRD\n';
    injectedContent += '2. ALWAYS ask about UI components (see PRD template)\n';
    injectedContent += '3. Wait for user answers before proceeding\n';
    injectedContent += '4. Generate parent tasks first, wait for "Go"\n';
    injectedContent += '5. Then generate sub-tasks\n';
    injectedContent += '6. Save to /tasks/ directory with correct filenames\n';
    injectedContent += '\n';
    injectedContent += 'FRONTEND DESIGN (MANDATORY for UI features):\n';
    injectedContent += '- Include "Frontend Design Stack" section in PRD\n';
    injectedContent += '- Include task 0.5 "Setup frontend design tooling"\n';
    injectedContent += '- Tools: frontend-design plugin, shadcn-create skill, shadcn MCP\n';
    injectedContent += '═'.repeat(60) + '\n\n';

    injectedContent += '─'.repeat(40) + '\n';
    injectedContent += 'ORIGINAL TASK:\n';
    injectedContent += '─'.repeat(40) + '\n';
    injectedContent += originalPrompt;

    return injectedContent;
}

function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        // Only process PreToolUse for Agent/Task tool
        if (data.event !== 'PreToolUse' || (data.tool_name !== 'Agent' && data.tool_name !== 'Task')) {
            console.log(JSON.stringify({ result: 'allow' }));
            return;
        }

        const prompt = data.tool_input?.prompt || '';
        const subagentType = data.tool_input?.subagent_type || '';

        // Check if we should inject templates
        if (!shouldInjectTemplates(prompt, subagentType)) {
            console.log(JSON.stringify({ result: 'allow' }));
            return;
        }

        // Inject templates into the prompt
        const modifiedPrompt = buildInjectedPrompt(prompt);

        const output: HookOutput = {
            result: 'allow',
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                modifiedInput: { prompt: modifiedPrompt },
                additionalContext: 'Ralph workflow templates injected into Maestro prompt'
            }
        };
        console.log(JSON.stringify(output));

    } catch (error) {
        // On error, allow without modification (fail open)
        console.log(JSON.stringify({ result: 'allow' }));
    }
}

main();
