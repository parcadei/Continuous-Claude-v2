# Windows Anti-patterns Reference

Detailed documentation for each of the 6 anti-patterns detected by the win-preflight skill. Each pattern includes: why it fails on Windows, the specific error message it produces, the fix, and an example.

---

## Pattern 1: Unicode/Emoji in Python Files

### Why It Fails

Windows console uses `cp1252` encoding by default. Python's `print()` and `sys.stdout.write()` inherit this encoding. When a Python script outputs non-ASCII characters (arrows, checkmarks, emoji) to stdout or stderr, the codec cannot encode them.

### Error Message

```
UnicodeEncodeError: 'charmap' codec can't encode character '\u2713' in position 0: character maps to <undefined>
```

Or:

```
UnicodeEncodeError: 'charmap' codec can't encode characters in position 0-1: character maps to <undefined>
```

### Fix

**Option A: Replace with ASCII equivalents**
```python
# Before (breaks on Windows)
print("[x] Task complete")
print("-> Next step")

# After (works everywhere)
print("[x] Task complete")
print("-> Next step")
```

**Option B: Set environment variable**
```bash
# In .env or shell profile
PYTHONUTF8=1
```

**Option C: Explicit encoding in script**
```python
import sys
sys.stdout.reconfigure(encoding='utf-8')
```

### Detection Command

```bash
grep -rn '[^\x00-\x7F]' --include='*.py' . 2>/dev/null | head -20
```

---

## Pattern 2: `python3` Command Usage

### Why It Fails

Windows does not have `python3` on PATH by default. The `python3` command triggers the Microsoft Store alias, which opens the Store app instead of running Python. Even when Python is installed, the executable is `python.exe`, not `python3.exe`.

### Error Message

```
bash: python3: command not found
```

Or the Microsoft Store opens silently with no Python execution.

### Fix

**Option A: Use `python` (Windows native)**
```bash
# Before (fails on Windows)
python3 scripts/generate.py

# After (works on Windows)
python scripts/generate.py
```

**Option B: Use `uv run python` (cross-platform, preferred)**
```bash
# Works on all platforms, handles virtual environments
uv run python scripts/generate.py
```

**Option C: Use `node` instead (when possible)**
```bash
# For scripts that could be JavaScript
node scripts/generate.js
```

### Detection Command

```bash
grep -rn 'python3' --include='*.sh' --include='*.ts' --include='*.js' --include='*.md' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20
```

---

## Pattern 3: Bare `/Users/` Paths Without Drive Letter

### Why It Fails

On Git Bash for Windows, a path like `/Users/david.hayes/project` does NOT resolve to `C:\Users\david.hayes\project`. Instead, Git Bash interprets it as relative to its install directory: `C:\Program Files\Git\Users\david.hayes\project`, which does not exist.

This is the #1 cause of `Exit code 1` errors across sessions. The error is confusing because the path looks correct.

### Error Message

```
bash: cd: /Users/david.hayes/project: No such file or directory
```

Or:

```
ENOENT: no such file or directory, open '/Users/david.hayes/project/file.ts'
```

### Fix

**Always include the drive letter in literal paths:**

```bash
# Before (fails on Git Bash)
cd /Users/david.hayes/project

# After (Git Bash format)
cd /c/Users/david.hayes/project

# After (Windows forward-slash format)
cd C:/Users/david.hayes/project
```

**For environment variables:** `$HOME` works when set, but literal paths MUST include the drive letter.

| Wrong | Right |
|-------|-------|
| `/Users/david.hayes/project` | `/c/Users/david.hayes/project` |
| `"/Users/david.hayes/file"` | `"C:/Users/david.hayes/file"` |

### Detection Command

```bash
grep -rn '"/Users/' --include='*.ts' --include='*.js' --include='*.sh' --include='*.json' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20
grep -rn "'/Users/" --include='*.ts' --include='*.js' --include='*.sh' --include='*.json' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -20
```

---

## Pattern 4: `npx` Without `cmd /c` Wrapper in MCP Configs

### Why It Fails

On Windows, MCP server configurations that specify `"command": "npx"` fail because `npx` is a batch script (`npx.cmd`) on Windows, not a direct executable. Node.js `child_process.spawn` cannot execute `.cmd` files directly without a shell wrapper.

### Error Message

```
Error: spawn npx ENOENT
```

