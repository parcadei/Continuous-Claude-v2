// src/session-end-cleanup.ts
import * as fs from "fs";
import * as path from "path";
async function main() {
  const input = JSON.parse(await readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try {
    const ledgerFiles = fs.readdirSync(projectDir).filter((f) => f.startsWith("CONTINUITY_CLAUDE-") && f.endsWith(".md"));
    if (ledgerFiles.length > 0) {
      const mostRecent = ledgerFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(projectDir, a));
        const statB = fs.statSync(path.join(projectDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      })[0];
      const ledgerPath = path.join(projectDir, mostRecent);
      let content = fs.readFileSync(ledgerPath, "utf-8");
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      content = content.replace(
        /Updated: .*/,
        `Updated: ${timestamp}`
      );
      if (input.reason !== "other") {
        const endNote = `
### Session Ended (${timestamp})
- Reason: ${input.reason}
`;
        const agentReportsMatch = content.indexOf("## Agent Reports");
        if (agentReportsMatch > 0) {
          content = content.slice(0, agentReportsMatch) + endNote + content.slice(agentReportsMatch);
        }
      }
      fs.writeFileSync(ledgerPath, content);
    }
    const agentCacheDir = path.join(projectDir, ".claude", "cache", "agents");
    if (fs.existsSync(agentCacheDir)) {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1e3;
      const agents = fs.readdirSync(agentCacheDir);
      for (const agent of agents) {
        const agentDir = path.join(agentCacheDir, agent);
        const stat = fs.statSync(agentDir);
        if (stat.isDirectory()) {
          const outputFile = path.join(agentDir, "latest-output.md");
          if (fs.existsSync(outputFile)) {
            const fileStat = fs.statSync(outputFile);
            if (now - fileStat.mtime.getTime() > maxAge) {
              fs.unlinkSync(outputFile);
            }
          }
        }
      }
    }
    console.log(JSON.stringify({ result: "continue" }));
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
  }
}
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
  });
}
main().catch(console.error);
