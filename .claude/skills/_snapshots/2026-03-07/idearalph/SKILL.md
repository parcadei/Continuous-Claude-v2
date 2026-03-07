# IdeaRalph - AI Co-Founder for Startup Ideation

Ralph is your enthusiastic startup idea validator with the energy of a caffeinated golden retriever.

## When to Use

- "I have a startup idea"
- "Brainstorm ideas for [domain]"
- "Validate my idea"
- "Help me with my startup"
- "Generate a PRD"
- "Score my business idea"

## The IdeaRalph Workflow

```
brainstorm → validate → refine → PRD → design → architecture → checklist
    │           │          │        │       │          │           │
 Generate    Score on   Iterate   Create  UI/UX    Tech plan    Launch
  ideas     10 PMF      to 9.5+   docs    spec                  prep
            dims
```

## Tools Reference

### 1. `idearalph_brainstorm`
Generate startup ideas for a domain.

```
Parameters:
  topic: string (required) - Domain to brainstorm
  constraints: string - e.g., "solo founder", "B2B SaaS"

Example: Brainstorm ideas in "AI productivity tools" with "bootstrappable"
```

### 2. `idearalph_validate`
Score an idea on 10 PMF dimensions.

```
Parameters:
  idea: string (required) - The startup idea

PMF Dimensions:
  1. Problem Clarity    6. Timing
  2. Market Size        7. Virality
  3. Uniqueness         8. Defensibility
  4. Feasibility        9. Team Fit
  5. Monetization      10. Ralph Factor
```

### 3. `idearalph_refine`
Iteratively improve an idea (The Ralph Loop).

```
Parameters:
  idea: string (required) - Idea to refine
  mode: "single" | "target" | "max" (default: "target")
  targetScore: number 1-10 (default: 9.5)
  maxIterations: number (default: 10)

Modes:
  single - One round of feedback
  target - Keep refining until score reached
  max    - Run all iterations for maximum score
```

### 4. `idearalph_prd`
Generate Product Requirements Document.

```
Parameters:
  idea: string (required)
  level: "napkin" | "science-fair" | "genius" (default: "napkin")
  scores: object - PMF scores if available
  includeArchitecture: boolean (default: false)

Levels:
  napkin      - 1-page sketch
  science-fair - Detailed with personas, user stories
  genius      - Investor-ready with TAM/SAM/SOM
```

### 5. `idearalph_design`
Generate UI/UX design spec.

```
Parameters:
  idea: string (required)
  prd: string - PRD content for context
  vibe: "clean" | "bold" | "dark" | "playful"
  referenceUrl: string - Site to draw inspiration from

Output:
  - Color palette
  - Typography scale
  - Component specs
  - Landing page wireframe
```

### 6. `idearalph_architecture`
Generate implementation plan.

```
Parameters:
  idea: string (required)
  prd: string - PRD content
  designSpec: string - Design spec
  techPreferences: string (default: "SvelteKit, Supabase")

Recommends Spawner skills:
  - SvelteKit frontend
  - Supabase backend
  - Tailwind CSS
  - TypeScript Strict
```

### 7. `idearalph_checklist`
Generate YC-level launch checklist.

```
Parameters:
  idea: string (required)
  projectName: string (required)
  prd: string
  designSpec: string
  currentStatus: string

Creates:
  - Tasks.md - Actionable tasks by category
  - Checklist.md - Pre/post-launch checklist

Covers:
  - Security (OWASP, auth, rate limiting)
  - Legal (ToS, Privacy, GDPR)
  - Analytics (product, errors, sessions)
  - Growth (viral loops, referral)
  - Infrastructure (monitoring, CI/CD)
  - Launch (Product Hunt, HN, press)
```

## Quick Start Workflows

### New Idea from Scratch
```
1. idearalph_brainstorm(topic="your domain")
2. idearalph_refine(idea=best_result, mode="target")
3. idearalph_prd(idea=refined, level="science-fair")
4. idearalph_design(idea=refined, prd=prd_output)
5. idearalph_architecture(idea=refined, prd=prd, designSpec=design)
6. idearalph_checklist(idea=refined, projectName="MyStartup")
```

### Validate Existing Idea
```
1. idearalph_validate(idea="your idea description")
2. If score < 8: idearalph_refine(idea=your_idea, mode="target")
3. Proceed to PRD when satisfied
```

### Quick PRD Only
```
idearalph_prd(idea="your idea", level="napkin", includeArchitecture=true)
```

## PMF Scoring Guide

| Score | Meaning |
|-------|---------|
| 1-3   | Weak - needs major rework |
| 4-6   | Moderate - has potential |
| 7-8   | Strong - ready to build |
| 9-10  | Exceptional - ship it! |

## Tips

- **Start broad**: Use brainstorm with loose constraints, then narrow down
- **Iterate aggressively**: The refine tool can push ideas from 6 to 9+
- **PRD levels matter**: Use "napkin" for exploration, "genius" for fundraising
- **Design vibe**: Match to your target audience (dark=devs, playful=consumers)
- **Don't skip checklist**: It catches things you'll forget

## Integration with Spawner

IdeaRalph outputs are designed to feed into Spawner's build skills:
- Architecture recommends specific Spawner skills to load
- Design spec maps to Tailwind + component libraries
- Checklist includes Spawner skill triggers for each phase
