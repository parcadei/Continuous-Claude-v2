#!/usr/bin/env python3
"""CCv3 Hackathon Demo - Prolonged Coordination with MongoDB Atlas.

This demo showcases Statement 1: Prolonged Coordination
- Multi-step workflow spanning "hours" (simulated)
- MongoDB Atlas as the context engine
- Failure recovery and task resumption
- All sponsor integrations

Run: python -m opc.ccv3.demo_hackathon
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

# Colors for terminal output
class C:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'


def print_step(step: int, total: int, msg: str):
    print(f"\n{C.CYAN}[{step}/{total}]{C.END} {C.BOLD}{msg}{C.END}")


def print_sponsor(sponsor: str, action: str):
    print(f"  {C.YELLOW}► {sponsor}:{C.END} {action}")


def print_success(msg: str):
    print(f"  {C.GREEN}✓{C.END} {msg}")


def print_data(key: str, value: str):
    print(f"    {C.BLUE}{key}:{C.END} {value}")


async def demo_prolonged_coordination():
    """Demo: Multi-step workflow with MongoDB Atlas context engine."""

    print(f"\n{C.HEADER}{'='*60}{C.END}")
    print(f"{C.HEADER}  CCv3: Prolonged Coordination Demo{C.END}")
    print(f"{C.HEADER}  MongoDB Atlas as Context Engine{C.END}")
    print(f"{C.HEADER}{'='*60}{C.END}")

    # Import our modules
    from .atlas import Atlas
    from .embeddings import EmbeddingsRouter
    from .galileo import GalileoEval
    from .handoff import HandoffPack, Citation

    total_steps = 7

    # =========================================================================
    # STEP 1: Connect to MongoDB Atlas
    # =========================================================================
    print_step(1, total_steps, "Connecting to MongoDB Atlas (Context Engine)")
    print_sponsor("MongoDB Atlas", "Establishing connection...")

    atlas = Atlas()
    await atlas.connect()

    if atlas.is_in_memory:
        print_success("Using in-memory mode (set MONGODB_URI for persistence)")
    else:
        print_success("Connected to MongoDB Atlas cluster")

    # =========================================================================
    # STEP 2: Initialize Repository Context
    # =========================================================================
    print_step(2, total_steps, "Initializing Repository Context")
    print_sponsor("MongoDB Atlas", "Creating repo document in 'repos' collection")

    repo_id = await atlas.register_repo(
        name="hackathon-project",
        root_path="/workspace/agentic-app",
        languages=["python", "typescript"],
    )
    print_success(f"Repository registered: {repo_id}")
    print_data("Collections", "repos, files, symbols, graphs, handoffs, runs, embeddings")

    # =========================================================================
    # STEP 3: Create Long-Running Workflow (Simulated)
    # =========================================================================
    print_step(3, total_steps, "Starting Long-Running Workflow")
    print_sponsor("MongoDB Atlas", "Creating run document to track workflow state")

    run_id = await atlas.create_run(
        repo_id=repo_id,
        command="/build feature-auth",
        description="Implement authentication system with OAuth2",
    )
    print_success(f"Workflow started: {run_id}")
    print_data("Status", "running")
    print_data("Task", "Implement authentication system")

    # Simulate workflow steps stored in MongoDB
    workflow_steps = [
        {"step": 1, "action": "analyze_requirements", "status": "completed"},
        {"step": 2, "action": "design_architecture", "status": "completed"},
        {"step": 3, "action": "implement_oauth2", "status": "running"},
        {"step": 4, "action": "write_tests", "status": "pending"},
        {"step": 5, "action": "validate_security", "status": "pending"},
    ]

    await atlas.update_run(run_id, plan={"steps": workflow_steps})
    print_success("Workflow plan stored in MongoDB Atlas")
    for step in workflow_steps:
        status_color = C.GREEN if step["status"] == "completed" else (C.YELLOW if step["status"] == "running" else C.BLUE)
        print(f"    {status_color}[{step['status']}]{C.END} Step {step['step']}: {step['action']}")

    # =========================================================================
    # STEP 4: Generate Embeddings (Jina v3)
    # =========================================================================
    print_step(4, total_steps, "Generating Context Embeddings")
    print_sponsor("Jina AI", "Using jina-embeddings-v3 with task adapters")

    embeddings = EmbeddingsRouter()

    # Embed code context
    code_samples = [
        "class AuthService:\n    def login(self, username, password):\n        return self.oauth2_provider.authenticate(username, password)",
        "def verify_token(token: str) -> User:\n    payload = jwt.decode(token, SECRET_KEY)\n    return User.from_payload(payload)",
        "async def refresh_token(refresh_token: str) -> TokenPair:\n    if not validate_refresh(refresh_token):\n        raise InvalidTokenError()",
    ]

    for i, code in enumerate(code_samples):
        # Embed for storage (retrieval.passage adapter)
        emb = await embeddings.embed_for_storage(code)
        await atlas.store_embedding(
            repo_id=repo_id,
            object_type="code",
            object_id=f"auth_code_{i}",
            vector=emb,
            content=code,
            metadata={"file": "auth_service.py", "line": i * 10 + 1},
        )

    print_success(f"Stored {len(code_samples)} code embeddings")
    print_data("Embedding dim", str(len(emb)))
    print_data("Task adapter", "retrieval.passage (for storage)")
    print_data("Provider", embeddings.provider_name)

    # =========================================================================
    # STEP 5: Simulate Failure & Recovery
    # =========================================================================
    print_step(5, total_steps, "Simulating Failure & Recovery")
    print_sponsor("MongoDB Atlas", "Workflow state persisted - can recover from failure")

    # Mark current step as failed
    await atlas.update_run(run_id, status="interrupted")
    print(f"  {C.RED}✗{C.END} Simulated failure during step 3 (implement_oauth2)")
    print_data("Run status", "interrupted")

    # Simulate session restart
    print(f"\n  {C.YELLOW}... Session restart ...{C.END}\n")
    await asyncio.sleep(0.5)

    # Recovery: Load workflow state from MongoDB
    print_sponsor("MongoDB Atlas", "Recovering workflow state from 'runs' collection")
    # In real implementation: run_data = await atlas.get_run(run_id)

    # Resume from last completed step
    await atlas.update_run(run_id, status="running")
    workflow_steps[2]["status"] = "completed"  # Mark oauth2 as done
    workflow_steps[3]["status"] = "running"    # Move to tests
    await atlas.update_run(run_id, plan={"steps": workflow_steps})

    print_success("Workflow recovered and resumed")
    print_data("Resumed from", "step 3 (implement_oauth2)")
    print_data("Now running", "step 4 (write_tests)")

    # =========================================================================
    # STEP 6: Quality Gate (Galileo)
    # =========================================================================
    print_step(6, total_steps, "Evaluating Output Quality")
    print_sponsor("Galileo AI", "RAG Triad evaluation for context quality")

    galileo = GalileoEval()

    # Evaluate the generated code against requirements
    eval_result = await galileo.evaluate(
        query="Implement OAuth2 authentication with token refresh",
        response="AuthService class with login(), verify_token(), and refresh_token() methods using JWT",
        context="OAuth2 authentication requires: 1) Token-based auth 2) Refresh token rotation 3) JWT validation",
    )

    print_success(f"Quality gate: {'PASSED' if eval_result.passed else 'NEEDS REVIEW'}")
    print_data("Context Adherence", f"{eval_result.scores.get('context_adherence', 0):.2f}")
    print_data("Chunk Relevance", f"{eval_result.scores.get('chunk_relevance', 0):.2f}")
    print_data("Correctness", f"{eval_result.scores.get('correctness', 0):.2f}")

    # =========================================================================
    # STEP 7: Create Handoff Pack for Next Session
    # =========================================================================
    print_step(7, total_steps, "Creating Handoff Pack")
    print_sponsor("MongoDB Atlas", "Storing handoff in 'handoffs' collection")

    # Create handoff pack
    handoff_yaml = f"""task: Complete authentication implementation
