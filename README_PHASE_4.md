# MINDOS Phase 4 — Knowledge Vault

## Features

- Create, list, search, update, archive, favorite, and delete knowledge items
- Manual understanding status without automatic inference
- Item types: note, concept, question, insight, quote, resource, and summary
- Comma-separated tags
- Optional source metadata
- User ownership checks on every item operation
- React Knowledge Vault capture and list interface

## API endpoints

- `GET /api/v1/knowledge/items`
- `GET /api/v1/knowledge/items/{item_id}`
- `POST /api/v1/knowledge/items`
- `PATCH /api/v1/knowledge/items/{item_id}`
- `DELETE /api/v1/knowledge/items/{item_id}`

Search uses `?search=` and archived items are excluded by default.

## Test

```powershell
cd C:\Users\jayrp\Projects\mindos\backend
.\.venv\Scripts\python.exe -m pytest -q
```

```powershell
cd C:\Users\jayrp\Projects\mindos\frontend
npm run build
```

Login first, open `/vault`, create a note, search it, favorite it, archive it, and delete it. Captured content should remain at `captured` until you change it manually.
