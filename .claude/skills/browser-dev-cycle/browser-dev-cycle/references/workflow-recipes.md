# Browser Dev Cycle: Workflow Recipes

## Visual QA

```
Step 1: Navigate
  browser_navigate to target URL

Step 2: Screenshot
  browser_take_screenshot (requires vision mode)
  OR browser_snapshot for structural validation (no vision needed)

Step 3: Check content
  browser_snapshot -> verify expected elements appear
  Look for: correct headings, buttons, navigation items, data

Step 4: Responsive check (Tier 3)
  Run viewport matrix script: 375, 768, 1024, 1920px
  Review all screenshots for layout breakage

Step 5: Accessibility check
  browser_snapshot -> check for missing labels, unlabeled buttons, improper heading hierarchy
```

## API Debugging

```
Option A: CDP CLI (Tier 2)
  1. browser_navigate (Tier 1)        -> trigger the page load
  2. node scripts/cdp.mjs network            # list all requests
  3. node scripts/cdp.mjs console            # check for JS errors

Option B: Network Mocking (Tier 3)
  1. page.route('**/api/failing-endpoint', ...) -> return mock data
  2. Verify frontend handles the mock response correctly
  3. Compare mock vs real response to find the discrepancy
```

## Responsive Testing

```
Step 1: Create viewport-test.mjs (Tier 3)
  viewports = [mobile 375, tablet 768, laptop 1024, desktop 1920]
  Loop: set viewport -> wait -> screenshot -> next

Step 2: Run
  node viewport-test.mjs

Step 3: Review screenshots
  Check: overflow, overlapping elements, hidden content, broken grids

Step 4: Accessibility at key viewports
  browser_snapshot (Tier 1) -> verify accessibility tree structure at target sizes
```

## Performance Profiling

```
Step 1: Baseline metrics (Tier 2)
  node scripts/cdp.mjs perf               # runtime metrics
  node scripts/cdp.mjs lighthouse <url>   # full performance audit

Step 2: Load trace
  browser_navigate (Tier 1) -> load the page
  Wait 3-5s for page to settle
  node scripts/cdp.mjs perf               # re-capture after load

Step 3: Core Web Vitals targets
  FCP  < 1.8s
  LCP  < 2.5s
  CLS  < 0.1
  TTI  < 3.8s

Step 4: Bottlenecks to look for
  Long tasks (>50ms), large JS bundles, render-blocking resources, DOM > 1500 nodes

Step 5: Re-measure after fixes
```

## State Management (Login Persistence)

```
Step 1: Login using Tier 1
  browser_navigate to login page
  browser_snapshot -> find email/password fields
  browser_type -> fill credentials
  browser_click -> submit

Step 2: Save state
  Tier 1: browser_evaluate "JSON.stringify({ cookies: document.cookie, localStorage: JSON.stringify(localStorage) })"
  Save result to file

  Tier 3: context.cookies() + page.evaluate for localStorage -> write to browser-state.json

Step 3: Restore in future sessions
  Tier 3 script: read browser-state.json, set cookies and localStorage
  browser_navigate to app -> should be logged in

Step 4: Validate
  browser_snapshot -> verify logged-in UI, check for user-specific content
```

## End-to-End Feature Testing

```
Step 1: Setup (Tier 3 if mocking needed)
  Mock external APIs that are unreliable in testing
  Set up test data via API calls or database seeding

Step 2: Execute user flow (Tier 1)
  Navigate through the feature step by step
  Fill forms, click buttons, verify content at each step
  Use browser_snapshot for assertions

Step 3: Verify network (Tier 2)
  Check that expected API calls were made
  Verify request payloads and response status codes

Step 4: Performance check (Tier 2)
  Ensure the feature meets performance targets

Step 5: Visual check (Tier 1)
  Take screenshots at key states for a visual record
```
