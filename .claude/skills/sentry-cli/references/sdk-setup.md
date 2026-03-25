# Sentry SDK Setup

Per-framework guide for adding Sentry error monitoring to a project.

## Next.js

The wizard handles everything:

```bash
npx @sentry/wizard@latest -i nextjs
```

This auto-creates:
- `sentry.client.config.ts` -- browser SDK init
- `sentry.server.config.ts` -- server SDK init
- `sentry.edge.config.ts` -- edge runtime SDK init
- `instrumentation.ts` -- Node.js instrumentation hook
- Wraps `next.config.mjs` with `withSentryConfig`

After running the wizard, set env vars:
- `SENTRY_DSN` -- from Project Settings > Client Keys (public, safe for client bundles)
- `SENTRY_AUTH_TOKEN` -- for source map uploads (private, server-only)
- `SENTRY_ORG` -- organization slug
- `SENTRY_PROJECT` -- project slug

### Vercel Deployment

Install the Sentry integration from Vercel Dashboard > Integrations > Sentry. It:
- Auto-sets `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` env vars
- Uploads source maps automatically during build
- Creates releases from `VERCEL_GIT_COMMIT_SHA`

### Railway Deployment

Set env vars manually in Railway:

```
SENTRY_DSN=https://<key>@sentry.io/<project-id>
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=<org-slug>
SENTRY_PROJECT=<project-slug>
SENTRY_ENVIRONMENT=production
```

## Node.js / Express

```bash
npm install @sentry/node
```

Create `src/instrument.ts` (MUST be imported before anything else):

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
});
```

In your entry point (`src/index.ts` or `src/server.ts`):

```typescript
import "./instrument"; // MUST be first import
import express from "express";
import * as Sentry from "@sentry/node";

const app = express();

// ... routes ...

// Sentry error handler MUST be after all routes but before other error handlers
Sentry.setupExpressErrorHandler(app);

app.listen(3000);
```

## Python

```bash
uv add sentry-sdk    # or: pip install sentry-sdk
```

In your entry point or config:

```python
import sentry_sdk

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    environment=os.environ.get("SENTRY_ENVIRONMENT", "development"),
    traces_sample_rate=0.2 if os.environ.get("SENTRY_ENVIRONMENT") == "production" else 1.0,
)
```

Sentry auto-detects frameworks (FastAPI, Django, Flask, Celery) and instruments them automatically.

## Environment Variables Summary

| Var | Scope | Purpose |
|-----|-------|---------|
| `SENTRY_DSN` | Per-project, public | SDK connection string |
| `SENTRY_AUTH_TOKEN` | Global, private | CLI auth + source map upload |
| `SENTRY_ORG` | Global | Organization slug |
| `SENTRY_PROJECT` | Per-project | Project slug for CLI commands |
| `SENTRY_ENVIRONMENT` | Per-deployment | `production`, `staging`, `development` |

## Sample Rate Guidelines

| Environment | `tracesSampleRate` | `replaysSessionSampleRate` | `replaysOnErrorSampleRate` |
|-------------|-------------------|---------------------------|---------------------------|
| Development | `1.0` | `1.0` | `1.0` |
| Staging | `0.5` | `0.5` | `1.0` |
| Production | `0.1` - `0.2` | `0.1` | `1.0` |

## Verification

After setup, trigger a test error:

```typescript
// JavaScript/TypeScript
Sentry.captureException(new Error("Sentry test error"));
```

```python
# Python
sentry_sdk.capture_exception(Exception("Sentry test error"))
```

Check the Sentry dashboard -- the error should appear within 30 seconds.
