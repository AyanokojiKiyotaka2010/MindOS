# Free-tier deployment guide

This deployment uses a Vercel static frontend, a Render free FastAPI service, and an external PostgreSQL database. The free backend may sleep when idle; first requests can be slow. Uploaded files are stored on local disk and are not persistent on Render's free service, so do not rely on file uploads until object storage is added.

## 1. Prepare PostgreSQL

Create a PostgreSQL database with a provider such as Neon. Copy its connection URL privately. Use SQLAlchemy's Psycopg URL form:

```text
postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

Do not post the connection string in chat or commit it. The deployment runs `alembic upgrade head` on service startup to create the MINDOS tables.

This creates a new PostgreSQL database; it does not migrate existing MySQL data. Back up any local data you need before proceeding.

## 2. Deploy the API on Render

1. Push the application source to the connected GitHub repository. Check `git status` first and do not stage `.env`, `backend/.env`, backups, or database dumps.
2. In Render, choose **New → Blueprint** and connect the repository.
3. Render reads the root `render.yaml` and creates the `mindos-api` web service.
4. In the Render service's Environment settings, set:
   - `DATABASE_URL`: the PostgreSQL URL from Step 1, using `postgresql+psycopg://`.
   - `CORS_ORIGINS`: the exact Vercel production origin after Step 3 (for example `https://your-site.vercel.app`).
5. Keep `ENVIRONMENT=production`. Render generates `AUTH_SECRET`.
6. Wait for deployment, then check `https://<render-service>.onrender.com/api/v1/health`.

## 3. Deploy the frontend on Vercel

1. In Vercel, import the same GitHub repository.
2. Set **Root Directory** to `frontend`; use the Vite defaults (`npm run build`, output directory `dist`).
3. In `frontend/vercel.json`, replace the placeholder hostname with the Render service hostname:

```json
"destination": "https://<render-service>.onrender.com/api/:path*"
```

4. Commit and push that change, then redeploy Vercel.
5. Set `CORS_ORIGINS` in Render to the exact Vercel production origin and redeploy the API.
6. Open the Vercel `*.vercel.app` URL and test registration, login, profile, vault, and logout.

## Free-tier limitations

- Free services have quotas and policies that can change; confirm current provider terms before creating accounts.
- Render's free API can spin down while idle, causing a cold start.
- Render local disk is ephemeral; uploaded files may disappear after restart or redeploy.
- PostgreSQL free tiers have storage/compute limits and may pause when inactive.
- Free hosting is suitable for a small demo, not guaranteed 24/7 production.
- Keep secrets in provider environment settings, not Vercel source or GitHub.
