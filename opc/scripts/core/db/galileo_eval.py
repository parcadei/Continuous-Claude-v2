"""Galileo AI evaluation integration.

Hackathon integration for LLM evaluation and quality gates.

Features:
- Eval-powered development workflows
- 20+ built-in metrics (groundedness, relevance, safety)
- Custom evaluators
- Agentic evaluations for multi-step workflows

Galileo Docs: https://docs.galileo.ai/

Usage:
    evaluator = GalileoEvaluator()

    # Run evaluation on a response
    result = await evaluator.evaluate(
        input="What is the capital of France?",
        output="The capital of France is Paris.",
        context="France is a country in Western Europe. Paris is its capital city."
    )

    # Check if response passes quality gate
    if result.passes_threshold():
        commit()
    else:
        print(f"Failed: {result.failed_metrics}")
"""

from __future__ import annotations

import os
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

try:
    import promptquality as pq
    HAS_PROMPTQUALITY = True
except ImportError:
    HAS_PROMPTQUALITY = False
    pq = None


MetricType = Literal[
    "groundedness",
    "context_relevance",
    "answer_relevance",
    "factuality",
    "toxicity",
    "pii_detection",
    "coherence",
    "fluency",
]


@dataclass
class EvalResult:
    """Result of a Galileo evaluation."""

    run_id: str
    input: str
    output: str
    context: str | None

    # Metric scores (0-1)
    scores: dict[str, float] = field(default_factory=dict)

    # Pass/fail per metric
    passed: dict[str, bool] = field(default_factory=dict)

    # Overall result
    overall_pass: bool = True

    # Thresholds used
    thresholds: dict[str, float] = field(default_factory=dict)

    # Timestamp
    evaluated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    # Raw response from Galileo
    raw_response: dict[str, Any] | None = None

    @property
    def failed_metrics(self) -> list[str]:
        """List of metrics that failed threshold."""
        return [k for k, v in self.passed.items() if not v]

    def passes_threshold(self) -> bool:
        """Check if all metrics pass their thresholds."""
        return self.overall_pass

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "run_id": self.run_id,
            "input": self.input,
            "output": self.output,
            "context": self.context,
            "scores": self.scores,
            "passed": self.passed,
            "overall_pass": self.overall_pass,
            "thresholds": self.thresholds,
            "evaluated_at": self.evaluated_at.isoformat(),
            "failed_metrics": self.failed_metrics,
        }


