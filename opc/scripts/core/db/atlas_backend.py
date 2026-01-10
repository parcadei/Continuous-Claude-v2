"""MongoDB Atlas backend for memory storage.

Hackathon integration replacing PostgreSQL with MongoDB Atlas.

Features:
- MongoDB Atlas Vector Search for semantic retrieval
- Change Streams for real-time sync
- Flexible document schema
- Global distribution

Atlas Docs: https://www.mongodb.com/docs/atlas/

Usage:
    backend = AtlasMemoryBackend()
    await backend.connect()

    # Store with embedding
    memory_id = await backend.store(
        content="Important learning",
        metadata={"type": "session_learning"},
        embedding=[0.1, 0.2, ...]
    )

    # Vector search
    results = await backend.vector_search(
        query_embedding=[0.1, 0.2, ...],
        limit=10
    )
"""

from __future__ import annotations

import os
import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

try:
    from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
    from pymongo import ASCENDING, DESCENDING
    from pymongo.errors import ConnectionFailure, OperationFailure
    HAS_MOTOR = True
except ImportError:
    HAS_MOTOR = False
    AsyncIOMotorClient = None
    AsyncIOMotorDatabase = None


class AtlasError(Exception):
    """Error from Atlas operations."""
    pass


class AtlasMemoryBackend:
    """MongoDB Atlas memory backend.

    Implements the MemoryBackend protocol for Atlas.

    Collections:
    - archival_memory: Long-term learnings with vector embeddings
    - core_memory: Key-value state storage
    - sessions: Session tracking
    - handoffs: Session handoffs
    - runs: Workflow run history

    Requires:
    - MONGODB_URI or ATLAS_URI environment variable
    - motor package: pip install motor

    Vector Search Index (create in Atlas UI):
    - Index name: "vector_index"
    - Field: "embedding"
    - Dimensions: 1024 (for Jina/Voyage) or 1536 (for OpenAI)
    - Similarity: "cosine"
    """

    DEFAULT_DB_NAME = "continuous_claude"
    EMBEDDING_DIMENSION = 1024  # Jina v3 / Voyage default

    def __init__(
        self,
        uri: str | None = None,
        db_name: str | None = None,
        embedding_dimension: int = EMBEDDING_DIMENSION,
    ):
        """Initialize Atlas backend.

        Args:
            uri: MongoDB connection URI (defaults to MONGODB_URI or ATLAS_URI env var)
            db_name: Database name (defaults to continuous_claude)
            embedding_dimension: Dimension for vector embeddings
        """
        if not HAS_MOTOR:
            raise ImportError(
                "motor package required for Atlas backend. "
                "Install with: pip install motor"
            )

        self.uri = uri or os.environ.get("MONGODB_URI") or os.environ.get("ATLAS_URI")
        if not self.uri:
            raise ValueError(
                "MONGODB_URI or ATLAS_URI environment variable required"
            )

        self.db_name = db_name or os.environ.get("ATLAS_DB_NAME", self.DEFAULT_DB_NAME)
        self.embedding_dimension = embedding_dimension

        self._client: AsyncIOMotorClient | None = None
        self._db: AsyncIOMotorDatabase | None = None

    async def connect(self) -> None:
        """Initialize connection to Atlas."""
        if self._client is not None:
            return

        self._client = AsyncIOMotorClient(self.uri)
        self._db = self._client[self.db_name]

        # Verify connection
        try:
            await self._client.admin.command("ping")
        except ConnectionFailure as e:
            raise AtlasError(f"Failed to connect to Atlas: {e}")

        # Create indexes
        await self._ensure_indexes()

    async def close(self) -> None:
        """Close connection."""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None

    async def _ensure_indexes(self) -> None:
        """Create required indexes."""
        db = self._db

        # archival_memory indexes
        await db.archival_memory.create_index([("session_id", ASCENDING)])
        await db.archival_memory.create_index([("created_at", DESCENDING)])
        await db.archival_memory.create_index([("metadata.type", ASCENDING)])

        # core_memory indexes
        await db.core_memory.create_index(
            [("session_id", ASCENDING), ("key", ASCENDING)],
            unique=True
        )

        # sessions indexes
        await db.sessions.create_index([("session_id", ASCENDING)], unique=True)
        await db.sessions.create_index([("last_heartbeat", DESCENDING)])

        # runs indexes
        await db.runs.create_index([("run_id", ASCENDING)], unique=True)
        await db.runs.create_index([("created_at", DESCENDING)])

    # =========================================================================
    # Archival Memory Operations
    # =========================================================================

    async def store(
        self,
        content: str,
        metadata: dict[str, Any] | None = None,
        embedding: list[float] | None = None,
        session_id: str = "default",
    ) -> str:
        """Store content in archival memory.

        Args:
            content: Content to store
            metadata: Optional metadata dictionary
            embedding: Optional embedding vector
            session_id: Session identifier

        Returns:
            Memory ID (UUID)
        """
        memory_id = str(uuid4())

        doc = {
            "_id": memory_id,
            "session_id": session_id,
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
        }

        if embedding:
            doc["embedding"] = embedding

        await self._db.archival_memory.insert_one(doc)
        return memory_id

    async def search(
        self,
        query: str,
        limit: int = 10,
        session_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Text search in archival memory.

        Args:
            query: Search query
            limit: Maximum results
            session_id: Optional session filter

        Returns:
            List of matching documents
        """
        filter_doc: dict[str, Any] = {
            "$text": {"$search": query}
        }

        if session_id:
            filter_doc["session_id"] = session_id

        try:
            cursor = self._db.archival_memory.find(
                filter_doc,
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit)

            results = []
            async for doc in cursor:
                results.append({
                    "id": doc["_id"],
                    "session_id": doc.get("session_id"),
                    "content": doc["content"],
                    "metadata": doc.get("metadata", {}),
                    "created_at": doc.get("created_at"),
                    "similarity": doc.get("score", 0),
                })
            return results
        except OperationFailure:
            # Text index might not exist, fall back to regex
            filter_doc = {"content": {"$regex": query, "$options": "i"}}
            if session_id:
                filter_doc["session_id"] = session_id

            cursor = self._db.archival_memory.find(filter_doc).limit(limit)
            results = []
            async for doc in cursor:
                results.append({
                    "id": doc["_id"],
                    "session_id": doc.get("session_id"),
                    "content": doc["content"],
                    "metadata": doc.get("metadata", {}),
                    "created_at": doc.get("created_at"),
                    "similarity": 0.5,
                })
            return results

    async def vector_search(
        self,
        query_embedding: list[float],
        limit: int = 10,
        num_candidates: int = 150,
        filter_doc: dict[str, Any] | None = None,
        index_name: str = "vector_index",
    ) -> list[dict[str, Any]]:
        """Vector similarity search using Atlas Vector Search.

        Requires a vector search index to be created in Atlas UI.

        Args:
            query_embedding: Query vector
            limit: Number of results
            num_candidates: Candidates for ANN search
            filter_doc: Optional pre-filter
            index_name: Vector search index name

        Returns:
            List of documents with similarity scores
        """
        pipeline = [
            {
                "$vectorSearch": {
                    "index": index_name,
                    "path": "embedding",
                    "queryVector": query_embedding,
                    "numCandidates": num_candidates,
                    "limit": limit,
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "session_id": 1,
                    "content": 1,
                    "metadata": 1,
                    "created_at": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]

        if filter_doc:
            pipeline[0]["$vectorSearch"]["filter"] = filter_doc

        results = []
        async for doc in self._db.archival_memory.aggregate(pipeline):
            results.append({
                "id": doc["_id"],
                "session_id": doc.get("session_id"),
                "content": doc["content"],
                "metadata": doc.get("metadata", {}),
                "created_at": doc.get("created_at"),
                "similarity": doc.get("score", 0),
            })

        return results

    async def delete_archival(self, memory_id: str) -> None:
        """Delete an archival memory entry."""
        await self._db.archival_memory.delete_one({"_id": memory_id})

    # =========================================================================
    # Core Memory Operations (Key-Value)
    # =========================================================================

    async def set_core(
        self,
        key: str,
        value: str,
        session_id: str = "default",
    ) -> None:
        """Set a core memory block."""
        await self._db.core_memory.update_one(
            {"session_id": session_id, "key": key},
            {
                "$set": {
                    "value": value,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )

    async def get_core(
        self,
        key: str,
        session_id: str = "default",
    ) -> str | None:
        """Get a core memory block."""
        doc = await self._db.core_memory.find_one({
            "session_id": session_id,
            "key": key,
        })
        return doc["value"] if doc else None

    async def list_core_keys(self, session_id: str = "default") -> list[str]:
        """List all core memory keys."""
        cursor = self._db.core_memory.find(
            {"session_id": session_id},
            {"key": 1}
        )
        return [doc["key"] async for doc in cursor]

    async def delete_core(
        self,
        key: str,
        session_id: str = "default",
    ) -> None:
        """Delete a core memory block."""
        await self._db.core_memory.delete_one({
            "session_id": session_id,
            "key": key,
        })

    async def get_all_core(self, session_id: str = "default") -> dict[str, str]:
        """Get all core memory blocks."""
        cursor = self._db.core_memory.find({"session_id": session_id})
        return {doc["key"]: doc["value"] async for doc in cursor}

    # =========================================================================
    # Session Operations
    # =========================================================================

    async def register_session(
        self,
        session_id: str,
        project: str | None = None,
        working_on: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Register or update a session."""
        await self._db.sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "project": project,
                    "working_on": working_on,
                    "metadata": metadata or {},
                    "last_heartbeat": datetime.now(timezone.utc),
                },
                "$setOnInsert": {
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )

    async def heartbeat(self, session_id: str) -> None:
        """Update session heartbeat."""
        await self._db.sessions.update_one(
            {"session_id": session_id},
            {"$set": {"last_heartbeat": datetime.now(timezone.utc)}},
        )

    async def get_active_sessions(self, minutes: int = 5) -> list[dict[str, Any]]:
        """Get sessions with recent heartbeats."""
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)

        cursor = self._db.sessions.find({
            "last_heartbeat": {"$gt": cutoff}
        })

        return [doc async for doc in cursor]

    # =========================================================================
    # Run Tracking
    # =========================================================================

    async def create_run(
        self,
        run_id: str,
        command: str,
        session_id: str = "default",
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Create a new workflow run."""
        doc = {
            "_id": run_id,
            "run_id": run_id,
            "session_id": session_id,
            "command": command,
            "status": "running",
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
            "steps": [],
            "eval_results": None,
        }

        await self._db.runs.insert_one(doc)
        return run_id

    async def update_run(
        self,
        run_id: str,
        status: str | None = None,
        steps: list[dict[str, Any]] | None = None,
        eval_results: dict[str, Any] | None = None,
        commit_sha: str | None = None,
    ) -> None:
        """Update a workflow run."""
        update: dict[str, Any] = {
            "updated_at": datetime.now(timezone.utc),
        }

        if status:
            update["status"] = status
        if steps:
            update["steps"] = steps
        if eval_results:
            update["eval_results"] = eval_results
        if commit_sha:
            update["commit_sha"] = commit_sha

        await self._db.runs.update_one(
            {"run_id": run_id},
            {"$set": update}
        )

    async def get_run(self, run_id: str) -> dict[str, Any] | None:
        """Get a workflow run by ID."""
        return await self._db.runs.find_one({"run_id": run_id})

    async def list_runs(
        self,
        limit: int = 20,
        session_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """List recent workflow runs."""
        filter_doc = {}
        if session_id:
            filter_doc["session_id"] = session_id

        cursor = self._db.runs.find(filter_doc).sort(
            "created_at", DESCENDING
        ).limit(limit)

        return [doc async for doc in cursor]

    # =========================================================================
    # Handoff Storage
    # =========================================================================

    async def store_handoff(
        self,
        handoff_id: str,
        session_id: str,
        yaml_content: str,
        markdown_content: str | None = None,
        embedding: list[float] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Store a session handoff."""
        doc = {
            "_id": handoff_id,
            "session_id": session_id,
            "yaml_content": yaml_content,
            "markdown_content": markdown_content,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
        }

        if embedding:
            doc["embedding"] = embedding

        await self._db.handoffs.insert_one(doc)
        return handoff_id

    async def get_latest_handoff(
        self,
        session_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Get the most recent handoff."""
        filter_doc = {}
        if session_id:
            filter_doc["session_id"] = session_id

        return await self._db.handoffs.find_one(
            filter_doc,
            sort=[("created_at", DESCENDING)]
        )

    # =========================================================================
    # Protocol Methods
    # =========================================================================

    async def recall(
        self,
        query: str,
        include_core: bool = True,
        limit: int = 5,
        session_id: str = "default",
    ) -> str:
        """Recall relevant memories for a query."""
        parts = []

        if include_core:
            core = await self.get_all_core(session_id)
            if core:
                parts.append("## Core Memory")
                for key, value in core.items():
                    parts.append(f"### {key}\n{value}")

        archival = await self.search(query, limit=limit, session_id=session_id)
        if archival:
            parts.append("\n## Relevant Archival Memory")
            for mem in archival:
                parts.append(f"- {mem['content'][:200]}...")

        return "\n".join(parts) if parts else "No relevant memories found."

    async def to_context(
        self,
        max_archival: int = 10,
        session_id: str = "default",
    ) -> str:
        """Convert memory state to context string."""
        parts = []

        core = await self.get_all_core(session_id)
        if core:
            parts.append("## Core Memory")
            for key, value in core.items():
                parts.append(f"### {key}\n{value}")

        cursor = self._db.archival_memory.find(
            {"session_id": session_id}
        ).sort("created_at", DESCENDING).limit(max_archival)

        archival_parts = []
        async for doc in cursor:
            archival_parts.append(f"- {doc['content'][:200]}...")

        if archival_parts:
            parts.append("\n## Recent Archival Memory")
            parts.extend(archival_parts)

        return "\n".join(parts) if parts else "Memory is empty."


# Factory function for backend selection
def get_atlas_backend() -> AtlasMemoryBackend:
    """Get an Atlas memory backend instance.

    Checks for MONGODB_URI or ATLAS_URI in environment.
    """
    return AtlasMemoryBackend()
