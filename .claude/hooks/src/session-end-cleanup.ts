import * as fs from 'fs';
import * as path from 'path';

interface SessionEndInput {
  session_id: string;
  transcript_path: string;
  reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other';
}

async function main() {
  const input: SessionEndInput = JSON.parse(await readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  try {
    // Update continuity ledger with session end
    const ledgerFiles = fs.readdirSync(projectDir)
      .filter(f => f.startsWith('CONTINUITY_CLAUDE-') && f.endsWith('.md'));

    if (ledgerFiles.length > 0) {
      const mostRecent = ledgerFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(projectDir, a));
        const statB = fs.statSync(path.join(projectDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      })[0];

      const ledgerPath = path.join(projectDir, mostRecent);
      let content = fs.readFileSync(ledgerPath, 'utf-8');

      // Update timestamp
      const timestamp = new Date().toISOString();
      content = content.replace(
        /Updated: .*/,
        `Updated: ${timestamp}`
      );

      // Add session end note if not auto-compacting
      if (input.reason !== 'other') {
        const endNote = `\n### Session Ended (${timestamp})\n- Reason: ${input.reason}\n`;

        // Find Agent Reports section or end of file
        const agentReportsMatch = content.indexOf('## Agent Reports');
        if (agentReportsMatch > 0) {
          content = content.slice(0, agentReportsMatch) + endNote + content.slice(agentReportsMatch);
        }
      }

      fs.writeFileSync(ledgerPath, content);
    }

    // Clean up old agent cache files (older than 7 days)
    const agentCacheDir = path.join(projectDir, '.claude', 'cache', 'agents');
    if (fs.existsSync(agentCacheDir)) {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      const agents = fs.readdirSync(agentCacheDir);
      for (const agent of agents) {
        const agentDir = path.join(agentCacheDir, agent);
        const stat = fs.statSync(agentDir);
        if (stat.isDirectory()) {
          const outputFile = path.join(agentDir, 'latest-output.md');
          if (fs.existsSync(outputFile)) {
            const fileStat = fs.statSync(outputFile);
            if (now - fileStat.mtime.getTime() > maxAge) {
              fs.unlinkSync(outputFile);
            }
          }
        }
      }
    }

    console.log(JSON.stringify({ result: 'continue' }));
  } catch (err) {
    // Don't block session end on errors
    console.log(JSON.stringify({ result: 'continue' }));
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
  });
}

main().catch(console.error);
