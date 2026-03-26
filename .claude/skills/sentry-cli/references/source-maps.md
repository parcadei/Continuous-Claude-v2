# Sentry Source Maps

Source maps connect minified/bundled JavaScript to original source code, enabling readable stack traces in Sentry.

## Per-Framework Guide

### Next.js on Vercel

**No manual upload needed.** Install the Sentry-Vercel integration from the Vercel dashboard (Integrations > Sentry). It auto-configures:
- Source map upload during build
- Release creation from `VERCEL_GIT_COMMIT_SHA`
- Environment detection

In `next.config.mjs`, wrap with `withSentryConfig`:

```javascript
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI, // suppress logs in local dev
});
```

### Next.js on Railway

Manual upload required after build:

```bash
VERSION="${RAILWAY_GIT_COMMIT_SHA:-$(git rev-parse HEAD)}"
sentry-cli sourcemaps upload \
  --release="$VERSION" \
  --project "$SENTRY_PROJECT" \
  --url-prefix "~/_next" \
  .next/
```

Add `productionBrowserSourceMaps: true` to `next.config.mjs` (or use `withSentryConfig` which handles this).

### Node.js / Express (compiled TypeScript)

```bash
VERSION=$(git rev-parse HEAD)
sentry-cli sourcemaps upload \
  --release="$VERSION" \
  --project "$SENTRY_PROJECT" \
  ./dist
```

Ensure your TypeScript compiler or bundler emits source maps (`"sourceMap": true` in tsconfig.json or equivalent bundler option).

### Python

No source maps needed. Python is interpreted -- Sentry captures full stack traces natively.

## Debugging Source Map Issues

```bash
# Explain why source maps failed for a specific event
sentry-cli sourcemaps explain <EVENT_ID> --project <PROJECT>
```

Common issues:
- **Mismatched release**: event release version differs from uploaded source maps
- **Wrong URL prefix**: `--url-prefix` must match how the browser loads the files
- **Missing maps**: build did not produce `.map` files (check bundler config)
- **Stale maps**: ran upload before rebuilding -- always build fresh first

## Validation Checklist

1. Build the project (`npm run build` / `next build`)
2. Verify `.map` files exist in the output directory
3. Upload with correct `--release` and `--url-prefix`
4. Trigger a test error
5. Check the error in Sentry -- stack trace should show original source

## Clean Up

Source maps count toward your Sentry storage quota. Sentry automatically removes artifacts from old releases after the retention period. To manually delete:

```bash
sentry-cli releases files <VERSION> list --project <PROJECT>
sentry-cli releases files <VERSION> delete --all --project <PROJECT>
```
