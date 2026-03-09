---
name: win-preflight
description: Scans modified files for known Windows anti-patterns before commit. Triggers on "windows check", "win preflight", "platform check", or "windows preflight". Catches 6 recurring issues that cause 15-30 minute debugging sessions on Windows.
---

# Windows Pre-flight Check

Scan files for Windows-specific anti-patterns that cause silent failures, encoding crashes, and path resolution errors. Run before committing to catch issues early.

## When to Use

- Before committing changes on Windows
- After porting scripts from macOS/Linux
- When debugging mysterious Windows-only failures
- Triggered by: "windows check", "win preflight", "platform check", "windows preflight"

## Scope

**Default:** Scan only files modified in the current git diff:
```bash
git diff --name-only HEAD
```

**Full scan:** When the user says "full scan" or "scan all", scan all tracked files:
```bash
git ls-files
```

Filter the file list to relevant extensions before running checks (`.py`, `.ts`, `.js`, `.sh`, `.json`, `.md`).

## The 6 Checks

Run each check against the scoped file set. For detailed patterns, error messages, and examples, see `references/windows-antipatterns.md`.

### Check 1: Unicode/emoji in Python files

Non-ASCII characters in Python stdout/stderr crash on Windows cp1252 encoding.

```bash
grep -rn '[^\x00-\x7F]' --include='*.py' . 2>/dev/null | head -20
```

**Fix:** Replace with ASCII equivalents or set `PYTHONUTF8=1` environment variable.

### Check 2: `python3` command usage

Windows does not have `python3` on PATH. The command triggers the Microsoft Store alias.

```bash
grep -rn 'python3' --include='*.sh' --include='*.ts' --include='*.js' --include='*.md' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20
```

**Fix:** Use `python` or `uv run python` instead.

### Check 3: Bare `/Users/` paths without drive letter

Paths like `/Users/david.hayes/...` resolve to `C:\Program Files\Git\Users\...` on Git Bash.

```bash
grep -rn '"/Users/' --include='*.ts' --include='*.js' --include='*.sh' --include='*.json' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20
grep -rn "'/Users/" --include='*.ts' --include='*.js' --include='*.sh' --include='*.json' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20
```

**Fix:** Use `/c/Users/` (Git Bash) or `C:/Users/` (Windows forward-slash) format.

### Check 4: `npx` without `cmd /c` wrapper in MCP configs

On Windows, MCP server configs using `npx` directly as the command will fail to spawn.

```bash
grep -rn '"command": "npx"' --include='*.json' . 2>/dev/null | grep -v node_modules | head -10
```

**Fix:** Use `"command": "cmd", "args": ["/c", "npx", ...]` pattern.

### Check 5: `net.Socket` spin-loop patterns

`net.Socket` connection checks block the Node.js event loop on Windows, causing hangs.

```bash
grep -rn 'net\.Socket\|new Socket' --include='*.ts' --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -10
```

**Fix:** Use `spawnSync` subprocess for TCP connectivity checks on Windows.

### Check 6: Hardcoded encoding assumptions

Explicit references to `cp1252`, `latin-1`, or locale-dependent encoding create fragile code.

```bash
grep -rn "cp1252\|latin-1\|iso-8859\|encoding='utf" --include='*.py' --include='*.ts' --include='*.js' . 2>/dev/null | grep -v node_modules | head -10
```

**Fix:** Use UTF-8 explicitly everywhere, or keep output ASCII-only.

## Output Format

After running all 6 checks, present the report in this format:

```
Windows Pre-flight Report
========================
Check 1 (Unicode/emoji):     PASS / FAIL (N files)
Check 2 (python3):           PASS / FAIL (N occurrences)
Check 3 (bare /Users/):      PASS / FAIL (N occurrences)
Check 4 (npx without cmd):   PASS / FAIL (N configs)
Check 5 (net.Socket):        PASS / FAIL (N files)
Check 6 (encoding):          PASS / FAIL (N files)

Overall: PASS / FAIL

Details:
[file:line] issue description -> suggested fix
```

Mark each check PASS if zero matches found, FAIL if any matches found. Include the match count. Overall is PASS only if all 6 checks pass.

In the Details section, list each match with:
- File path and line number
- Brief description of the anti-pattern found
- The specific fix to apply

## Important

- This skill **reports only** -- it does not modify any files
- Present findings and let the user decide what to fix
- False positives are possible (e.g., `net.Socket` used correctly with proper async handling)
- Flag potential false positives but still report them