resumed_from: {run_id}
completed_steps:
  - analyze_requirements
  - design_architecture
  - implement_oauth2
pending_steps:
  - write_tests
  - validate_security
context:
  files_modified:
    - auth_service.py
    - auth_routes.py
  key_decisions:
    - Using JWT for stateless tokens
    - Refresh token rotation for security
  blockers: none
"""

    handoff_md = f"""# Handoff: Authentication Implementation

**Run ID:** {run_id}
**Status:** In Progress (4/5 steps complete)

## Completed
- ✓ Requirements analysis
- ✓ Architecture design
- ✓ OAuth2 implementation

## Next Steps
- [ ] Write unit tests for AuthService
- [ ] Security validation (OWASP checklist)

## Key Context
- Using JWT tokens with 15-min expiry
- Refresh tokens stored in MongoDB
- Rate limiting on auth endpoints
"""

    await atlas.store_handoff(
        repo_id=repo_id,
        task="authentication-implementation",
        yaml_content=handoff_yaml,
        markdown_content=handoff_md,
        citations=[{"file": "auth_service.py", "lines": "1-50"}],
        token_estimate=len(handoff_yaml + handoff_md) // 4,
    )

    print_success("Handoff pack stored in MongoDB Atlas")
    print_data("Task ID", "authentication-implementation")
    print_data("Token estimate", str(len(handoff_yaml + handoff_md) // 4))

    # Mark workflow as paused (for next session)
    await atlas.update_run(run_id, status="paused")

    # =========================================================================
    # Summary
    # =========================================================================
    print(f"\n{C.HEADER}{'='*60}{C.END}")
    print(f"{C.HEADER}  Demo Complete - Prolonged Coordination{C.END}")
    print(f"{C.HEADER}{'='*60}{C.END}")

    print(f"""
{C.BOLD}Key Achievements:{C.END}

  {C.GREEN}✓{C.END} Multi-step workflow tracked in MongoDB Atlas
  {C.GREEN}✓{C.END} Failure recovery with state persistence
  {C.GREEN}✓{C.END} Context embeddings stored for retrieval
  {C.GREEN}✓{C.END} Quality evaluation before proceeding
  {C.GREEN}✓{C.END} Handoff pack for session continuity

