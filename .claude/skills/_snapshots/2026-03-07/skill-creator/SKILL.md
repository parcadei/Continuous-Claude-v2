---
name: skill-creator
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, update or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy. This skill covers the full lifecycle from authoring through validation, testing, optimization, and packaging.
---

# Skill Creator

A skill for creating new skills and iteratively improving them. The full lifecycle:

```
Author -> Validate -> Test -> Optimize -> Package
```

Your job is to figure out where the user is in this process and help them progress. Maybe they want to create from scratch, or maybe they already have a draft and want to jump to eval/iterate. Be flexible -- if they say "just vibe with me", skip the formal eval loop.

## Communicating with the User

Pay attention to context cues about technical familiarity. Terms like "evaluation" and "benchmark" are usually fine; for "JSON" and "assertion", look for cues before using them without explanation. Briefly explain terms if in doubt.

---

## Creating a Skill

### Capture Intent

Start by understanding what the user wants. The conversation might already contain a workflow to capture (e.g., "turn this into a skill"). If so, extract from conversation history first -- tools used, step sequence, corrections made, input/output formats.

1. What should this skill enable Claude to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases? Skills with objectively verifiable outputs (file transforms, data extraction, code generation) benefit from test cases. Subjective skills (writing style, art) often don't. Suggest the appropriate default but let the user decide.

Get 3-5 concrete examples of how the skill would be used before proceeding:
- "Create Q4 budget template with Fourth branding"
- "Generate P&L report in our standard format"
- "Build sales dashboard with Fourth colors and logo"

### Plan Reusable Resources

For each example, analyze:
1. What needs to be done from scratch each time?
2. What can be reused (scripts, templates, documentation)?
3. What would make execution faster and more reliable?

If all test cases independently write similar helper scripts, that's a strong signal to bundle the script. Write it once, put it in `scripts/`, and instruct the skill to use it.

**Deliverable**: A list of resources to include -- scripts, references, and assets.

### Initialize

Scaffold the skill directory. Use `scripts/init_skill.py` for automated scaffolding:

```bash
python scripts/init_skill.py my-skill-name --path ~/.claude/skills/
```

Or create manually:

```bash
mkdir -p .claude/skills/your-skill-name/{scripts,references,assets}
```

Delete unused directories -- don't include empty `scripts/`, `references/`, or `assets/` folders.

### Write the SKILL.md

Based on the user interview, fill in:

- **name**: Skill identifier (kebab-case, max 64 chars)
- **description**: When to trigger, what it does. This is the primary triggering mechanism. Include both what the skill does AND specific contexts for when to use it. Currently Claude tends to "undertrigger" -- make descriptions slightly "pushy". Example: instead of "How to build a dashboard", write "How to build a dashboard. Use this skill whenever the user mentions dashboards, data visualization, or wants to display any kind of data, even if they don't explicitly ask for a 'dashboard.'"
- **compatibility**: Required tools/dependencies (optional, rarely needed)

#### Skill Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
```

#### Progressive Disclosure

Skills use three-level loading:
1. **Metadata** (name + description) -- Always in context (~100 words)
2. **SKILL.md body** -- When skill triggers (<500 lines ideal)
3. **Bundled resources** -- As needed (scripts can execute without loading)

Key patterns:
- Keep SKILL.md under 500 lines; if approaching, add hierarchy with clear pointers
- Reference files clearly with guidance on when to read them
- For large reference files (>300 lines), include a table of contents

**Domain organization** -- when supporting multiple variants:
```
cloud-deploy/
├── SKILL.md (workflow + selection)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```
Claude reads only the relevant reference file.

#### Writing Patterns

Use imperative form in instructions. Explain the **why** behind everything -- today's LLMs are smart and respond better to reasoning than heavy-handed MUSTs. If you find yourself writing ALWAYS or NEVER in all caps, reframe and explain the reasoning instead.

**Defining output formats:**
```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**Examples pattern:**
```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

See `references/authoring-guide.md` for full templates and worked examples (Excel skill, meeting notes skill, platform API details).

### Draft Test Cases

After writing the skill draft, create 2-3 realistic test prompts. Share with the user for confirmation, then run them.

Save to `evals/evals.json`:
```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

