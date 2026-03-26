# Sentry Safety Rules

## Safe Commands (no confirmation needed)

- `sentry-cli info`
- `sentry-cli projects list`
- `sentry-cli releases list`
- `sentry-cli issues list` (all variants and query filters)
- `sentry-cli monitors list`
- `sentry-cli sourcemaps explain`
- `sentry-cli releases files <VERSION> list`
- Any read-only Sentry MCP queries

## Dangerous Commands (ALWAYS confirm first)

Before running ANY of these, explain what it does and wait for explicit user approval:

- `sentry-cli releases new` (creates a release record)
- `sentry-cli releases finalize` (locks the release)
- `sentry-cli releases delete` (permanently deletes a release and its artifacts)
- `sentry-cli releases set-commits` (associates commits to a release)
- `sentry-cli issues resolve` (marks issues as resolved)
- `sentry-cli issues mute` (suppresses alerts for an issue)
- `sentry-cli sourcemaps upload` (uploads artifacts, affects production debugging)
- `sentry-cli deploys new` (records a deployment event)
- `sentry-cli projects create` (creates a new project in the org)
- `sentry-cli releases files <VERSION> delete` (deletes uploaded artifacts)
- `sentry-cli monitors delete` (permanently deletes a cron monitor)
- Any Sentry MCP write operations (autofix apply, issue resolve, etc.)

## Pre-Flight Checks

Before any Sentry operation:

1. Run `sentry-cli info` to verify auth token and org are correct
2. Confirm the target project with the user (check `SENTRY_PROJECT` env or `--project` flag)
3. For release operations, confirm the version string with the user
4. For source map uploads, verify the build output exists and is current (`ls` the output dir)

## Source Map Upload Safety

Source maps affect how stack traces render for all users viewing errors in Sentry:

1. Always build fresh before uploading (`npm run build` / `next build`)
2. Verify `.map` files exist in the output directory before upload
3. Confirm the `--release` version matches the deployed code version
4. Use `sentry-cli sourcemaps explain <EVENT_ID>` to verify after upload
