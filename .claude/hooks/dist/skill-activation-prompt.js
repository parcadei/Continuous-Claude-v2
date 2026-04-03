#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
// Import shared resource reader (Phase 4 module)
import { readResourceState } from "./shared/resource-reader.js";
// Import validation module for false-positive reduction
import { shouldValidateWithLLM } from "./skill-validation-prompt.js";
// Pattern-to-agent mapping
const PATTERN_AGENT_MAP = {
  swarm: "research-agent",
  hierarchical: "kraken",
  pipeline: "kraken",
  generator_critic: "review-agent",
  adversarial: "validate-agent",
  map_reduce: "kraken",
  jury: "validate-agent",
  blackboard: "maestro",
  circuit_breaker: "kraken",
  chain_of_responsibility: "maestro",
  event_driven: "kraken",
};
/**
 * Run pattern inference using the Python module.
 * Returns null if inference fails or module not available.
 */
function runPatternInference(prompt, projectDir) {
  try {
    const scriptPath = join(
      projectDir,
      "scripts",
      "agentica_patterns",
      "pattern_inference.py",
    );
    if (!existsSync(scriptPath)) {
      return null;
    }
    // Escape prompt for shell
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    // Run the Python module with uv - using direct import to avoid __init__.py issues
    const result = execSync(
      `cd "${projectDir}" && uv run python -c "
import sys
import json
import importlib.util

# Direct import bypassing __init__.py
spec = importlib.util.spec_from_file_location(
    'pattern_inference',
    '${scriptPath}'
)
pattern_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pattern_mod)

prompt = '''${escapedPrompt}'''
result = pattern_mod.infer_pattern(prompt)
output = result.to_dict()
output['work_breakdown_detailed'] = pattern_mod.generate_work_breakdown(result)
print(json.dumps(output))
"`,
      {
        encoding: "utf-8",
        timeout: 5000, // 5 second timeout
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    return JSON.parse(result.trim());
  } catch (err) {
    // Pattern inference is optional - fail silently
    return null;
  }
}
/**
 * Generate agentica orchestration output based on pattern inference.
 */
function generateAgenticaOutput(inference, prompt) {
  let output = "\n";
  output += "=".repeat(50) + "\n";
  output += "AGENTICA PATTERN INFERENCE\n";
  output += "=".repeat(50) + "\n";
  output += "\n";
  if (inference.confidence >= 0.7) {
    const suggestedAgent = PATTERN_AGENT_MAP[inference.pattern] || "kraken";
    output += "SUGGESTED APPROACH:\n";
    output += `  Agent: ${suggestedAgent}\n`;
    output += `  Pattern: ${inference.work_breakdown_detailed}\n`;
    const confidencePct = Math.round(inference.confidence * 100);
    output += `  Confidence: ${confidencePct}%\n`;
    output += "\n";
    output += "ACTION: Use AskUserQuestion to confirm before spawning:\n";
    output += `  "I'll use ${suggestedAgent} to ${inference.work_breakdown}. Proceed?"\n`;
    output +=
      "  Options: [Yes, proceed] [Different approach] [Let me explain more]\n";
    if (inference.alternatives.length > 0) {
      output += `\nAlternative approaches available: ${inference.alternatives.join(", ")}\n`;
    }
  } else {
    // Low confidence - ask CDM probe
    output += "CLARIFICATION NEEDED:\n";
    output += "\n";
    if (inference.clarification_probe) {
      output += `Ask the user: "${inference.clarification_probe}"\n`;
    }
    output += "\n";
    output += "Initial analysis suggests: " + inference.work_breakdown + "\n";
    const confidencePct = Math.round(inference.confidence * 100);
    output += `Confidence: ${confidencePct}%\n`;
    output += "\n";
    output += "ACTION: Use AskUserQuestion to clarify before proceeding.\n";
  }
  output += "=".repeat(50) + "\n";
  return output;
}
async function main() {
  try {
    // Read input from stdin
    const input = readFileSync(0, "utf-8");
    const data = JSON.parse(input);
    const prompt = data.prompt.toLowerCase();
    // Load skill rules (try project first, then global)
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const homeDir = process.env.HOME || "";
    const projectRulesPath = join(
      projectDir,
      ".claude",
      "skills",
      "skill-rules.json",
    );
    const globalRulesPath = join(
      homeDir,
      ".claude",
      "skills",
      "skill-rules.json",
    );
    let rulesPath = "";
    if (existsSync(projectRulesPath)) {
      rulesPath = projectRulesPath;
    } else if (existsSync(globalRulesPath)) {
      rulesPath = globalRulesPath;
    } else {
      // No rules file found, exit silently
      process.exit(0);
    }
    const rules = JSON.parse(readFileSync(rulesPath, "utf-8"));
    // CHANGE 1: Run pattern inference EARLY on all prompts
    const patternInference = runPatternInference(data.prompt, projectDir);
    const matchedSkills = [];
    // Check each skill for matches
    for (const [skillName, config] of Object.entries(rules.skills)) {
      const triggers = config.promptTriggers;
      if (!triggers) {
        continue;
      }
      // Keyword matching
      if (triggers.keywords) {
        const matchedKeyword = triggers.keywords.find((kw) =>
          prompt.includes(kw.toLowerCase()),
        );
        if (matchedKeyword) {
          // Check if this match needs LLM validation
          const skillMatchForValidation = {
            skillName,
            matchType: "keyword",
            matchedTerm: matchedKeyword,
            prompt: data.prompt, // Use original prompt (not lowercased)
            skillDescription: config.description,
            enforcement: config.enforcement,
          };
          const needsValidation = shouldValidateWithLLM(
            skillMatchForValidation,
          );
          matchedSkills.push({
            name: skillName,
            matchType: "keyword",
            matchedTerm: matchedKeyword,
            config,
            needsValidation,
          });
          continue;
        }
      }
      // Intent pattern matching (no validation needed - strong signal)
      if (triggers.intentPatterns) {
        const intentMatch = triggers.intentPatterns.some((pattern) => {
          try {
            const regex = new RegExp(pattern, "i");
            return regex.test(prompt);
          } catch {
            // Invalid regex pattern, skip
            return false;
          }
        });
        if (intentMatch) {
          matchedSkills.push({
            name: skillName,
            matchType: "intent",
            config,
            needsValidation: false,
          });
        }
      }
    }
    // Check each agent for matches
    const matchedAgents = [];
    if (rules.agents) {
      for (const [agentName, config] of Object.entries(rules.agents)) {
        const triggers = config.promptTriggers;
        if (!triggers) {
          continue;
        }
        // Keyword matching
        if (triggers.keywords) {
          const matchedKeyword = triggers.keywords.find((kw) =>
            prompt.includes(kw.toLowerCase()),
          );
          if (matchedKeyword) {
            // Check if this match needs LLM validation
            const skillMatchForValidation = {
              skillName: agentName,
              matchType: "keyword",
              matchedTerm: matchedKeyword,
              prompt: data.prompt,
              skillDescription: config.description,
              enforcement: config.enforcement,
            };
            const needsValidation = shouldValidateWithLLM(
              skillMatchForValidation,
            );
            matchedAgents.push({
              name: agentName,
              matchType: "keyword",
              matchedTerm: matchedKeyword,
              config,
              isAgent: true,
              needsValidation,
            });
            continue;
          }
        }
        // Intent pattern matching (no validation needed - strong signal)
        if (triggers.intentPatterns) {
          const intentMatch = triggers.intentPatterns.some((pattern) => {
            try {
              const regex = new RegExp(pattern, "i");
              return regex.test(prompt);
            } catch {
              // Invalid regex pattern, skip
              return false;
            }
          });
          if (intentMatch) {
            matchedAgents.push({
              name: agentName,
              matchType: "intent",
              config,
              isAgent: true,
              needsValidation: false,
            });
          }
        }
      }
    }
    // Generate output if matches found OR pattern inference succeeded
    if (
      matchedSkills.length > 0 ||
      matchedAgents.length > 0 ||
      patternInference
    ) {
      // Check which skills need LLM validation (potential false positives)
      const skillsNeedingValidation = matchedSkills.filter(
        (s) => s.needsValidation,
      );
      const agentsNeedingValidation = matchedAgents.filter(
        (a) => a.needsValidation,
      );
      const allNeedingValidation = [
        ...skillsNeedingValidation,
        ...agentsNeedingValidation,
      ];
      // Filter out skills that need validation from the main lists
      // (they will be shown in a separate section)
      const confirmedSkills = matchedSkills.filter((s) => !s.needsValidation);
      const confirmedAgents = matchedAgents.filter((a) => !a.needsValidation);
      let output = "";
      // CHANGE 2: Show pattern inference output FIRST if available
      if (patternInference) {
        output += generateAgenticaOutput(patternInference, data.prompt);
        output += "\n";
      }
      // Show skill activation check only if skills/agents matched
      if (matchedSkills.length > 0 || matchedAgents.length > 0) {
        output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        output += "🎯 SKILL ACTIVATION CHECK\n";
        output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        // Show skills needing validation FIRST
        if (allNeedingValidation.length > 0) {
          output += "❓ AMBIGUOUS MATCHES (validate before activating):\n";
          output +=
            "   The following skills matched on keywords that may be used\n";
          output +=
            "   in a non-technical context. Consider if they're needed:\n\n";
          for (const item of allNeedingValidation) {
            const isAgent = item.isAgent ? " [agent]" : "";
            output += `   • ${item.name}${isAgent}\n`;
            output += `     Matched: "${item.matchedTerm}" (keyword match)\n`;
            if (item.config.description) {
              output += `     Purpose: ${item.config.description}\n`;
            }
            output += `     → Skip if the user is NOT asking for this functionality\n`;
            output += "\n";
          }
          output += "   VALIDATION: Before activating these, ask yourself:\n";
          output +=
            "   \"Is the user asking for this skill's capability, or just\n";
          output += '    using the word in everyday language?"\n\n';
        }
        // Group confirmed skills by priority
        const critical = confirmedSkills.filter(
          (s) => s.config.priority === "critical",
        );
        const high = confirmedSkills.filter(
          (s) => s.config.priority === "high",
        );
        const medium = confirmedSkills.filter(
          (s) => s.config.priority === "medium",
        );
        const low = confirmedSkills.filter((s) => s.config.priority === "low");
        if (critical.length > 0) {
          output += "⚠️ CRITICAL SKILLS (REQUIRED):\n";
          critical.forEach((s) => (output += `  → ${s.name}\n`));
          output += "\n";
        }
        if (high.length > 0) {
          output += "📚 RECOMMENDED SKILLS:\n";
          high.forEach((s) => (output += `  → ${s.name}\n`));
          output += "\n";
        }
        if (medium.length > 0) {
          output += "💡 SUGGESTED SKILLS:\n";
          medium.forEach((s) => (output += `  → ${s.name}\n`));
          output += "\n";
        }
        if (low.length > 0) {
          output += "📌 OPTIONAL SKILLS:\n";
          low.forEach((s) => (output += `  → ${s.name}\n`));
          output += "\n";
        }
        // Add confirmed agents
        if (confirmedAgents.length > 0) {
          output += "🤖 RECOMMENDED AGENTS (token-efficient):\n";
          confirmedAgents.forEach((a) => (output += `  → ${a.name}\n`));
          output += "\n";
        }
        if (confirmedSkills.length > 0) {
          output += "ACTION: Use Skill tool BEFORE responding\n";
        }
        if (confirmedAgents.length > 0) {
          output += "ACTION: Use Task tool with agent for exploration\n";
        }
        output += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        // Check if any matched skill has enforcement: 'block'
        const blockingSkills = matchedSkills.filter(
          (s) => s.config.enforcement === "block",
        );
        if (blockingSkills.length > 0) {
          // Return blocking response - Claude must invoke the skill first
          const blockMessage =
            output +
            "\n⛔ BLOCKING: You MUST invoke " +
            blockingSkills.map((s) => s.name).join(", ") +
            " skill(s) before generating ANY response.";
          console.log(
            JSON.stringify({
              result: "block",
              reason: blockMessage,
            }),
          );
          process.exit(0);
        }
      }
      console.log(output);
    }
    // Check context % from statusLine temp file and add tiered warnings
    // CLAUDE_PPID is passed from shell wrapper (matches status.sh's $PPID)
    // This ensures we read the same file that StatusLine wrote
    const sessionId =
      process.env.CLAUDE_SESSION_ID || process.env.CLAUDE_PPID || "default";
    const contextFile = `/tmp/claude-context-pct-${sessionId}.txt`;
    if (existsSync(contextFile)) {
      try {
        const pct = parseInt(readFileSync(contextFile, "utf-8").trim(), 10);
        let contextWarning = "";
        if (pct >= 90) {
          contextWarning =
            "\n" +
            "=".repeat(50) +
            "\n" +
            "  CONTEXT CRITICAL: " +
            pct +
            "%\n" +
            "  Run /create_handoff NOW before auto-compact!\n" +
            "=".repeat(50) +
            "\n";
        } else if (pct >= 80) {
          contextWarning =
            "\n" +
            "CONTEXT WARNING: " +
            pct +
            "%\n" +
            "Recommend: /create_handoff then /clear soon\n";
        } else if (pct >= 70) {
          contextWarning =
            "\nContext at " +
            pct +
            "%. Consider handoff when you reach a stopping point.\n";
        }
        if (contextWarning) {
          console.log(contextWarning);
        }
      } catch {
        // Ignore read errors
      }
    }
    // Check resource limits and add advisory warnings
    // Phase 5: Soft Limit Advisory
    const resources = readResourceState();
    if (resources && resources.maxAgents > 0) {
      const utilization = resources.activeAgents / resources.maxAgents;
      let resourceWarning = "";
      if (utilization >= 1.0) {
        // At or over limit: CRITICAL
        resourceWarning =
          "\n" +
          "=".repeat(50) +
          "\n" +
          "RESOURCE CRITICAL: At limit (" +
          resources.activeAgents +
          "/" +
          resources.maxAgents +
          " agents)\n" +
          "Do NOT spawn new agents until existing ones complete.\n" +
          "=".repeat(50) +
          "\n";
      } else if (utilization >= 0.8) {
        // Near limit (80%+): WARNING
        const remaining = resources.maxAgents - resources.activeAgents;
        resourceWarning =
          "\n" +
          "RESOURCE WARNING: Near limit (" +
          resources.activeAgents +
          "/" +
          resources.maxAgents +
          " agents)\n" +
          "Only " +
          remaining +
          " agent slot(s) remaining. Limit spawning.\n";
      }
      if (resourceWarning) {
        console.log(resourceWarning);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error("Error in skill-activation-prompt hook:", err);
    process.exit(1);
  }
}
main().catch((err) => {
  console.error("Uncaught error:", err);
  process.exit(1);
});
