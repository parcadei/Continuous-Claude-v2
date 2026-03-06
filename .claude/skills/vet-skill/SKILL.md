---
name: vet-skill
description: Vet external skills installed from skills.sh through structural validation, trigger accuracy evaluation, optimization, and automatic registration into skill-rules.json. Use when a new skill is installed via npx skills add, when re-vetting an existing skill, or when bulk-vetting all unvetted skills.
---

# Vet Skill Pipeline

Validates and registers external skills from skills.sh into the local skill-rules.json routing table. The pipeline ensures that only skills with acceptable trigger accuracy get registered, and assigns trust tiers based on evaluation scores.

## When to Use

- A new external skill was installed via `npx skills add <name>`
- Re-vetting a skill after its SKILL.md was updated
- Bulk vetting all unvetted skills with `--all-unvetted`
- Manually vetting a skill that was copied into `~/.claude/skills/`

## Arguments

| Argument | Description |
|----------|-------------|
| `<skill-name>` | Name of a single skill to vet (directory name under `~/.claude/skills/`) |
| `--all-unvetted` | Find and vet all skills not yet registered in skill-rules.json |

## Pipeline Steps

### Step 1: Read the Skill

READ the target SKILL.md from `~/.claude/skills/<skill-name>/SKILL.md`.

If the file does not exist, report an error and stop. Extract the frontmatter (name, description) and body content for use in subsequent steps.

### Step 2: Structural Validation

RUN the structural validator:

```bash
python ~/.claude/skills/skill-creator/scripts/quick_validate.py --skill-path ~/.claude/skills/<skill-name>/SKILL.md
```

- If validation **FAILS**: report the specific errors to the user and **STOP**. Do NOT proceed to registration. The skill must be fixed first.
- If validation **PASSES**: continue to Step 3.

### Step 3: Check Trusted Publisher

READ `~/.claude/skills/trusted-publishers.json` to get the list of trusted organizations.

Determine the skill's source organization:
- Check `~/.claude/skills/<skill-name>/package.json` for `author` or `repository` fields
- Check any lock file or install metadata for the source org
- Extract the org name (e.g., `vercel-labs` from `github.com/vercel-labs/skills`)

If the org matches a trusted publisher:
1. RUN `python ~/.claude/skills/vet-skill/scripts/extract_triggers.py --skill-path ~/.claude/skills/<skill-name>/SKILL.md`
2. Register at tier `"trusted"` with priority `"high"`
3. Skip Steps 4-7 and go directly to Step 8
4. **DONE** -- trusted publishers bypass full evaluation

If NOT trusted or org cannot be determined: continue to Step 4.

### Step 4: Generate Evaluation Queries

Using extended thinking, generate 20 evaluation queries:

**10 should-trigger queries** -- realistic prompts that match the skill's domain:
- Include casual phrasing ("hey can you help me with...")
- Include formal phrasing ("Please generate a...")
- Include prompts with file paths ("...for src/components/Header.tsx")
- Include prompts with typos or abbreviations
- Cover different aspects of the skill's functionality

**10 should-not-trigger queries** -- near-miss prompts that share keywords but have different intent:
- Same domain keywords but different action (e.g., "review" vs "create")
- Adjacent topics the skill should NOT handle
- Generic requests that happen to mention relevant terms
- Prompts better served by a different skill

Write the eval set to `~/.claude/skills/<skill-name>/eval_set.json`:

```json
{
  "queries": [
    {"query": "Can you help me design a responsive navbar?", "should_trigger": true},
    {"query": "Review this CSS for accessibility issues", "should_trigger": false}
  ]
}
```

### Step 5: Run Trigger Evaluation

RUN the evaluation harness:

```bash
python ~/.claude/skills/skill-creator/scripts/run_eval.py \
  --eval-set ~/.claude/skills/<skill-name>/eval_set.json \
  --skill-path ~/.claude/skills/<skill-name>/ \
  --runs-per-query 3 \
  --max-workers 10
```

This tests whether the skill's description correctly triggers Claude to read it for each query. Multiple runs per query reduce variance.

### Step 6: Analyze Results

Score the evaluation results:

| Accuracy | Tier | Priority | Action |
|----------|------|----------|--------|
| >= 90% | `verified` | `high` | Register directly |
| >= 70% | `vetted` | `medium` | Register directly |
| < 70% | -- | -- | Proceed to Step 7 (optimization) |