See `references/schemas.md` for full schema including the `assertions` field.

---

## Running and Evaluating Test Cases

This section is one continuous sequence. Put results in `<skill-name>-workspace/` as a sibling to the skill directory. Within the workspace, organize by iteration (`iteration-1/`, `iteration-2/`, etc.) and each test case gets a directory (`eval-0/`, etc.).

### Step 1: Spawn all runs (with-skill AND baseline) in the same turn

For each test case, spawn two subagents -- one with the skill, one without. Launch everything at once.

**With-skill run:**
```
Execute this task:
- Skill path: <path-to-skill>
- Task: <eval prompt>
- Input files: <eval files if any, or "none">
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
```

**Baseline run** (same prompt, depends on context):
- **New skill**: no skill at all. Save to `without_skill/outputs/`.
- **Improving existing**: snapshot the old version first, point baseline at snapshot. Save to `old_skill/outputs/`.

Write `eval_metadata.json` for each test case with a descriptive name.

### Step 2: While runs are in progress, draft assertions

Don't wait -- use this time productively. Draft quantitative assertions with descriptive names that read clearly in the benchmark viewer. Subjective skills are better evaluated qualitatively.

Update `eval_metadata.json` and `evals/evals.json` with assertions.

### Step 3: As runs complete, capture timing data

When each subagent completes, save `total_tokens` and `duration_ms` to `timing.json` immediately -- this data comes through the task notification and isn't persisted elsewhere.

### Step 4: Grade, aggregate, and launch the viewer

Once all runs are done:

1. **Grade each run** -- spawn a grader (read `agents/grader.md`). Save to `grading.json`. The expectations array must use fields `text`, `passed`, and `evidence`. For programmatically checkable assertions, write a script.

2. **Aggregate into benchmark:**
   ```bash
   python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>
   ```

3. **Analyst pass** -- read `agents/analyzer.md` ("Analyzing Benchmark Results" section) to surface hidden patterns.

4. **Launch the viewer:**
   ```bash
   nohup python <skill-creator-path>/eval-viewer/generate_review.py \
     <workspace>/iteration-N \
     --skill-name "my-skill" \
     --benchmark <workspace>/iteration-N/benchmark.json \
     > /dev/null 2>&1 &
   VIEWER_PID=$!
   ```
   For iteration 2+, pass `--previous-workspace <workspace>/iteration-<N-1>`.

   **Cowork / headless:** Use `--static <output_path>` for standalone HTML.

5. **Tell the user** the viewer is open with two tabs: "Outputs" for qualitative review with feedback, "Benchmark" for quantitative comparison.

### Step 5: Read the feedback

When done, read `feedback.json`. Empty feedback = user thought it was fine. Focus improvements on test cases with specific complaints. Kill the viewer server when done.

---

## Improving the Skill

This is the heart of the loop.

1. **Generalize from feedback.** The goal is skills that work across many prompts, not just these test cases. Rather than fiddly overfitty changes, try different metaphors or patterns.

2. **Keep the prompt lean.** Read transcripts, not just final outputs -- if the skill makes the model waste time on unproductive paths, remove those parts.

3. **Explain the why.** Transmit understanding into the instructions. Frame reasoning so the model understands importance rather than rigid ALWAYS/NEVER rules.

4. **Look for repeated work.** If all test runs independently wrote similar helper scripts, bundle that script in `scripts/`.

### The Iteration Loop

1. Apply improvements to the skill
2. Rerun all test cases into `iteration-<N+1>/`, including baselines
3. Launch reviewer with `--previous-workspace`
4. Wait for user review
5. Read feedback, improve again, repeat

Keep going until the user is happy, feedback is all empty, or you're not making progress.

---

## Advanced: Blind Comparison

For rigorous A/B comparison between skill versions, read `agents/comparator.md` and `agents/analyzer.md`. An independent agent judges two outputs blind, then analyzes why the winner won. Optional -- most users won't need it.

---

## Description Optimization

After creating or improving a skill, offer to optimize the description for better triggering accuracy.

### Step 1: Generate trigger eval queries

Create 20 queries -- mix of should-trigger and should-not-trigger. Make them realistic with file paths, personal context, column names, casual speech, typos.

