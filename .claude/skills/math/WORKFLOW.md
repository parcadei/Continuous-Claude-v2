# Math Skills Development Workflow

How we built this system and how to extend it.

## Philosophy: Cognitive Prosthetics

LLMs make arithmetic errors. These tools don't replace thinking—they augment it:

- **SymPy**: Exact symbolic computation (no floating point drift)
- **Z3**: Exhaustive constraint checking
- **Lean 4**: Compiler IS the proof checker

## Development Pattern: TDD with Agents

We use Test-Driven Development with agent orchestration:

```
1. Research     → NIA/WebFetch for API docs
2. Plan         → Write plan in thoughts/shared/plans/
3. Red          → Write failing tests FIRST
4. Green        → Implement to pass tests
5. Review       → Agent reviews implementation
6. Regenerate   → Update skills with new capabilities
```

## Why Agent Orchestration?

**Problem:** Reading files burns main context (2000+ tokens per file)

**Solution:** Spawn agents that work in isolated context

```
Main: "Implement eigenvectors"
      ↓
Agent: Reads files → Writes code → Runs tests → Returns summary
      ↓
Main: Gets 200-token summary (not 2000+ token transcript)
```

## Key Decisions Log

| Decision                   | Why                                | Alternative Rejected       |
| -------------------------- | ---------------------------------- | -------------------------- |
| Lean 4 for category theory | Z3 can't do abstract algebra       | Keep broken Z3 commands    |
| Remove Key Techniques      | RAG chunks were noisy              | Jury pattern (too complex) |
| SymPy over NumPy           | Exact symbolic, not floating point | Numerical approximations   |
| Compiler-in-the-loop       | Lean compiler = proof verifier     | Manual proof checking      |

## Extending the System

### Add New SymPy Command

1. Write failing test in `tests/unit/test_sympy_compute.py`
2. Implement function in `scripts/sympy_compute.py`
3. Add CLI subparser
4. Wire in `main()` dispatch
5. Update skills that reference it

### Add New Math Skill

1. Add topic to `MATH_TOPICS` in generator
2. Add decision tree to `DECISION_TREES`
3. Add tool commands to `TOOL_COMMANDS`
4. Run: `uv run python scripts/generate_math_skills.py --tier N`

## Session Continuity

Before clearing context:

1. Update ledger: `thoughts/ledgers/CONTINUITY_CLAUDE-<session>.md`
2. Create handoff: `thoughts/shared/handoffs/<session>/`
3. Mark checkboxes for completed phases

After resuming:

1. SessionStart hook loads ledger automatically
2. Find `[→]` to see current phase
3. Continue from where you left off
