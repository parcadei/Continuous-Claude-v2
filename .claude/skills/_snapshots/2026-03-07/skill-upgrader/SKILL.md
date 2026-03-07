---
name: skill-upgrader
description: Upgrade any skill to v5 Hybrid format using decision theory + modal logic
allowed-tools: [Bash, Read, Write, Edit, Task, Glob, Grep]
---

# Skill Upgrader

Meta-skill that upgrades any SKILL.md to Decision Theory v5 Hybrid format using 4 parallel Ragie-backed agents.

## When to Use

- "Upgrade this skill to v5"
- "Formalize this skill with decision theory"
- "Add MDP structure to this skill"
- "Apply the skill-upgrader to X"

## Prerequisites

Ragie RAG with indexed books:
- **decision-theory partition**: LaValle Planning Algorithms, Sutton & Barto RL
- **modal-logic partition**: Blackburn Modal Logic, Huth & Ryan Logic in CS

## Workflow

### Step 1: Setup Session

```bash
SESSION=$(date +%Y%m%d-%H%M%S)-upgrade-{skill_name}
mkdir -p thoughts/skill-builds/${SESSION}
```

### Step 2: Initialize Blackboard

Create `thoughts/skill-builds/{session}/00-blackboard.md`:

```markdown
# Skill Upgrade: {skill_name}
Started: {timestamp}

## Input Skill
{path_to_skill}

## Target Format
Decision Theory v5 Hybrid

## Agent Findings
(Agents append below)

---
```

### Step 3: Launch 4 Agents in Parallel

Use Task tool to spawn all 4 agents simultaneously. Each agent:
1. Reads the input skill
2. Queries Ragie for their specific book
3. Appends findings to the blackboard

---

## Agent 1: LaValle Planner

**Book:** LaValle's "Planning Algorithms" (decision-theory partition)
**Focus:** States, Actions, Transitions

```
Task(
  subagent_type="general-purpose",
  prompt="""
INPUT SKILL: {path}
BLACKBOARD: thoughts/skill-builds/{session}/00-blackboard.md

YOUR BOOK: LaValle's "Planning Algorithms" in Ragie partition 'decision-theory'

TASK: Identify MDP structure in the skill.

Query Ragie:
```bash
uv run python scripts/ragie_query.py -q "MDP state space definition" -p decision-theory
uv run python scripts/ragie_query.py -q "action space sequential decisions" -p decision-theory
uv run python scripts/ragie_query.py -q "POMDP partial observability" -p decision-theory
```

Read the input skill and answer:
1. What are the STATES? (phases, modes, tracked info)
2. What are the ACTIONS? (what can agent do in each state)
3. How do TRANSITIONS work? (deterministic or stochastic)
4. Is this POMDP or fully observable?

WRITE to blackboard section: ## Agent 1: States, Actions & Transitions

Format as plain English with LaValle chapter citations.
"""
)
```

---

## Agent 2: Sutton & Barto Optimizer

**Book:** Sutton & Barto's "Reinforcement Learning" (decision-theory partition)
**Focus:** Policy, Termination, Value
**Depends on:** Agent 1

```
Task(
  subagent_type="general-purpose",
  prompt="""
INPUT SKILL: {path}
BLACKBOARD: thoughts/skill-builds/{session}/00-blackboard.md

YOUR BOOK: Sutton & Barto's "Reinforcement Learning" in Ragie partition 'decision-theory'

WAIT: Read Agent 1's findings from blackboard first.

TASK: Design policy and termination conditions.

Query Ragie:
```bash
uv run python scripts/ragie_query.py -q "policy deterministic stochastic" -p decision-theory
uv run python scripts/ragie_query.py -q "episodic termination conditions" -p decision-theory
uv run python scripts/ragie_query.py -q "reward function design" -p decision-theory
```

Using Agent 1's states and actions, answer:
1. What's the POLICY? (state → action rules)
2. When does it END? (terminal states, success/failure)
3. What are REWARDS? (goals +, costs -)
4. Which states are HIGH/LOW value?

WRITE to blackboard section: ## Agent 2: Policy & Values

Format as plain English with Sutton & Barto section citations.
"""
)
```

---

## Agent 3: Blackburn Modal Logician

**Book:** Blackburn's "Modal Logic" (modal-logic partition)
**Focus:** Constraints (temporal, epistemic, deontic)

