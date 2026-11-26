# MINDOS Phase 12 — Deployment and Public Beta

## Docker deployment

1. Copy `.env.docker.example` to `.env` and replace every placeholder.
2. Never commit `.env`.
3. From the project root run:

```powershell
docker compose up -d --build
```

4. Open `http://localhost`.
5. Check `http://localhost/api/v1/health`.

## Production follow-up

- Put the stack behind a real HTTPS reverse proxy or managed certificate.
- Set `CORS_ORIGINS` to the public origin.
- Schedule database and private upload backups.
- Restore database, private uploads, and auth configuration consistently.
- Configure monitoring and log rotation before inviting beta users.
- Replace development-only MySQL health and auth defaults.
