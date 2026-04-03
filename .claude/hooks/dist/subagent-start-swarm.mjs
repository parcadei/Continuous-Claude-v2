// src/subagent-start-swarm.ts
import { readFileSync } from "fs";
async function main() {
  let input;
  try {
    const rawInput = readFileSync(0, "utf-8");
    if (!rawInput.trim()) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    input = JSON.parse(rawInput);
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const swarmId = process.env.SWARM_ID;
  if (!swarmId) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const agentId = input.agent_id ?? "unknown";
  const agentType = input.agent_type ?? "unknown";
  console.error(
    `[subagent-start] Agent ${agentId} (type: ${agentType}) joining swarm ${swarmId}`,
  );
  const output = {
    result: "continue",
  };
  console.log(JSON.stringify(output));
}
main().catch((err) => {
  console.error("Uncaught error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
