# Script to Clear All Seed Data from Database
# This will remove all test/seed data from the database

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CLEARING ALL SEED DATA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend directory exists
if (-not (Test-Path "backend")) {
    Write-Host "ERROR: Backend directory not found!" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location backend

Write-Host "Clearing all data from database..." -ForegroundColor Yellow
Write-Host ""

# Run the clear data script
try {
    npm run clear-data
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ All seed data cleared successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Error clearing data. Exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error running clear-data script: $_" -ForegroundColor Red
    exit 1
}

# Return to root directory
Set-Location ..

Write-Host "`nData clearing completed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow

