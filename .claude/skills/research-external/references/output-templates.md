# Research External: Output Templates

Two output formats produced by the `research-external` skill.

---

## Template 1: `doc` — Research Document

**Path:** `thoughts/shared/research/YYYY-MM-DD-{topic-slug}.md`

~~~markdown
---
date: {ISO timestamp}
type: external-research
topic: "{topic}"
focus: {focus}
sources: [nia, perplexity, firecrawl]
status: complete
---

# Research: {Topic}

## Summary
{2-3 sentence summary of findings}

## Key Findings

### Library Documentation
{From nia-docs - API references, usage patterns}

### Best Practices (2024-2025)
{From perplexity - recommended approaches}

### Code Examples
```{language}
// Working examples found
```

## Recommendations
- {Recommendation 1}
- {Recommendation 2}

## Pitfalls to Avoid
- {Pitfall 1}
- {Pitfall 2}

## Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| {Option 1} | ... | ... |

## Sources
- [{Source 1}]({url1})
- [{Source 2}]({url2})
~~~

**Status values:**
- `complete` — All requested tools succeeded
- `partial` — Some tools failed, findings still useful
- `failed` — No useful results obtained

---

## Template 2: `handoff` — Implementation Handoff YAML

**Path:** `thoughts/shared/handoffs/{session}/research-{topic-slug}.yaml`

```yaml
---
type: research-handoff
ts: {ISO timestamp}
topic: "{topic}"
focus: {focus}
status: complete
---

goal: Research {topic} for implementation planning
sources_used: [nia, perplexity, firecrawl]

findings:
  key_concepts:
    - {concept1}
    - {concept2}

  code_examples:
    - pattern: "{pattern name}"
      code: |
        // example code

  best_practices:
    - {practice1}
    - {practice2}

  pitfalls:
    - {pitfall1}

recommendations:
  - {rec1}
  - {rec2}

sources:
  - title: "{Source 1}"
    url: "{url1}"
    type: {documentation|article|reference}

for_plan_agent: |
  Based on research, the recommended approach is:
  1. {Step 1}
  2. {Step 2}
  Key libraries: {lib1}, {lib2}
  Avoid: {pitfall1}
```

---

## Error Annotation

When tools fail, annotate the output with tool status:

```yaml
tool_status:
  nia: success
  perplexity: failed (rate limited)
  firecrawl: skipped
```

And add a gaps section to the doc:

```markdown
## Gaps
- Perplexity unavailable - best practices section limited to nia results
```
