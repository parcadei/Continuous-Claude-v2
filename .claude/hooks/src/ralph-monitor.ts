#!/usr/bin/env node
/**
 * Ralph Monitor Hook
 *
 * PostToolUse hook for Bash that monitors for Ralph signal patterns in output.
 * When a Ralph signal is detected (<TASK_COMPLETE/>, <BLOCKED/>, <COMPLETE/>),
 * updates the workflow state machine and injects status back to context.
 *
 * This creates the feedback loop from Ralph containers back to Maestro orchestration.
 */

import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join } from 'path';

interface HookInput {
    event: string;
    tool_name?: string;
    tool_input?: {
        command?: string;
    };
    tool_result?: {
        stdout?: string;
        stderr?: string;
        exitCode?: number;
    };
}

interface RalphSignal {
    type: 'TASK_COMPLETE' | 'COMPLETE' | 'BLOCKED' | 'ERROR';
    storyId?: string;
    reason?: string;
}

// Pattern to detect Ralph signals in output
const SIGNAL_PATTERNS = [
    { pattern: /<TASK_COMPLETE\s*\/?>/i, type: 'TASK_COMPLETE' as const },
    { pattern: /<COMPLETE\s*\/?>/i, type: 'COMPLETE' as const },
    { pattern: /<BLOCKED(?:\s+reason="([^"]+)")?\s*\/?>/i, type: 'BLOCKED' as const, reasonGroup: 1 },
    { pattern: /<ERROR(?:\s+reason="([^"]+)")?\s*\/?>/i, type: 'ERROR' as const, reasonGroup: 1 },
];

// Pattern to extract story ID from environment or output
const STORY_ID_PATTERN = /Story:\s*(\w+-\d+)/i;

function parseRalphSignals(output: string): RalphSignal[] {
    const signals: RalphSignal[] = [];
    const combinedOutput = output;

    for (const { pattern, type, reasonGroup } of SIGNAL_PATTERNS) {
        const match = combinedOutput.match(pattern);
        if (match) {
            const signal: RalphSignal = { type };
            if (reasonGroup && match[reasonGroup]) {
                signal.reason = match[reasonGroup];
            }
            signals.push(signal);
        }
    }

    // Try to extract story ID
    const storyMatch = combinedOutput.match(STORY_ID_PATTERN);
    if (storyMatch) {
        const storyId = storyMatch[1];
        signals.forEach(s => s.storyId = storyId);
    }

    return signals;
}

function updateRalphState(signals: RalphSignal[], projectDir: string): boolean {
    if (signals.length === 0) {
        return false;
    }

    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    let updated = false;

    // Try unified state (v2) first
    const v2Script = join(homeDir, '.claude', 'scripts', 'ralph', 'ralph-state-v2.py');
    const v2StateFile = join(projectDir, '.ralph', 'state.json');

    if (existsSync(v2Script) && existsSync(v2StateFile)) {
        for (const signal of signals) {
            // Find in-progress tasks and update them based on signal
            if (signal.type === 'TASK_COMPLETE' || signal.type === 'COMPLETE') {
                // Complete in-progress tasks
                const result = spawnSync('python', [
                    v2Script, '-p', projectDir, 'task-list'
                ], { encoding: 'utf-8', timeout: 5000 });

                if (result.status === 0) {
                    try {
                        const parsed = JSON.parse(result.stdout);
                        const tasks: any[] = parsed.tasks || [];
                        const inProgress = tasks.filter((t: any) => t.status === 'in_progress');
                        for (const task of inProgress) {
                            spawnSync('python', [
                                v2Script, '-p', projectDir, 'task-complete', '--id', String(task.id)
                            ], { encoding: 'utf-8', timeout: 5000 });
                            updated = true;
                        }
                    } catch { /* parse error */ }
                }
            } else if (signal.type === 'BLOCKED' || signal.type === 'ERROR') {
                const result = spawnSync('python', [
                    v2Script, '-p', projectDir, 'task-list'
                ], { encoding: 'utf-8', timeout: 5000 });

                if (result.status === 0) {
                    try {
                        const parsed = JSON.parse(result.stdout);
                        const tasks: any[] = parsed.tasks || [];
                        const inProgress = tasks.filter((t: any) => t.status === 'in_progress');
                        for (const task of inProgress) {
                            spawnSync('python', [
                                v2Script, '-p', projectDir, 'task-fail', '--id', String(task.id),
                                '--error', signal.reason || signal.type
                            ], { encoding: 'utf-8', timeout: 5000 });
                            updated = true;
                        }
                    } catch { /* parse error */ }
                }
            }
        }
        return updated;
    }

    return updated;
}

