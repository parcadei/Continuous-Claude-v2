#!/usr/bin/env node
import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { logSkill, logAgent } from './shared/session-activity.js';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    tool_name: string;
    tool_input: Record<string, unknown>;
    tool_response?: {
        status?: string;
        output?: string;
    };
}

interface TelemetryEvent {
    timestamp: string;
    session_id: string;
    type: 'skill_triggered' | 'skill_used' | 'agent_suggested' | 'agent_spawned';
    name: string;
    trigger_source: 'hook' | 'explicit' | 'llm';
    success?: boolean;
}

function getTelemetryPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const telemetryDir = join(homeDir, '.claude', 'cache');
    if (!existsSync(telemetryDir)) {
        mkdirSync(telemetryDir, { recursive: true });
    }
    return join(telemetryDir, 'skill-telemetry.jsonl');
}

function logEvent(event: TelemetryEvent): void {
    const telemetryPath = getTelemetryPath();
    const line = JSON.stringify(event) + '\n';
    appendFileSync(telemetryPath, line, 'utf-8');
}

function determineSource(toolInput: Record<string, unknown>): 'hook' | 'explicit' | 'llm' {
    const skill = toolInput.skill as string || '';
    if (skill.startsWith('/')) {
        return 'explicit';
    }
    return 'llm';
}

async function main() {
    try {
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);

        if (data.tool_name === 'Skill') {
            const skillName = data.tool_input?.skill as string || 'unknown';
            const success = data.tool_response?.status !== 'error';

            const event: TelemetryEvent = {
                timestamp: new Date().toISOString(),
                session_id: data.session_id,
                type: 'skill_used',
                name: skillName,
                trigger_source: determineSource(data.tool_input),
                success
            };

            logEvent(event);
            try { logSkill(data.session_id, skillName); } catch { /* never break */ }
        } else if (data.tool_name === 'Task') {
            const agentType = data.tool_input?.subagent_type as string || 'unknown';
            const success = data.tool_response?.status !== 'error';

            const event: TelemetryEvent = {
                timestamp: new Date().toISOString(),
                session_id: data.session_id,
                type: 'agent_spawned',
                name: agentType,
                trigger_source: 'llm',
                success
            };

            logEvent(event);
            try { logAgent(data.session_id, agentType); } catch { /* never break */ }
        }

        process.exit(0);
    } catch {
        process.exit(0);
    }
}

main();
