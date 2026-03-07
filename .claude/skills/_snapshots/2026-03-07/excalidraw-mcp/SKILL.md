---
name: excalidraw-mcp
description: Create, edit, and export live Excalidraw diagrams using mcp-excalidraw-server (MCP tools + canvas REST API). Use when an agent needs to draw/lay out diagrams, convert Mermaid to Excalidraw, query/update/delete elements, or export/import elements from a running canvas server (EXPRESS_SERVER_URL, default http://localhost:3000).
---

# Excalidraw MCP

## Overview

Create and refine diagrams on a live Excalidraw canvas via MCP tools, with helper scripts for export/import workflows.

## Quick Start

- Ensure the canvas server is reachable at `EXPRESS_SERVER_URL` (default `http://localhost:3000`).
- Use MCP tools for interactive diagram edits; use `scripts/*.cjs` for file-ish workflows (export/import/clear/health).
- For detailed endpoint/tool reference, read `references/cheatsheet.md`.

## Workflow: Draw A Diagram (From Empty Canvas)

1. Confirm canvas is up:
   - Run `node scripts/healthcheck.cjs` (or GET `/health`).
2. Optional: clear the canvas:
   - Run `node scripts/clear-canvas.cjs`.
3. Create shapes first (rectangles/diamonds/ellipses), using `create_element`.
4. Put text on shapes by setting the shape’s `text` field (do not create a separate text element unless you need standalone text).
5. Create arrows/lines after both endpoints exist.
6. Use `align_elements` / `distribute_elements` after rough placement; group only after layout stabilizes.

## Workflow: Refine An Existing Diagram

1. Discover what’s already there:
   - Prefer `get_resource` with `resource: "elements"` or `query_elements`.
2. Identify targets by stable signals (id, type, label text), not by exact x/y.
3. Update with `update_element` (move/resize/colors/text) or delete with `delete_element`.
4. If deletes/updates “don’t work”, check:
   - You’re pointing to the right `EXPRESS_SERVER_URL`.
   - The element id exists on the canvas (use `get_resource` / `GET /api/elements/:id`).
   - The element isn’t locked (use `unlock_elements` first).

## Workflow: Export / Import (Repository-Friendly)

- Export current elements to a JSON file:
  - `node scripts/export-elements.cjs --out diagram.elements.json`
- Import elements (append) using batch create:
  - `node scripts/import-elements.cjs --in diagram.elements.json --mode batch`
- Import elements (overwrite canvas) using sync:
  - `node scripts/import-elements.cjs --in diagram.elements.json --mode sync`

Notes:
- `--mode sync` clears the canvas and then writes the provided elements (good for “make canvas match this file”).
- If you want stable ids across updates, keep ids in the exported JSON; if you want fresh ids, regenerate before importing.

## Workflow: CRUD Smoke Test (Create → Update → Delete)

1. Clear:
   - `node scripts/clear-canvas.cjs`
2. Create a large visible rectangle + label:
   - Use `node scripts/create-element.cjs` twice (rectangle + text).
3. Update:
   - Move the rectangle with `node scripts/update-element.cjs`.
4. Delete:
   - Remove both with `node scripts/delete-element.cjs`.

## References

- `references/cheatsheet.md`: MCP tool list + REST API endpoints + payload shapes
