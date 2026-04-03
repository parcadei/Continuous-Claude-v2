from typing import Any, Dict
from pydantic import BaseModel

class GitShowParams(BaseModel):
    """Parameters for git_show"""
    repo_path: str
    revision: str

async def git_show(params: GitShowParams) -> Dict[str, Any]:
    """
    Shows the contents of a commit

    Args:
        params: Tool parameters

    Returns:
        Tool execution result
    """
    from runtime.mcp_client import call_mcp_tool
    from runtime.normalize_fields import normalize_field_names

    # Call tool
    result = await call_mcp_tool("git__git_show", params.model_dump(exclude_none=True))

    # Defensive unwrapping
    unwrapped = getattr(result, "value", result)

    # Apply field normalization
    normalized = normalize_field_names(unwrapped, "git")

    return normalized
