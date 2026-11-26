# MINDOS Phase 2 automation package

Extract/merge this ZIP into your existing MINDOS project root (the folder containing `frontend` and `backend`). Do not replace Phase 1 files.

From the MINDOS root in PowerShell, with the backend virtual environment activated, run:

```powershell
python -m pip install PyMySQL; if ($LASTEXITCODE -eq 0) { python .\backend\database\setup_database.py }
```

The script prompts for MySQL host, port, username, database and a hidden password. Defaults are `localhost`, `3306`, `mindos_app`, and `mindos`. Enter your newly rotated password locally; do not send it in chat.

Safety: all 12 tables already present = no-op success; partial schema = stop; none present = apply migration. The script never drops tables. If DDL fails, stop and share the error rather than rerunning blindly.

See `MINDOS_PROJECT_CONTEXT.md` for complete architecture, roadmap and work log.