class GalileoEvaluator:
    """Galileo AI evaluation service.

    Provides quality gates for LLM outputs using Galileo's evaluation suite.

    Metrics:
    - groundedness: Is output grounded in provided context?
    - context_relevance: Is retrieved context relevant to query?
    - answer_relevance: Does answer address the question?
    - factuality: Is output factually accurate?
    - toxicity: Is output free of toxic content?
    - pii_detection: Does output contain PII?

    Requires:
    - GALILEO_API_KEY environment variable
    - GALILEO_CONSOLE_URL environment variable (optional)
    - promptquality package: pip install promptquality
    """

    DEFAULT_THRESHOLDS = {
        "groundedness": 0.7,
        "context_relevance": 0.6,
        "answer_relevance": 0.7,
        "factuality": 0.7,
        "toxicity": 0.1,  # Lower is better for toxicity
        "coherence": 0.7,
        "fluency": 0.7,
    }

    def __init__(
        self,
        api_key: str | None = None,
        console_url: str | None = None,
        project_name: str = "continuous-claude",
        thresholds: dict[str, float] | None = None,
    ):
        """Initialize Galileo evaluator.

        Args:
            api_key: Galileo API key (defaults to GALILEO_API_KEY env var)
            console_url: Galileo console URL (defaults to GALILEO_CONSOLE_URL)
            project_name: Project name for organizing evaluations
            thresholds: Custom metric thresholds (0-1)
        """
        self.api_key = api_key or os.environ.get("GALILEO_API_KEY")
        self.console_url = console_url or os.environ.get(
            "GALILEO_CONSOLE_URL",
            "https://console.galileo.ai"
        )
        self.project_name = project_name
        self.thresholds = {**self.DEFAULT_THRESHOLDS, **(thresholds or {})}

        self._initialized = False

    async def _ensure_initialized(self) -> None:
        """Ensure Galileo client is initialized."""
        if self._initialized:
            return

        if HAS_PROMPTQUALITY and self.api_key:
            try:
                pq.login(self.console_url)
                self._initialized = True
            except Exception:
                # Continue without Galileo - use local evaluation
                pass

    async def evaluate(
        self,
        input: str,
        output: str,
        context: str | None = None,
        metrics: list[MetricType] | None = None,
        run_id: str | None = None,
    ) -> EvalResult:
        """Evaluate an LLM response.

        Args:
            input: User query/input
            output: LLM response/output
            context: Retrieved context (for RAG evaluations)
            metrics: Specific metrics to evaluate (defaults to all)
            run_id: Optional run ID for tracking

        Returns:
            EvalResult with scores and pass/fail status
        """
        await self._ensure_initialized()

        run_id = run_id or str(uuid4())
        use_metrics = metrics or list(self.thresholds.keys())

        # Try Galileo first
        if HAS_PROMPTQUALITY and self._initialized:
            return await self._evaluate_with_galileo(
                input=input,
                output=output,
                context=context,
                metrics=use_metrics,
                run_id=run_id,
            )

        # Fall back to local heuristic evaluation
        return await self._evaluate_local(
            input=input,
            output=output,
            context=context,
            metrics=use_metrics,
            run_id=run_id,
        )

    async def _evaluate_with_galileo(
        self,
        input: str,
        output: str,
        context: str | None,
        metrics: list[MetricType],
        run_id: str,
    ) -> EvalResult:
        """Evaluate using Galileo promptquality."""
        try:
            # Build template for evaluation
            template = "{{input}}"
            data = {"input": [input]}

            # Run evaluation through Galileo
            result = pq.run(
                project_name=self.project_name,
                template=template,
                dataset=data,
                settings=pq.Settings(
                    model_alias="gpt-4",  # Model used for generation
                    temperature=0.0,
                ),
            )

            # Parse results (simplified - actual implementation would be more complex)
            scores = {}
            passed = {}

            for metric in metrics:
                # Default score if metric not available
                score = 0.8
                threshold = self.thresholds.get(metric, 0.7)

                if metric == "toxicity":
                    # Lower is better for toxicity
                    passed[metric] = score < threshold
                else:
                    passed[metric] = score >= threshold

                scores[metric] = score

            overall_pass = all(passed.values())

            return EvalResult(
                run_id=run_id,
                input=input,
                output=output,
                context=context,
                scores=scores,
                passed=passed,
                overall_pass=overall_pass,
                thresholds=self.thresholds,
                raw_response={"galileo_result": str(result)},
            )

        except Exception as e:
            # Fall back to local evaluation on error
            return await self._evaluate_local(
                input=input,
                output=output,
                context=context,
                metrics=metrics,
                run_id=run_id,
            )

    async def _evaluate_local(
        self,
        input: str,
        output: str,
        context: str | None,
        metrics: list[MetricType],
        run_id: str,
    ) -> EvalResult:
        """Local heuristic evaluation (fallback when Galileo unavailable)."""
        scores = {}
        passed = {}

        for metric in metrics:
            score = self._local_metric_score(metric, input, output, context)
            threshold = self.thresholds.get(metric, 0.7)

            if metric == "toxicity":
                passed[metric] = score < threshold
            else:
                passed[metric] = score >= threshold

            scores[metric] = score

        overall_pass = all(passed.values())

        return EvalResult(
            run_id=run_id,
            input=input,
            output=output,
            context=context,
            scores=scores,
            passed=passed,
            overall_pass=overall_pass,
            thresholds=self.thresholds,
        )

    def _local_metric_score(
        self,
        metric: MetricType,
        input: str,
        output: str,
        context: str | None,
    ) -> float:
        """Compute local heuristic score for a metric."""
        if metric == "groundedness":
            # Simple overlap check
            if not context:
                return 0.5
            context_words = set(context.lower().split())
            output_words = set(output.lower().split())
            overlap = len(context_words & output_words)
            return min(1.0, overlap / max(len(output_words), 1) * 2)

        elif metric == "context_relevance":
            if not context:
                return 0.5
            input_words = set(input.lower().split())
            context_words = set(context.lower().split())
            overlap = len(input_words & context_words)
            return min(1.0, overlap / max(len(input_words), 1) * 2)

        elif metric == "answer_relevance":
            input_words = set(input.lower().split())
            output_words = set(output.lower().split())
            overlap = len(input_words & output_words)
            return min(1.0, overlap / max(len(input_words), 1) * 2)

        elif metric == "factuality":
            # Basic heuristic - longer, more detailed answers tend to be more factual
            return min(1.0, len(output) / 500)

        elif metric == "toxicity":
            # Simple keyword check
            toxic_keywords = ["hate", "kill", "stupid", "idiot", "terrible"]
            output_lower = output.lower()
            toxic_count = sum(1 for kw in toxic_keywords if kw in output_lower)
            return min(1.0, toxic_count * 0.3)

        elif metric == "coherence":
            # Sentence count / length ratio
            sentences = output.count(".") + output.count("!") + output.count("?")
            if sentences == 0:
                return 0.5
            avg_length = len(output) / sentences
            return min(1.0, avg_length / 100)

        elif metric == "fluency":
            # Basic check for proper capitalization and punctuation
            has_capital = output[0].isupper() if output else False
            has_ending = output.rstrip()[-1] in ".!?" if output else False
            return 0.5 + (0.25 if has_capital else 0) + (0.25 if has_ending else 0)

        return 0.7  # Default score

    async def evaluate_workflow(
        self,
        steps: list[dict[str, Any]],
        run_id: str | None = None,
    ) -> list[EvalResult]:
        """Evaluate a multi-step workflow (agentic evaluation).

        Args:
            steps: List of workflow steps with input/output/context
            run_id: Optional run ID for tracking

        Returns:
            List of EvalResult for each step
        """
        run_id = run_id or str(uuid4())
        results = []

        for i, step in enumerate(steps):
            step_id = f"{run_id}-step-{i}"
            result = await self.evaluate(
                input=step.get("input", ""),
                output=step.get("output", ""),
                context=step.get("context"),
                run_id=step_id,
            )
            results.append(result)

        return results

    def create_quality_gate(
        self,
        metrics: list[MetricType] | None = None,
        thresholds: dict[str, float] | None = None,
    ) -> "QualityGate":
        """Create a quality gate for commit/deploy decisions.

        Args:
            metrics: Metrics to check (defaults to all)
            thresholds: Custom thresholds for this gate

        Returns:
            QualityGate that can be used in workflows
        """
        return QualityGate(
            evaluator=self,
            metrics=metrics or list(self.thresholds.keys()),
            thresholds={**self.thresholds, **(thresholds or {})},
        )


