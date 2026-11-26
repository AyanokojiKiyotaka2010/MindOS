# MINDOS — Complete Architecture & Current Work Log
_Last updated: 26 November 2026_

## Product
MINDOS is a Personal Knowledge & Intelligence Operating System combining personal knowledge management, learning, reflection, decision tracking and explicitly chosen social sharing.

### Approved product principles
- Manual and automatic knowledge capture are equally important.
- It is both a personal operating system and a social network.
- AI is optional; core features must work without AI or external AI APIs.
- Privacy by default; sharing is explicit.
- No fake IQ/intelligence scores or psychological diagnoses.
- Captured information is not the same as understood knowledge.

## Architecture
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query.
- Backend: Python, FastAPI, Pydantic.
- ORM/migrations: SQLAlchemy and Alembic planned for implementation.
- Database: MySQL 8+ / InnoDB.
- Modular monolith, not microservices.
- Knowledge graph: relational edge records in MySQL; Cytoscape.js visualization later.
- Initial search: MySQL FULLTEXT.
- Uploads: private object storage; database stores metadata/storage key, not file bytes.
- Avoid Redis/Celery, Neo4j, vector DB, Kubernetes and model training in MVP unless justified later.

### Security direction
Argon2id password hashing; secure session/token design; CSRF if cookie auth; rate limiting; CORS allowlist; HTTPS; secrets in environment variables; backups; ownership checks; SSRF protection for URL import.

## 12-phase roadmap
1. Project setup, architecture and frontend foundation — **COMPLETED**
2. MySQL database design and DDL/migrations — **COMPLETED BY USER DIRECTION**
3. Authentication and user profiles — COMPLETED
4. Knowledge Vault — COMPLETED
5. Knowledge Graph — COMPLETED
6. Automatic document acquisition — COMPLETED
7. Learning Intelligence — COMPLETED
8. Mindtrace and Decision Intelligence — COMPLETED
9. Personal Intelligence Dashboard — COMPLETED
10. Social Network — COMPLETED
11. Privacy, security and optimization — COMPLETED
12. Deployment and public beta — IMPLEMENTED; DOCKER RUNTIME NOT AVAILABLE FOR VERIFICATION

The user requires each phase to be delivered separately with complete files, migrations as needed, setup/run/test instructions, debugging help, a ZIP, and Git guidance. Do not advance until the user confirms the current phase works.

## Phase 1 completed
ZIP previously delivered: `MINDOS_Phase_1.zip`.
Reported files/features: Vite + React + TypeScript + Tailwind frontend; FastAPI backend; health endpoint `/api/v1/health`; test `backend/tests/test_health.py`; dashboard and navigation for Overview, Knowledge Vault, Knowledge Graph, Learning, Mindtrace, Community, Profile and Settings; placeholder pages; `/api` proxy to `http://127.0.0.1:8000`.

### Phase 1 verification by user
- Windows PowerShell environment.
- Python 3.11 was absent; Python 3.14 was available.
- User successfully created and activated a venv using Python 3.14.
- Dependencies installed; backend launched using `python -m uvicorn app.main:app --reload`.
- Health endpoint returned expected JSON.
- Frontend started using `npm run dev`; screenshot showed dashboard, navigation and **API connected**.
- Phase 1 formally closed.

## Phase 2 database design
12 intended tables:
1. users
2. user_profiles
3. user_settings
4. knowledge_items
5. knowledge_sources
6. tags
7. knowledge_item_tags
8. knowledge_relations
9. learning_goals
10. reflections
11. decisions
12. decision_outcomes

Design details:
- MySQL 8.0.16+; InnoDB; utf8mb4.
- UUIDs use CHAR(36).
- `knowledge_items.understanding_status` defaults to `captured`.
- Never auto-mark imported content as understood.
- Graph edges stored in `knowledge_relations`.
- File bytes remain in private object storage, not MySQL.
- FULLTEXT indexes on knowledge, reflections and decisions.
- Social graph/feed/messaging deferred to Phase 10.

### Current database setup history
- User says MySQL is installed and running.
- Database `mindos` already existed.
- MySQL account `mindos_app`@`localhost` already existed; duplicate `CREATE USER` gave Error 1396.
- User was advised to alter existing account and grant privileges.
- User said a combined SQL setup script completed, but has not supplied MySQL version or table count.
- Do not assume the migration has run or the 12 tables exist.
- User prefers avoiding Workbench manual SQL and asked for a single automated PowerShell command.
- Two passwords were pasted into chat and must be considered compromised. User was advised to rotate them. Never repeat them or ask user to share the replacement password.

## Phase 2 automation package in this delivery
Files:
- `backend/database/migrations/001_initial_schema.up.sql`
- `backend/database/setup_database.py`
- `README_AUTOMATION.md`
- `docs/DATABASE_DESIGN.md`
- `MINDOS_PROJECT_CONTEXT.md`

The Python setup script:
- Prompts for host, port, database user, database and hidden password.
- Connects with PyMySQL.
- Checks MySQL version.
- If all 12 expected tables exist, exits successfully without changes.
- If a subset exists, stops without running DDL to avoid unsafe partial reruns.
- If none exist, runs the initial CREATE TABLE migration.
- Verifies all 12 tables after execution.
- Never drops tables or invokes the down migration.
- Warns that MySQL DDL may partially complete on error; do not rerun blindly after a failure.

## User environment / run command
Windows PowerShell. Project root previously reported as `C:\\users\\jayrp\\projects\\mindos`, containing `frontend` and `backend`.
Extract/merge this ZIP into the project root. Keep folder structure.
Activate backend venv first, then from project root run:

```powershell
python -m pip install PyMySQL; if ($LASTEXITCODE -eq 0) { python .\\backend\\database\\setup_database.py }
```

Accept defaults if correct: localhost, 3306, mindos_app, mindos. Enter the rotated application password locally at the hidden prompt. Never send it in chat.

If script reports partial schema, stop and share table names/error only. If it reports success, Phase 2 table creation is verified.

## Phase 2 definition of done
- MySQL version meets minimum.
- All 12 tables exist in `mindos`.
- Script prints `SUCCESS: all 12 MINDOS tables are present.`
- User confirms successful run.
Then, and only then, proceed to Phase 3.

## Phase 3 preview
Registration/login, Argon2id password hashing, secure auth/session or token design, profile create/read/update, validation, tests, environment config, integration with MySQL schema.

## Git workflow after each phase
```powershell
git status
git add .
git commit -m "Complete MINDOS Phase N"
git push origin main
```
Never commit `.env`, passwords, API keys, DB dumps or private uploads.
