# Linear Projects and Cycles Reference

## Linear Concepts

| Concept | Purpose | Lifespan |
|---------|---------|----------|
| **Team** | Organizational unit (e.g., "The Lab") | Permanent |
| **Project** | Long-term initiative with milestones | Weeks to months |
| **Cycle** | Time-boxed sprint (per team) | 1-2 weeks typically |
| **Label** | Categorization tag on issues | Permanent |
| **Milestone** | Checkpoint within a project | Until completed |

## Teams

```bash
# linearis
linearis teams list                              # All teams (JSON)

# linear
linear team list                                 # All teams
```

Our workspace: `minions-lab`. Primary team: "The Lab".

## Projects

```bash
# linearis
linearis projects list                           # All projects (JSON)

# linear
linear project list                              # All projects
linear project list --team "The Lab"             # Team-scoped
```

Projects map to long-term efforts (e.g., "Workbook Platform", "Agent Factory"). Issues are assigned to projects via `--project` flag.

### Project Milestones

```bash
# linearis
linearis project-milestones list --project "ProjectName"

# linear
linear milestone list --project "ProjectName"
```

Milestones are checkpoints within a project (e.g., "v1.0", "Beta Launch").

## Cycles

```bash
# linearis
linearis cycles list                             # All cycles (JSON)
linearis cycles list --team "The Lab"            # Team-scoped
linearis cycles read "Sprint 4" --team "The Lab" # Cycle details with issues

# linear
linear cycle list                                # All cycles
linear cycle list --team "The Lab"               # Team-scoped
```

Cycles are time-boxed sprints. Issues are assigned to cycles via `--cycle` flag on create/update.

### Active Cycle

```bash
linear issue list --cycle active                 # Issues in current cycle
```

## Labels

```bash
# linearis
linearis labels list                             # All labels (JSON)
linearis labels list --team "The Lab"            # Team-scoped labels
```

Labels are applied to issues for categorization. Use comma-separated names:

```bash
linearis issues create "Title" --team "The Lab" --labels "bug,frontend"
linearis issues update LIN-42 --labels "critical" --label-by adding
linearis issues update LIN-42 --labels "bug,critical" --label-by overwriting
```

## Documents

```bash
# linearis
linearis documents list --project "ProjectName"  # Project docs

# linear
linear document list                             # All docs
```

Linear Documents are project-level documentation pages (specs, RFCs, notes).

## Mapping CCv3 Projects to Linear

| CCv3 Project | Linear Team | Linear Project |
|--------------|-------------|----------------|
| continuous-claude | The Lab | (infrastructure) |
| NorthStar Transformation | The Lab | NorthStar |
| Fourth Connect | The Lab | Fourth Connect |
| Agent Factory | The Lab | Agent Factory |
| ECG Lead Reactivation | The Lab | ECG |

Use `--team "The Lab" --project "<name>"` when creating issues to maintain this mapping.
