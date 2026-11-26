param(
    [Parameter(Mandatory = $true)]
    [string]$MysqlDumpPath,
    [Parameter(Mandatory = $true)]
    [string]$BackupDirectory
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $BackupDirectory "mindos-$timestamp.sql"

& $MysqlDumpPath -h 127.0.0.1 -u mindos_app -p mindos `
    --routines --events --single-transaction --set-gtid-purged=OFF |
    Set-Content -Encoding UTF8 $backupFile

Write-Host "Backup written to $backupFile"
