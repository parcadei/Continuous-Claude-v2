# Sentry Monitoring

Performance monitoring, session replay, alerts, and cron monitoring.

## Performance Monitoring

Auto-instrumented with the SDK -- no extra code needed for:
- HTTP requests (incoming and outgoing)
- Database queries (Prisma, Drizzle, Sequelize, SQLAlchemy)
- React component renders (Next.js)
- API route handlers

### Custom Spans

For manual instrumentation of specific operations:

```typescript
import * as Sentry from "@sentry/node";

const result = await Sentry.startSpan(
  { name: "expensive-operation", op: "function" },
  async (span) => {
    // ... your code ...
    return result;
  }
);
```

```python
import sentry_sdk

with sentry_sdk.start_span(op="function", name="expensive-operation"):
    # ... your code ...
    pass
```

## Session Replay (Browser Only)

Captures user interactions as replayable sessions, linked to errors.

In `sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,    // privacy: mask all text by default
      blockAllMedia: true,  // privacy: block media by default
    }),
  ],
  replaysSessionSampleRate: 0.1,  // 10% of sessions
  replaysOnErrorSampleRate: 1.0,  // 100% of sessions with errors
});
```

## Cron Monitoring

Wrap cron jobs or scheduled tasks to detect missed runs, failures, and duration anomalies.

```bash
# Wrap a CLI command
sentry-cli monitors run <MONITOR_SLUG> -- <command>

# Example: monitor a daily backup
sentry-cli monitors run daily-backup -- node scripts/backup.mjs

# List monitors
sentry-cli monitors list
```

Create monitors in the Sentry dashboard first (Crons section), which generates the `MONITOR_SLUG`.

### Programmatic Check-In

```typescript
const checkInId = Sentry.captureCheckIn({
  monitorSlug: "daily-report",
  status: "in_progress",
});

try {
  await generateReport();
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "daily-report",
    status: "ok",
  });
} catch (e) {
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: "daily-report",
    status: "error",
  });
  throw e;
}
```

## Alerts

Configure alerts in the Sentry dashboard (Alerts section). No CLI or MCP support for alert rule creation.

Common alert types:
- **Error spike**: triggers when error count exceeds threshold in a time window
- **New issue**: triggers on first occurrence of a new error type
- **Performance regression**: triggers when transaction duration degrades
- **Uptime**: HTTP endpoint monitoring (checks every 1-60 min)
- **Cron missed**: triggers when a monitored cron job misses its schedule

Alert destinations: email, Slack, PagerDuty, webhooks, MS Teams.

## Uptime Monitoring

Configure in dashboard (Alerts > Uptime Monitors):
- Set URL to check
- Set interval (1, 5, 15, 30, or 60 minutes)
- Set expected status code (default: 2xx)
- Configure alert recipients

No CLI/MCP support -- dashboard only.