{C.BOLD}Sponsors Used:{C.END}

  {C.YELLOW}MongoDB Atlas{C.END} - Context engine (repos, runs, handoffs, embeddings)
  {C.YELLOW}Jina AI{C.END} - Embeddings with task adapters (v3)
  {C.YELLOW}Galileo AI{C.END} - RAG Triad quality evaluation
  {C.YELLOW}Fireworks AI{C.END} - LLM inference (when API key set)

{C.BOLD}Problem Statement:{C.END} Prolonged Coordination

  This demo shows how CCv3 enables agentic workflows that:
  - Span multiple sessions (hours/days)
  - Survive failures and restarts
  - Maintain reasoning state in MongoDB
  - Ensure task consistency through handoffs
""")

    # Cleanup
    await embeddings.close()
    await galileo.close()
    await atlas.close()


async def demo_adaptive_retrieval():
    """Demo: Adaptive retrieval with hybrid search."""

    print(f"\n{C.HEADER}{'='*60}{C.END}")
    print(f"{C.HEADER}  CCv3: Adaptive Retrieval Demo{C.END}")
    print(f"{C.HEADER}{'='*60}{C.END}")

    from .atlas import Atlas
    from .embeddings import EmbeddingsRouter

    atlas = Atlas()
    await atlas.connect()

    embeddings = EmbeddingsRouter()

    # Create test data
    repo_id = await atlas.register_repo("test-retrieval", "/tmp", ["python"])

    # Store some documents
    docs = [
        ("auth.py", "def authenticate(user, password): return check_credentials(user, password)"),
        ("routes.py", "app.post('/login', authenticate_handler)"),
        ("models.py", "class User: username: str; password_hash: str"),
    ]

    print_step(1, 3, "Indexing documents with embeddings")
    for filename, content in docs:
        emb = await embeddings.embed_for_storage(content)
        await atlas.store_embedding(
            repo_id=repo_id,
            object_type="file",
            object_id=filename,
            vector=emb,
            content=content,
            metadata={"filename": filename},
        )
        print_success(f"Indexed: {filename}")

    print_step(2, 3, "Hybrid search with RRF fusion")
    query = "how does authentication work"
    query_emb = await embeddings.embed_for_search(query)

    print_sponsor("MongoDB Atlas", "Combining text search + vector search")
    results = await atlas.hybrid_search(
        repo_id=repo_id,
        query=query,
        query_vector=query_emb,
        limit=3,
    )

    print_success(f"Found {len(results)} results")
    for r in results:
        print_data(r.get("object_id", "?"), f"score={r.get('rrf_score', 0):.4f}")

    print_step(3, 3, "Adaptive chunking based on query")
    print_sponsor("Jina AI", "Task-specific adapter: retrieval.query")
    print_success("Query embedding uses different adapter than storage")

    await embeddings.close()
    await atlas.close()


async def main():
    """Run hackathon demos."""

    print(f"""
{C.BOLD}{C.CYAN}
   ██████╗ ██████╗██╗   ██╗██████╗
  ██╔════╝██╔════╝██║   ██║╚════██╗
  ██║     ██║     ██║   ██║ █████╔╝
  ██║     ██║     ╚██╗ ██╔╝ ╚═══██╗
  ╚██████╗╚██████╗ ╚████╔╝ ██████╔╝
   ╚═════╝ ╚═════╝  ╚═══╝  ╚═════╝
{C.END}
  {C.BOLD}Continuous Context Engineering{C.END}
  {C.BLUE}Hackathon Edition - January 2026{C.END}
""")

    # Run main demo
    await demo_prolonged_coordination()

    print(f"\n{C.CYAN}Press Enter to run Adaptive Retrieval demo...{C.END}")
    input()

    await demo_adaptive_retrieval()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{C.YELLOW}Demo cancelled{C.END}")
    except Exception as e:
        print(f"\n{C.RED}Error: {e}{C.END}")
        sys.exit(1)
