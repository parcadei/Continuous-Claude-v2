// src/resource-gate.ts
import { readFileSync } from "fs";
async function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const input = JSON.parse(await readStdin());
  if (input.tool_name !== "Task") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  try {
    const { execSync } = await import("child_process");
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const result = execSync(
      `cd "${projectDir}" && uv run python -c "
from scripts.agentica_patterns.dynamic_resources import DynamicAllocator, ResourceCircuitBreaker
from scripts.resource_profiler import ResourceProfiler

profiler = ResourceProfiler()
allocator = DynamicAllocator(profiler)
breaker = ResourceCircuitBreaker()

can_spawn, reason = breaker.can_spawn()
if not can_spawn:
    print('BLOCK:' + reason)
else:
    max_agents = allocator.calculate_max_agents()
    print('OK:' + str(max_agents))
"`,
      { encoding: "utf-8", timeout: 5e3 },
    ).trim();
    if (result.startsWith("BLOCK:")) {
      const output = {
        result: "block",
        message: `Resource Gate: ${result.slice(6)}`,
      };
      console.log(JSON.stringify(output));
    } else {
      const output = {
        result: "continue",
        message: `R:\u2713 max_agents=${result.slice(3)}`,
      };
      console.log(JSON.stringify(output));
    }
  } catch (error) {
    console.log(
      JSON.stringify({
        result: "continue",
        message: "R:? (check failed, allowing)",
      }),
    );
  }
}
main().catch(() => {
  console.log(JSON.stringify({ result: "continue" }));
});
