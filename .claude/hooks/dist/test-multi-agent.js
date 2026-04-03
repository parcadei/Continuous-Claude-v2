/**
 * PostToolUse:* Hook - Multi-agent test hook
 *
 * A minimal test hook that fires on any tool use and logs to stderr.
 * Used to verify multi-agent coordination is working correctly.
 */
import { readFileSync } from "fs";
export function main() {
  // Read input from stdin
  let input;
  try {
    const stdinContent = readFileSync(0, "utf-8");
    input = JSON.parse(stdinContent);
  } catch {
    // On parse error, continue (don't block)
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Log to stderr (not stdout, which is for hook output)
  console.error("multi-agent test hook fired");
  // Output: always continue, no modifications
  const output = {
    result: "continue",
  };
  console.log(JSON.stringify(output));
}
// Run the hook
main();
