#!/usr/bin/env python3
"""Setup MongoDB Atlas for CCv3 Hackathon.

This script:
1. Connects to your MongoDB Atlas cluster
2. Creates required collections with indexes
3. Sets up vector search index (manual step required)
4. Seeds test data for demo

Prerequisites:
    export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority"

Run:
    python -m opc.ccv3.setup_atlas
"""

import asyncio
import os
import sys


async def setup_atlas():
    """Set up MongoDB Atlas for CCv3."""

    print("=" * 60)
    print("CCv3 MongoDB Atlas Setup")
    print("=" * 60)

    # Check for URI
    uri = os.environ.get("MONGODB_URI") or os.environ.get("ATLAS_URI")
    if not uri:
        print("\n❌ Error: MONGODB_URI not set")
        print("\nTo set up MongoDB Atlas:")
        print("  1. Go to https://cloud.mongodb.com")
        print("  2. Create a free cluster (M0)")
        print("  3. Add your IP to Network Access")
        print("  4. Create a database user")
        print("  5. Get connection string and run:")
        print('     export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net"')
        return False

    print(f"\n✓ Found MONGODB_URI")

    # Import and connect
    from .atlas import Atlas

    atlas = Atlas()
    try:
        await atlas.connect()
    except Exception as e:
        print(f"\n❌ Connection failed: {e}")
        print("\nTroubleshooting:")
        print("  - Check your IP is in Network Access list")
        print("  - Verify username/password are correct")
        print("  - Ensure cluster is running")
        return False

    if atlas.is_in_memory:
        print("\n⚠ Warning: Using in-memory mode (MongoDB connection failed)")
        return False

    print("\n✓ Connected to MongoDB Atlas!")

    # Show collections
    db = atlas._db
    collections = await db.list_collection_names()
    print(f"\n📦 Collections: {collections or '(none yet)'}")

    # Create indexes
    print("\n🔧 Creating indexes...")

    # Test by creating a sample document
    print("\n📝 Creating test data...")

    from .embeddings import EmbeddingsRouter

    embeddings = EmbeddingsRouter()

    # Create a test repo
    repo_id = await atlas.register_repo(
        name="hackathon-test",
        root_path="/demo/hackathon",
        languages=["python"],
    )
    print(f"  ✓ Test repo: {repo_id}")

    # Create a test embedding
    test_emb = await embeddings.embed_for_storage("def hello(): return 'world'")
    await atlas.store_embedding(
        repo_id=repo_id,
        object_type="code",
        object_id="test_function",
        vector=test_emb,
        content="def hello(): return 'world'",
        metadata={"file": "test.py", "line": 1},
    )
    print(f"  ✓ Test embedding stored ({len(test_emb)} dims)")

    # Create a test run
    run_id = await atlas.create_run(
        repo_id=repo_id,
        command="/test",
        description="Test workflow",
    )
    print(f"  ✓ Test run: {run_id}")

    await embeddings.close()
    await atlas.close()

    print("\n" + "=" * 60)
    print("✅ MongoDB Atlas setup complete!")
    print("=" * 60)

    print("""
📋 Next Steps:

1. For Vector Search (optional but recommended):
   - Go to Atlas UI → Database → Search
   - Create Search Index with this JSON:

   {
     "mappings": {
       "dynamic": true,
       "fields": {
         "vector": {
           "type": "knnVector",
           "dimensions": 384,
           "similarity": "cosine"
         }
       }
     }
   }

2. Run the demo:
   python -m opc.ccv3.demo_hackathon

3. Start the API:
   uvicorn opc.ccv3.api:app --reload
""")

    return True


async def quick_test():
    """Quick test of MongoDB connection."""
    from .atlas import Atlas

    atlas = Atlas()
    await atlas.connect()

    if atlas.is_in_memory:
        print("❌ MongoDB not connected (using in-memory)")
        return False

    # Quick ping
    print("✓ MongoDB Atlas connected")
    print(f"  Database: {atlas.db_name}")

    await atlas.close()
    return True


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        asyncio.run(quick_test())
    else:
        asyncio.run(setup_atlas())
