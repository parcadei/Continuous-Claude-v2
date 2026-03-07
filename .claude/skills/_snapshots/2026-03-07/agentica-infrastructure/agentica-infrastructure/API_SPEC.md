# Agentica Infrastructure API Specification

Formal API specification for all Agentica multi-agent infrastructure components.

**Source:** `scripts/agentica_patterns/`

---

## Table of Contents

1. [Core Primitives](#core-primitives)
2. [Coordination Database](#coordination-database)
3. [Tracked Agent](#tracked-agent)
4. [Handoff Atom](#handoff-atom)
5. [Blackboard Communication](#blackboard-communication)
6. [Claude Scope Functions](#claude-scope-functions)
7. [Memory Service](#memory-service)
8. [Pattern Classes](#pattern-classes)

---

## Core Primitives

**File:** `primitives.py`

### ConsensusMode (Enum)

```python
class ConsensusMode(Enum):
    MAJORITY = "majority"    # Most common vote wins
    UNANIMOUS = "unanimous"  # All votes must agree
    THRESHOLD = "threshold"  # Percentage must agree
```

### Consensus

**Constructor:**
```python
Consensus(
    mode: ConsensusMode,
    threshold: float | None = None  # Required for THRESHOLD mode (0.0-1.0)
)
```

**Methods:**
- `.decide(votes: list[Any], weights: list[float]? = None, key: Callable[[Any], Any]? = None) -> Any` - Decide consensus from votes

**Exceptions:**
- `ConsensusNotReachedError` - Raised when consensus cannot be reached

### AggregateMode (Enum)

```python
class AggregateMode(Enum):
    MERGE = "merge"    # Combine dicts/lists
    CONCAT = "concat"  # Join strings
    BEST = "best"      # Pick highest score
```

### Aggregator

**Constructor:**
```python
Aggregator(
    mode: AggregateMode,
    separator: str = " ",        # For CONCAT mode
    deduplicate: bool = False    # Remove duplicates
)
```

**Methods:**
- `.aggregate(results: list[Any]) -> Any` - Aggregate multiple results into one

### HandoffState

**Constructor:**
```python
HandoffState(
    context: str,                                    # Current situation
    next_instruction: str,                           # Required - next agent task
    artifacts: dict[str, Any] = {},                  # Data/files produced
    metadata: dict[str, Any] = {}                    # Arbitrary metadata
)
```

**Methods:**
- `.to_dict() -> dict[str, Any]` - Serialize to dictionary
- `.from_dict(data: dict[str, Any]) -> HandoffState` (classmethod)
- `.add_artifact(key: str, value: Any) -> None` - Add artifact to state
- `.merge(other: HandoffState) -> HandoffState` - Merge two states
- `.record_handoff(from_agent: str, to_agent: str) -> None` - Record handoff
- `.get_handoff_chain() -> list[dict[str, str]]` - Get handoff history
- `.update_instruction(instruction: str) -> None` - Update next instruction
- `.clear_artifacts() -> None` - Clear all artifacts

### build_premise

```python
def build_premise(
    role: str,                      # Required - functional role
    task: str,                      # Required - task description
    do: list[str],                  # 3-5 action items
    dont: list[str],                # 3-5 anti-patterns
    examples: list[str]? = None    # Optional 2-3 examples
) -> str
```

### gather_fail_fast

```python
async def gather_fail_fast(
    coros: list,            # List of coroutines
    fail_fast: bool = True  # If True, first exception cancels all
) -> list
```

---

## Coordination Database

**File:** `coordination.py`

### BroadcastType (Enum)

```python
class BroadcastType(str, Enum):
    FINDING = "finding"      # Discovered something useful
    QUESTION = "question"    # Asking other agents
    BLOCKER = "blocker"      # Stuck, need help
    DONE = "done"            # Agent completed
    ABORT = "abort"          # Critical failure
```

### AgentRecord (dataclass)

```python
@dataclass
class AgentRecord:
    id: str
    session_id: str
    premise: str | None
    model: str | None
    scope_keys: list[str]
    pattern: str | None
    parent_agent_id: str | None
    pid: int | None
    ppid: int | None
    spawned_at: datetime
    completed_at: datetime | None
    status: str              # "running", "completed", "failed"
    error_message: str | None
```

### TaskRecord (dataclass)

```python
@dataclass
class TaskRecord:
    id: str
    agent_id: str
    pattern: str | None
    input_summary: str
    output_summary: str
    output_type: str
    artifacts: dict[str, Any]
    duration_ms: int
    completed_at: datetime
```

### BroadcastRecord (dataclass)

```python
@dataclass
class BroadcastRecord:
    id: str
    swarm_id: str
    sender_agent: str
    broadcast_type: BroadcastType
    payload: dict[str, Any]
    created_at: datetime
```

### OrphanCandidate (dataclass)

```python
@dataclass
class OrphanCandidate:
    agent_id: str
    ppid: int | None
    parent_agent_id: str | None
    spawned_at: datetime
    tier: int      # 1=Unix orphan, 2=parent dead, 3=app orphan
    reason: str
```

### CoordinationDB

**Constructor:**
```python
CoordinationDB(
    db_path: Path | None = None,      # Default: .claude/cache/agentica-coordination/coordination.db
    session_id: str | None = None     # Default: generated UUID
)
```

**Agent Methods:**
- `.register_agent(agent_id: str, premise?: str, model?: str, scope_keys?: list[str], pattern?: str, parent_agent_id?: str, pid?: int, ppid?: int) -> AgentRecord`
- `.complete_agent(agent_id: str, status: str = "completed", error_message?: str) -> None`
- `.get_running_agents(pattern?: str) -> list[AgentRecord]` - Current session only
- `.get_all_running_agents(pattern?: str) -> list[AgentRecord]` - All sessions
- `.get_global_running_count() -> int` - Count across all sessions

**Session Methods:**
- `.get_all_sessions() -> list[str]` - List unique session IDs
- `.get_all_sessions_summary() -> dict[str, Any]` - Statistics across sessions
- `.get_session_summary() -> dict[str, Any]` - Current session statistics

**Task Methods:**
- `.record_task(agent_id: str, input_text: str, output: Any, duration_ms: int, pattern?: str, artifacts?: dict[str, Any]) -> TaskRecord`
- `.get_completed_tasks(agent_id?: str, limit: int = 20) -> list[TaskRecord]`

**Orphan Detection:**
- `.find_orphans() -> list[OrphanCandidate]` - Three-tier orphan detection
- `.get_orphan_candidates() -> list[OrphanCandidate]` - Alias for find_orphans

**Broadcast Methods:**
- `.create_broadcast(swarm_id: str, sender_agent: str, broadcast_type: BroadcastType, payload: dict[str, Any]) -> BroadcastRecord`
- `.get_broadcasts(swarm_id: str, since?: datetime, exclude_sender?: str, broadcast_types?: list[BroadcastType]) -> list[BroadcastRecord]`

---

## Tracked Agent

**File:** `tracked_agent.py`

### TrackedAgent (dataclass)

**Properties:**
- `.agent_id: str` - Unique agent identifier

**Methods:**
- `.call(return_type: type[T], prompt: str, **kwargs) -> T` - Call agent with tracking
- `.close() -> None` - Close agent and mark completed

### tracked_spawn

```python
async def tracked_spawn(
    db: CoordinationDB | None,    # Required for tracking
    premise: str,                  # Agent premise
    model: str? = None,           # Model name
    scope: dict[str, Any]? = None,
    mcp: str | None = None,
    pattern: str? = None,         # Pattern name for tracking
    parent_agent_id: str? = None,
    **kwargs
) -> TrackedAgent
```

---

## Handoff Atom

**File:** `handoff_atom.py`

### Outcome (Enum)

```python
class Outcome(Enum):
    SUCCESS = "success"              # Task completed successfully
    PARTIAL_PLUS = "partial_plus"    # Progress made, continuation needed
    PARTIAL_MINUS = "partial_minus"  # Limited progress
    FAILED = "failed"                # Could not complete
    BLOCKED = "blocked"              # Waiting on dependency
    DEFERRED = "deferred"            # Intentionally postponed
```

### Choice (dataclass)

```python
@dataclass
class Choice:
    selected: str                         # Required - what was chosen
    alternatives: list[str] = []          # Other options
    rationale: str = ""                   # Why selected
    confidence: float = 1.0               # 0.0-1.0
    constraints: list[str] = []           # What ruled out options
```

**Methods:**
- `.to_dict() -> dict[str, Any]`
- `.from_dict(data: dict[str, Any]) -> Choice` (classmethod)

### Morphism (dataclass)

```python
@dataclass
class Morphism:
    source: str                           # Required - from state
    target: str                           # Required - to state
    via: str = "spawn"                    # Mechanism
    timestamp: str = ""                   # ISO timestamp (auto-set)
    preserves: list[str] = []             # Keys preserved
    transforms: dict[str, str] = {}       # What changed
```

### Question (dataclass)

```python
@dataclass
class Question:
    name: str                             # Required - snake_case identifier
    value: Any = None                     # Resolved value (None = UNKNOWN)
    q_value: Literal["HIGH", "MED", "LOW"] = "MED"
    why: str = ""
    resolved_at: str | None = None
```

**Properties:**
- `.is_resolved: bool` - True if answered

**Methods:**
- `.resolve(value: Any) -> None` - Mark resolved

### HandoffAtom (dataclass)

**Constructor:**
```python
HandoffAtom(
    agent_id: str,                        # Required
    task_id: str,                         # Required
    from_state: str,                      # Required
    to_state: str,                        # Required
    pattern_id: str = "",
    via_pattern: str = "direct",
    decisions: list[Choice] = [],
    q_resolved: list[Question] = [],
    q_remaining: list[Question] = [],
    artifacts: list[str] = [],
    outcome: Outcome = Outcome.PARTIAL_PLUS,
    metadata: dict[str, Any] = {},
    timestamp: str = ""                   # Auto-set if empty
)
```

**Properties:**
- `.e_is_empty: bool` - True if all questions resolved
- `.q_remaining_count: int` - Number of unresolved questions
- `.q_remaining_high: list[Question]` - HIGH priority unresolved

**Methods:**
- `.record_morphism(source: str, target: str, via: str = "spawn", preserves?: list[str], transforms?: dict[str, str]) -> None`
- `.compose(other: HandoffAtom) -> HandoffAtom` - Category-theoretic composition
- `.record_decision(choice: Choice) -> None`
- `.to_dict() -> dict[str, Any]`
- `.from_dict(data: dict[str, Any]) -> HandoffAtom` (classmethod)
- `.to_json() -> str`
- `.from_json(json_str: str) -> HandoffAtom` (classmethod)

### Factory Functions

```python
def create_swarm_atom(
    agent_id: str,
    task_id: str,
    perspectives_used: list[str],
    aggregated_result: str,
    outcome: Outcome = Outcome.SUCCESS
) -> HandoffAtom

def create_pipeline_atom(
    agent_id: str,
    task_id: str,
    stages_completed: list[str],
    current_stage: str,
    outcome: Outcome = Outcome.PARTIAL_PLUS
) -> HandoffAtom

def create_jury_atom(
    agent_id: str,
    task_id: str,
    votes: list[Any],
    verdict: Any,
    consensus_mode: str,
    outcome: Outcome = Outcome.SUCCESS
) -> HandoffAtom
```

### Prose Renderer

```python
def summarize_handoff(atom: HandoffAtom) -> str
```

---

## Blackboard Communication

**File:** `blackboard.py`

### MessageType (Enum)

```python
class MessageType(str, Enum):
    TASK = "task"          # Task assignment
    RESULT = "result"      # Task completion
    QUERY = "query"        # Question to other agents
    RESPONSE = "response"  # Answer to query
    STATUS = "status"      # Progress update
    ARTIFACT = "artifact"  # File/resource created
    ERROR = "error"        # Failure notification
```

### EntryPriority (Enum)

```python
class EntryPriority(str, Enum):
    CRITICAL = "critical"  # Must see immediately
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"
```

### ScopeLevel (Enum)

```python
class ScopeLevel(str, Enum):
    AGENT = "agent"        # Private to one agent
    SHARED = "shared"      # Visible to pattern/swarm
    TEMPORAL = "temporal"  # Global, persisted, queryable
```

### SharedContextEntry (dataclass)

```python
@dataclass
class SharedContextEntry:
    # Identity (required)
    id: str
    project_id: str
    type: MessageType
    from_agent: str

    # Optional routing
    to_agent: str | None = None       # None = broadcast
    pattern_id: str | None = None
    scope: ScopeLevel = ScopeLevel.SHARED

    # Content (hybrid format)
    formal: str | None = None         # Formal logic notation
    prose: str | None = None          # Natural language
    data: dict[str, Any] = {}         # Structured payload

    # References
    artifacts: list[str] = []         # File paths
    parent_id: str | None = None      # For threading

    # Metadata
    priority: EntryPriority = EntryPriority.NORMAL
    timestamp: str                    # Auto-set
    ttl_seconds: int | None = None    # Auto-expire
```

**Methods:**
- `.to_dict() -> dict[str, Any]`
- `.from_dict(data: dict[str, Any]) -> SharedContextEntry` (classmethod)
- `.to_system_reminder() -> str` - Compact format for hook injection

### BlackboardCache

**Constructor:**
```python
BlackboardCache(
    project_id: str,
    cache_dir: Path = BLACKBOARD_CACHE_DIR  # Default: /tmp/claude-blackboard
)
```

**Methods:**
- `.push(entry: SharedContextEntry) -> None` - Add entry (FIFO with max size)
- `.poll(agent_id?: str, pattern_id?: str, since_timestamp?: str, types?: list[MessageType], scope?: ScopeLevel) -> list[SharedContextEntry]`
- `.clear() -> None` - Clear all entries
- `.get_summary(max_entries: int = 5) -> str` - Compact summary for injection

### Convenience Functions

```python
def create_task(
    project_id: str,
    from_agent: str,
    to_agent: str | None,
    description: str,
    data: dict[str, Any]? = None,
    formal: str? = None,
    priority: EntryPriority = EntryPriority.NORMAL
) -> SharedContextEntry

def create_result(
    project_id: str,
    from_agent: str,
    task_id: str,
    success: bool,
    summary: str,
    artifacts: list[str]? = None
) -> SharedContextEntry

def create_status(
    project_id: str,
    from_agent: str,
    status: str,
    progress: float? = None
) -> SharedContextEntry
```

---

## Claude Scope Functions

**File:** `claude_scope.py`

### ClaudeResult (dataclass)

```python
@dataclass
class ClaudeResult:
    success: bool
    operation: str
    path: str | None = None
    content: str | None = None
    output: str | None = None
    error: str | None = None
    raw_response: str | None = None
```

### SharedContext (dataclass)

Thread-safe shared context for multi-agent coordination.

```python
@dataclass
class SharedContext:
    file_cache: dict[str, ClaudeResult] = {}
    operation_log: list[dict[str, Any]] = []
```

**Methods:**
- `.get_cached(path: str) -> ClaudeResult | None`
- `.set_cached(path: str, result: ClaudeResult) -> None`
- `.invalidate(path: str) -> None`
- `.log_operation(operation: dict[str, Any]) -> None`
- `.get_writes_for_path(path: str) -> list[dict[str, Any]]` - Conflict detection
- `.get_all_cached() -> dict[str, ClaudeResult]`
- `.get_all_operations() -> list[dict[str, Any]]`
- `.clear_cache() -> None`

### Scope Factory Functions

```python
def create_claude_scope(
    cache_reads: bool = True,
    project_dir: str | None = None  # Required for path validation
) -> dict[str, Any]
```

Returns scope dict with: `read_file`, `write_file`, `edit_file`, `bash`, `search_codebase`, `broadcast_finding`, `broadcast_blocker`, `broadcast_done`

```python
def create_claude_scope_with_shared(
    shared: SharedContext,
    cache_reads: bool = True,
    project_dir: str | None = None
) -> dict[str, Any]
```

Returns scope dict with shared context for multi-agent coordination.

### Broadcast Functions

```python
def broadcast_finding(finding: str, metadata?: dict[str, Any]) -> dict[str, Any]
def broadcast_blocker(blocker: str, severity: str = "medium") -> dict[str, Any]
def broadcast_done(summary: str, artifacts?: dict[str, Any]) -> dict[str, Any]
```

---

## Memory Service

**File:** `memory_service.py`

### ArchivalFact (dataclass)

```python
@dataclass
class ArchivalFact:
    id: str
    content: str
    metadata: dict[str, Any]
    created_at: datetime
```

### MemoryService

**Constructor:**
```python
MemoryService(
    session_id: str = "default",
    db_path: Path | None = None  # Default: .claude/cache/agentica-memory/memory.db
)
```

**Connection Methods:**
- `async .connect() -> None` - Initialize (idempotent)
- `async .close() -> None` - Close connection (idempotent)

**Core Memory (Key-Value):**
- `async .set_core(key: str, value: str) -> None`
- `async .get_core(key: str) -> str | None`
- `async .list_core_keys() -> list[str]`
- `async .delete_core(key: str) -> None`
- `async .get_all_core() -> dict[str, str]`

**Archival Memory (FTS5):**
- `async .store(content: str, metadata?: dict[str, Any], embedding?: list[float]) -> str` - Returns memory_id
- `async .search(query: str, limit: int = 10, threshold: float = 0.0) -> list[dict[str, Any]]`
- `async .delete_archival(memory_id: str) -> None`

**Recall (Cross-Source):**
- `async .recall(query: str, include_core: bool = True, limit: int = 5) -> str`
- `async .to_context(max_archival: int = 10) -> str` - Generate prompt context

---

## Pattern Classes

**File:** `patterns.py`

All patterns support optional `db: CoordinationDB` parameter for tracking.

### Swarm

Parallel agents with different perspectives.

```python
Swarm(
    perspectives: list[str],                    # Required - one premise per agent
    aggregate_mode: AggregateMode = AggregateMode.MERGE,
    aggregation_separator: str = " ",
    fail_fast: bool = False,
    model: str | None = None,
    scope: dict[str, Any] | None = None,
    mcp: str | None = None,
    db: CoordinationDB | None = None
)
```

**Methods:**
- `async .execute(query: str, return_type: type? = None) -> Any`

### Pipeline

Sequential stage execution.

```python
Pipeline(
    stages: list[Callable[[HandoffState], HandoffState]]  # Required
)
```

**Methods:**
- `async .run(initial_state: HandoffState) -> HandoffState`

### Hierarchical

Coordinator decomposes tasks for specialists.

```python
Hierarchical(
    coordinator_premise: str,                   # Required
    specialist_premises: dict[str, str],        # Required - name -> premise
    coordinator_scope: dict[str, Any] | None = None,
    specialist_scope: dict[str, Any] | None = None,
    coordinator_model: str | None = None,
    specialist_model: str | None = None,
    aggregation_mode: AggregateMode = AggregateMode.CONCAT,
    aggregation_separator: str = "\n\n",
    aggregator: Aggregator | None = None,
    fail_fast: bool = False,
    return_type: type = str,
    db: CoordinationDB | None = None
)
```

**Methods:**
- `async .execute(task: str) -> Any`

### Jury

N independent agents vote via Consensus.

```python
Jury(
    num_jurors: int,                            # Required
    consensus_mode: ConsensusMode,              # Required
    threshold: float | None = None,             # Required for THRESHOLD
    weights: list[float] | None = None,
    premise: str | None = None,                 # Single premise for all
    premises: list[str] | None = None,          # Different per juror
    model: str | None = None,
    scope: dict[str, Any] | None = None,
    key: Callable[[Any], Any] | None = None,
    allow_partial: bool = False,
    min_jurors: int | None = None,
    debug: bool = False,
    db: CoordinationDB | None = None
)
```

**Methods:**
- `async .decide(return_type: type, question: str) -> Any`

**Debug Properties:**
- `.last_votes: list` - When debug=True

### GeneratorCritic

Iterative refinement loop.

```python
GeneratorCritic(
    generator_premise: str,                     # Required
    critic_premise: str,                        # Required
    max_rounds: int = 3,
    generator_scope: dict[str, Any] | None = None,
    critic_scope: dict[str, Any] | None = None,
    generator_model: str | None = None,
    critic_model: str | None = None,
    is_approved: Callable[[HandoffState], bool] | None = None,
    db: CoordinationDB | None = None
)
```

**Methods:**
- `async .run(task: str) -> HandoffState`

### CircuitBreaker

Failure detection with fallback.

```python
CircuitBreaker(
    primary_premise: str,                       # Required
    fallback_premise: str,                      # Required
    max_failures: int = 3,
    reset_timeout: float = 60,                  # Seconds
    primary_model: str | None = None,
    fallback_model: str | None = None,
    primary_scope: dict[str, Any] | None = None,
    fallback_scope: dict[str, Any] | None = None,
    return_type: type = str,
    db: CoordinationDB | None = None
)
```

**Methods:**
- `async .execute(query: str) -> Any`

**State Properties:**
- `.state: CircuitState` - CLOSED, OPEN, or HALF_OPEN
- `.failure_count: int`

### CircuitState (Enum)

```python
class CircuitState(Enum):
    CLOSED = "closed"        # Normal operation
    OPEN = "open"            # Using fallback
    HALF_OPEN = "half_open"  # Testing primary
```

### Adversarial

Opposing agents debate.

```python
Adversarial(
    advocate_premise: str,                      # Required
    adversary_premise: str,                     # Required
    judge_premise: str | None = None,           # Optional
    max_rounds: int = 3,
    advocate_model: str | None = None,
    adversary_model: str | None = None,
    judge_model: str | None = None,
    advocate_scope: dict[str, Any] | None = None,
    adversary_scope: dict[str, Any] | None = None,
    judge_scope: dict[str, Any] | None = None,
    db: CoordinationDB | None = None
)
```

**Methods:**
- `async .debate(question: str) -> dict[str, Any]` - Returns debate history
- `async .resolve(question: str) -> dict[str, Any] | str` - Debate with judge verdict

### ChainOfResponsibility

Route to first capable handler.

```python
ChainOfResponsibility(
    handlers: list[Handler],                    # Required
    model: str | None = None,
    scope: dict[str, Any] | None = None,
    return_type: type = str,
    db: CoordinationDB | None = None
)
```

### Handler (dataclass)

```python
@dataclass
class Handler:
    premise: str
    can_handle: Callable[[str], bool]          # Returns True if can handle
    priority: int = 0                          # Lower = higher priority
```

**Methods:**
- `async .process(query: str) -> Any`

### MapReduce

Fan out to mappers, combine with reducer.

```python
MapReduce(
    mapper_premise: str,                        # Required
    reducer_premise: str,                       # Required
    num_mappers: int = 3,
    mapper_model: str | None = None,
    reducer_model: str | None = None,
    mapper_scope: dict[str, Any] | None = None,
    reducer_scope: dict[str, Any] | None = None,
    fail_fast: bool = True,
    return_type: type = str,
    db: CoordinationDB | None = None
)
```

**Methods:**
- `async .execute(query: str, chunks: list[Any]) -> Any`

### Blackboard (Pattern)

Specialists contribute to shared state.

```python
Blackboard(
    specialists: list[Specialist],              # Required
    controller_premise: str,                    # Required
    max_iterations: int = 5,
    controller_model: str | None = None,
    specialist_model: str | None = None,
    controller_scope: dict[str, Any] | None = None,
    specialist_scope: dict[str, Any] | None = None,
    db: CoordinationDB | None = None
)
```

### Specialist (dataclass)

```python
@dataclass
class Specialist:
    premise: str
    writes_to: list[str] = []                  # Blackboard keys to write
    reads_from: list[str] = []                 # Blackboard keys to read
```

### BlackboardState

```python
class BlackboardState:
    history: list[dict[str, Any]]              # Change history
```

**Methods:**
- `.__getitem__(key: str) -> Any`
- `.__setitem__(key: str, value: Any) -> None`
- `.__contains__(key: str) -> bool`
- `.get(key: str, default: Any = None) -> Any`
- `.keys() -> KeysView`
- `.items() -> ItemsView`
- `.to_dict() -> dict[str, Any]`

### BlackboardResult (dataclass)

```python
@dataclass
class BlackboardResult:
    state: BlackboardState
    iterations: int
    completed: bool
```

**Methods:**
- `async .solve(query: str) -> BlackboardResult`

### EventDriven

Agents react to events on a bus.

```python
EventDriven(
    subscribers: list[Subscriber],              # Required
    model: str | None = None,
    scope: dict[str, Any] | None = None,
    return_type: type = str,
    db: CoordinationDB | None = None
)
```

### Event (dataclass)

```python
@dataclass
class Event:
    type: str                                   # e.g., "user.created"
    payload: dict[str, Any]
    timestamp: datetime                         # Auto-set
```

### Subscriber (dataclass)

```python
@dataclass
class Subscriber:
    premise: str
    event_types: list[str]                     # Use "*" for wildcard
```

**Methods:**
- `async .publish(event: Event) -> list[Any]` - Notify matching subscribers

---

## Summary: Import Patterns

### From primitives.py

```python
from scripts.agentica_patterns.primitives import (
    ConsensusMode, Consensus, ConsensusNotReachedError,
    AggregateMode, Aggregator,
    HandoffState,
    build_premise,
)
from scripts.agentica_patterns.patterns.primitives import gather_fail_fast
```

### From coordination.py

```python
from scripts.agentica_patterns.coordination import (
    CoordinationDB,
    BroadcastType, BroadcastRecord,
    AgentRecord, TaskRecord, OrphanCandidate,
)
```

### From patterns.py

```python
from scripts.agentica_patterns.patterns import (
    Swarm, Pipeline, Hierarchical, Jury,
    GeneratorCritic, CircuitBreaker, CircuitState,
    Adversarial, ChainOfResponsibility, Handler,
    MapReduce, Blackboard, Specialist, BlackboardState, BlackboardResult,
    EventDriven, Event, Subscriber,
)
```

### From tracked_agent.py

```python
from scripts.agentica_patterns.tracked_agent import tracked_spawn, TrackedAgent
```

### From handoff_atom.py

```python
from scripts.agentica_patterns.handoff_atom import (
    HandoffAtom, Outcome, Choice, Morphism, Question,
    create_swarm_atom, create_pipeline_atom, create_jury_atom,
    summarize_handoff,
)
```

### From blackboard.py

```python
from scripts.agentica_patterns.blackboard import (
    BlackboardCache, SharedContextEntry,
    MessageType, EntryPriority, ScopeLevel,
    create_task, create_result, create_status,
)
```

### From claude_scope.py

```python
from scripts.agentica_patterns.claude_scope import (
    create_claude_scope, create_claude_scope_with_shared,
    SharedContext, ClaudeResult,
    broadcast_finding, broadcast_blocker, broadcast_done,
)
```

### From memory_service.py

```python
from scripts.agentica_patterns.memory_service import MemoryService, ArchivalFact
```
