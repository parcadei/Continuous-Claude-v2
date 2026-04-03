// src/test-multi-agent.ts
import { readFileSync } from "fs";
function main() {
  let input;
  try {
    const stdinContent = readFileSync(0, "utf-8");
    input = JSON.parse(stdinContent);
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  console.error("multi-agent test hook fired");
  const output = {
    result: "continue",
  };
  console.log(JSON.stringify(output));
}
main();
export { main };