Accuracy is calculated as: (correct predictions) / (total predictions) across all runs.

Also compute:
- **Precision**: true positives / (true positives + false positives) -- how often trigger was correct
- **Recall**: true positives / (true positives + false negatives) -- how many real triggers were caught

### Step 7: Optimization (only if accuracy < 70%)

RUN the optimization loop to improve the skill's description:

```bash
python ~/.claude/skills/skill-creator/scripts/run_loop.py \
  --eval-set ~/.claude/skills/<skill-name>/eval_set.json \
  --skill-path ~/.claude/skills/<skill-name>/ \
  --max-iterations 5
```

This iteratively rewrites the skill's frontmatter description to improve trigger accuracy.

After optimization, re-score:
- accuracy >= 70%: tier = `"vetted"`, priority = `"medium"`
- accuracy < 70%: tier = `"provisional"`, priority = `"low"` -- warn the user that this skill has poor trigger accuracy and may fire incorrectly

### Step 8: Generate skill-rules.json Entry

Build the registration entry using this schema:

```json
{
  "type": "domain",
  "enforcement": "suggest",
  "priority": "<high|medium|low based on tier>",
  "description": "<from SKILL.md frontmatter description>",
  "promptTriggers": {
    "keywords": ["<from extract_triggers.py output>"],
    "intentPatterns": ["<from extract_triggers.py output>"]
  },
  "source": {
    "registry": "skills.sh",
    "repo": "<from lock file or install source>",
    "installedAt": "<ISO 8601 timestamp>",
    "trustTier": "<trusted|verified|vetted|provisional>",
    "evalScores": {
      "triggerAccuracy": 0.85,
      "triggerPrecision": 0.90,
      "triggerRecall": 0.80,
      "optimizationIterations": 0,
      "evalDate": "<ISO 8601 timestamp>"
    }
  }
}
```

For trusted publishers, set `evalScores` to `null` (evaluation was skipped).

### Step 9: Register the Skill

RUN registration:

```bash
python ~/.claude/skills/vet-skill/scripts/register_skill.py \
  --rules-path ~/.claude/skills/skill-rules.json \
  --skill-name "<skill-name>" \
  --entry '<json string from Step 8>'
```

This atomically updates skill-rules.json with the new entry.

### Step 10: Report Results

Present a summary to the user:

```
Skill: <name>
Tier: <trusted|verified|vetted|provisional>
Accuracy: <X%> (precision: Y%, recall: Z%)
Optimization: <N iterations | skipped>
Status: Registered in skill-rules.json
```

If tier is `provisional`, include a warning:
> This skill has low trigger accuracy (<70%). It may fire on unrelated prompts or miss relevant ones. Consider improving the skill's description or narrowing its scope.

## Bulk Mode (`--all-unvetted`)

When invoked with `--all-unvetted`:

1. READ `~/.claude/skills/skill-rules.json` to get the set of already-registered skill names
2. LIST all directories in `~/.claude/skills/`
3. For each directory that contains a `SKILL.md`:
   - Skip if the skill name is already in skill-rules.json
   - Skip if the skill is clearly internal (created by the user, no source in any lock file or package.json) -- use heuristics: no `package.json`, no `.git`, directory name matches a known internal skill pattern
   - Otherwise, run the full pipeline (Steps 1-10)
4. Report a summary table of all vetted skills and their tiers

## Trust Tier Reference

| Tier | Accuracy Threshold | Priority | Description |
|------|-------------------|----------|-------------|
| `trusted` | N/A (publisher-based) | `high` | From a trusted publisher org. Skips evaluation. |
| `verified` | >= 90% | `high` | Passed evaluation with high accuracy. Reliable trigger behavior. |
| `vetted` | >= 70% | `medium` | Passed evaluation with acceptable accuracy. May occasionally misfire. |
| `provisional` | < 70% (after optimization) | `low` | Poor trigger accuracy even after optimization. Use with caution. |
| `rejected` | Fails structural validation | N/A | Did not pass basic validation. Not registered. |

## Notes

- The pipeline is idempotent: re-running on an already-registered skill overwrites the existing entry
- Evaluation requires the `anthropic` Python package and a valid API key
- Optimization modifies the skill's SKILL.md frontmatter description in place
- The eval_set.json is preserved for future re-evaluation
- All scripts use `python` (not `python3`) for Windows compatibility
