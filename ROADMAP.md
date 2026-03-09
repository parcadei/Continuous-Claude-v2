# Project Roadmap

## Current Focus
**Deep Review: Zombie Process Cleanup + ROADMAP Fix — Hardening Pass**
- Zero cross-project contamination in any of 12 project ROADMAPs checked; Problem: `findstr ":${port}"` is substring — matches `:30020` when looking for `:3002`.
- Started: 2026-03-09

## Completed
- [x] Add Mixed Background Design Elements to CCv3 Light Landing Page (2026-03-09)
- [x] Fix Sync-to-Repo Revert Loop + Re-apply Reverted Fixes (2026-03-07)
- [x] [fix](hooks) break sync-to-repo revert loop + re-apply 7 code fixes (2026-03-07) `0adbdeb`
- [x] Fix: Eliminate Explore → Scout Redirect Round-Trip (2026-03-07)
- [x] LinkMap Code Review, Refactor & Cleanup (2026-03-07)
- [x] [fix](hooks) revive dead agent validation pipeline — Task→Agent rename (2026-03-06) `d8d7343`
- [x] Dashboard Phase 1 — Fix HIGH Priority Bugs (2026-03-05)
- [x] Skills.sh Vetting Pipeline — Code Review Remediation + Testing (2026-03-05)
- [x] Dashboard Final Review via Browser Automation (2026-03-05)
- [x] [feat](dashboard) add System Health Report and Sessions sidebar panels (2026-03-03) `4ec578e`
- [x] [fix](dashboard) activity feed always empty — seed on load, broadcast events, fix reactivity (2026-03-03) `8d503e1`
- [x] [fix](dashboard) handoffs scan both directories, Ralph status online when idle (2026-03-03) `bcd323e`
- [x] [fix](dashboard) HandoffsDetail crash on uppercase status values from API (2026-03-02) `35fd59c`
- [x] [feat](dashboard) session dashboard UX overhaul — WebSocket, panels, DRY cleanup (2026-03-02) `97d7950`
- [x] PPTX Design Revolution — From Corporate Template to Agency-Quality (2026-03-01)
- [x] [feat] add paper-design skill v1.1.0 for visual UI design via MCP (2026-03-01) `241f8ff`
- [x] Fourth Presentation Suite — Premium Visual Upgrade (v4) (2026-02-28)
- [x] Fourth Presentation Suite — Visual Polish Upgrade (2026-02-28)
- [x] [feat] add forge-landing Next.js project (frontend-design skill v1.2.0 test) (2026-02-22) `68b035b`
- [x] [fix](hooks) V5 final repair — eliminate Python bridge, fix Windows daemon tests (2026-02-21) `2067653`
- [x] [feat](hooks) implement skill-router functions + LOW severity fixes (2026-02-21) `e97222c`
- [x] [docs] update README counts and add Mermaid architecture diagrams (2026-02-21) `cd1fcdc`
- [x] [fix](hooks) context management v3 — 8 remaining gaps resolved (2026-02-21) `29c3f64`
- [x] [fix](hooks) repair context management system — 10 audit findings resolved (2026-02-20) `00e41da`
- [x] [fix](infra) subsystem audit fixes — session activity, PageIndex MCP, Braintrust stop hook (2026-02-20) `6f1a08a`
- [x] [feat](hooks) add plan-to-ralph enforcement hooks (2026-02-20) `560cbcb`
- [x] [fix](settings) remove broken statusLine PowerShell wrapper from project config (2026-02-19) `dd0c611`
- [x] [test](ralph) add 211 regression tests for all 11 bug fixes + state backbone (2026-02-19) `2422a62`
- [x] [fix](ralph) fix 11 bugs across hooks, scripts, and state schema (2026-02-19) `c635d93`
- [x] [fix](ralph) make /ralph work in new projects without manual setup (2026-02-19) `f8c19b1`
- [x] [docs](ops) add reviews, E2E runbook, stress-test handoff, and ralph preproduction results (2026-02-19) `b4a1839`
- [x] [feat](skills) add browser-dev-cycle, create-better-skills, excalidraw-mcp, full-test-suite, weekly-report skills + pageindex-watch hook + TDD reference docs (2026-02-19) `159ba4e`
- [x] [fix](memory) cleanup garbage learnings + add ingestion/recall quality gates (2026-02-19) `05abf54`
- [x] [feat](ralph) integrate TDD workflow with atomic task sizing (2026-02-18) `35428b7`
- [x] PRD: NorthStar Transformation Site MVP [prd-northstar-transformation.md] (2026-02-18)
- [x] [docs](rules) add Git Bash drive letter and parallel cascade rules (2026-02-18) `edaeac3`
- [x] [docs](rules) add Windows platform rules for .claude.json, python3, npx (2026-02-18) `f3ec104`
- [x] [fix](nexus) CEO demo QA — dark mode alignment, Workbook rebrand, CSS var fixes (2026-02-15) `153377a`
- [x] [fix](nexus) remove screen zoom/magnify animation on click (2026-02-15) `4fcd9db`
- [x] [fix](nexus) update sidebar/nav test counts for workspaces addition (2026-02-15) `698c872`
- [x] [feat](nexus) implement TASK-002 through TASK-010 audit items (2026-02-15) `1c3b89a`
- [x] PRD: CLI Task Tracker [prd-cli-task-tracker.md] (2026-02-14)
- [x] Platform Quality Upgrade — Implementation Plan (2026-02-14)
- [x] [docs] update agent-browser skill for v0.10 (2026-02-13) `388860c`
- [x] [docs] add new project setup guide for Continuous Claude (2026-02-13) `c0634b7`
- [x] [feat] v3.0 production-grade presentation (2026-02-11) `d0afba5`
- [x] [feat] premium production polish v2.0 (2026-02-11) `bdcac09`
- [x] Major update: reframe narrative with Continuous Claude as headline (2026-02-11) `7b41781`
- [x] [fix] restructure skills with YAML frontmatter + add orchestrator skill (2026-02-11) `07e775e`
- [x] [feat] expand content library to 34 docs (43K words) + Claude.ai project + Phase 2 doc (2026-02-11) `3b6baf2`
- [x] [fix] accept both v1.0 and v2.0 Azure AD token formats (2026-02-11) `2a86e03`
- [x] [fix] override correct method (load_access_token) for debug logging (2026-02-11) `0ecd3dc`
- [x] [fix] set accessTokenAcceptedVersion=2 and add debug JWT logging (2026-02-11) `07cfb64`
- [x] [fix] use custom app scope so Azure AD token audience matches our app (2026-02-11) `81ba563`
- [x] [fix] harden knowledge tree reliability (2026-02-11) `36fb119`
- [x] [fix] strip resource param from Azure AD authorize URL (2026-02-11) `d4c1663`
- [x] [fix] use httpx directly for Notion API (notion-client v2.7 lacks query) (2026-02-11) `d716ec2`
- [x] [docs] add Streamdown implementation guide (2026-02-10) `0fbd8be`
- [x] [fix] 6 hooks output valid JSON instead of raw text to stdout (2026-02-10) `9819347`
- [x] [fix] task-router hook outputs valid JSON instead of mixed stdout (2026-02-10) `1de6398`
- [x] [docs] add Edge CDP browser automation setup guide (2026-02-10) `3908973`
- [x] [feat] fast PageIndex search via FTS + hybrid RRF (2026-02-10) `1729de4`
- [x] [fix] PageIndex CLI Windows compatibility and project root detection (2026-02-09) `ddd84b7`
- [x] [docs] add Ralph quickstart guide (2026-02-09) `c4f916e`
- [x] Knowledge tree & ROADMAP audit + repair (2026-02-09)
- [x] Comprehensive README update with Ralph, browser automation, and corrected counts (2026-02-09) ed034eb
- [x] Ralph 8-phase scale hardening for 100+ task reliability (2026-02-07) cc4fe68
- [x] PRD-001: Session Status Dashboard [PRD-001-session-status-dashboard.md] (2026-02-05)
- [x] Agent Integration [PRD-004] (2026-02-04)
- [x] Dark Mode [PRD-003] (2026-02-04)
- [x] Decisions Filter [PRD-002] (2026-02-04)
- [x] Actions Kanban Board [PRD-001] (2026-02-04)
- [x] ROADMAP as Source of Truth Implementation (2026-02-03)
- [x] Git commit ROADMAP sync hook (2026-02-03)
- [x] ROADMAP auto-update mechanism fix (2026-02-03)
- [x] Memory & Braintrust systems health check (2026-02-03)
- [x] Agent delegation improvements (2026-02-02)
- [x] Documentation consolidation (2026-02-02)
- [x] Memory system performance optimization (2026-02-02)
- [x] Finalize session isolation patterns (2026-02-02)
- [x] Complete stress testing for enforcer hooks (2026-02-02)
- [x] Hook System Improvements (2026-02-02)
- [x] Core memory system with PostgreSQL + pgvector (2026-01)
- [x] Defense-in-depth extraction architecture (2026-01)
- [x] Session hooks infrastructure (2026-01)
- [x] Skill system with v5 hybrid format (2026-01)
- [x] Agent orchestration (maestro, ralph workflows) (2026-01)
- [x] Knowledge tree integration (2026-01)
- [x] Cross-terminal coordination database (2026-01)
- [x] Memory unit tests in opc/tests/ (2026-02)

