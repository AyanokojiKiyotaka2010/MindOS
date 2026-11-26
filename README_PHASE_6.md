# MINDOS Phase 6 — Automatic Document Acquisition

## Features

- SSRF-protected HTTP/HTTPS URL imports
- Private local storage for text, Markdown, and PDF uploads
- 2 MB upload limit
- Source metadata stored in `knowledge_sources`
- Imported items remain `captured`; they are never marked understood
- URL and file controls in the Knowledge Vault

## Security

- Blocks loopback, private, link-local, multicast, reserved, and unspecified addresses
- Blocks credentials in URLs
- Disables redirect following
- Keeps uploaded files outside the public frontend and database

## API endpoints

- `POST /api/v1/acquisition/url`
- `POST /api/v1/acquisition/upload`
