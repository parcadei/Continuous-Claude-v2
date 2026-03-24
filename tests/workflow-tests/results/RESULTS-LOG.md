# Test Results Log

Chronological record of CCv3 workflow test runs. Latest at top.
Updated after each `node run-all.mjs` execution.

---

## 2026-03-24 03:33 -- CDP CLI Re-run (standalone)

**Trigger:** Re-run after Chrome auto-launch warmed up
**Suite:** cdp-cli only

| Suite | Pass | Fail | Skip | Grade |
|-------|------|------|------|-------|
| cdp-cli | 13 | 0 | 0 | **A** |

All 13 commands validated: navigate, title, url, perf, network, a11y, snapshot, eval, tabs, cleanup + 3 smoke.
Chrome auto-launched successfully via PID management.

**Result file:** `cdp-cli-2026-03-24T03-33-01.json`

---

## 2026-03-24 03:31 -- Full Suite (first run)

**Trigger:** Initial test framework deployment
**Command:** `node run-all.mjs`

| Suite | Pass | Fail | Skip | Grade |
|-------|------|------|------|-------|
| browser-automation | 8 | 0 | 0 | **A** |
| cdp-cli | 2 | 1 | 10 | F |
| cli-strategy | 13 | 0 | 0 | **A** |
| deployer-agent | 11 | 0 | 0 | **A** |
| docker | 4 | 0 | 0 | **A** |
| gh-cli | 2 | 0 | 0 | **A** |
| neonctl | 11 | 0 | 0 | **A** |
| opencli | 8 | 0 | 0 | **A** |
| qlty | 1 | 0 | 1 | **A** |
| railway-cli | 10 | 0 | 0 | **A** |
| skill-rules | 9 | 0 | 0 | **A** |
| stale-refs | 6 | 0 | 0 | **A** |
| tldr | 4 | 0 | 0 | **A** |
| vercel-cli | 5 | 0 | 0 | **A** |
| **TOTAL** | **94** | **1** | **11** | **B (98.9%)** |

**Notes:**
- cdp-cli: 1 fail was a timing race during agent file write (help expected 13 commands, got 14 before test stabilized). 10 skips because Chrome wasn't pre-running with debug port.
- qlty: 1 skip because qlty CLI not installed on this machine.
- CDP CLI standalone re-run (03:33) confirmed 13/13 pass after Chrome auto-launch.

**Result file:** `combined-2026-03-24T03-31-52.json`

---

## 2026-03-24 03:30 -- Agent Build Runs (pre-combined)

**Trigger:** 3 parallel kraken agents building and testing suites during development
**Not a formal run** -- these are intermediate results from the build phase.

Individual agent results (for provenance):
- `railway-cli-2026-03-24T03-29-52.json` — 10/10 pass (A)
- `gh-cli-2026-03-24T03-29-58.json` — 2/2 pass (A)
- `deployer-agent-2026-03-24T03-30-01.json` — 11/11 pass (A)
- `neonctl-2026-03-24T03-30-15.json` — 11/11 pass (A)
- `vercel-cli-2026-03-24T03-30-22.json` — 5/5 pass (A)
- `browser-automation-2026-03-24T03-30-33.json` — 8/8 pass (A)
- `docker-2026-03-24T03-30-36.json` — 4/4 pass (A)
- `qlty-2026-03-24T03-30-40.json` — 1/1 pass, 1 skip (A)
- `stale-refs-2026-03-24T03-30-44.json` — 6/6 pass (A)
- `opencli-2026-03-24T03-30-45.json` — 8/8 pass (A)
- `skill-rules-2026-03-24T03-30-49.json` — 9/9 pass (A)
- `cli-strategy-2026-03-24T03-31-00.json` — 13/13 pass (A)
- `tldr-2026-03-24T03-31-07.json` — 4/4 pass (A)
