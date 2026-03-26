# Sentry Releases

## Release Lifecycle

Releases link deployed code versions to errors, enabling commit association, deploy tracking, and regression detection.

### Full Workflow

```bash
# 1. Create release (use git SHA as version)
VERSION=$(git rev-parse HEAD)
sentry-cli releases new "$VERSION" --project <PROJECT>

# 2. Associate commits from git history
sentry-cli releases set-commits "$VERSION" --auto

# 3. Upload source maps (if applicable -- see source-maps.md)
sentry-cli sourcemaps upload --release="$VERSION" --project <PROJECT> .next/

# 4. Finalize the release
sentry-cli releases finalize "$VERSION"

# 5. Record deployment
sentry-cli deploys new -e production -r "$VERSION"
```

## Version Strategy

| Platform | Version Source | Example |
|----------|---------------|---------|
| Any (git) | `git rev-parse HEAD` | `a1b2c3d4e5f6...` |
| Railway | `$RAILWAY_GIT_COMMIT_SHA` | Auto-set by Railway |
| Vercel | `$VERCEL_GIT_COMMIT_SHA` | Auto-set by Vercel |
| Semantic | Manual or from package.json | `1.2.3` |

Short SHA is also acceptable: `git rev-parse --short HEAD` (7 chars).

## Commands Reference

```bash
# List releases
sentry-cli releases list --project <PROJECT>

# Create a new release
sentry-cli releases new <VERSION> --project <PROJECT>

# Associate commits (auto-detect from local git repo)
sentry-cli releases set-commits <VERSION> --auto

# Associate commits (explicit range)
sentry-cli releases set-commits <VERSION> --commit "REPO_NAME@FROM_SHA..TO_SHA"

# Finalize (marks release as ready, locks commit range)
sentry-cli releases finalize <VERSION>

# Record a deployment to an environment
sentry-cli deploys new -e <ENV> -r <VERSION>
# ENV: production, staging, development

# Delete a release (DANGEROUS -- confirm first)
sentry-cli releases delete <VERSION> --project <PROJECT>
```

## CI/CD Integration

### Railway (post-deploy script or Dockerfile)

```bash
VERSION="${RAILWAY_GIT_COMMIT_SHA:-$(git rev-parse HEAD)}"
sentry-cli releases new "$VERSION" --project "$SENTRY_PROJECT"
sentry-cli releases set-commits "$VERSION" --auto
sentry-cli sourcemaps upload --release="$VERSION" --project "$SENTRY_PROJECT" ./dist
sentry-cli releases finalize "$VERSION"
sentry-cli deploys new -e production -r "$VERSION"
```

### Vercel

With the Sentry-Vercel integration installed, releases are created automatically. Manual release management is not needed for Vercel deployments.

## Notes

- `set-commits --auto` requires the deploy environment to have git history (not a shallow clone)
- Releases without `finalize` are visible but marked as unreleased
- A release can have multiple deploys (e.g., staging then production)
- Old releases are automatically cleaned up after the retention period
