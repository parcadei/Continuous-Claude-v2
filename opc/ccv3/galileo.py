"""Galileo AI Evaluation - RAG Triad Metrics.

Full integration with Galileo for evaluating LLM output quality
in the context of Claude Code context management.

Sponsors: Galileo AI
Docs: https://docs.rungalileo.io/

RAG Triad Metrics:
1. Context Adherence (Groundedness) - Response is grounded in context
2. Chunk Relevance - Retrieved chunks are relevant to query
3. Answer Relevance (Correctness) - Answer correctly addresses query

Usage:
    galileo = GalileoEval()

    # Single evaluation
    result = await galileo.evaluate(
        query="How do I authenticate?",
        response="Use the AuthService.login() method...",
        context="The AuthService provides login() and logout() methods...",
    )

    # Batch evaluation for workflow
    results = await galileo.evaluate_workflow(run_data)
"""

import os
from dataclasses import dataclass, field
from typing import Literal

import httpx


MetricType = Literal[
    "context_adherence",   # Is response grounded in context?
    "chunk_relevance",     # Are retrieved chunks relevant?
    "correctness",         # Is response correct?
    "completeness",        # Is response complete?
    "instruction_following",  # Does response follow instructions?
]


@dataclass
class EvalResult:
    """Result of a Galileo evaluation."""

    passed: bool
    scores: dict[str, float] = field(default_factory=dict)
    failed_metrics: list[str] = field(default_factory=list)
    explanation: str = ""
    run_id: str | None = None


@dataclass
class ChunkEvaluation:
    """Evaluation of a single retrieved chunk."""

    chunk_id: str
    relevance_score: float
    is_relevant: bool
    explanation: str = ""