```
Task(
  subagent_type="general-purpose",
  prompt="""
INPUT SKILL: {path}
BLACKBOARD: thoughts/skill-builds/{session}/00-blackboard.md

YOUR BOOK: Blackburn's "Modal Logic" in Ragie partition 'modal-logic'

TASK: Extract constraints from the skill.

Query Ragie:
```bash
uv run python scripts/ragie_query.py -q "temporal logic LTL operators" -p modal-logic
uv run python scripts/ragie_query.py -q "epistemic logic knowledge" -p modal-logic
uv run python scripts/ragie_query.py -q "deontic logic obligations" -p modal-logic
```

Read the input skill and identify:
1. TEMPORAL: "must do X before Y" → □, ◇, U
2. EPISTEMIC: "must know X" → K operator
3. DEONTIC: "must/forbidden/may" → O, F, P
4. DYNAMIC: "action causes effect" → [action]

WRITE to blackboard section: ## Agent 3: Constraints

For each constraint:
- Plain English description
- Modal logic notation
- Why it matters
- Blackburn chapter citation
"""
)
```

---

## Agent 4: Huth & Ryan Verifier

**Book:** Huth & Ryan's "Logic in Computer Science" (modal-logic partition)
**Focus:** Validation, Safety, Liveness
**Depends on:** Agents 1-3

```
Task(
  subagent_type="general-purpose",
  prompt="""
INPUT SKILL: {path}
BLACKBOARD: thoughts/skill-builds/{session}/00-blackboard.md

YOUR BOOK: Huth & Ryan's "Logic in Computer Science" in Ragie partition 'modal-logic'

WAIT: Read Agents 1-3 findings from blackboard first.

TASK: Verify consistency and completeness.

Query Ragie:
```bash
uv run python scripts/ragie_query.py -q "safety properties verification" -p modal-logic
uv run python scripts/ragie_query.py -q "liveness properties eventually" -p modal-logic
uv run python scripts/ragie_query.py -q "model checking CTL" -p modal-logic
```

Check:
1. SAFETY: What bad things never happen? □¬(bad)
2. LIVENESS: What good things eventually happen? ◇(good)
3. CONSISTENCY: Any contradictions between agents?
4. COMPLETENESS: Any gaps in coverage?

WRITE to blackboard section: ## Agent 4: Verification

Report with ✓/✗ for each property.
Overall verdict: PASS or NEEDS_WORK
Huth & Ryan section citations.
"""
)
```

---

## Step 4: Synthesize Final Skill

After all agents complete, read the blackboard and create:

**Output:** `thoughts/skill-builds/{session}/SKILL-upgraded.md`

Use v5 Hybrid template:

```yaml
---
name: {original_name}
description: {original_description}
version: 5.1-hybrid
---

# Option: {name}

## Initiation (I)
[From original + Agent 1 state analysis]

## Observation Space (Y)
[From Agent 1 POMDP analysis]

## Action Space (U)
[From Agent 1 actions]

## Policy (pi)
[From Agent 2 state→action rules]

## Termination (beta)
[From Agent 2 episode structure]

## Q-Heuristics
[From Agent 2 value guidance]

## Constraints
[From Agent 3 modal logic]

## Verification
[From Agent 4 safety/liveness]
```

---

## Example Usage

```
User: "Upgrade .claude/skills/implement_plan/SKILL.md to v5 Hybrid"

Claude:
1. Creates session directory
2. Initializes blackboard
3. Launches 4 agents in parallel (Task tool)
4. Waits for completion
5. Reads blackboard
6. Synthesizes upgraded skill
7. Reports: "Upgraded skill at thoughts/skill-builds/.../SKILL-upgraded.md"
```

## Ragie Query Reference

```bash
# Decision theory partition
uv run python scripts/ragie_query.py -q "your question" -p decision-theory

# Modal logic partition
uv run python scripts/ragie_query.py -q "your question" -p modal-logic

# With reranking for better results
uv run python scripts/ragie_query.py -q "your question" -p decision-theory --rerank
```

## Files Created

After upgrade:
```
thoughts/skill-builds/{session}/
├── 00-blackboard.md      # Agent collaboration
├── SKILL-upgraded.md     # Final v5 Hybrid skill
└── validation-report.md  # Agent 4 verification
```