## Planned
- [ ] PRD: Continuous Claude Platform Optimization [prd-platform-optimization.md] (normal)
_No planned items yet._

## Recent Planning Sessions
### 2026-03-09: Deep Review: Zombie Process Cleanup + ROADMAP Fix — Hardening Pass
**Summary:** Deep review of the implementation completed earlier this session. Two independent scouts audited every file and found **2 HIGH**, **2 MEDIUM**, and several LOW issues that need fixing to ensure reliability across all projects.

**Key Decisions:**
- Zero cross-project contamination in any of 12 project ROADMAPs checked
- Problem: `findstr ":${port}"` is substring — matches `:30020` when looking for `:3002`.
- Fix: Replace the netstat parsing with a post-filter that validates the exact port:
- Problem: `kill -TERM -${pid}` sends to process group, which only works if process is group leader. `npx` is typically NOT a group leader.
- Fix: Replace the Unix branch with positive-PID kill + child process cleanup:

**Files:** path.join, package.json, npx.cmd, post-plan-roadmap.ts, dev-cleanup.mjs, C:/Users/david.hayes/Projects/NorthStar Transformation/scripts/dev-cleanup.mjs, dev-start.mjs, C:/Users/david.hayes/Projects/NorthStar Transformation/scripts/dev-start.mjs

