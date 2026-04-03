// src/smart-search-router.ts
import {
  existsSync as existsSync2,
  mkdirSync,
  writeFileSync as writeFileSync2,
} from "fs";
import { execSync as execSync2 } from "child_process";
import { join as join2 } from "path";

// src/daemon-client.ts
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { join, resolve } from "path";
import { tmpdir } from "os";
import * as net from "net";
import * as crypto from "crypto";
function resolveProjectDir(projectDir) {
  return resolve(projectDir);
}
function getLockPath(projectDir) {
  const resolvedPath = resolveProjectDir(projectDir);
  const hash = crypto
    .createHash("md5")
    .update(resolvedPath)
    .digest("hex")
    .substring(0, 8);
  return `${tmpdir()}/tldr-${hash}.lock`;
}
function getPidPath(projectDir) {
  const resolvedPath = resolveProjectDir(projectDir);
  const hash = crypto
    .createHash("md5")
    .update(resolvedPath)
    .digest("hex")
    .substring(0, 8);
  return `${tmpdir()}/tldr-${hash}.pid`;
}
function isDaemonProcessRunning(projectDir) {
  const pidPath = getPidPath(projectDir);
  if (!existsSync(pidPath)) return false;
  try {
    const pid = parseInt(readFileSync(pidPath, "utf-8").trim(), 10);
    if (isNaN(pid) || pid <= 0) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function tryAcquireLock(projectDir) {
  const lockPath = getLockPath(projectDir);
  try {
    if (existsSync(lockPath)) {
      const lockContent = readFileSync(lockPath, "utf-8");
      const lockTime = parseInt(lockContent, 10);
      if (!isNaN(lockTime) && Date.now() - lockTime < 3e4) {
        return false;
      }
      try {
        unlinkSync(lockPath);
      } catch {}
    }
    writeFileSync(lockPath, Date.now().toString(), { flag: "wx" });
    return true;
  } catch {
    return false;
  }
}
function releaseLock(projectDir) {
  try {
    unlinkSync(getLockPath(projectDir));
  } catch {}
}
var QUERY_TIMEOUT = 3e3;
function getConnectionInfo(projectDir) {
  const resolvedPath = resolveProjectDir(projectDir);
  const hash = crypto
    .createHash("md5")
    .update(resolvedPath)
    .digest("hex")
    .substring(0, 8);
  if (process.platform === "win32") {
    const port = 49152 + (parseInt(hash, 16) % 1e4);
    return { type: "tcp", host: "127.0.0.1", port };
  } else {
    return { type: "unix", path: `${tmpdir()}/tldr-${hash}.sock` };
  }
}
function getStatusFile(projectDir) {
  const statusPath = join(projectDir, ".tldr", "status");
  if (existsSync(statusPath)) {
    try {
      return readFileSync(statusPath, "utf-8").trim();
    } catch {
      return null;
    }
  }
  return null;
}
function isIndexing(projectDir) {
  return getStatusFile(projectDir) === "indexing";
}
function isDaemonReachable(projectDir) {
  const connInfo = getConnectionInfo(projectDir);
  if (connInfo.type === "tcp") {
    try {
      const testSocket = new net.Socket();
      testSocket.setTimeout(100);
      let connected = false;
      testSocket.on("connect", () => {
        connected = true;
        testSocket.destroy();
      });
      testSocket.on("error", () => {
        testSocket.destroy();
      });
      testSocket.connect(connInfo.port, connInfo.host);
      const end = Date.now() + 200;
      while (Date.now() < end && !connected) {}
      return connected;
    } catch {
      return false;
    }
  } else {
    if (!existsSync(connInfo.path)) {
      return false;
    }
    if (isDaemonProcessRunning(projectDir)) {
      try {
        execSync(`echo '{"cmd":"ping"}' | nc -U "${connInfo.path}"`, {
          encoding: "utf-8",
          timeout: 1e3,
          // Increased from 500ms
          stdio: ["pipe", "pipe", "pipe"],
        });
        return true;
      } catch {
        return true;
      }
    }
    try {
      execSync(`echo '{"cmd":"ping"}' | nc -U "${connInfo.path}"`, {
        encoding: "utf-8",
        timeout: 500,
        stdio: ["pipe", "pipe", "pipe"],
      });
      return true;
    } catch {
      try {
        unlinkSync(connInfo.path);
      } catch {}
      return false;
    }
  }
}
function tryStartDaemon(projectDir) {
  try {
    if (isDaemonProcessRunning(projectDir)) {
      return true;
    }
    if (isDaemonReachable(projectDir)) {
      return true;
    }
    if (!tryAcquireLock(projectDir)) {
      const start = Date.now();
      while (Date.now() - start < 5e3) {
        if (
          isDaemonProcessRunning(projectDir) ||
          isDaemonReachable(projectDir)
        ) {
          return true;
        }
        const end = Date.now() + 100;
        while (Date.now() < end) {}
      }
      return (
        isDaemonProcessRunning(projectDir) || isDaemonReachable(projectDir)
      );
    }
    try {
      const tldrPath = join(projectDir, "opc", "packages", "tldr-code");
      let started = false;
      if (existsSync(tldrPath)) {
        const result = spawnSync(
          "uv",
          ["run", "tldr", "daemon", "start", "--project", projectDir],
          {
            timeout: 1e4,
            stdio: "ignore",
            cwd: tldrPath,
          },
        );
        started = result.status === 0;
      }
      if (!started && !process.env.TLDR_DEV) {
        spawnSync("tldr", ["daemon", "start", "--project", projectDir], {
          timeout: 5e3,
          stdio: "ignore",
        });
      }
      const start = Date.now();
      while (Date.now() - start < 1e4) {
        if (isDaemonReachable(projectDir)) {
          const cooldown = Date.now() + 1e3;
          while (Date.now() < cooldown) {}
          return true;
        }
        const end = Date.now() + 100;
        while (Date.now() < end) {}
      }
      return isDaemonReachable(projectDir);
    } finally {
      releaseLock(projectDir);
    }
  } catch {
    return false;
  }
}
function queryDaemonSync(query, projectDir) {
  if (isIndexing(projectDir)) {
    return {
      indexing: true,
      status: "indexing",
      message: "Daemon is still indexing, results may be incomplete",
    };
  }
  const connInfo = getConnectionInfo(projectDir);
  if (!isDaemonReachable(projectDir)) {
    if (!tryStartDaemon(projectDir)) {
      return {
        status: "unavailable",
        error: "Daemon not running and could not start",
      };
    }
  }
  try {
    const input = JSON.stringify(query);
    let result;
    if (connInfo.type === "tcp") {
      const psCommand = `
        $client = New-Object System.Net.Sockets.TcpClient('${connInfo.host}', ${connInfo.port})
        $stream = $client.GetStream()
        $writer = New-Object System.IO.StreamWriter($stream)
        $reader = New-Object System.IO.StreamReader($stream)
        $writer.WriteLine('${input.replace(/'/g, "''")}')
        $writer.Flush()
        $response = $reader.ReadLine()
        $client.Close()
        Write-Output $response
      `.trim();
      result = execSync(
        `powershell -Command "${psCommand.replace(/"/g, '\\"')}"`,
        {
          encoding: "utf-8",
          timeout: QUERY_TIMEOUT,
        },
      );
    } else {
      result = execSync(`echo '${input}' | nc -U "${connInfo.path}"`, {
        encoding: "utf-8",
        timeout: QUERY_TIMEOUT,
      });
    }
    return JSON.parse(result.trim());
  } catch (err) {
    if (err.killed) {
      return { status: "error", error: "timeout" };
    }
    if (
      err.message?.includes("ECONNREFUSED") ||
      err.message?.includes("ENOENT")
    ) {
      return { status: "unavailable", error: "Daemon not running" };
    }
    return { status: "error", error: err.message || "Unknown error" };
  }
}
function trackHookActivitySync(
  hookName,
  projectDir,
  success = true,
  metrics = {},
) {
  try {
    queryDaemonSync(
      { cmd: "track", hook: hookName, success, metrics },
      projectDir,
    );
  } catch {}
}

// src/smart-search-router.ts
var CONTEXT_DIR = "/tmp/claude-search-context";
function storeSearchContext(sessionId, context) {
  try {
    if (!existsSync2(CONTEXT_DIR)) {
      mkdirSync(CONTEXT_DIR, { recursive: true });
    }
    writeFileSync2(
      `${CONTEXT_DIR}/${sessionId}.json`,
      JSON.stringify(context, null, 2),
    );
  } catch {}
}
function tldrSearch(pattern, projectDir = ".") {
  try {
    const response = queryDaemonSync({ cmd: "search", pattern }, projectDir);
    if (response.indexing || response.status === "unavailable") {
      return ripgrepFallback(pattern, projectDir);
    }
    if (response.status === "ok" && response.results) {
      return response.results;
    }
    return [];
  } catch {
    return ripgrepFallback(pattern, projectDir);
  }
}
function ripgrepFallback(pattern, projectDir) {
  try {
    const escaped = pattern.replace(/"/g, '\\"').replace(/\$/g, "\\$");
    const result = execSync2(
      `rg "${escaped}" "${projectDir}" --type py --line-number --max-count 10 2>/dev/null`,
      { encoding: "utf-8", timeout: 3e3 },
    );
    return result
      .trim()
      .split("\n")
      .filter((l) => l)
      .slice(0, 10)
      .map((line) => {
        const match = line.match(/^([^:]+):(\d+):(.*)$/);
        if (match) {
          return {
            file: match[1],
            line: parseInt(match[2], 10),
            content: match[3],
          };
        }
        return { file: line, line: 0, content: "" };
      });
  } catch {
    return [];
  }
}
function checkSemanticIndexExists(projectDir) {
  const indexPath = join2(
    projectDir,
    ".tldr",
    "cache",
    "semantic",
    "index.faiss",
  );
  return existsSync2(indexPath);
}
function tldrSemantic(query, projectDir = ".") {
  if (!checkSemanticIndexExists(projectDir)) {
    return { results: [], status: "no_index" };
  }
  try {
    const response = queryDaemonSync(
      { cmd: "semantic", query, k: 5 },
      projectDir,
    );
    if (response.indexing) {
      return { results: [], status: "indexing" };
    }
    if (response.status === "unavailable") {
      return { results: [], status: "daemon_unavailable" };
    }
    if (response.status === "ok" && response.results) {
      return { results: response.results, status: "ok" };
    }
    return { results: [], status: "ok" };
  } catch {
    return { results: [], status: "error" };
  }
}
function tldrImpact(funcName, projectDir = ".") {
  try {
    const response = queryDaemonSync(
      { cmd: "impact", func: funcName },
      projectDir,
    );
    if (response.indexing || response.status === "unavailable") {
      return [];
    }
    if (response.status === "ok" && response.callers) {
      return response.callers.map((c) => `${c.file}:${c.line}`);
    }
    return [];
  } catch {
    return [];
  }
}
function lookupCallers(pattern) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || ".";
  return tldrImpact(pattern, projectDir).slice(0, 20);
}
function lookupSymbol(pattern) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || ".";
  const funcResults = tldrSearch(`def ${pattern}`, projectDir);
  if (funcResults.length > 0) {
    return {
      type: "function",
      location: `${funcResults[0].file}:${funcResults[0].line}`,
    };
  }
  const classResults = tldrSearch(`class ${pattern}`, projectDir);
  if (classResults.length > 0) {
    return {
      type: "class",
      location: `${classResults[0].file}:${classResults[0].line}`,
    };
  }
  if (/^[A-Z][A-Z0-9_]+$/.test(pattern)) {
    const varResults = tldrSearch(`${pattern} =`, projectDir);
    if (varResults.length > 0) {
      return {
        type: "variable",
        location: `${varResults[0].file}:${varResults[0].line}`,
      };
    }
  }
  return null;
}
var FUNCTION_VERB_PREFIXES =
  /^(get|set|is|has|do|can|create|update|delete|fetch|load|save|read|write|parse|build|make|init|setup|run|start|stop|handle|process|validate|check|find|search|filter|sort|map|reduce|transform|convert|format|render|display|show|hide|enable|disable|add|remove|insert|append|push|pop|clear|reset|close|open|connect|disconnect|send|receive|emit|on_|async_|_get|_set|_is|_has|_do|_create|_update|_delete|_fetch|_load|_save|_read|_write|_parse|_build|_make|_init|_setup|_run|_handle|_process|_validate|_check|_find|poll|call|exec|execute|invoke|apply|bind|dispatch|trigger|fire|notify|broadcast|publish|subscribe|unsubscribe|listen|watch|observe|register|unregister|mount|unmount|attach|detach|flush|dump|log|warn|error|debug|trace|print|throw|raise|assert|test|mock|stub|spy|wait|sleep|delay|retry|abort|cancel|pause|resume|refresh|reload|rerun|revert|rollback|commit|merge|split|join|clone|copy|move|swap|toggle|flip|increment|decrement|next|prev|first|last|peek|drain|consume|produce|yield|spawn|fork|join|kill|terminate|shutdown|cleanup|destroy|dispose|release|acquire|lock|unlock|enter|exit|begin|end|finalize)(_|$)/;
function extractTarget(pattern) {
  const indexed = lookupSymbol(pattern);
  if (indexed) {
    return { target: pattern, targetType: indexed.type };
  }
  const classMatch = pattern.match(/^class\s+(\w+)/);
  if (classMatch) return { target: classMatch[1], targetType: "class" };
  const defMatch = pattern.match(/^(?:async\s+)?def\s+(\w+)/);
  if (defMatch) return { target: defMatch[1], targetType: "function" };
  const functionMatch = pattern.match(/^(?:async\s+)?function\s+(\w+)/);
  if (functionMatch)
    return { target: functionMatch[1], targetType: "function" };
  const decoratorMatch = pattern.match(/^@(\w+)/);
  if (decoratorMatch)
    return { target: decoratorMatch[1], targetType: "decorator" };
  const importMatch = pattern.match(/^(?:import|from)\s+(\w+)/);
  if (importMatch) return { target: importMatch[1], targetType: "import" };
  const attrMatch = pattern.match(/(?:self|this)(?:\.|\\\.|\\\.\s*)(\w+)/);
  if (attrMatch) {
    const attr = attrMatch[1];
    if (FUNCTION_VERB_PREFIXES.test(attr)) {
      return { target: attr, targetType: "function" };
    }
    return { target: attr, targetType: "variable" };
  }
  if (/^__[a-z][a-z0-9_]*__$/.test(pattern)) {
    const moduleVars = [
      "__all__",
      "__version__",
      "__author__",
      "__doc__",
      "__file__",
      "__name__",
      "__package__",
      "__path__",
      "__cached__",
      "__loader__",
      "__spec__",
      "__builtins__",
      "__dict__",
      "__module__",
      "__slots__",
      "__annotations__",
    ];
    if (moduleVars.includes(pattern)) {
      return { target: pattern, targetType: "variable" };
    }
    return { target: pattern, targetType: "function" };
  }
  if (/^[A-Z][A-Z0-9_]+$/.test(pattern))
    return { target: pattern, targetType: "variable" };
  if (/^[A-Z][a-zA-Z0-9]+$/.test(pattern))
    return { target: pattern, targetType: "class" };
  if (
    /^_?[a-z][a-z0-9_]*$/.test(pattern) &&
    FUNCTION_VERB_PREFIXES.test(pattern)
  ) {
    return { target: pattern, targetType: "function" };
  }
  if (/^_?[a-z][a-z0-9_]*$/.test(pattern)) {
    return { target: pattern, targetType: "variable" };
  }
  const camelCaseVerbPattern =
    /^(get|set|is|has|do|can|use|create|update|delete|fetch|load|save|read|write|parse|build|make|init|setup|run|start|stop|handle|process|validate|check|find|search|filter|sort|map|reduce|transform|convert|format|render|display|show|hide|enable|disable|add|remove|insert|append|push|pop|clear|reset|close|open|connect|disconnect|send|receive|emit|on|async|poll|call|exec|execute|invoke|apply|bind|dispatch|trigger|fire|notify|broadcast|publish|subscribe|watch|observe|register|mount|attach|flush|dump|log|warn|error|debug|print|throw|assert|test|mock|wait|sleep|retry|abort|cancel|pause|resume|refresh|reload|revert|commit|merge|clone|copy|move|toggle|spawn|fork|kill|terminate|shutdown|cleanup|destroy|dispose|release|acquire|lock|unlock|enter|exit|begin|end)[A-Z]/;
  if (camelCaseVerbPattern.test(pattern)) {
    return { target: pattern, targetType: "function" };
  }
  if (/^[a-z][a-zA-Z0-9]*$/.test(pattern) && /[A-Z]/.test(pattern)) {
    return { target: pattern, targetType: "variable" };
  }
  const identMatch = pattern.match(/\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b/);
  if (identMatch) return { target: identMatch[1], targetType: "unknown" };
  return { target: null, targetType: "unknown" };
}
function suggestLayers(targetType, queryType) {
  switch (targetType) {
    case "function":
      return ["ast", "call_graph", "cfg"];
    case "class":
      return ["ast", "call_graph"];
    case "variable":
      return ["ast", "dfg"];
    case "import":
      return ["ast"];
    case "decorator":
      return ["ast", "call_graph"];
    default:
      return queryType === "semantic"
        ? ["ast", "call_graph", "cfg"]
        : ["ast", "call_graph"];
  }
}
function readStdin() {
  return new Promise((resolve2) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve2(data));
  });
}
function classifyQuery(pattern) {
  const structuralPatterns = [
    /^(class|function|def|async def|const|let|var|interface|type|export)\s+\w+/,
    /^(import|from|require)\s/,
    /^\w+\s*\([^)]*\)/,
    // function calls
    /^async\s+(function|def)/,
    /\$\w+/,
    // AST-grep metavariables
    /^@\w+/,
    // decorators
  ];
  if (structuralPatterns.some((p) => p.test(pattern))) {
    return "structural";
  }
  if (
    pattern.includes("\\") ||
    pattern.includes("[") ||
    /\([^)]*\|/.test(pattern)
  ) {
    return "literal";
  }
  if (
    /^[A-Z][a-zA-Z0-9]*$/.test(pattern) ||
    /^[a-z_][a-z0-9_]*$/.test(pattern) ||
    /^[A-Z_][A-Z0-9_]*$/.test(pattern)
  ) {
    return "literal";
  }
  if (pattern.includes("/") || /\.(ts|py|js|go|rs|md)/.test(pattern)) {
    return "literal";
  }
  const words = pattern.split(/\s+/).filter((w) => w.length > 0);
  if (
    words.length <= 2 &&
    !/^(how|what|where|why|when|find|show|list)/i.test(pattern)
  ) {
    return "literal";
  }
  const semanticPatterns = [
    /^(how|what|where|why|when|which)\s/i,
    /\?$/,
    /^(find|show|list|get|explain)\s+(all|the|every|any)/i,
    /works?$/i,
    /^.*\s+(implementation|architecture|flow|pattern|logic|system)$/i,
  ];
  if (semanticPatterns.some((p) => p.test(pattern))) {
    return "semantic";
  }
  if (words.length >= 3) {
    return "semantic";
  }
  return "literal";
}
function getAstGrepSuggestion(pattern, lang = "python") {
  const suggestions = {
    function: `def $FUNC($$$):`,
    async: `async def $FUNC($$$):`,
    class: `class $NAME:`,
    import: `import $MODULE`,
    decorator: `@$DECORATOR`,
  };
  for (const [keyword, astPattern] of Object.entries(suggestions)) {
    if (pattern.toLowerCase().includes(keyword)) {
      return astPattern;
    }
  }
  return `$PATTERN($$$)`;
}
async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    console.log("{}");
    return;
  }
  if (input.tool_name !== "Grep") {
    console.log("{}");
    return;
  }
  if (!input.tool_input || typeof input.tool_input.pattern !== "string") {
    console.log("{}");
    return;
  }
  const pattern = input.tool_input.pattern;
  const queryType = classifyQuery(pattern);
  const sessionId = input.session_id || "default";
  const { target, targetType } = extractTarget(pattern);
  const layers = suggestLayers(targetType, queryType);
  const symbolInfo = target ? lookupSymbol(target) : null;
  const callers = target ? lookupCallers(target) : [];
  storeSearchContext(sessionId, {
    timestamp: Date.now(),
    queryType,
    pattern,
    target,
    targetType,
    suggestedLayers: layers,
    definitionLocation: symbolInfo?.location,
    callers: callers.slice(0, 20),
    // Limit to 20 callers for token efficiency
  });
  const projectDir = process.env.CLAUDE_PROJECT_DIR || ".";
  if (queryType === "literal") {
    trackHookActivitySync("smart-search-router", projectDir, true, {
      queries_routed: 1,
      literal_queries: 1,
    });
    const reason2 = `\u{1F50D} Use TLDR search for code exploration (95% token savings):

**Option 1 - TLDR Skill:**
/tldr-search ${pattern}

**Option 2 - Direct CLI:**
\`\`\`bash
tldr search "${pattern}" .
\`\`\`

**Option 3 - Read specific file (TLDR auto-enriches):**
Read the file containing "${pattern}" - the tldr-read-enforcer will return structured context.

TLDR finds location + provides call graph + docstrings in one call.`;
    const output2 = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason2,
      },
    };
    console.log(JSON.stringify(output2));
    return;
  }
  if (queryType === "structural") {
    trackHookActivitySync("smart-search-router", projectDir, true, {
      queries_routed: 1,
      structural_queries: 1,
    });
    const astPattern = getAstGrepSuggestion(pattern);
    const reason2 = `\u{1F3AF} Structural query - Use AST-grep OR TLDR:

**Option 1 - AST-grep (pattern matching):**
ast-grep --pattern "${astPattern}" --lang python

**Option 2 - TLDR (richer context):**
/tldr-search ${target || pattern}

AST-grep: precise pattern match, file:line only
TLDR: finds + call graph + docstrings + complexity`;
    const output2 = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason2,
      },
    };
    console.log(JSON.stringify(output2));
    return;
  }
  trackHookActivitySync("smart-search-router", projectDir, true, {
    queries_routed: 1,
    semantic_queries: 1,
  });
  const semanticSearch = tldrSemantic(pattern, projectDir);
  let reason;
  if (semanticSearch.status === "ok" && semanticSearch.results.length > 0) {
    const resultsStr = semanticSearch.results
      .map((r) => {
        const loc = `${r.file}:${r.function || "module"}`;
        const score = r.score ? ` (${(r.score * 100).toFixed(0)}%)` : "";
        return `  - ${loc}${score}`;
      })
      .join("\n");
    reason = `\u{1F9E0} **Semantic Search Results** (via TLDR daemon):

${resultsStr}

**Next steps:**
1. Read the most relevant file: \`Read ${semanticSearch.results[0].file}\`
2. For deeper analysis: \`/tldr-search ${target || pattern} --layer all\`

The results above are semantically similar to "${pattern}".`;
  } else if (semanticSearch.status === "no_index") {
    reason = `\u{1F9E0} **Semantic Search Not Set Up**

No semantic index found. To enable AI-powered code search:

\`\`\`bash
tldr semantic index . --lang all
\`\`\`

This creates embeddings for your codebase (one-time, ~30s).
After indexing, natural language queries like "${pattern}" will find relevant code.

**For now, use:**
- \`/tldr-search ${target || pattern}\` - structured search
- \`Task(subagent_type="Explore", prompt="${pattern}")\` - agent exploration`;
  } else if (semanticSearch.status === "daemon_unavailable") {
    reason = `\u{1F9E0} **TLDR Daemon Not Running**

Start the daemon for semantic search:
\`\`\`bash
tldr daemon start
\`\`\`

Then retry your query. The daemon provides fast, in-memory semantic search.

**For now, use:**
- \`/tldr-search ${target || pattern}\` - structured search (no daemon needed)`;
  } else if (semanticSearch.status === "indexing") {
    reason = `\u{1F9E0} **Semantic Index Building...**

The daemon is currently building the semantic index. This takes ~30s.
Retry in a moment, or use structured search for now:

\`/tldr-search ${target || pattern}\``;
  } else {
    reason = `\u{1F9E0} **No Semantic Matches**

No code semantically similar to "${pattern}" found in the index.

**Try:**
1. Rephrase the query with different keywords
2. Use structured search: \`/tldr-search ${target || pattern}\`
3. Explore with agent: \`Task(subagent_type="Explore", prompt="${pattern}")\``;
  }
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
  console.log(JSON.stringify(output));
}
main().catch(console.error);
