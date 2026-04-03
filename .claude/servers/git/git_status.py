from typing import Any, Dict
from pydantic import BaseModel

class GitStatusParams(BaseModel):
    """Parameters for git_status"""
    repo_path: str

async def git_status(params: GitStatusParams) -> Dict[str, Any]:
    """
    Shows the working tree status

    Args:
        params: Tool parameters

    Returns:
        Tool execution result
    """
    from runtime.mcp_client import call_mcp_tool
    from runtime.normalize_fields import normalize_field_names

    # Call tool
    result = await call_mcp_tool("git__git_status", params.model_dump(exclude_none=True))

    # Defensive unwrapping
    unwrapped = getattr(result, "value", result)

    # Apply field normalization
    normalized = normalize_field_names(unwrapped, "git")

    return normalized
