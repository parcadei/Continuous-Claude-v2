"""MongoDB Atlas Backbone - Single Source of Truth.

Implements the full data model from PRD Section 6:
- repos: Repository metadata
- files: File tracking with SHA
- symbols: AST symbols (functions, classes, etc.)
- graphs: Call graphs, CFG, DFG, PDG
- handoffs: YAML/MD handoff packs
- runs: Workflow execution history
- embeddings: Vector embeddings for Atlas Vector Search

Usage:
    atlas = Atlas()
    await atlas.connect()

    # Store symbols from AST parsing
    await atlas.store_symbols(repo_id, symbols)

    # Hybrid search with RRF
    results = await atlas.search("authentication", query_embedding)

    # Store handoff pack
    await atlas.store_handoff(handoff)

    # Track workflow run
    run_id = await atlas.create_run("/fix", "Fix auth bug")
"""

import os
import hashlib
from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    HAS_MOTOR = True
except ImportError:
    HAS_MOTOR = False


GraphType = Literal["call", "cfg", "dfg", "pdg"]
SymbolKind = Literal["function", "class", "method", "variable", "import"]


class InMemoryStore:
    """In-memory fallback when MongoDB is unavailable.

    For demo/testing only - data is not persisted.
    """

    def __init__(self):
        self._collections: dict[str, list[dict]] = {
            "repos": [],
            "files": [],
            "symbols": [],
            "graphs": [],
            "handoffs": [],
            "runs": [],
            "embeddings": [],
            "file_claims": [],
        }

    def __getattr__(self, name: str):
        if name.startswith("_"):
            raise AttributeError(name)
        return InMemoryCollection(self._collections.setdefault(name, []))


