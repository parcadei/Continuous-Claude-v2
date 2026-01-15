"""Database configuration utilities.

Single source of truth for PostgreSQL URL resolution and backend selection.
Import from here instead of duplicating logic in each script.

Priority order for PostgreSQL URL:
1. OPC_POSTGRES_URL - specific to OPC, allows override when another project sets DATABASE_URL
2. CONTINUOUS_CLAUDE_DB_URL - alternative name
3. DATABASE_URL - standard name, may be set by other projects

Usage:
    from scripts.core.db.config import get_postgres_url, use_postgres, load_env_files

    # Load .env files (call once at module level)
    load_env_files()

    # Get URL
    url = get_postgres_url()

    # Check if postgres is available
    if use_postgres():
        # use postgres
    else:
        # fallback to sqlite
"""

import os
from pathlib import Path


def load_env_files() -> None:
    """Load .env files in correct priority order.

    Order:
    1. Global ~/.claude/.env (base config)
    2. Local opc/.env (project overrides)
    """
    try:
        from dotenv import load_dotenv
    except ImportError:
        return  # dotenv not required

    # 1. Global ~/.claude/.env
    global_env = Path.home() / ".claude" / ".env"
    if global_env.exists():
        load_dotenv(global_env)

    # 2. Local opc/.env (override with project-specific values)
    # Works from any script location within opc/
    opc_env = Path(__file__).parent.parent.parent / ".env"
    if opc_env.exists():
        load_dotenv(opc_env, override=True)


def get_postgres_url() -> str | None:
    """Get PostgreSQL URL from environment.

    Priority:
    1. OPC_POSTGRES_URL - specific to OPC memory system
    2. CONTINUOUS_CLAUDE_DB_URL - alternative name
    3. DATABASE_URL - standard name (may be from another project)

    Returns:
        PostgreSQL connection URL or None if not configured.
    """
    return (
        os.environ.get("OPC_POSTGRES_URL")
        or os.environ.get("CONTINUOUS_CLAUDE_DB_URL")
        or os.environ.get("DATABASE_URL")
    )


def use_postgres() -> bool:
    """Check if PostgreSQL should be used as backend.

    Returns True if:
    - A postgres URL is configured
    - psycopg2 is installed
    """
    url = get_postgres_url()
    if not url:
        return False
    try:
        import psycopg2  # noqa: F401
        return True
    except ImportError:
        return False
