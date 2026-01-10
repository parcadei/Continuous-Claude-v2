# Fix Workflows by Scope

## bug

```
sleuth (investigation)
  |
[HUMAN CHECKPOINT: diagnosis]
  |
[PREMORTEM: quick risk check]
  |
kraken (implement_task + TDD)
  |
kraken (regression test)
  |
[HUMAN CHECKPOINT: verification]
  |
commit
```

## hook

```
debug-hooks (structured investigation)
  |
[HUMAN CHECKPOINT: diagnosis]
  |
[PREMORTEM: quick risk check]
  |
kraken (implement_task + hook-developer patterns)
  |
test hook manually
  |
[HUMAN CHECKPOINT: verification]
  |
commit
```

## deps

```
dependency-preflight
  |
oracle (find versions)
  |
plan-agent
  |
[HUMAN CHECKPOINT: plan review]
  |
[PREMORTEM]
  |
kraken (implement_plan)
  |
qlty-check
  |
[HUMAN CHECKPOINT: verification]
  |
commit
```

## pr-comments

```
github-search (fetch PR context)
  |
research-codebase
  |
plan-agent
  |
[HUMAN CHECKPOINT: plan review]
  |
[PREMORTEM]
  |
kraken (implement_plan)
  |
[HUMAN CHECKPOINT: verification]
  |
commit (reference PR comments)
```

## Error Handling

| Error | Action |
|-------|--------|
| Investigation finds nothing | Ask user for more context |
| User rejects diagnosis | Refine hypothesis |
| Fix breaks other tests | Rollback, refine |
| User rejects verification | Offer revert or adjust |