Or the MCP server silently fails to start with no output.

### Fix

Wrap `npx` with `cmd /c`:

```json
// Before (fails on Windows)
{
  "command": "npx",
  "args": ["-y", "package-name@latest"]
}

// After (works on Windows)
{
  "command": "cmd",
  "args": ["/c", "npx", "-y", "package-name@latest"]
}
```

Claude Code diagnostics will warn about this. Fix immediately when seen.

### Detection Command

```bash
grep -rn '"command": "npx"' --include='*.json' . 2>/dev/null | grep -v node_modules | head -10
```

---

## Pattern 5: `net.Socket` Spin-Loop Patterns

### Why It Fails

Using `net.Socket` to check TCP port availability blocks the Node.js event loop on Windows. The connection attempt does not resolve promptly on Windows (unlike Unix where it fails fast with ECONNREFUSED). This causes the process to hang for the socket timeout duration.

The pattern typically appears in daemon health checks or port availability tests.

### Error Message

No explicit error -- the process simply hangs. After the timeout (often 5-30 seconds), it may produce:

```
Error: connect ETIMEDOUT 127.0.0.1:PORT
```

Or the entire process becomes unresponsive.

### Fix

Replace `net.Socket` TCP checks with `spawnSync` subprocess:

```typescript
// Before (hangs on Windows)
import net from 'net';
function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.connect(port, '127.0.0.1', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });
}

// After (works on Windows)
import { spawnSync } from 'child_process';
function checkPort(port: number): boolean {
  const result = spawnSync('node', [
    '-e',
    `require('net').createConnection(${port},'127.0.0.1').on('connect',()=>{process.exit(0)}).on('error',()=>{process.exit(1)})`
  ], { timeout: 2000 });
  return result.status === 0;
}
```

### Detection Command

```bash
grep -rn 'net\.Socket\|new Socket' --include='*.ts' --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v '.git/' | head -10
```

### False Positive Note

Not all `net.Socket` usage is problematic. The anti-pattern specifically involves synchronous-style spin loops waiting for connection results. Properly async usage with `await` and short timeouts may be acceptable. Flag but note the context.

---

## Pattern 6: Hardcoded Encoding Assumptions

### Why It Fails

Code that explicitly references `cp1252`, `latin-1`, or `iso-8859` is either:
- Working around a Windows encoding issue (may be intentional but fragile)
- Making locale-dependent assumptions that break across environments

Code using `encoding='utf-8'` in Python is often fine but should be verified -- it may indicate the developer already encountered the encoding problem and patched it locally.

### Error Message

Various, depending on context:

```
UnicodeDecodeError: 'utf-8' codec can't decode byte 0x93 in position 10
```

```
LookupError: unknown encoding: cp1252
```

Or data corruption with wrong characters appearing in output.

### Fix

**Standardize on UTF-8:**

```python
# Before (fragile)
with open(path, encoding='latin-1') as f:
    data = f.read()

# After (explicit UTF-8)
with open(path, encoding='utf-8') as f:
    data = f.read()
```

**For stdout/stderr:**
```python
# Set at process level
import os
os.environ['PYTHONUTF8'] = '1'
```

**For Node.js:**
```javascript
// Explicitly specify encoding when reading files
const data = fs.readFileSync(path, 'utf-8');
```

### Detection Command

```bash
grep -rn "cp1252\|latin-1\|iso-8859\|encoding='utf" --include='*.py' --include='*.ts' --include='*.js' . 2>/dev/null | grep -v node_modules | head -10
```

---

## Summary Table

| # | Pattern | Error Type | Time to Debug | Severity |
|---|---------|-----------|---------------|----------|
| 1 | Unicode/emoji in Python | UnicodeEncodeError | 15-30 min | High |
| 2 | `python3` command | Command not found / Store opens | 5-15 min | Medium |
| 3 | Bare `/Users/` paths | ENOENT / Exit code 1 | 15-30 min | High |
| 4 | `npx` without `cmd /c` | spawn ENOENT | 10-20 min | Medium |
| 5 | `net.Socket` spin-loop | Process hang | 15-30 min | High |
| 6 | Hardcoded encoding | UnicodeDecodeError / corruption | 10-20 min | Medium |

Total estimated time saved per session: 15-150 minutes depending on how many patterns are caught pre-commit.