### 2026-03-07: Add Mixed Background Design Elements to CCv3 Light Landing Page
**Key Decisions:**
- Target: Hero section (3W-0)
- Target: Problem (46-0) / Solution (4E-0) area
- Target: Stats row (4N-0)
- Applied via update_styles background property or wrapper div
- Target: Feature cards area (57-0 through 6A-0)
- Target: Hero section (3W-0)
- Technique: Two large soft radial gradient circles floating behind the headline
- Orb 1: ~500px, radial-gradient teal rgba(13,148,136,0.08), top-right area
- Orb 2: ~400px, radial-gradient warm peach rgba(251,191,146,0.07), bottom-left area
- Absolute positioned divs, pointer-events: none

### 2026-03-05: LinkMap Code Review, Refactor & Cleanup
**Key Decisions:**
- Overall assessment: Strong codebase (B+/A-). Clean architecture, solid state management, comprehensive features. Issues are mostly dead code, inconsistent error handling, and minor robustness gaps.
- `chrome.windows.getCurrent()` resolves async, but `handleStateUpdate()` can fire before it resolves
- Fix:: Await the window query before requesting state, or gate first render on both being ready:
- Fix:: Generate labels from render order, not sorted order
- Fix:: Add `if (!name || !name.trim()) return;` guards

### 2026-03-01: PPTX Design Revolution — From Corporate Template to Agency-Quality
**Key Decisions:**
- The fundamental issue: Every slide uses the same 2-3 visual primitives (glass card, dark gradient, teal accent) with no variation in composition, scale drama, or information design. The result is monotonous and flat — the visual equivalent of a monotone speaker.
- Fix: Introduce 4-5 DISTINCT container styles. Glass cards should be ONE option, not the default for everything.
- Fix: Create "hero metric" compositions where the number dominates 60%+ of the visual space.
- Fix: Build shape-based visualizations that don't depend on python-pptx chart objects.
- Fix: Introduce 3-4 distinct layout archetypes that rotate through the deck.

### 2026-02-28: Fourth Presentation Suite — Premium Visual Upgrade (v4)
**Key Decisions:**
- Gap: The current PPTX looks good but not *agency-quality*. Missing: gradient area charts, pill badges, thin divider lines, teal checkmarks, left-accent cards, and a new roadmap slide type.
- Goal: Implement premium design primitives and new slide types so the PPTX output matches the reference images — ready to present in boardrooms.
- Find/create `<c:spPr>` under the `<c:ser>` element
- Build: `<c:symbol val="circle"/>`, `<c:size val="8"/>`, `<c:spPr>` with fill + line
- Create `XL_CHART_TYPE.AREA` chart via existing `_add_category_chart`
