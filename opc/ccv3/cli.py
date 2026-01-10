#!/usr/bin/env python3
"""CCv3 CLI - Context Engineering for Claude Code.

Commands from PRD Section 4:
    ccv3 init            Initialize repository
    ccv3 index           Build/update indexes
    ccv3 query <text>    Search context
    ccv3 handoff <task>  Generate handoff pack
    ccv3 status          Show daemon status
    ccv3 run <workflow>  Execute workflow

Usage:
    ccv3 init .
    ccv3 index --full
    ccv3 query "authentication flow"
    ccv3 handoff "Fix login bug"
    ccv3 run /fix "authentication error"
"""

import argparse
import asyncio
import hashlib
import os
import sys
from pathlib import Path


def get_repo_id(path: str) -> str:
    """Generate repo ID from path."""
    abs_path = os.path.abspath(path)
    name = os.path.basename(abs_path)
    hash_part = hashlib.sha256(abs_path.encode()).hexdigest()[:8]
    return f"{name}-{hash_part}"


async def cmd_init(args):
    """Initialize repository for CCv3."""
    from .atlas import Atlas

    path = os.path.abspath(args.path)
    name = os.path.basename(path)

    print(f"Initializing CCv3 for: {path}")

    atlas = Atlas()
    await atlas.connect()

    repo_id = await atlas.register_repo(
        name=name,
        root_path=path,
        languages=args.languages.split(",") if args.languages else None,
    )

    print(f"✓ Repository registered: {repo_id}")
    print(f"  Name: {name}")
    print(f"  Path: {path}")

    await atlas.close()
    return repo_id


async def cmd_index(args):
    """Build or update indexes."""
    from .atlas import Atlas
    from .embeddings import EmbeddingsRouter

    path = os.path.abspath(args.path)
    repo_id = get_repo_id(path)

    print(f"Indexing repository: {repo_id}")

    atlas = Atlas()
    embeddings = EmbeddingsRouter()

    await atlas.connect()

    # Find Python/TypeScript files
    extensions = {".py", ".ts", ".tsx", ".js", ".jsx"}
    files_indexed = 0

    for root, dirs, files in os.walk(path):
        # Skip common directories
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "__pycache__", ".venv", "venv"}]

        for file in files:
            if not any(file.endswith(ext) for ext in extensions):
                continue

            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, path)

            try:
                with open(file_path, "r") as f:
                    content = f.read()

                # Compute SHA
                sha = hashlib.sha256(content.encode()).hexdigest()

                # Track file
                lang = "python" if file.endswith(".py") else "typescript"
                await atlas.track_file(repo_id, rel_path, sha, lang)

                # Generate embedding for file
                if len(content) < 50000:  # Skip very large files
                    emb = await embeddings.embed_for_storage(content[:8000])  # Truncate
                    await atlas.store_embedding(
                        repo_id=repo_id,
                        object_type="file",
                        object_id=rel_path,
                        vector=emb,
                        content=content[:2000],
                        metadata={"file_path": rel_path, "language": lang},
                    )

                files_indexed += 1
                if files_indexed % 10 == 0:
                    print(f"  Indexed {files_indexed} files...")

            except Exception as e:
                print(f"  Warning: Could not index {rel_path}: {e}")

    print(f"✓ Indexed {files_indexed} files")

    await embeddings.close()
    await atlas.close()


async def cmd_query(args):
    """Search context."""
    from .atlas import Atlas
    from .embeddings import EmbeddingsRouter

    path = os.path.abspath(args.path)
    repo_id = get_repo_id(path)

    atlas = Atlas()
    embeddings = EmbeddingsRouter()

    await atlas.connect()

    # Get query embedding
    query_emb = await embeddings.embed_for_search(args.query)

    # Hybrid search
    results = await atlas.hybrid_search(
        repo_id=repo_id,
        query=args.query,
        query_vector=query_emb,
        limit=args.limit,
    )

    print(f"\nResults for: {args.query}\n")
    for i, r in enumerate(results, 1):
        score = r.get("rrf_score", 0)
        obj_id = r.get("object_id", "unknown")
        content = r.get("content", "")[:200]

        print(f"{i}. [{score:.4f}] {obj_id}")
        print(f"   {content}...")
        print()

    await embeddings.close()
    await atlas.close()


async def cmd_handoff(args):
    """Generate handoff pack."""
    from .atlas import Atlas
    from .handoff import HandoffCompiler

    path = os.path.abspath(args.path)
    repo_id = get_repo_id(path)

    atlas = Atlas()
    await atlas.connect()

    compiler = HandoffCompiler(atlas)
    pack = await compiler.compile(
        repo_id=repo_id,
        task=args.task,
        query=args.query,
    )

    print(f"\n{'='*60}")
    print(f"HANDOFF PACK: {args.task}")
    print(f"{'='*60}")
    print(f"Token estimate: {pack.token_estimate}")
    print(f"Citations: {len(pack.citations)}")
    print()

    if args.format == "yaml":
        print(pack.yaml)
    else:
        print(pack.markdown)

    await compiler.close()
    await atlas.close()


