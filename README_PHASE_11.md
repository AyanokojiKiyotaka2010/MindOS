# MINDOS Phase 11 — Privacy, Security, and Optimization

## Implemented

- HTTP-only session cookie
- SameSite Strict cookie mode
- Double-submit CSRF validation for state-changing APIs
- Argon2id password hashing
- SSRF protection for URL imports
- Ownership checks for user records
- Private upload storage
- Security headers
- Strict production HSTS header
- Rate limiting for auth attempts
- `.env`, private uploads, SQLite runtime data, and build output exclusions

## Production requirements

- Set a strong unique `AUTH_SECRET`
- Use HTTPS end to end
- Rotate database and auth credentials
- Keep `ENVIRONMENT=production`
- Restrict CORS origins
- Schedule encrypted off-site database backups
- Restrict private upload directory permissions
- Review logs for secrets and personal data

## Backup

```powershell
cd C:\Users\jayrp\Projects\mindos
.\backend\scripts\backup_mysql.ps1 `
  -MysqlDumpPath "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" `
  -BackupDirectory "C:\MindOSBackups"
```
