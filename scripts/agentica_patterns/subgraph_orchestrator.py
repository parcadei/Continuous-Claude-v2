#!/usr/bin/env python3
"""Subgraph orchestrator for hierarchical multi-agent workflows."""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Callable
from uuid import uuid4

class SubgraphState(Enum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class SubgraphNode:
    """A node in the subgraph."""
    id: str
    name: str
    agent_type: str
    depends_on: List[str] = field(default_factory=list)
    input_mapper: Optional[Callable] = None
    output_mapper: Optional[Callable] = None
    retry_count: int = 0
    max_retries: int = 3

@dataclass
class SubgraphEdge:
    """An edge connecting nodes."""
    source: str
    target: str
    condition: Optional[Callable[[Any], bool]] = None

@dataclass
class SubgraphExecution:
    """Execution context for a subgraph."""
    id: str
    subgraph_id: str
    nodes: Dict[str, SubgraphNode]
    edges: List[SubgraphEdge]
    state: Dict[str, Any] = field(default_factory=dict)
    node_results: Dict[str, Any] = field(default_factory=dict)
    status: SubgraphState = SubgraphState.PENDING
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

class SubgraphOrchestrator:
    """Orchestrates subgraph execution with dependency resolution."""

    def __init__(self):
        self.subgraphs: Dict[str, SubgraphExecution] = {}
        self.node_outputs: Dict[str, Any] = {}

    def create_subgraph(
        self,
        subgraph_id: str,
        nodes: List[SubgraphNode],
        edges: List[SubgraphEdge],
    ) -> SubgraphExecution:
        """Create a new subgraph execution context."""
        execution = SubgraphExecution(
            id=str(uuid4())[:8],
            subgraph_id=subgraph_id,
            nodes={n.id: n for n in nodes},
            edges=edges,
        )
        self.subgraphs[execution.id] = execution
        return execution

    def _get_executable_nodes(self, execution: SubgraphExecution) -> List[str]:
        """Get nodes whose dependencies are satisfied."""
        executable = []
        for node_id, node in execution.nodes.items():
            # Check if all dependencies have results
            deps_satisfied = all(
                dep in execution.node_results
                for dep in node.depends_on
            )
            if deps_satisfied and node_id not in execution.node_results:
                executable.append(node_id)
        return executable

    async def execute(
        self,
        subgraph_id: str,
        initial_state: Dict[str, Any],
    ) -> SubgraphExecution:
        """Execute a subgraph with the given initial state."""
        # Create or get execution
        if subgraph_id not in self.subgraphs:
            raise ValueError(f"Subgraph {subgraph_id} not found")

        execution = self.subgraphs[subgraph_id]
        execution.state = initial_state
        execution.status = SubgraphState.RUNNING
        execution.started_at = datetime.utcnow().isoformat()

        # Execute nodes in topological order
        while True:
            executable = self._get_executable_nodes(execution)
            if not executable:
                if all(
                    n in execution.node_results or
                    execution.nodes[n].status == SubgraphState.FAILED
                    for n in execution.nodes
                ):
                    break  # All nodes processed
                await asyncio.sleep(0.1)
                continue

            # Execute executable nodes concurrently
            await asyncio.gather(*[
                self._execute_node(execution, node_id)
                for node_id in executable
            ])

        execution.status = SubgraphState.COMPLETED
        execution.completed_at = datetime.utcnow().isoformat()
        return execution

    async def _execute_node(self, execution: SubgraphExecution, node_id: str) -> Any:
        """Execute a single node."""
        node = execution.nodes[node_id]

        try:
            # Prepare input from state and dependencies
            input_data = self._prepare_input(execution, node)

            # Execute agent
            result = await self._run_agent(node.agent_type, input_data)

            # Map output to state
            output = self._map_output(execution, node, result)
            execution.node_results[node_id] = output

            return output
        except Exception as e:
            node.retry_count += 1
            if node.retry_count < node.max_retries:
                await asyncio.sleep(2 ** node.retry_count)  # Exponential backoff
                return await self._execute_node(execution, node_id)
            else:
                execution.status = SubgraphState.FAILED
                raise

    def _prepare_input(self, execution: SubgraphExecution, node: SubgraphNode) -> Dict[str, Any]:
        """Prepare input for a node from state and dependencies."""
        input_data = {'state': execution.state.copy()}

        # Add dependency outputs
        for dep in node.depends_on:
            if dep in execution.node_results:
                input_data[dep] = execution.node_results[dep]

        if node.input_mapper:
            input_data = node.input_mapper(input_data)

        return input_data

    def _map_output(self, execution: SubgraphExecution, node: SubgraphNode, result: Any) -> Any:
        """Map node output to state."""
        if node.output_mapper:
            return node.output_mapper(result)
        return result

    async def _run_agent(self, agent_type: str, input_data: Dict[str, Any]) -> Any:
        """Run an agent of the given type with input data."""
        # Placeholder - actual implementation would spawn agent
        return {"agent_type": agent_type, "result": f"Processed {input_data}"}

    def get_status(self, execution_id: str) -> Dict[str, Any]:
        """Get the status of a subgraph execution."""
        if execution_id not in self.subgraphs:
            return {"error": "Execution not found"}

        execution = self.subgraphs[execution_id]
        return {
            "id": execution.id,
            "subgraph_id": execution.subgraph_id,
            "status": execution.status.value,
            "nodes_completed": len(execution.node_results),
            "total_nodes": len(execution.nodes),
            "started_at": execution.started_at,
            "completed_at": execution.completed_at,
        }

# Singleton
orchestrator = SubgraphOrchestrator()