async def cmd_status(args):
    """Show status of providers."""
    from .atlas import Atlas

    print("CCv3 Status\n")

    # Check environment
    providers = {
        "MongoDB Atlas": bool(os.environ.get("MONGODB_URI") or os.environ.get("ATLAS_URI")),
        "Fireworks AI": bool(os.environ.get("FIREWORKS_API_KEY")),
        "Jina AI": bool(os.environ.get("JINA_API_KEY")),
        "Galileo": bool(os.environ.get("GALILEO_API_KEY")),
    }

    for name, configured in providers.items():
        status = "✓ Configured" if configured else "✗ Not configured"
        print(f"  {name}: {status}")

    # Test Atlas connection
    if providers["MongoDB Atlas"]:
        try:
            atlas = Atlas()
            await atlas.connect()
            print("\n  MongoDB Atlas: Connected")
            await atlas.close()
        except Exception as e:
            print(f"\n  MongoDB Atlas: Connection failed - {e}")


async def cmd_run(args):
    """Execute a workflow."""
    from .atlas import Atlas
    from .inference import InferenceRouter

    path = os.path.abspath(args.path)
    repo_id = get_repo_id(path)

    workflow = args.workflow.lstrip("/")
    task = args.task or f"Run {workflow}"

    print(f"Running workflow: /{workflow}")
    print(f"Task: {task}")
    print()

    atlas = Atlas()
    llm = InferenceRouter()

    await atlas.connect()

    # Create run
    run_id = await atlas.create_run(
        repo_id=repo_id,
        command=f"/{workflow}",
        description=task,
    )

    print(f"Run ID: {run_id}")

    try:
        if workflow == "fix":
            # Fix workflow: analyze → plan → implement → validate
            print("\n[1/4] Analyzing...")
            analysis = await llm.analyze(f"Analyze this task and identify what needs to be fixed: {task}")
            print(f"Analysis: {analysis[:200]}...")

            print("\n[2/4] Planning...")
            plan = await llm.plan(f"Create a plan to fix: {task}\n\nAnalysis: {analysis}")
            print(f"Plan: {plan[:200]}...")

            await atlas.update_run(run_id, plan={"analysis": analysis, "plan": plan})

            print("\n[3/4] Would implement patches...")
            print("\n[4/4] Would validate...")

            await atlas.update_run(run_id, status="completed")

        elif workflow == "build":
            # Build workflow: plan → implement → test
            print("\n[1/3] Planning...")
            plan = await llm.plan(f"Create a build plan for: {task}")
            print(f"Plan: {plan[:200]}...")

            await atlas.update_run(run_id, plan={"plan": plan})

            print("\n[2/3] Would implement...")
            print("\n[3/3] Would test...")

            await atlas.update_run(run_id, status="completed")

        else:
            print(f"Unknown workflow: /{workflow}")
            await atlas.update_run(run_id, status="failed")

    except Exception as e:
        print(f"Error: {e}")
        await atlas.update_run(run_id, status="failed")

    await llm.close()
    await atlas.close()


async def cmd_eval(args):
    """Evaluate quality of a response."""
    from .galileo import GalileoEval

    galileo = GalileoEval()

    result = await galileo.evaluate(
        query=args.query,
        response=args.response,
        context=args.context,
    )

    print("Evaluation Result:")
    print(f"  Passed: {result.passed}")
    print(f"  Scores:")
    for metric, score in result.scores.items():
        status = "✓" if score >= 0.7 else "✗"
        print(f"    {status} {metric}: {score:.3f}")

    if result.failed_metrics:
        print(f"  Failed: {', '.join(result.failed_metrics)}")

    await galileo.close()


def main():
    parser = argparse.ArgumentParser(
        prog="ccv3",
        description="CCv3 - Context Engineering for Claude Code",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # init
    init_p = subparsers.add_parser("init", help="Initialize repository")
    init_p.add_argument("path", default=".", help="Repository path")
    init_p.add_argument("--languages", help="Comma-separated languages")
    init_p.set_defaults(func=cmd_init)

    # index
    index_p = subparsers.add_parser("index", help="Build/update indexes")
    index_p.add_argument("path", nargs="?", default=".", help="Repository path")
    index_p.add_argument("--full", action="store_true", help="Full reindex")
    index_p.set_defaults(func=cmd_index)

    # query
    query_p = subparsers.add_parser("query", help="Search context")
    query_p.add_argument("query", help="Search query")
    query_p.add_argument("--path", default=".", help="Repository path")
    query_p.add_argument("--limit", type=int, default=10, help="Max results")
    query_p.set_defaults(func=cmd_query)

    # handoff
    handoff_p = subparsers.add_parser("handoff", help="Generate handoff pack")
    handoff_p.add_argument("task", help="Task description")
    handoff_p.add_argument("--query", help="Search query (defaults to task)")
    handoff_p.add_argument("--path", default=".", help="Repository path")
    handoff_p.add_argument("--format", choices=["yaml", "md"], default="md")
    handoff_p.set_defaults(func=cmd_handoff)

    # status
    status_p = subparsers.add_parser("status", help="Show provider status")
    status_p.set_defaults(func=cmd_status)

    # run
    run_p = subparsers.add_parser("run", help="Execute workflow")
    run_p.add_argument("workflow", help="Workflow name (e.g., /fix, /build)")
    run_p.add_argument("task", nargs="?", help="Task description")
    run_p.add_argument("--path", default=".", help="Repository path")
    run_p.set_defaults(func=cmd_run)

    # eval
    eval_p = subparsers.add_parser("eval", help="Evaluate response quality")
    eval_p.add_argument("--query", required=True, help="Original query")
    eval_p.add_argument("--response", required=True, help="LLM response")
    eval_p.add_argument("--context", required=True, help="Retrieved context")
    eval_p.set_defaults(func=cmd_eval)

    args = parser.parse_args()

    try:
        asyncio.run(args.func(args))
    except KeyboardInterrupt:
        print("\nCancelled")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
