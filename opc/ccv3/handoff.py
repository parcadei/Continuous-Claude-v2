"""Handoff Pack Compiler - YAML/MD Context Bundles.

Compiles context from multiple sources into structured handoff packs
that can be stored in Atlas and used to bootstrap Claude sessions.

Sponsors: MongoDB Atlas (storage)
PRD Section 5: Handoff Packs

Usage:
    compiler = HandoffCompiler(atlas)

    # Compile handoff for a task
    handoff = await compiler.compile(
        repo_id="my-repo-abc123",
        task="Fix the authentication bug in login flow",
        query="authentication login AuthService",
    )

    # Access the pack
    print(handoff.yaml)     # Structured YAML
    print(handoff.markdown) # Human-readable MD
    print(handoff.citations)  # Source citations
"""

import yaml
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from .atlas import Atlas
from .embeddings import EmbeddingsRouter


@dataclass
class Citation:
    """Source citation for a piece of context."""

    file_path: str
    line_start: int
    line_end: int
    content_preview: str = ""
    symbol_name: str | None = None
    relevance_score: float = 0.0


@dataclass
class HandoffPack:
    """Compiled handoff pack."""

    task: str
    yaml_content: str
    markdown_content: str
    citations: list[Citation] = field(default_factory=list)
    token_estimate: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def yaml(self) -> str:
        return self.yaml_content

    @property
    def markdown(self) -> str:
        return self.markdown_content