class InMemoryCollection:
    """Simulates a MongoDB collection in memory."""

    def __init__(self, data: list[dict]):
        self._data = data

    async def insert_one(self, doc: dict):
        self._data.append(doc.copy())
        return type("InsertResult", (), {"inserted_id": doc.get("_id", str(uuid4()))})()

    async def find_one(self, query: dict):
        for doc in self._data:
            if all(doc.get(k) == v for k, v in query.items()):
                return doc.copy()
        return None

    async def find(self, query: dict = None):
        return InMemoryCursor([d for d in self._data if self._matches(d, query or {})])

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        for doc in self._data:
            if self._matches(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                return type("UpdateResult", (), {"modified_count": 1})()
        if upsert:
            new_doc = {**query, **update.get("$set", {})}
            self._data.append(new_doc)
            return type("UpdateResult", (), {"modified_count": 0, "upserted_id": str(uuid4())})()
        return type("UpdateResult", (), {"modified_count": 0})()

    async def delete_one(self, query: dict):
        for i, doc in enumerate(self._data):
            if self._matches(doc, query):
                self._data.pop(i)
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    async def create_index(self, *args, **kwargs):
        pass  # Indexes not needed for in-memory

    async def aggregate(self, pipeline: list):
        # Simplified aggregation - just return all for now
        return InMemoryCursor(self._data.copy())

    def _matches(self, doc: dict, query: dict) -> bool:
        for k, v in query.items():
            if isinstance(v, dict) and "$regex" in v:
                import re
                if not re.search(v["$regex"], str(doc.get(k, "")), re.IGNORECASE if v.get("$options") == "i" else 0):
                    return False
            elif doc.get(k) != v:
                return False
        return True


class InMemoryCursor:
    """Simulates a MongoDB cursor."""

    def __init__(self, data: list[dict]):
        self._data = data
        self._limit = None
        self._skip = 0

    def limit(self, n: int):
        self._limit = n
        return self

    def skip(self, n: int):
        self._skip = n
        return self

    def sort(self, *args):
        return self  # Ignore sorting for simplicity

    async def to_list(self, length: int = None):
        data = self._data[self._skip:]
        if self._limit:
            data = data[:self._limit]
        if length:
            data = data[:length]
        return data

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self._data:
            raise StopAsyncIteration
        return self._data.pop(0)


class Atlas:
    """MongoDB Atlas backbone for CCv3.

    All collections from PRD Section 6:
    - repos: {repo_id, name, root_path_hash, languages, created_at}
    - files: {repo_id, path, sha, last_indexed_at, language}
    - symbols: {repo_id, file_path, symbol_id, kind, name, signature, span}
    - graphs: {repo_id, graph_type, file_path, nodes, edges, version, computed_at}
    - handoffs: {repo_id, task_id, yaml, markdown, citations, token_estimates, created_at}
    - runs: {repo_id, run_id, command, plan, patches, validations, eval_results, status, commit_sha}
    - embeddings: {repo_id, object_type, object_id, vector, metadata}
    """

    def __init__(
        self,
        uri: str | None = None,
        db_name: str = "ccv3_hackathon",
    ):
        self.uri = uri or os.environ.get("MONGODB_URI") or os.environ.get("ATLAS_URI")
        self.db_name = db_name
        self._client = None
        self._db = None
        self._in_memory = False

    async def connect(self):
        """Connect to Atlas or use in-memory fallback."""
        # Try MongoDB first
        if self.uri and HAS_MOTOR:
            try:
                self._client = AsyncIOMotorClient(self.uri, serverSelectionTimeoutMS=5000)
                self._db = self._client[self.db_name]
                await self._client.admin.command("ping")
                print(f"✓ Connected to MongoDB Atlas: {self.db_name}")
                await self._create_indexes()
                return self
            except Exception as e:
                print(f"⚠ MongoDB connection failed: {e}")
                print("  Falling back to in-memory store (data not persisted)")

        # Fallback to in-memory
        self._in_memory = True
        self._db = InMemoryStore()
        print("✓ Using in-memory store (demo mode - data not persisted)")
        return self

    @property
    def is_in_memory(self) -> bool:
        """Check if using in-memory fallback."""
        return self._in_memory

    async def close(self):
        if self._client:
            self._client.close()

    async def _create_indexes(self):
        """Create all required indexes."""
        db = self._db

        # repos
        await db.repos.create_index("repo_id", unique=True)

        # files
        await db.files.create_index([("repo_id", 1), ("path", 1)], unique=True)
        await db.files.create_index("sha")

        # symbols
        await db.symbols.create_index([("repo_id", 1), ("symbol_id", 1)], unique=True)
        await db.symbols.create_index([("repo_id", 1), ("file_path", 1)])
        await db.symbols.create_index([("repo_id", 1), ("kind", 1)])
        await db.symbols.create_index([("repo_id", 1), ("name", 1)])

        # graphs
        await db.graphs.create_index([("repo_id", 1), ("graph_type", 1), ("file_path", 1)])

        # handoffs
        await db.handoffs.create_index([("repo_id", 1), ("task_id", 1)], unique=True)
        await db.handoffs.create_index("created_at")

        # runs
        await db.runs.create_index("run_id", unique=True)
        await db.runs.create_index([("repo_id", 1), ("created_at", -1)])

        # embeddings
        await db.embeddings.create_index([("repo_id", 1), ("object_type", 1), ("object_id", 1)])

        # file_claims (for parallel sessions)
        await db.file_claims.create_index([("repo_id", 1), ("file_path", 1)], unique=True)
        await db.file_claims.create_index("expires_at", expireAfterSeconds=0)

    # =========================================================================
    # Repos
    # =========================================================================

    async def register_repo(
        self,
        name: str,
        root_path: str,
        languages: list[str] | None = None,
    ) -> str:
        """Register a repository."""
        root_hash = hashlib.sha256(root_path.encode()).hexdigest()[:16]
        repo_id = f"{name}-{root_hash}"

        await self._db.repos.update_one(
            {"repo_id": repo_id},
            {
                "$set": {
                    "name": name,
                    "root_path_hash": root_hash,
                    "languages": languages or [],
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )
        return repo_id

    # =========================================================================
    # Files
    # =========================================================================

    async def track_file(
        self,
        repo_id: str,
        path: str,
        sha: str,
        language: str | None = None,
    ):
        """Track a file in the index."""
        await self._db.files.update_one(
            {"repo_id": repo_id, "path": path},
            {
                "$set": {
                    "sha": sha,
                    "language": language,
                    "last_indexed_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )

    async def get_changed_files(self, repo_id: str, file_shas: dict[str, str]) -> list[str]:
        """Get files that have changed since last index."""
        changed = []
        for path, sha in file_shas.items():
            doc = await self._db.files.find_one({"repo_id": repo_id, "path": path})
            if not doc or doc.get("sha") != sha:
                changed.append(path)
        return changed

    # =========================================================================
    # Symbols (AST Layer)
    # =========================================================================

    async def store_symbols(
        self,
        repo_id: str,
        file_path: str,
        symbols: list[dict[str, Any]],
    ):
        """Store AST symbols for a file.

        Each symbol: {kind, name, signature, span: {start, end}}
        """
        # Clear old symbols for this file
        await self._db.symbols.delete_many({"repo_id": repo_id, "file_path": file_path})

        if not symbols:
            return

        docs = []
        for sym in symbols:
            symbol_id = f"{file_path}:{sym['name']}:{sym.get('span', {}).get('start', 0)}"
            docs.append({
                "repo_id": repo_id,
                "file_path": file_path,
                "symbol_id": symbol_id,
                "kind": sym.get("kind", "unknown"),
                "name": sym["name"],
                "signature": sym.get("signature", ""),
                "span": sym.get("span", {}),
                "docstring": sym.get("docstring", ""),
            })

        if docs:
            await self._db.symbols.insert_many(docs)

    async def get_symbols(
        self,
        repo_id: str,
        file_path: str | None = None,
        kind: SymbolKind | None = None,
        name_pattern: str | None = None,
    ) -> list[dict]:
        """Query symbols."""
        query: dict[str, Any] = {"repo_id": repo_id}
        if file_path:
            query["file_path"] = file_path
        if kind:
            query["kind"] = kind
        if name_pattern:
            query["name"] = {"$regex": name_pattern, "$options": "i"}

        cursor = self._db.symbols.find(query)
        return [doc async for doc in cursor]

    # =========================================================================
    # Graphs (Call Graph, CFG, DFG, PDG)
    # =========================================================================

    async def store_graph(
        self,
        repo_id: str,
        graph_type: GraphType,
        file_path: str,
        nodes: list[dict],
        edges: list[dict],
        version: str = "1",
    ):
        """Store a graph (call, cfg, dfg, pdg)."""
        await self._db.graphs.update_one(
            {"repo_id": repo_id, "graph_type": graph_type, "file_path": file_path},
            {
                "$set": {
                    "nodes": nodes,
                    "edges": edges,
                    "version": version,
                    "computed_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )

    async def get_graph(
        self,
        repo_id: str,
        graph_type: GraphType,
        file_path: str,
    ) -> dict | None:
        """Get a stored graph."""
        return await self._db.graphs.find_one({
            "repo_id": repo_id,
            "graph_type": graph_type,
            "file_path": file_path,
        })

    async def query_call_graph(
        self,
        repo_id: str,
        function_name: str,
        direction: Literal["forward", "backward"] = "forward",
        depth: int = 2,
    ) -> list[dict]:
        """Query call graph - what does X call, or what calls X."""
        # Get all call graphs
        cursor = self._db.graphs.find({"repo_id": repo_id, "graph_type": "call"})

        results = []
        visited = set()

        async for graph in cursor:
            edges = graph.get("edges", [])
            for edge in edges:
                if direction == "forward" and edge.get("from") == function_name:
                    if edge.get("to") not in visited:
                        visited.add(edge.get("to"))
                        results.append({
                            "function": edge.get("to"),
                            "file": graph.get("file_path"),
                            "direction": "calls",
                        })
                elif direction == "backward" and edge.get("to") == function_name:
                    if edge.get("from") not in visited:
                        visited.add(edge.get("from"))
                        results.append({
                            "function": edge.get("from"),
                            "file": graph.get("file_path"),
                            "direction": "called_by",
                        })

        return results

    # =========================================================================
    # Embeddings (Atlas Vector Search)
    # =========================================================================

    async def store_embedding(
        self,
        repo_id: str,
        object_type: Literal["symbol", "graph_slice", "handoff", "file"],
        object_id: str,
        vector: list[float],
        content: str,
        metadata: dict | None = None,
    ):
        """Store embedding for vector search."""
        await self._db.embeddings.update_one(
            {"repo_id": repo_id, "object_type": object_type, "object_id": object_id},
            {
                "$set": {
                    "vector": vector,
                    "content": content,
                    "metadata": metadata or {},
                    "updated_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )

    async def vector_search(
        self,
        repo_id: str,
        query_vector: list[float],
        object_type: str | None = None,
        limit: int = 10,
        index_name: str = "vector_index",
    ) -> list[dict]:
        """Atlas Vector Search query."""
        filter_doc = {"repo_id": repo_id}
        if object_type:
            filter_doc["object_type"] = object_type

        pipeline = [
            {
                "$vectorSearch": {
                    "index": index_name,
                    "path": "vector",
                    "queryVector": query_vector,
                    "numCandidates": limit * 10,
                    "limit": limit,
                    "filter": filter_doc,
                }
            },
            {
                "$project": {
                    "object_type": 1,
                    "object_id": 1,
                    "content": 1,
                    "metadata": 1,
                    "score": {"$meta": "vectorSearchScore"},
                }
            },
        ]

        results = []
        try:
            async for doc in self._db.embeddings.aggregate(pipeline):
                results.append(doc)
        except Exception as e:
            # Vector index might not exist, fall back to text search
            print(f"Vector search failed (index may not exist): {e}")

        return results

    async def hybrid_search(
        self,
        repo_id: str,
        query: str,
        query_vector: list[float],
        object_type: str | None = None,
        limit: int = 10,
        rrf_k: int = 60,
    ) -> list[dict]:
        """Hybrid search with Reciprocal Rank Fusion.

        Combines text search + vector search for better results.
        This is the KEY feature for MongoDB judges.
        """
        # Text search
        text_query: dict[str, Any] = {
            "repo_id": repo_id,
            "content": {"$regex": query, "$options": "i"},
        }
        if object_type:
            text_query["object_type"] = object_type

        text_cursor = self._db.embeddings.find(text_query).limit(limit * 2)
        text_results = [doc async for doc in text_cursor]

        # Vector search
        vector_results = await self.vector_search(
            repo_id, query_vector, object_type, limit * 2
        )

        # RRF fusion
        scores: dict[str, float] = {}
        doc_map: dict[str, dict] = {}

        for rank, doc in enumerate(text_results):
            doc_id = str(doc.get("object_id", doc.get("_id")))
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (rrf_k + rank + 1)
            doc_map[doc_id] = doc

        for rank, doc in enumerate(vector_results):
            doc_id = str(doc.get("object_id", doc.get("_id")))
            scores[doc_id] = scores.get(doc_id, 0) + 1.0 / (rrf_k + rank + 1)
            doc_map[doc_id] = doc

        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

        results = []
        for doc_id in sorted_ids[:limit]:
            doc = doc_map[doc_id]
            doc["rrf_score"] = scores[doc_id]
            results.append(doc)

        return results

    # =========================================================================
    # Handoffs (Context Packs)
    # =========================================================================

    async def store_handoff(
        self,
        repo_id: str,
        task: str,
        yaml_content: str,
        markdown_content: str,
        citations: list[dict] | None = None,
        token_estimate: int | None = None,
        inputs: dict | None = None,
    ) -> str:
        """Store a handoff pack."""
        task_id = hashlib.sha256(f"{repo_id}:{task}".encode()).hexdigest()[:16]

        await self._db.handoffs.update_one(
            {"repo_id": repo_id, "task_id": task_id},
            {
                "$set": {
                    "task": task,
                    "yaml": yaml_content,
                    "markdown": markdown_content,
                    "citations": citations or [],
                    "token_estimate": token_estimate,
                    "inputs": inputs or {},
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )
        return task_id

    async def get_handoff(self, repo_id: str, task_id: str) -> dict | None:
        """Get a handoff pack."""
        return await self._db.handoffs.find_one({"repo_id": repo_id, "task_id": task_id})

    async def list_handoffs(self, repo_id: str, limit: int = 20) -> list[dict]:
        """List recent handoffs."""
        cursor = self._db.handoffs.find({"repo_id": repo_id}).sort("created_at", -1).limit(limit)
        return [doc async for doc in cursor]

    # =========================================================================
    # Runs (Workflow Execution)
    # =========================================================================

    async def create_run(
        self,
        repo_id: str,
        command: str,
        description: str | None = None,
    ) -> str:
        """Create a workflow run."""
        run_id = str(uuid4())[:8]

        await self._db.runs.insert_one({
            "run_id": run_id,
            "repo_id": repo_id,
            "command": command,
            "description": description,
            "status": "running",
            "plan": None,
            "patches": [],
            "validations": [],
            "eval_results": None,
            "commit_sha": None,
            "created_at": datetime.now(timezone.utc),
        })
        return run_id

    async def update_run(
        self,
        run_id: str,
        status: str | None = None,
        plan: dict | None = None,
        patches: list[dict] | None = None,
        validations: list[dict] | None = None,
        eval_results: dict | None = None,
        commit_sha: str | None = None,
    ):
        """Update a workflow run."""
        update: dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}

        if status:
            update["status"] = status
        if plan:
            update["plan"] = plan
        if patches:
            update["patches"] = patches
        if validations:
            update["validations"] = validations
        if eval_results:
            update["eval_results"] = eval_results
        if commit_sha:
            update["commit_sha"] = commit_sha

        await self._db.runs.update_one({"run_id": run_id}, {"$set": update})

    async def get_run(self, run_id: str) -> dict | None:
        """Get a workflow run."""
        return await self._db.runs.find_one({"run_id": run_id})

    async def list_runs(self, repo_id: str, limit: int = 20) -> list[dict]:
        """List recent runs."""
        cursor = self._db.runs.find({"repo_id": repo_id}).sort("created_at", -1).limit(limit)
        return [doc async for doc in cursor]

    # =========================================================================
    # File Claims (Parallel Sessions)
    # =========================================================================

    async def claim_file(
        self,
        repo_id: str,
        file_path: str,
        session_id: str,
        ttl_seconds: int = 300,
    ) -> bool:
        """Claim a file for editing (prevents parallel conflicts)."""
        try:
            await self._db.file_claims.insert_one({
                "repo_id": repo_id,
                "file_path": file_path,
                "session_id": session_id,
                "claimed_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc),  # TTL index handles expiry
            })
            return True
        except Exception:
            # File already claimed
            existing = await self._db.file_claims.find_one({
                "repo_id": repo_id,
                "file_path": file_path,
            })
            if existing and existing.get("session_id") == session_id:
                return True
            return False

    async def release_file(self, repo_id: str, file_path: str, session_id: str):
        """Release a file claim."""
        await self._db.file_claims.delete_one({
            "repo_id": repo_id,
            "file_path": file_path,
            "session_id": session_id,
        })

    async def get_sessions(self, repo_id: str) -> list[dict]:
        """Get active sessions with their file claims."""
        cursor = self._db.file_claims.find({"repo_id": repo_id})
        claims = [doc async for doc in cursor]

        sessions: dict[str, list[str]] = {}
        for claim in claims:
            sid = claim.get("session_id", "unknown")
            if sid not in sessions:
                sessions[sid] = []
            sessions[sid].append(claim.get("file_path", ""))

        return [{"session_id": sid, "files": files} for sid, files in sessions.items()]
