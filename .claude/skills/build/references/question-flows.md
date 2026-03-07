# Build Skill — Question Flows

Used when user invokes `/build` with no or partial arguments. Use `AskUserQuestion` for each phase.

## Phase 0: Workflow Selection

```yaml
question: "What would you like to do?"
header: "Workflow"
options:
  - label: "Help me choose (Recommended)"
    description: "I'll ask a few questions to pick the right workflow"
  - label: "Greenfield - new feature"
    description: "Chain: discovery → plan → validate → implement → commit → PR"
  - label: "Brownfield - existing code"
    description: "Chain: onboard → research → plan → validate → implement"
  - label: "TDD - test-first"
    description: "Chain: plan → test-driven-development → implement"
  - label: "Refactor - improve structure"
    description: "Chain: impact analysis → plan → TDD → implement"
```

**Mapping:**
- "Help me choose" → Continue to Phase 1-4 questions
- "Greenfield" → Set mode=greenfield, skip to Phase 5 (description)
- "Brownfield" → Set mode=brownfield, skip to Phase 5 (description)
- "TDD" → Set mode=tdd, skip to Phase 5 (description)
- "Refactor" → Set mode=refactor, skip to Phase 5 (description)

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to understand your workflow needs. Did you mean..."
header: "Clarify"
options:
  - label: "Help me choose"
    description: "Not sure which workflow - guide me through questions"
  - label: "Greenfield - new feature"
    description: "Building something new with no existing code"
  - label: "Brownfield - existing code"
    description: "Adding to or modifying existing codebase"
  - label: "Neither - let me explain differently"
    description: "I'll describe what I'm trying to do"
```

## Phase 1: Project Context

```yaml
question: "Is this a new feature or work in existing code?"
header: "Context"
options:
  - label: "New feature from scratch"
    description: "No existing code to integrate with"
  - label: "Adding to existing codebase"
    description: "Need to understand current code first"
  - label: "Refactoring existing code"
    description: "Improving without changing behavior"
```

**Mapping:**
- "New feature from scratch" → greenfield mode
- "Adding to existing codebase" → brownfield mode
- "Refactoring existing code" → refactor mode

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to make sure I understand. Did you mean..."
header: "Clarify"
options:
  - label: "New feature from scratch"
    description: "Building something new with no existing code"
  - label: "Adding to existing codebase"
    description: "Integrating with code that already exists"
  - label: "Refactoring existing code"
    description: "Improving structure without changing behavior"
  - label: "Neither - let me explain differently"
    description: "I'll provide more details"
```

## Phase 2: Requirements Clarity

```yaml
question: "How clear are your requirements?"
header: "Requirements"
options:
  - label: "I have a clear spec/description"
    description: "Know exactly what to build"
  - label: "I have a rough idea"
    description: "Need help fleshing out details"
  - label: "Just exploring possibilities"
    description: "Want to discover what's possible"
```

**Mapping:**
- "Clear spec" → --skip-discovery
- "Rough idea" → run discovery-interview first
- "Exploring" → run discovery-interview with broader scope

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to make sure I understand your requirements state. Did you mean..."
header: "Clarify"
options:
  - label: "I have a clear spec/description"
    description: "Ready to implement - no discovery needed"
  - label: "I have a rough idea"
    description: "Need some help defining the details"
  - label: "Just exploring possibilities"
    description: "Don't know exactly what's possible yet"
  - label: "Neither - let me explain differently"
    description: "I'll describe my situation better"
```

## Phase 3: Development Approach

```yaml
question: "How should I approach development?"
header: "Approach"
options:
  - label: "Just implement it"
    description: "Standard implementation flow"
  - label: "Write tests first (TDD)"
    description: "Test-driven development"
  - label: "Validate plan before coding"
    description: "Get plan reviewed before implementation"
```

**Mapping:**
- "Just implement" → standard chain
- "Tests first" → tdd mode (overrides previous if not refactor)
- "Validate plan" → keep validate-agent in chain

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to make sure I understand your preferred approach. Did you mean..."
header: "Clarify"
options:
  - label: "Just implement it"
    description: "Standard development - implement then test"
  - label: "Write tests first (TDD)"
    description: "Test-driven - tests before implementation"
  - label: "Validate plan before coding"
    description: "Review plan with validate-agent first"
  - label: "Neither - let me explain differently"
    description: "I have a different workflow in mind"
```

## Phase 4: Post-Implementation

```yaml
question: "What should happen after implementation?"
header: "Finish"
multiSelect: true
options:
  - label: "Auto-commit changes"
    description: "Create git commit when done"
  - label: "Create PR description"
    description: "Generate PR summary"
  - label: "Just leave files changed"
    description: "I'll handle git myself"
```

**Mapping:**
- No "Auto-commit" selected → --skip-commit
- No "Create PR" selected → --skip-pr

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to understand what you need after implementation. Which apply?"
header: "Clarify"
multiSelect: true
options:
  - label: "Auto-commit changes"
    description: "I'll create a git commit with your changes"
  - label: "Create PR description"
    description: "I'll generate a PR summary for you"
  - label: "Just leave files changed"
    description: "No git operations - you'll handle it"
  - label: "Neither - let me explain differently"
    description: "I have different post-implementation needs"
```

## Phase 5: Description

Finally, ask for the feature description:

```yaml
question: "Describe what you want to build (1-2 sentences):"
header: "Feature"
options: []  # Free text input via "Other"
```

## Summary Before Execution

Before starting, show what will run:

```
Based on your answers, I'll run:

**Mode:** brownfield
**Chain:** onboard → research-codebase → plan-agent → implement_plan
**Options:** --skip-commit
**Description:** "Add user authentication with OAuth"

Proceed? [Yes / Adjust settings]
```

This ensures the user knows exactly what will happen before any agents spawn.
