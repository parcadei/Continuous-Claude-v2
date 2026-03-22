# Dev Server Cleanup Pattern

For web projects (Next.js, Vite, Express, etc.), scaffold managed dev server scripts that prevent zombie processes.

## When to Scaffold

Only scaffold when the project:
1. Has a `package.json`
2. Has a `dev` script in package.json
3. Is a web project (serves on a port)

Skip for libraries, CLI tools, or projects without a dev server.

## Files to Create

### scripts/dev-cleanup.mjs

```javascript
// Dev server cleanup - kills previous dev server before starting new one
import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = dirname(import.meta.dirname);
const PID_FILE = join(ROOT, '.dev-server.pid');

if (existsSync(PID_FILE)) {
  try {
    const pid = readFileSync(PID_FILE, 'utf8').trim();
    if (pid) {
      console.log(`Cleaning up previous dev server (PID ${pid})...`);
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        } else {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        }
      } catch { /* process already dead */ }
    }
    unlinkSync(PID_FILE);
  } catch { /* ignore cleanup errors */ }
}
```

### scripts/dev-start.mjs

```javascript
// Managed dev server start - cleanup + start + PID tracking
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Cleanup previous
await import('./dev-cleanup.mjs');

const ROOT = dirname(import.meta.dirname);
const PID_FILE = join(ROOT, '.dev-server.pid');
const PORT = process.env.DEV_PORT || '{{DEV_PORT}}';

console.log(`Starting dev server on port ${PORT}...`);

const child = spawn('npx', ['next', 'dev', '-p', PORT], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT }
});

writeFileSync(PID_FILE, String(child.pid));

child.on('exit', () => {
  if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
});

process.on('SIGINT', () => {
  child.kill('SIGTERM');
  if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
  process.exit(0);
});
```

## package.json Changes

Replace the `dev` script:
```json
{
  "scripts": {
    "dev": "node scripts/dev-start.mjs",
    "dev:cleanup": "node scripts/dev-cleanup.mjs"
  }
}
```

## .env.local

```
DEV_PORT={{PORT_NUMBER}}
```

## .gitignore Addition

```
.dev-server.pid
```

## Port Assignment

Check `~/.claude/project-registry.json` for used ports. Current assignments:
- 3000: Fourth Connect
- 3001: agent-factory
- 3002: NorthStar Transformation
- 3003: ECG Lead Reactivation Engine

New projects should use the next available port (3004+).

## Caddy Setup (Optional, for HTTPS localhost)

If the project needs HTTPS (auth cookies, OAuth), create a `Caddyfile`:

```
{{project}}.localhost {
    reverse_proxy localhost:{{PORT}}
}
```

Then the dev URL becomes `https://{{project}}.localhost/` instead of `http://localhost:{{PORT}}`.