class HandoffCompiler:
    """Compiles handoff packs from Atlas data.

    Context hierarchy (from PRD):
    1. AST symbols (functions, classes)
    2. Call graph slices
    3. Data flow paths
    4. Related files
    5. Recent changes

    Output formats:
    - YAML: Machine-readable structure
    - Markdown: Human-readable summary
    """

    def __init__(self, atlas: Atlas):
        self.atlas = atlas
        self._embeddings = EmbeddingsRouter()

    async def compile(
        self,
        repo_id: str,
        task: str,
        query: str | None = None,
        max_tokens: int = 8000,
    ) -> HandoffPack:
        """Compile a handoff pack for a task.

        Args:
            repo_id: Repository ID
            task: Task description
            query: Search query for context (defaults to task)
            max_tokens: Maximum token budget

        Returns:
            HandoffPack with YAML and Markdown
        """
        query = query or task

        # Get query embedding
        query_embedding = await self._embeddings.embed_for_search(query)

        # Gather context from multiple sources
        context = await self._gather_context(repo_id, query, query_embedding)

        # Compile to YAML
        yaml_content = self._compile_yaml(task, context)

        # Compile to Markdown
        markdown_content = self._compile_markdown(task, context)

        # Extract citations
        citations = self._extract_citations(context)

        # Estimate tokens
        token_estimate = self._estimate_tokens(yaml_content + markdown_content)

        pack = HandoffPack(
            task=task,
            yaml_content=yaml_content,
            markdown_content=markdown_content,
            citations=citations,
            token_estimate=token_estimate,
        )

        # Store in Atlas
        await self.atlas.store_handoff(
            repo_id=repo_id,
            task=task,
            yaml_content=yaml_content,
            markdown_content=markdown_content,
            citations=[c.__dict__ for c in citations],
            token_estimate=token_estimate,
        )

        return pack

    async def _gather_context(
        self,
        repo_id: str,
        query: str,
        query_embedding: list[float],
    ) -> dict[str, Any]:
        """Gather context from Atlas."""
        context: dict[str, Any] = {
            "symbols": [],
            "graphs": [],
            "embeddings": [],
            "files": [],
        }

        # Hybrid search for relevant embeddings
        embeddings = await self.atlas.hybrid_search(
            repo_id=repo_id,
            query=query,
            query_vector=query_embedding,
            limit=10,
        )
        context["embeddings"] = embeddings

        # Get symbols mentioned in results
        symbol_names = set()
        for emb in embeddings:
            if emb.get("object_type") == "symbol":
                symbol_names.add(emb.get("object_id", "").split(":")[-2])

        for name in symbol_names:
            symbols = await self.atlas.get_symbols(
                repo_id=repo_id,
                name_pattern=name,
            )
            context["symbols"].extend(symbols)

        # Get call graph for relevant functions
        for symbol in context["symbols"][:5]:  # Limit
            if symbol.get("kind") in ("function", "method"):
                calls = await self.atlas.query_call_graph(
                    repo_id=repo_id,
                    function_name=symbol.get("name", ""),
                    direction="forward",
                )
                called_by = await self.atlas.query_call_graph(
                    repo_id=repo_id,
                    function_name=symbol.get("name", ""),
                    direction="backward",
                )
                context["graphs"].append({
                    "symbol": symbol.get("name"),
                    "calls": calls,
                    "called_by": called_by,
                })

        return context

    def _compile_yaml(self, task: str, context: dict[str, Any]) -> str:
        """Compile context to YAML format."""
        data = {
            "task": task,
            "compiled_at": datetime.now(timezone.utc).isoformat(),
            "symbols": [],
            "call_graph": [],
            "relevant_files": [],
        }

        # Add symbols
        for sym in context.get("symbols", [])[:20]:
            data["symbols"].append({
                "name": sym.get("name"),
                "kind": sym.get("kind"),
                "file": sym.get("file_path"),
                "signature": sym.get("signature", ""),
                "line": sym.get("span", {}).get("start"),
            })

        # Add call graph
        for graph in context.get("graphs", [])[:10]:
            data["call_graph"].append({
                "function": graph.get("symbol"),
                "calls": [c.get("function") for c in graph.get("calls", [])[:5]],
                "called_by": [c.get("function") for c in graph.get("called_by", [])[:5]],
            })

        # Add relevant files from embeddings
        files_seen = set()
        for emb in context.get("embeddings", []):
            file_path = emb.get("metadata", {}).get("file_path") or emb.get("object_id", "").split(":")[0]
            if file_path and file_path not in files_seen:
                files_seen.add(file_path)
                data["relevant_files"].append({
                    "path": file_path,
                    "relevance": emb.get("rrf_score", 0),
                })

        return yaml.dump(data, sort_keys=False, default_flow_style=False)

    def _compile_markdown(self, task: str, context: dict[str, Any]) -> str:
        """Compile context to Markdown format."""
        lines = [
            f"# Handoff: {task}",
            "",
            f"*Compiled: {datetime.now(timezone.utc).isoformat()}*",
            "",
            "## Relevant Symbols",
            "",
        ]

        # Add symbols
        for sym in context.get("symbols", [])[:20]:
            kind = sym.get("kind", "unknown")
            name = sym.get("name", "unknown")
            file_path = sym.get("file_path", "")
            line = sym.get("span", {}).get("start", 0)
            sig = sym.get("signature", "")

            if sig:
                lines.append(f"- **{kind}** `{name}` - `{sig}`")
            else:
                lines.append(f"- **{kind}** `{name}`")
            lines.append(f"  - File: `{file_path}:{line}`")

        lines.append("")
        lines.append("## Call Graph")
        lines.append("")

        # Add call graph
        for graph in context.get("graphs", [])[:10]:
            func = graph.get("symbol", "unknown")
            lines.append(f"### {func}")

            calls = graph.get("calls", [])
            if calls:
                lines.append("**Calls:**")
                for c in calls[:5]:
                    lines.append(f"- `{c.get('function')}` in `{c.get('file')}`")

            called_by = graph.get("called_by", [])
            if called_by:
                lines.append("**Called by:**")
                for c in called_by[:5]:
                    lines.append(f"- `{c.get('function')}` in `{c.get('file')}`")

            lines.append("")

        lines.append("## Relevant Context")
        lines.append("")

        # Add embeddings context
        for emb in context.get("embeddings", [])[:5]:
            content = emb.get("content", "")[:500]
            score = emb.get("rrf_score", 0)
            lines.append(f"### Score: {score:.4f}")
            lines.append("```")
            lines.append(content)
            lines.append("```")
            lines.append("")

        return "\n".join(lines)

    def _extract_citations(self, context: dict[str, Any]) -> list[Citation]:
        """Extract citations from context."""
        citations = []

        for sym in context.get("symbols", []):
            span = sym.get("span", {})
            citations.append(Citation(
                file_path=sym.get("file_path", ""),
                line_start=span.get("start", 0),
                line_end=span.get("end", 0),
                content_preview=sym.get("signature", ""),
                symbol_name=sym.get("name"),
                relevance_score=1.0,
            ))

        for emb in context.get("embeddings", []):
            meta = emb.get("metadata", {})
            citations.append(Citation(
                file_path=meta.get("file_path", emb.get("object_id", "")),
                line_start=meta.get("line_start", 0),
                line_end=meta.get("line_end", 0),
                content_preview=emb.get("content", "")[:100],
                relevance_score=emb.get("rrf_score", 0),
            ))

        return citations

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars per token)."""
        return len(text) // 4

    async def close(self):
        await self._embeddings.close()


class HandoffLoader:
    """Load and parse handoff packs."""

    def __init__(self, atlas: Atlas):
        self.atlas = atlas

    async def load(self, repo_id: str, task_id: str) -> HandoffPack | None:
        """Load a handoff pack from Atlas."""
        doc = await self.atlas.get_handoff(repo_id, task_id)
        if not doc:
            return None

        citations = []
        for c in doc.get("citations", []):
            citations.append(Citation(**c))

        return HandoffPack(
            task=doc.get("task", ""),
            yaml_content=doc.get("yaml", ""),
            markdown_content=doc.get("markdown", ""),
            citations=citations,
            token_estimate=doc.get("token_estimate", 0),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
        )

    async def list_recent(self, repo_id: str, limit: int = 10) -> list[dict]:
        """List recent handoff packs."""
        handoffs = await self.atlas.list_handoffs(repo_id, limit)
        return [
            {
                "task_id": h.get("task_id"),
                "task": h.get("task"),
                "token_estimate": h.get("token_estimate"),
                "created_at": h.get("created_at"),
            }
            for h in handoffs
        ]
