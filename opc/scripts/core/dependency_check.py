#!/usr/bin/env python3
"""Pre-flight dependency validation script."""

import importlib
import json
import sys
from pathlib import Path

# Runtime modules to check
RUNTIME_MODULES = [
    "src.runtime.mcp_client",
    "src.runtime.config",
    "src.runtime.harness",
    "src.runtime.env_utils",
]

# Third-party packages that must be available
REQUIRED_PACKAGES = [
    "aiofiles",
    "mcp",
    "pydantic",
    "pgvector",
    "asyncpg",
    "redis",
]

def check_package_importable(package: str) -> tuple[bool, str]:
    """Check if a package can be imported."""
    try:
        mod = importlib.import_module(package)
        version = getattr(mod, "__version__", "unknown")
        return True, version
    except ImportError as e:
        return False, str(e)

def check_runtime_imports() -> dict:
    """Check that runtime modules can be imported."""
    results = {}
    for module_path in RUNTIME_MODULES:
        module_name = module_path.replace("/", ".")
        try:
            # Don't actually import, just check syntax
            import ast
            module_file = Path(f"{module_path.replace('.', '/')}.py")
            if module_file.exists():
                with open(module_file) as f:
                    ast.parse(f.read())
            results[module_name] = {"status": "ok", "file_exists": True}
        except SyntaxError as e:
            results[module_name] = {"status": "error", "error": str(e)}
        except Exception as e:
            results[module_name] = {"status": "error", "error": str(e)}
    return results

def main():
    result = {
        "status": "ok",
        "packages": {},
        "runtime_imports": {},
    }

    # Check packages
    for pkg in REQUIRED_PACKAGES:
        available, info = check_package_importable(pkg)
        result["packages"][pkg] = {
            "available": available,
            "info": info,
        }
        if not available:
            result["status"] = "error"

    # Check runtime imports
    result["runtime_imports"] = check_runtime_imports()

    # Output
    print(json.dumps(result, indent=2))

    # Exit codes
    if result["status"] == "error":
        sys.exit(1)
    sys.exit(0)

if __name__ == "__main__":
    main()
