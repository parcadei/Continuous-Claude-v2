---
name: full-test
description: Complete platform testing suite - functional + frontend design quality testing with graded report
user_invocable: true
---

# /full-test — Complete Platform Testing Suite

Functional + frontend design quality testing in a single command. Combines unit tests, API smoke tests, browser functional tests, and a 25-check design audit into a graded report.

## Invocation

```
/full-test                          # Interactive - asks questions
/full-test <url>                    # Quick run against URL
/full-test --depth comprehensive    # Full depth
```

## Question Flow

Ask the user these questions before starting (skip if args provided):

<question id="target" header="Target" multiSelect="false">
  <option label="Auto-detect" description="Use test-config.json if present, else prompt" />
  <option label="Specify URL" description="Enter a base URL to test against" />
  <option label="Load config" description="Path to a test-config.json file" />
</question>

<question id="depth" header="Depth" multiSelect="false">
  <option label="Quick (3-5min)" description="3 routes, basic a11y, top 2 anti-patterns only" />
  <option label="Standard (10-15min) (Recommended)" description="All routes, full a11y, all anti-patterns + semantic + cursor + contrast" />
  <option label="Comprehensive (20-30min)" description="Everything: responsive screenshots, hover shift, touch targets, fonts, palette, design system" />
</question>

<question id="phases" header="Phases" multiSelect="true">
  <option label="Unit + API tests" description="Run project unit tests and API smoke tests via agents" />
  <option label="Browser functional" description="Route smoke, performance, accessibility, console errors" />
  <option label="Design audit" description="25 automated frontend design quality checks" />
  <option label="Report" description="Generate graded markdown report from all results" />
</question>

## Prerequisites

Before running, verify:

1. **Chrome CDP** available on port 9222 (or configured port)
   - Launch Chrome: `chrome --remote-debugging-port=9222`
2. **playwright-core** installed: `npm list playwright-core` or `npm i -g playwright-core`
3. **Config file** (optional): `test-config.json` in project root
   - See `examples/test-config.example.json` for format

## Execution Flow

### Phase 0: Preflight

```bash
# Verify CDP
curl -s http://localhost:9222/json/version | head -1

# Verify playwright
node -e "require('playwright-core')" 2>/dev/null && echo "OK" || echo "MISSING"
```

If config path provided, load it. Otherwise check for `test-config.json` in CWD.

### Phase 1: Unit + API Tests (parallel agents)

Spawn two agents in parallel:

**Agent 1: Unit Tests (arbiter)**
```
Run the project's unit test command.
If test-config.json has unitTest.command, use that.
Otherwise detect: pnpm test, npm test, yarn test, pytest.
Capture pass/fail counts and output to <screenshotDir>/unit-results.json
```

**Agent 2: API Smoke Tests (spark)**
```
If test-config.json has apiTest.endpoints, test each endpoint:
- Send request, verify status code matches expected
- Measure response time
- Check response shape (valid JSON, has expected keys)
Output to <screenshotDir>/api-results.json
```

### Phase 2: Browser Functional Tests

Run the browser functional test script:

```bash
node .claude/skills/full-test-suite/scripts/browser-functional.mjs \
  --config <configPath> \
  --depth <quick|standard|comprehensive> \
  --output <screenshotDir>/functional-results.json
```

This tests:
- **Route smoke** — every route loads, captures screenshots
- **Performance** — TTFB, DOM interactive, LCP, resource count (standard+)
- **Accessibility** — missing alt, labels, ARIA, heading hierarchy
- **Console errors** — captures all JS errors per route
- **Responsive** — 4 viewport screenshots per route (comprehensive only)

### Phase 3: Frontend Design Audit

Run the design audit script:

```bash
node .claude/skills/full-test-suite/scripts/design-audit.mjs \
  --config <configPath> \
  --depth <quick|standard|comprehensive> \
  --output <screenshotDir>/design-audit-results.json
```

#### The 25 Design Checks

