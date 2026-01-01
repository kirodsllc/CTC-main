$db = "backend\prisma\dev.db"
$output = "database-export\import-all-data.sql"
New-Item -ItemType Directory -Force -Path "database-export" | Out-Null
Write-Host "Exporting database..."
sqlite3 $db ".dump" | Out-File -FilePath $output -Encoding UTF8
Write-Host "Export complete: $output"
Copy-Item "import-database-server.sh" "database-export\import-to-server.sh" -ErrorAction SilentlyContinue
Write-Host "Files ready in database-export folder"

