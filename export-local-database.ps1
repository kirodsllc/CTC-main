# Export Local Database to SQL Migration Files
# PowerShell version for Windows

$ErrorActionPreference = "Continue"

Write-Host "=========================================="
Write-Host "  Export Local Database Data"
Write-Host "=========================================="
Write-Host ""

$BackendDir = ".\backend"
$ExportDir = ".\database-export"
$DbFile = "$BackendDir\prisma\dev.db"

if (-not (Test-Path $DbFile)) {
    Write-Host "[✗] Database file not found: $DbFile" -ForegroundColor Red
    $DbFile = "$BackendDir\prisma\inventory.db"
    if (-not (Test-Path $DbFile)) {
        Write-Host "[✗] Database file not found: $DbFile" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[✓] Found database: $DbFile" -ForegroundColor Green

# Create export directory
if (-not (Test-Path $ExportDir)) {
    New-Item -ItemType Directory -Path $ExportDir | Out-Null
}
Write-Host "[✓] Created export directory: $ExportDir" -ForegroundColor Green

# Check if sqlite3 is available
$sqlite3Path = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite3Path) {
    Write-Host "[✗] sqlite3 not found. Please install SQLite or use WSL/Git Bash" -ForegroundColor Red
    Write-Host "[!] Creating SQL export script that can be run on server..." -ForegroundColor Yellow
    
    # Create a script that will be run on server
    $MasterSQL = "$ExportDir\import-all-data.sql"
    $sqlContent = @"
-- Database Migration: Import All Data
-- Generated: $(Get-Date)
-- Source: $DbFile
-- NOTE: This file should be populated by running export on a system with sqlite3
-- Or manually export using: sqlite3 $DbFile .dump > import-all-data.sql

BEGIN TRANSACTION;

-- Run export-local-database.sh on a system with sqlite3 to populate this file
-- Or use: sqlite3 backend/prisma/dev.db .dump > database-export/import-all-data.sql

COMMIT;
"@
    $sqlContent | Out-File -FilePath $MasterSQL -Encoding UTF8
    
    Write-Host "[!] Created placeholder SQL file. Please run export on server or use WSL." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Step 1: Getting list of tables..."
$Tables = sqlite3 $DbFile "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_%' ORDER BY name;" 2>$null

if ([string]::IsNullOrEmpty($Tables)) {
    Write-Host "[✗] No tables found in database" -ForegroundColor Red
    exit 1
}

$TableArray = $Tables -split "`n" | Where-Object { $_ -ne "" }
$TableCount = $TableArray.Count
Write-Host "[✓] Found $TableCount tables" -ForegroundColor Green

# Create master SQL file
$MasterSQL = "$ExportDir\import-all-data.sql"
$header = "-- Database Migration: Import All Data`n-- Generated: $(Get-Date)`n-- Source: $DbFile`n`nBEGIN TRANSACTION;`n"
$header | Out-File -FilePath $MasterSQL -Encoding UTF8

Write-Host ""
Write-Host "Step 2: Exporting table data..."
$ExportedCount = 0

foreach ($table in $TableArray) {
    Write-Host "[i] Exporting: $table"
    
    # Get row count
    $RowCount = sqlite3 $DbFile "SELECT COUNT(*) FROM `"$table`";" 2>$null
    
    if ($RowCount -gt 0) {
        # Create individual table SQL file
        $TableSQL = "$ExportDir\$table.sql"
        
        Add-Content -Path $MasterSQL -Value "-- Table: $table"
        Add-Content -Path $MasterSQL -Value "-- Rows: $RowCount"
        Add-Content -Path $MasterSQL -Value ""
        
        # Export data with INSERT statements
        sqlite3 $DbFile ".mode insert $table`nSELECT * FROM `"$table`";" 2>$null | Out-File -FilePath $TableSQL -Encoding UTF8
        
        # Add to master SQL file
        Get-Content $TableSQL | Add-Content -Path $MasterSQL
        Add-Content -Path $MasterSQL -Value ""
        
        Write-Host "  [✓] Exported $RowCount rows" -ForegroundColor Green
        $ExportedCount++
    } else {
        Write-Host "  [!] Table is empty, skipping"
    }
}

Add-Content -Path $MasterSQL -Value "COMMIT;"

Write-Host ""
Write-Host "Step 3: Creating import script..."
$importScriptContent = Get-Content "import-database-server.sh" -Raw -ErrorAction SilentlyContinue
if (-not $importScriptContent) {
    # Create import script if it doesn't exist
    $importScriptContent = @'
#!/bin/bash
set +e
echo "=========================================="
echo "  Import Database Data to Server"
echo "=========================================="
echo ""
BACKEND_DIR="/var/www/nextapp/backend"
DB_FILE="$BACKEND_DIR/prisma/inventory.db"
SQL_FILE="./import-all-data.sql"
if [ ! -f "$SQL_FILE" ]; then
    SQL_FILE="/var/www/Upload/import-all-data.sql"
fi
if [ ! -f "$SQL_FILE" ]; then
    echo "[✗] SQL file not found"
    exit 1
fi
echo "[✓] Found SQL file: $SQL_FILE"
pm2 stop backend > /dev/null 2>&1 || true
sleep 2
BACKUP_FILE="$BACKEND_DIR/prisma/inventory.db.backup.$(date +%Y%m%d_%H%M%S)"
cp "$DB_FILE" "$BACKUP_FILE" 2>/dev/null || true
echo "[✓] Backup created"
sqlite3 "$DB_FILE" < "$SQL_FILE" && echo "[✓] Data imported" || echo "[✗] Import failed"
cd "$BACKEND_DIR" && rm -rf node_modules/.prisma node_modules/@prisma/client && npx prisma generate && pm2 start dist/server.js --name backend
echo "[✓] Complete!"
'@
}
$importScriptContent | Out-File -FilePath "$ExportDir\import-to-server.sh" -Encoding UTF8

Write-Host ""
Write-Host "Step 4: Creating compressed archive..."
Set-Location $ExportDir
Compress-Archive -Path * -DestinationPath "..\database-export.zip" -Force
Set-Location ..
if (Test-Path "database-export.zip") {
    Write-Host "[✓] Created: database-export.zip" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================="
Write-Host "  Export Complete!"
Write-Host "=========================================="
Write-Host ""
Write-Host "Exported $ExportedCount tables with data"
Write-Host ""
Write-Host "Files created:"
Write-Host "  - $MasterSQL (master import file)"
Write-Host "  - $ExportDir\import-to-server.sh (server import script)"
Write-Host "  - Individual table SQL files in $ExportDir\"
Write-Host "  - database-export.zip (compressed archive)"
Write-Host ""
Write-Host "To import on server:"
Write-Host "  1. Upload database-export.zip or database-export/ folder to /var/www/Upload/"
Write-Host "  2. Extract if needed: unzip database-export.zip"
Write-Host "  3. Run: bash import-to-server.sh"
Write-Host ""

