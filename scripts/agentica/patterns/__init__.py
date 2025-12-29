'''Multi-Agent Patterns for Agentica.

Re-exports all patterns for convenience.
'''

# Primitives
from scripts.agentica.patterns.adversarial import Adversarial
from scripts.agentica.patterns.blackboard import (
    Blackboard,
    BlackboardResult,
    BlackboardState,
    Specialist,
)
from scripts.agentica.patterns.chain_of_responsibility import ChainOfResponsibility, Handler
from scripts.agentica.patterns.circuit_breaker import CircuitBreaker, CircuitState
from scripts.agentica.patterns.event_driven import Event, EventDriven, Subscriber
from scripts.agentica.patterns.generator_critic import GeneratorCritic
from scripts.agentica.patterns.hierarchical import Hierarchical
from scripts.agentica.patterns.jury import Jury
from scripts.agentica.patterns.map_reduce import MapReduce
from scripts.agentica.patterns.pipeline import Pipeline
from scripts.agentica.patterns.primitives import (
    AggregateMode,
    Aggregator,
    Consensus,
    ConsensusMode,
    ConsensusNotReachedError,
    HandoffState,
    gather_fail_fast,
)

# Patterns
from scripts.agentica.patterns.swarm import Swarm

__all__ = [
    "AggregateMode",
    "Aggregator",
    "Consensus",
    "ConsensusMode",
    "ConsensusNotReachedError",
    "HandoffState",
    "gather_fail_fast",
    # Pattern classes
    "Swarm",
    "Pipeline",
    "Hierarchical",
    "CircuitBreaker",
    "CircuitState",
    "Jury",
    "GeneratorCritic",
    "MapReduce",
    "ChainOfResponsibility",
    "Handler",
    "Adversarial",
    "EventDriven",
    "Event",
    "Subscriber",
    "Blackboard",
    "BlackboardResult",
    "BlackboardState",
    "Specialist",
]