| # | Check | Category | Severity | Depth |
|---|-------|----------|----------|-------|
| 1 | no-user-scalable-no | Anti-Patterns | ERROR | quick+ |
| 2 | no-paste-prevention | Anti-Patterns | WARNING | quick+ |
| 3 | no-outline-removal | Anti-Patterns | ERROR | standard+ |
| 4 | no-transition-all | Anti-Patterns | WARNING | standard+ |
| 5 | clickable-divs | Semantic HTML | ERROR | standard+ |
| 6 | focus-ring-visible | Semantic HTML | ERROR | standard+ |
| 7 | inputs-have-labels | Semantic HTML | ERROR | standard+ |
| 8 | inputs-have-autocomplete | Semantic HTML | WARNING | standard+ |
| 9 | cursor-pointer | Interaction | WARNING | standard+ |
| 10 | no-layout-shift-on-hover | Interaction | WARNING | comprehensive |
| 11 | touch-targets-44px | Interaction | ERROR | comprehensive |
| 12 | contrast-ratio | Visual | ERROR | standard+ |
| 13 | no-emoji-icons | Visual | INFO | comprehensive |
| 14 | font-quality | Visual | INFO | comprehensive |
| 15 | color-palette | Visual | INFO | comprehensive |
| 16 | icon-button-labels | Accessibility | ERROR | standard+ |
| 17 | heading-hierarchy | Accessibility | ERROR | standard+ |
| 18 | clickable-labels | Accessibility | WARNING | comprehensive |
| 19 | readable-font-size | Layout | ERROR | standard+ |
| 20 | horizontal-scroll | Layout | ERROR | standard+ |
| 21 | line-height-readability | Layout | WARNING | comprehensive |
| 22 | img-dimensions | Layout | WARNING | comprehensive |
| 23 | reduced-motion-support | Perf/Polish | WARNING | comprehensive |
| 24 | img-lazy-loading | Perf/Polish | INFO | comprehensive |
| 25 | z-index-sanity | Perf/Polish | INFO | comprehensive |

### Phase 4: Report Synthesis

Generate the final graded report:

```bash
node .claude/skills/full-test-suite/scripts/report-generator.mjs \
  --functional <screenshotDir>/functional-results.json \
  --design <screenshotDir>/design-audit-results.json \
  --unit <screenshotDir>/unit-results.json \
  --output <project>/test-report.md
```

#### Scoring Model (100-point weighted scale)

| Category | Weight |
|----------|--------|
| Unit Tests | 25% |
| API Tests | 10% |
| Route Smoke | 15% |
| Performance | 15% |
| Accessibility | 15% |
| Design Quality | 20% |

**Grades:** A+ (95-100), A (90-94), A- (85-89), B+ (80-84), B (75-79), B- (70-74), C+ (65-69), C (60-64), C- (55-59), D (50-54), F (<50)

## Present Results

After Phase 4 completes, present to the user:

```
## Full Test Results: [Grade] ([Score]/100)

| Category | Score | Key Finding |
|----------|-------|-------------|
| Unit Tests | X/100 | N/M passed |
| Route Smoke | X/100 | N routes OK |
| Performance | X/100 | Avg TTFB Xms |
| Accessibility | X/100 | N issues |
| Design Quality | X/100 | N errors, M warnings |

Top issues:
1. [Most impactful finding]
2. [Second finding]
3. [Third finding]

Full report: <path>/test-report.md
```

## Depth Matrix Reference

| Feature | Quick | Standard | Comprehensive |
|---------|-------|----------|---------------|
| Route smoke | 3 routes | All | All |
| Console errors | Yes | Yes | Yes |
| Performance | No | Yes | Yes |
| Accessibility | Basic | Full | Full |
| Responsive screenshots | No | No | Yes (4 viewports) |
| Anti-patterns (4) | Top 2 | All 4 | All 4 |
| Semantic HTML (4) | No | All 4 | All 4 |
| A11y/Semantic (3) | No | #16-17 | All 3 |
| Interaction (3) | No | Cursor only | All 3 |
| Visual quality (4) | No | Contrast only | All 4 |
| Layout/Visual (4) | No | #19-20 | All 4 |
| Perf/Polish (3) | No | No | All 3 |

## Configuration

Three input methods (priority order): CLI args > env vars > test-config.json

**Environment variables:**
- `TEST_BASE_URL` — target URL
- `TEST_CDP_URL` — Chrome CDP endpoint

**Config file format:** See `examples/test-config.example.json`

## Error Recovery

| Error | Recovery |
|-------|----------|
| CDP connection refused | Start Chrome with `--remote-debugging-port=9222` |
| playwright-core not found | `npm i -g playwright-core` |
| Route timeout | Script auto-falls back to domcontentloaded |
| Cross-origin CSS errors | Gracefully skipped with try/catch |
| No config file | Uses defaults (localhost:3000, single route) |

## Files

```
.claude/skills/full-test-suite/
  SKILL.md                              # This file
  scripts/
    browser-functional.mjs              # Route smoke, perf, a11y, responsive
    design-audit.mjs                    # 25 design quality checks
    report-generator.mjs                # Scoring + markdown report
  examples/
    test-config.example.json            # Example configuration
```