function generateStatusOutput(signals: RalphSignal[]): string {
    if (signals.length === 0) {
        return '';
    }

    let output = '\n';
    output += '─'.repeat(40) + '\n';
    output += '🎭 RALPH SIGNAL DETECTED\n';
    output += '─'.repeat(40) + '\n';

    for (const signal of signals) {
        switch (signal.type) {
            case 'TASK_COMPLETE':
                output += `✓ Task completed`;
                if (signal.storyId) {
                    output += ` for ${signal.storyId}`;
                }
                output += '\n';
                output += '  Loop will continue to next task.\n';
                break;

            case 'COMPLETE':
                output += `✓✓ ALL TASKS COMPLETE`;
                if (signal.storyId) {
                    output += ` for ${signal.storyId}`;
                }
                output += '\n';
                output += '  Review and merge changes.\n';
                break;

            case 'BLOCKED':
                output += `⚠ BLOCKED`;
                if (signal.storyId) {
                    output += ` on ${signal.storyId}`;
                }
                output += '\n';
                if (signal.reason) {
                    output += `  Reason: ${signal.reason}\n`;
                }
                output += '  Intervention required.\n';
                break;

            case 'ERROR':
                output += `✗ ERROR`;
                if (signal.storyId) {
                    output += ` in ${signal.storyId}`;
                }
                output += '\n';
                if (signal.reason) {
                    output += `  Reason: ${signal.reason}\n`;
                }
                output += '  Review error and decide next action.\n';
                break;
        }
    }

    output += '─'.repeat(40) + '\n';

    // Add action recommendations
    const hasComplete = signals.some(s => s.type === 'COMPLETE');
    const hasBlocked = signals.some(s => s.type === 'BLOCKED');
    const hasError = signals.some(s => s.type === 'ERROR');

    if (hasComplete) {
        output += '\nRECOMMENDED ACTION:\n';
        output += '  1. Review changes: git diff main...HEAD\n';
        output += '  2. Run tests: npm test / pytest\n';
        output += '  3. Store learnings:\n';
        output += '     cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/store_learning.py \\\n';
        output += '       --session-id "ralph-<feature>" --type WORKING_SOLUTION \\\n';
        output += '       --content "<what worked>" --context "<feature>" \\\n';
        output += '       --tags "ralph,feature" --confidence high\n';
        output += '  4. Merge if passing: git checkout main && git merge <branch>\n';
    } else if (hasBlocked || hasError) {
        output += '\nRECOMMENDED ACTION:\n';
        output += '  1. Review the blocking issue\n';
        output += '  2. Fix or provide guidance\n';
        output += '  3. Resume Ralph loop or escalate\n';
    }

    return output;
}

function isRalphRelatedCommand(command: string): boolean {
    const lowerCmd = command.toLowerCase();
    return (
        lowerCmd.includes('ralph') ||
        lowerCmd.includes('spawn-ralph') ||
        lowerCmd.includes('docker') ||
        lowerCmd.includes('worktree') ||
        // Also check for Claude CLI invocations that might be Ralph
        (lowerCmd.includes('claude') && lowerCmd.includes('-p'))
    );
}

function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        // Only process PostToolUse for Bash
        if (data.event !== 'PostToolUse' || data.tool_name !== 'Bash') {
            process.exit(0);
            return;
        }

        const command = data.tool_input?.command || '';
        const stdout = data.tool_result?.stdout || '';
        const stderr = data.tool_result?.stderr || '';

        // Only monitor Ralph-related commands
        if (!isRalphRelatedCommand(command)) {
            process.exit(0);
            return;
        }

        // Combine output for signal detection
        const combinedOutput = `${stdout}\n${stderr}`;

        // Parse signals
        const signals = parseRalphSignals(combinedOutput);

        if (signals.length === 0) {
            process.exit(0);
            return;
        }

        // Update state machine
        const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
        updateRalphState(signals, projectDir);

        // Generate status output
        const statusOutput = generateStatusOutput(signals);
        if (statusOutput) {
            console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: statusOutput } }));
        }

        process.exit(0);

    } catch (error) {
        // Fail silently - monitoring is non-critical
        process.exit(0);
    }
}

main();
