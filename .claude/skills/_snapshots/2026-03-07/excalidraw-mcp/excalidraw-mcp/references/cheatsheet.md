# Excalidraw MCP Cheatsheet

## Defaults

- Canvas base URL: `EXPRESS_SERVER_URL` (default `http://localhost:3000`)
- Canvas health: `GET /health`

## MCP Tools (Server-Side)

Tool names are defined in `src/index.ts`.

- `create_element`: create a shape/text/arrow/line
- `update_element`: update an element by `id`
- `delete_element`: delete an element by `id`
- `query_elements`: query by `type` and/or exact-match filters
- `get_resource`: `scene` | `library` | `theme` | `elements`
- `group_elements` / `ungroup_elements`
- `align_elements` / `distribute_elements`
- `lock_elements` / `unlock_elements`
- `create_from_mermaid`: send Mermaid diagram to canvas for frontend conversion
- `batch_create_elements`: create many elements in one call

Notes:
- For shapes, set the `text` field to place text inside the shape (backend converts to `label.text`).
- Prefer creating shapes first, then arrows, then alignment/grouping.

## Canvas REST API (HTTP)

Read/write primitives (used by the MCP server and helper scripts):

- `GET /api/elements` -> `{ success, elements, count }`
- `GET /api/elements/:id` -> `{ success, element }`
- `POST /api/elements` -> `{ success, element }`
- `PUT /api/elements/:id` -> `{ success, element }`
- `DELETE /api/elements/:id` -> `{ success, message }`
- `GET /api/elements/search?type=...&key=value` -> `{ success, elements, count }`
- `POST /api/elements/batch` -> `{ success, elements, count }`
- `POST /api/elements/from-mermaid` -> triggers websocket conversion on the frontend
- `POST /api/elements/sync` -> clears stored elements, then writes provided ones (overwrite import)

## Skill Scripts

All scripts accept `--url <canvasUrl>` (defaults to `EXPRESS_SERVER_URL`).

- `node scripts/healthcheck.cjs`
- `node scripts/clear-canvas.cjs`
- `node scripts/export-elements.cjs --out diagram.elements.json`
- `node scripts/import-elements.cjs --in diagram.elements.json --mode batch|sync`
- `node scripts/create-element.cjs --data '{...}'`
- `node scripts/update-element.cjs --id <id> --data '{...}'`
- `node scripts/delete-element.cjs --id <id>`
