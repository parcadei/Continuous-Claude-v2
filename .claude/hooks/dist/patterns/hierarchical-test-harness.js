/**
 * Test harness for hierarchical pattern handlers.
 * Reads JSON from stdin and calls the appropriate handler based on the input.
 */
import { readFileSync } from "fs";
import * as hierarchical from "./hierarchical.js";
async function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  try {
    const rawInput = await readStdin();
    if (!rawInput.trim()) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    const input = JSON.parse(rawInput);
    // Determine which handler to call based on the input structure
    let output;
    if (
      "stop_hook_active" in input ||
      (!("tool_name" in input) && !("agent_id" in input))
    ) {
      // Stop handler
      output = await hierarchical.onStop(input);
    } else if ("tool_name" in input && "tool_response" in input) {
      // PostToolUse handler
      output = await hierarchical.onPostToolUse(input);
    } else if ("tool_name" in input) {
      // PreToolUse handler
      output = await hierarchical.onPreToolUse(input);
    } else if ("agent_id" in input && process.env.STOP_HOOK === "true") {
      // SubagentStop handler
      output = await hierarchical.onSubagentStop(input);
    } else {
      // SubagentStart handler
      output = await hierarchical.onSubagentStart(input);
    }
    console.log(JSON.stringify(output));
  } catch (err) {
    console.error("Error:", err);
    console.log(JSON.stringify({ result: "continue" }));
  }
}
main();
