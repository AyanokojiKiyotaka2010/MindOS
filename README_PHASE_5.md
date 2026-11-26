# MINDOS Phase 5 — Knowledge Graph

## Features

- Create and delete knowledge relations
- Six supported relation types
- Self-relations and duplicate relations are rejected
- Both related items must belong to the current user
- SVG graph visualization using the existing knowledge items

## API endpoints

- `GET /api/v1/graph/relations`
- `POST /api/v1/graph/relations`
- `DELETE /api/v1/graph/relations/{relation_id}`