For **should-trigger** (8-10): different phrasings, cases where user doesn't name the skill explicitly, uncommon use cases.

For **should-not-trigger** (8-10): near-misses sharing keywords but needing something different. Avoid obviously irrelevant queries.

### Step 2: Review with user

Present via `assets/eval_review.html` template (replace placeholders `__EVAL_DATA_PLACEHOLDER__`, `__SKILL_NAME_PLACEHOLDER__`, `__SKILL_DESCRIPTION_PLACEHOLDER__`). User edits/exports to `eval_set.json`.

### Step 3: Run the optimization loop

```bash
python -m scripts.run_loop \
  --eval-set <path-to-trigger-eval.json> \
  --skill-path <path-to-skill> \
  --model <model-id-powering-this-session> \
  --max-iterations 5 \
  --verbose
```

This handles 60/40 train/test split, 3x evaluation per query, extended-thinking improvement proposals, and iterative optimization. Returns JSON with `best_description`.

### Step 4: Apply the result

Update SKILL.md frontmatter with `best_description`. Show user before/after and report scores.

---

## Validation and Packaging

### Validate

Run validation before packaging or as a quality check:

```bash
python -m scripts.quick_validate <path/to/skill-folder>
```

Checks: SKILL.md existence, frontmatter (allowed properties, name format, description length/triggers), unfinished markers, word count, file path references, script validation, examples.

### Package

```bash
python -m scripts.package_skill <path/to/skill-folder> [output-dir]
```

Creates a `.skill` file (zip format). Validates first, excludes system files, reports package size. Warns if >10MB.

### Initialize new skills

```bash
python scripts/init_skill.py <skill-name> --path <parent-dir>
```

Scaffolds directory with SKILL.md template, example script, reference, and asset.

---

## Platform Adaptations

### Claude.ai

Core workflow is the same but without subagents:
- **Test cases**: Run them yourself one at a time (less rigorous but useful sanity check). Skip baselines.
- **Review**: If no browser, present results directly in conversation. Ask for feedback inline.
- **Benchmarking**: Skip quantitative -- focus on qualitative feedback.
- **Description optimization**: Requires `claude` CLI. Skip on Claude.ai.
- **Blind comparison**: Requires subagents. Skip.
- **Packaging**: `package_skill.py` works anywhere with Python.

### Cowork

- Subagents available -- main workflow works (spawn parallel, baselines, grade).
- No browser -- use `--static <output_path>` for eval viewer HTML.
- GENERATE THE EVAL VIEWER BEFORE evaluating results yourself. Get them in front of the human ASAP.
- Feedback via downloaded `feedback.json` file.

See `references/authoring-guide.md` for platform API details (beta headers, Files API, upload flow).

---

## Reference Index

| Resource | Purpose |
|----------|---------|
| `agents/grader.md` | Evaluate assertions against outputs |
| `agents/comparator.md` | Blind A/B comparison |
| `agents/analyzer.md` | Post-comparison analysis + benchmark patterns |
| `references/schemas.md` | JSON schemas for evals, grading, benchmark, etc. |
| `references/authoring-guide.md` | Templates, worked examples, platform API, troubleshooting |
| `scripts/init_skill.py` | Scaffold new skill directory |
| `scripts/quick_validate.py` | Validate skill quality |
| `scripts/package_skill.py` | Package as .skill file |
| `scripts/run_eval.py` | Run trigger-detection evals |
| `scripts/run_loop.py` | Full description optimization loop |
| `scripts/aggregate_benchmark.py` | Aggregate grading into benchmark stats |
| `scripts/generate_report.py` | HTML report for optimization iterations |
| `scripts/improve_description.py` | Claude-powered description improvement |
| `eval-viewer/generate_review.py` | Launch interactive eval viewer |
| `assets/eval_review.html` | Trigger eval set editor template |

---

The core loop, one more time:

1. Figure out what the skill is about
2. Draft or edit the skill
3. Run claude-with-access-to-the-skill on test prompts
4. Evaluate outputs with the user (create benchmark, launch `eval-viewer/generate_review.py`)
5. Improve the skill based on feedback
6. Repeat until satisfied
7. Package the final skill
