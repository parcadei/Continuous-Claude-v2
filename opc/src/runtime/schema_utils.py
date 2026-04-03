"""
JSON Schema to Pydantic model conversion utilities.

Converts MCP tool schemas (JSON Schema format) to Pydantic model definitions.
Uses dispatch tables to reduce cyclomatic complexity.
"""

from collections.abc import Callable
from typing import Any

# ===========================================================================
# Dispatch Table: Maps JSON Schema types to Python type strings
# ===========================================================================

TYPE_MAPPING: dict[str, str] = {
    "string": "str",
    "number": "float",
    "integer": "int",
    "boolean": "bool",
    "null": "None",
}


def _wrap_optional(base_type: str, required: bool) -> str:
    """Wrap type in Optional[] if not required."""
    return base_type if required else f"Optional[{base_type}]"


def _handle_primitive_type(schema: dict[str, Any], required: bool) -> str:
    """Handle primitive JSON Schema types via dispatch table."""
    schema_type = schema.get("type", "object")
    base_type = TYPE_MAPPING.get(schema_type, "Any")
    return _wrap_optional(base_type, required)


def _handle_array_type(schema: dict[str, Any], required: bool) -> str:
    """Handle JSON Schema array type."""
    items_schema = schema.get("items", {"type": "object"})
    item_type = json_schema_to_python_type(items_schema, required=True)
    base_type = f"List[{item_type}]"
    return _wrap_optional(base_type, required)


def _handle_object_type(schema: dict[str, Any], required: bool) -> str:
    """Handle JSON Schema object type."""
    if "additionalProperties" in schema:
        value_schema = schema["additionalProperties"]
        if isinstance(value_schema, bool):
            value_type = "Any"
        else:
            value_type = json_schema_to_python_type(value_schema, required=True)
        base_type = f"Dict[str, {value_type}]"
        return _wrap_optional(base_type, required)
    return "Dict[str, Any]" if required else "Optional[Dict[str, Any]]"


def _handle_enum_type(schema: dict[str, Any], required: bool) -> str:
    """Handle JSON Schema enum type."""
    enum_values = schema["enum"]
    literal_values = ", ".join([f'"{v}"' for v in enum_values])
    base_type = f"Literal[{literal_values}]"
    return _wrap_optional(base_type, required)


def _handle_union_type(schema: dict[str, Any], required: bool) -> tuple[dict[str, Any], bool]:
    """Handle union types like ["string", "null"]. Returns updated schema and required."""
    types = schema["type"]
    if "null" in types:
        required = False
        types = [t for t in types if t != "null"]
        if len(types) == 1:
            schema = {"type": types[0]}
    return schema, required


# Dispatch table for complex types that need special handling
COMPLEX_TYPE_HANDLERS: dict[str, Callable[[dict[str, Any], bool], str]] = {
    "array": _handle_array_type,
    "object": _handle_object_type,
}


def json_schema_to_python_type(schema: dict[str, Any], required: bool = True) -> str:
    """
    Convert JSON Schema type to Python type hint string.

    Uses dispatch tables to minimize cyclomatic complexity:
    - TYPE_MAPPING for primitive types
    - COMPLEX_TYPE_HANDLERS for array/object types

    Args:
        schema: JSON Schema definition
        required: Whether field is required

    Returns:
        Python type hint string (e.g., "str", "Optional[int]", "List[str]")

    Examples:
        >>> json_schema_to_python_type({"type": "string"}, True)
        'str'
        >>> json_schema_to_python_type({"type": "string"}, False)
        'Optional[str]'
        >>> json_schema_to_python_type({"type": "array", "items": {"type": "string"}})
        'List[str]'
    """
    # Handle union types: ["string", "null"]
    if isinstance(schema.get("type"), list):
        schema, required = _handle_union_type(schema, required)

    # Handle enum first (takes priority)
    if "enum" in schema:
        return _handle_enum_type(schema, required)

    # Get schema type
    schema_type = schema.get("type", "object")

    # Dispatch to primitive type handler
    if schema_type in TYPE_MAPPING:
        return _handle_primitive_type(schema, required)

    # Dispatch to complex type handler
    if schema_type in COMPLEX_TYPE_HANDLERS:
        return COMPLEX_TYPE_HANDLERS[schema_type](schema, required)

    # Fallback for unknown types
    return _wrap_optional("Any", required)


def generate_pydantic_model(
    model_name: str,
    schema: dict[str, Any],
    description: str | None = None,
) -> str:
    """
    Generate Pydantic model class from JSON Schema.

    Args:
        model_name: Name of the Pydantic model class
        schema: JSON Schema definition
        description: Optional model description

    Returns:
        Python code for Pydantic model

    Example:
        >>> schema = {
        ...     "type": "object",
        ...     "properties": {
        ...         "name": {"type": "string"},
        ...         "age": {"type": "integer"}
        ...     },
        ...     "required": ["name"]
        ... }
        >>> print(generate_pydantic_model("Person", schema))
        class Person(BaseModel):
            '''Generated model'''
            name: str
            age: Optional[int] = None
    """
    properties = schema.get("properties", {})
    required_fields = set(schema.get("required", []))

    lines = [f"class {model_name}(BaseModel):"]

    # Add docstring
    if description:
        lines.append(f'    """{description}"""')
    else:
        lines.append('    """Generated Pydantic model."""')

    # Generate fields
    if not properties:
        lines.append("    pass")
    else:
        for field_name, field_schema in properties.items():
            is_required = field_name in required_fields
            field_type = json_schema_to_python_type(field_schema, is_required)
            field_desc = field_schema.get("description", "")

            if is_required:
                lines.append(f"    {field_name}: {field_type}")
            else:
                lines.append(f"    {field_name}: {field_type} = None")

            if field_desc:
                lines.append(f'    """{field_desc}"""')

    return "\n".join(lines)


def sanitize_name(name: str) -> str:
    """
    Sanitize name for Python identifier.

    Args:
        name: Original name

    Returns:
        Valid Python identifier

    Examples:
        >>> sanitize_name("my-tool")
        'my_tool'
        >>> sanitize_name("list")
        'list_'
    """
    # Replace hyphens with underscores
    name = name.replace("-", "_").replace(".", "_")

    # Handle Python keywords
    python_keywords = {"list", "dict", "set", "type", "class", "def", "import"}
    if name in python_keywords:
        name = name + "_"

    return name
