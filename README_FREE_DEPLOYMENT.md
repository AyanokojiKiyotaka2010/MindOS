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

## Bulk knowledge import and AI provider integrations

The Knowledge Vault importer accepts Obsidian or Notion ZIP exports and Markdown, text, PDF, DOCX, PPTX, HTML, and CSV files. Imports are analyzed in memory and shown in a review screen; only selected documents, concepts, and links are saved. ZIP imports are limited to 25 MB per uploaded file, 50 MB total per import, and 100 supported documents. PDF import extracts selectable text; scanned PDFs are not OCR-processed.

Local extraction uses note titles, Markdown headings, tags, wiki links, and repeated phrases. Optional Gemini, OpenAI, and Anthropic suggestions are available when the account owner enables optional AI and selects a configured provider. The selected document text is sent to that provider only after the user starts analysis.

To allow users to save their own provider keys or Lichess tokens:

1. Generate a Fernet key locally:

   ```powershell
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

2. Set `INTEGRATION_ENCRYPTION_KEY` in the backend's private environment. Keep the same value across deploys and back it up securely; saved credentials cannot be decrypted if this value is lost or changed.
3. Optionally set a site-managed `GEMINI_API_KEY`. Users may instead add their own Gemini, OpenAI, or Anthropic keys in **Settings & privacy**. Personal keys are encrypted at rest and never returned to the frontend or data export.
4. Run `alembic upgrade head` to create the `user_integrations` table. Render's configured startup command already applies Alembic migrations.

Chess.com analytics fetches public monthly game archives by username and requires no API key. Lichess uses a username and can use a personal access token with game-reading permission. MINDOS analyzes at most the 200 most recent games in a refresh and does not store imported PGNs. URL analysis is limited to Chess.com profile/archive URLs and public Lichess profile/game URLs; Chess.com game pages should be imported by pasting PGN instead.

Provider availability, quotas, prices, and terms can change. Review generated AI suggestions before approving an import. Chess opening labels and scores are descriptive statistics derived from PGN headers, not coaching or a skill diagnosis.

## Free-tier limitations

- Free services have quotas and policies that can change; confirm current provider terms before creating accounts.
- Render's free API can spin down while idle, causing a cold start.
- Render local disk is ephemeral; uploaded files may disappear after restart or redeploy.
- PostgreSQL free tiers have storage/compute limits and may pause when inactive.
- Free hosting is suitable for a small demo, not guaranteed 24/7 production.
- Keep secrets in provider environment settings, not Vercel source or GitHub.