class GalileoEval:
    """Galileo evaluation client.

    Features:
    - RAG Triad metrics (context adherence, chunk relevance, correctness)
    - Batch evaluation for workflows
    - Integration with Galileo dashboard
    - Fallback to local heuristics when API unavailable
    """

    API_URL = "https://api.rungalileo.io/v1"

    def __init__(
        self,
        api_key: str | None = None,
        project: str = "ccv3-hackathon",
    ):
        self.api_key = api_key or os.environ.get("GALILEO_API_KEY")
        self.project = project
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def evaluate(
        self,
        query: str,
        response: str,
        context: str | list[str],
        *,
        metrics: list[MetricType] | None = None,
        thresholds: dict[str, float] | None = None,
    ) -> EvalResult:
        """Evaluate a single LLM response.

        Args:
            query: User query/prompt
            response: LLM response
            context: Retrieved context (single string or list of chunks)
            metrics: Which metrics to evaluate
            thresholds: Passing thresholds per metric

        Returns:
            EvalResult with scores and pass/fail status
        """
        metrics = metrics or ["context_adherence", "chunk_relevance", "correctness"]
        thresholds = thresholds or {
            "context_adherence": 0.7,
            "chunk_relevance": 0.6,
            "correctness": 0.7,
        }

        # Galileo API or fallback
        if self.api_key:
            return await self._evaluate_galileo(query, response, context, metrics, thresholds)
        else:
            return await self._evaluate_local(query, response, context, metrics, thresholds)

    async def _evaluate_galileo(
        self,
        query: str,
        response: str,
        context: str | list[str],
        metrics: list[MetricType],
        thresholds: dict[str, float],
    ) -> EvalResult:
        """Evaluate using Galileo API."""
        client = await self._get_client()

        # Format context as list
        context_chunks = [context] if isinstance(context, str) else context

        try:
            # Galileo Observe API for RAG evaluation
            response_data = await client.post(
                f"{self.API_URL}/observe/rag",
                json={
                    "project": self.project,
                    "inputs": [
                        {
                            "query": query,
                            "response": response,
                            "contexts": context_chunks,
                        }
                    ],
                    "metrics": metrics,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            )
            response_data.raise_for_status()
            data = response_data.json()

            # Parse Galileo response
            result = data.get("results", [{}])[0]
            scores = {m: result.get(m, 0.0) for m in metrics}
            failed = [m for m in metrics if scores[m] < thresholds.get(m, 0.7)]

            return EvalResult(
                passed=len(failed) == 0,
                scores=scores,
                failed_metrics=failed,
                run_id=data.get("run_id"),
            )

        except Exception as e:
            # Fallback to local on API error
            print(f"Galileo API error, using local: {e}")
            return await self._evaluate_local(query, response, context, metrics, thresholds)

    def _tokenize(self, text: str) -> set[str]:
        """Tokenize text into words, stripping punctuation."""
        import re
        # Convert to lowercase, split on non-alphanumeric, filter short words
        words = re.findall(r'[a-z0-9]+', text.lower())
        # Filter out very short words and common stop words
        stop_words = {'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
                      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                      'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
                      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
                      'through', 'during', 'before', 'after', 'above', 'below',
                      'between', 'under', 'again', 'further', 'then', 'once',
                      'here', 'there', 'when', 'where', 'why', 'how', 'all',
                      'each', 'few', 'more', 'most', 'other', 'some', 'such',
                      'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
                      'too', 'very', 'just', 'i', 'me', 'my', 'we', 'you', 'it'}
        return {w for w in words if len(w) > 1 and w not in stop_words}

    async def _evaluate_local(
        self,
        query: str,
        response: str,
        context: str | list[str],
        metrics: list[MetricType],
        thresholds: dict[str, float],
    ) -> EvalResult:
        """Local heuristic-based evaluation (fallback).

        These are rough approximations - use Galileo API for production.
        """
        context_text = context if isinstance(context, str) else "\n".join(context)
        scores: dict[str, float] = {}

        # Tokenize all texts
        response_words = self._tokenize(response)
        context_words = self._tokenize(context_text)
        query_words = self._tokenize(query)

        # Context Adherence: Check if response words appear in context
        if "context_adherence" in metrics:
            if response_words:
                overlap = len(response_words & context_words)
                # Weight by significance of overlapping words
                scores["context_adherence"] = min(1.0, (overlap + 1) / (len(response_words) * 0.5 + 1))
            else:
                scores["context_adherence"] = 0.5

        # Chunk Relevance: Check if context contains query keywords
        if "chunk_relevance" in metrics:
            if query_words:
                overlap = len(query_words & context_words)
                scores["chunk_relevance"] = min(1.0, (overlap + 1) / (len(query_words) * 0.5 + 1))
            else:
                scores["chunk_relevance"] = 0.5

        # Correctness: Check if response addresses query
        if "correctness" in metrics:
            # Response should contain relevant info from both query and context
            query_in_response = len(query_words & response_words)
            context_in_response = len(context_words & response_words)
            if query_words and response_words:
                q_score = query_in_response / len(query_words)
                c_score = context_in_response / max(len(response_words), 1)
                scores["correctness"] = min(1.0, (q_score + c_score) / 1.5 + 0.3)
            else:
                scores["correctness"] = 0.5

        # Completeness: Check response length relative to context
        if "completeness" in metrics:
            response_len = len(response)
            if response_len > 20:
                scores["completeness"] = min(1.0, 0.5 + response_len / 200)
            else:
                scores["completeness"] = 0.3

        # Instruction Following: Basic check for response format
        if "instruction_following" in metrics:
            if len(response) > 20 and not response.lower().startswith(("i cannot", "i don't", "sorry")):
                scores["instruction_following"] = 0.8
            else:
                scores["instruction_following"] = 0.4

        failed = [m for m in metrics if scores.get(m, 0) < thresholds.get(m, 0.7)]

        return EvalResult(
            passed=len(failed) == 0,
            scores=scores,
            failed_metrics=failed,
            explanation="Local heuristic evaluation (Galileo API not configured)",
        )

    async def evaluate_chunks(
        self,
        query: str,
        chunks: list[dict],
    ) -> list[ChunkEvaluation]:
        """Evaluate relevance of retrieved chunks.

        Args:
            query: User query
            chunks: List of chunks with 'id' and 'content' keys

        Returns:
            List of ChunkEvaluation with relevance scores
        """
        evaluations = []

        for chunk in chunks:
            chunk_id = chunk.get("id", str(hash(chunk.get("content", ""))))
            content = chunk.get("content", "")

            # Simple relevance check
            query_words = set(query.lower().split())
            content_words = set(content.lower().split())
            overlap = len(query_words & content_words)
            score = min(1.0, overlap / max(len(query_words), 1))

            evaluations.append(ChunkEvaluation(
                chunk_id=chunk_id,
                relevance_score=score,
                is_relevant=score >= 0.5,
            ))

        return evaluations

    async def evaluate_workflow(
        self,
        run_id: str,
        steps: list[dict],
    ) -> dict:
        """Evaluate a complete workflow run.

        Args:
            run_id: Workflow run ID
            steps: List of steps with {query, response, context}

        Returns:
            Aggregated evaluation results
        """
        results = []
        for step in steps:
            result = await self.evaluate(
                query=step.get("query", ""),
                response=step.get("response", ""),
                context=step.get("context", ""),
            )
            results.append(result)

        # Aggregate
        all_scores = {}
        for result in results:
            for metric, score in result.scores.items():
                if metric not in all_scores:
                    all_scores[metric] = []
                all_scores[metric].append(score)

        avg_scores = {k: sum(v) / len(v) for k, v in all_scores.items()}
        all_passed = all(r.passed for r in results)
        all_failed = []
        for r in results:
            all_failed.extend(r.failed_metrics)

        return {
            "run_id": run_id,
            "passed": all_passed,
            "scores": avg_scores,
            "failed_metrics": list(set(all_failed)),
            "step_count": len(steps),
            "step_results": [
                {
                    "passed": r.passed,
                    "scores": r.scores,
                    "failed_metrics": r.failed_metrics,
                }
                for r in results
            ],
        }


class QualityGate:
    """Quality gate for blocking bad outputs.

    Used in the workflow to ensure outputs meet quality thresholds
    before proceeding.
    """

    def __init__(
        self,
        thresholds: dict[str, float] | None = None,
    ):
        self.thresholds = thresholds or {
            "context_adherence": 0.7,
            "chunk_relevance": 0.6,
            "correctness": 0.7,
        }
        self._galileo = GalileoEval()

    async def check(
        self,
        query: str,
        response: str,
        context: str | list[str],
    ) -> EvalResult:
        """Check if response passes quality gate."""
        return await self._galileo.evaluate(
            query=query,
            response=response,
            context=context,
            thresholds=self.thresholds,
        )

    async def close(self):
        await self._galileo.close()


# Context management specific evaluations
class ContextQualityEval:
    """Evaluation metrics specific to context engineering.

    Measures:
    - Context efficiency (tokens vs information)
    - Context completeness (has all needed info)
    - Context relevance (no irrelevant info)
    """

    def __init__(self):
        self._galileo = GalileoEval()

    async def evaluate_context_pack(
        self,
        task: str,
        context_pack: str,
        token_estimate: int,
    ) -> dict:
        """Evaluate a context pack for a task.

        Returns:
            Evaluation with efficiency, completeness, relevance scores
        """
        # Token efficiency
        words = len(context_pack.split())
        efficiency = min(1.0, 200 / max(words, 1))  # Prefer concise context

        # Completeness heuristics
        has_code = "def " in context_pack or "function " in context_pack or "class " in context_pack
        has_context = len(context_pack) > 100
        completeness = 0.5 + (0.25 if has_code else 0) + (0.25 if has_context else 0)

        # Relevance check via Galileo
        eval_result = await self._galileo.evaluate(
            query=task,
            response="Context pack for: " + task,
            context=context_pack,
            metrics=["chunk_relevance"],
        )
        relevance = eval_result.scores.get("chunk_relevance", 0.5)

        return {
            "efficiency": efficiency,
            "completeness": completeness,
            "relevance": relevance,
            "token_estimate": token_estimate,
            "passed": all([efficiency > 0.3, completeness > 0.5, relevance > 0.5]),
        }

    async def close(self):
        await self._galileo.close()