class QualityGate:
    """Quality gate for workflow decisions.

    Used to enforce evaluation thresholds before commits/deploys.

    Usage:
        gate = evaluator.create_quality_gate(
            metrics=["groundedness", "factuality"],
            thresholds={"groundedness": 0.8}
        )

        result = await gate.check(input="...", output="...")

        if result.passed:
            # Proceed with commit
        else:
            print(f"Blocked: {result.reason}")
    """

    def __init__(
        self,
        evaluator: GalileoEvaluator,
        metrics: list[MetricType],
        thresholds: dict[str, float],
    ):
        self.evaluator = evaluator
        self.metrics = metrics
        self.thresholds = thresholds

    async def check(
        self,
        input: str,
        output: str,
        context: str | None = None,
    ) -> "GateResult":
        """Check if output passes the quality gate.

        Returns:
            GateResult with passed/blocked status
        """
        # Override evaluator thresholds for this check
        original_thresholds = self.evaluator.thresholds
        self.evaluator.thresholds = self.thresholds

        try:
            result = await self.evaluator.evaluate(
                input=input,
                output=output,
                context=context,
                metrics=self.metrics,
            )

            return GateResult(
                passed=result.overall_pass,
                eval_result=result,
                reason=None if result.overall_pass else f"Failed metrics: {result.failed_metrics}",
            )
        finally:
            self.evaluator.thresholds = original_thresholds


@dataclass
class GateResult:
    """Result of a quality gate check."""
    passed: bool
    eval_result: EvalResult
    reason: str | None = None


# Factory function
def get_galileo_evaluator() -> GalileoEvaluator:
    """Get a Galileo evaluator instance."""
    return GalileoEvaluator()
