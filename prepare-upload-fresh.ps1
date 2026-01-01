# Prepare Fresh Upload Folder for VPS Deployment
# This script creates a clean Upload folder with only production files

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Preparing Fresh Upload Folder" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Remove existing Upload folder
if (Test-Path "Upload") {
    Write-Host "[!] Removing existing Upload folder..." -ForegroundColor Yellow
    Remove-Item -Path "Upload" -Recurse -Force
    Write-Host "[✓] Upload folder removed" -ForegroundColor Green
}

# Create new Upload folder
Write-Host "[!] Creating new Upload folder..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "Upload" -Force | Out-Null
Write-Host "[✓] Upload folder created" -ForegroundColor Green

# Files and folders to copy (production only)
$filesToCopy = @(
    # Root files
    "package.json",
    "package-lock.json",
    "index.html",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "tailwind.config.ts",
    "postcss.config.js",
    "eslint.config.js",
    "components.json",
    
    # Source code
    "src",
    
    # Public assets
    "public",
    
    # Backend
    "backend"
)

# Copy files
Write-Host "[!] Copying production files..." -ForegroundColor Yellow
foreach ($item in $filesToCopy) {
    if (Test-Path $item) {
        $destPath = Join-Path "Upload" $item
        $destParent = Split-Path $destPath -Parent
        if ($destParent -and -not (Test-Path $destParent)) {
            New-Item -ItemType Directory -Path $destParent -Force | Out-Null
        }
        Copy-Item -Path $item -Destination $destPath -Recurse -Force
        Write-Host "  [✓] Copied: $item" -ForegroundColor Green
    } else {
        Write-Host "  [!] Not found: $item" -ForegroundColor Yellow
    }
}

# Clean up backend folder - remove unnecessary files
Write-Host ""
Write-Host "[!] Cleaning backend folder..." -ForegroundColor Yellow

$backendPath = "Upload\backend"

# Remove .md files from backend
Get-ChildItem -Path $backendPath -Filter "*.md" -Recurse | Remove-Item -Force
Write-Host "  [✓] Removed .md files from backend" -ForegroundColor Green

# Remove test files from backend
$testPatterns = @("*.test.*", "*test*.js", "*test*.ts", "test-*.ps1", "test-*.js", "verify-*.ps1", "verify-*.js")
foreach ($pattern in $testPatterns) {
    Get-ChildItem -Path $backendPath -Filter $pattern -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force
}
Write-Host "  [✓] Removed test files from backend" -ForegroundColor Green

# Remove seed data files
$seedFiles = Get-ChildItem -Path $backendPath -Filter "*seed*" -Recurse -ErrorAction SilentlyContinue
foreach ($file in $seedFiles) {
    if ($file.Name -like "*seed*" -and $file.Name -notlike "*schema*") {
        Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "  [✓] Removed seed data files" -ForegroundColor Green

# Remove database files (will be created fresh on VPS)
$dbFiles = Get-ChildItem -Path $backendPath -Filter "*.db*" -Recurse -ErrorAction SilentlyContinue
foreach ($file in $dbFiles) {
    Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
}
Write-Host "  [✓] Removed database files (will be created fresh)" -ForegroundColor Green

# Remove temp files
$tempFiles = Get-ChildItem -Path $backendPath -Filter "temp_*" -Recurse -ErrorAction SilentlyContinue
foreach ($file in $tempFiles) {
    Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
}
Write-Host "  [✓] Removed temp files" -ForegroundColor Green

# Remove .md files from root Upload folder
Get-ChildItem -Path "Upload" -Filter "*.md" -File | Remove-Item -Force
Write-Host "  [✓] Removed .md files from root" -ForegroundColor Green

# Remove test files from root Upload folder
foreach ($pattern in $testPatterns) {
    Get-ChildItem -Path "Upload" -Filter $pattern -File -ErrorAction SilentlyContinue | Remove-Item -Force
}
Write-Host "  [✓] Removed test files from root" -ForegroundColor Green

# Remove import/export scripts (not needed for production)
$importScripts = Get-ChildItem -Path "Upload" -Filter "*import*" -File -ErrorAction SilentlyContinue
$exportScripts = Get-ChildItem -Path "Upload" -Filter "*export*" -File -ErrorAction SilentlyContinue
$convertScripts = Get-ChildItem -Path "Upload" -Filter "*convert*" -File -ErrorAction SilentlyContinue
$extractScripts = Get-ChildItem -Path "Upload" -Filter "*extract*" -File -ErrorAction SilentlyContinue
$parseScripts = Get-ChildItem -Path "Upload" -Filter "*parse*" -File -ErrorAction SilentlyContinue
$pdfScripts = Get-ChildItem -Path "Upload" -Filter "*pdf*" -File -ErrorAction SilentlyContinue
$deleteScripts = Get-ChildItem -Path "Upload" -Filter "*delete*" -File -ErrorAction SilentlyContinue
$forceScripts = Get-ChildItem -Path "Upload" -Filter "*force*" -File -ErrorAction SilentlyContinue
$verifyScripts = Get-ChildItem -Path "Upload" -Filter "*verify*" -File -ErrorAction SilentlyContinue

$allScripts = $importScripts + $exportScripts + $convertScripts + $extractScripts + $parseScripts + $pdfScripts + $deleteScripts + $forceScripts + $verifyScripts
foreach ($script in $allScripts) {
    Remove-Item -Path $script.FullName -Force -ErrorAction SilentlyContinue
}
Write-Host "  [✓] Removed import/export/utility scripts" -ForegroundColor Green

# Remove data files
$dataFiles = Get-ChildItem -Path "Upload" -Filter "*.xlsx" -File -ErrorAction SilentlyContinue
$dataFiles += Get-ChildItem -Path "Upload" -Filter "*.json" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Item*" -or $_.Name -like "*CTC*" }
$dataFiles += Get-ChildItem -Path "Upload" -Filter "*.txt" -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*pdf*" -or $_.Name -like "*extracted*" }
foreach ($file in $dataFiles) {
    Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
}
Write-Host "  [✓] Removed data files" -ForegroundColor Green

# Remove Python files
Get-ChildItem -Path "Upload" -Filter "*.py" -File -ErrorAction SilentlyContinue | Remove-Item -Force
Write-Host "  [✓] Removed Python files" -ForegroundColor Green

# Remove PowerShell scripts
Get-ChildItem -Path "Upload" -Filter "*.ps1" -File -ErrorAction SilentlyContinue | Remove-Item -Force
Write-Host "  [✓] Removed PowerShell scripts" -ForegroundColor Green

# Remove docs folder if exists
if (Test-Path "Upload\docs") {
    Remove-Item -Path "Upload\docs" -Recurse -Force
    Write-Host "  [✓] Removed docs folder" -ForegroundColor Green
}

# Ensure backend/src/server.ts has correct CORS configuration
Write-Host ""
Write-Host "[!] Verifying backend CORS configuration..." -ForegroundColor Yellow
$serverTsPath = "Upload\backend\src\server.ts"
if (Test-Path $serverTsPath) {
    $serverContent = Get-Content $serverTsPath -Raw
    if ($serverContent -notmatch "103\.60\.12\.157") {
        Write-Host "  [!] CORS configuration may need update (will be fixed by install script)" -ForegroundColor Yellow
    } else {
        Write-Host "  [✓] CORS configuration looks good" -ForegroundColor Green
    }
}

# Ensure frontend API configuration uses relative paths
Write-Host "[!] Verifying frontend API configuration..." -ForegroundColor Yellow
$apiTsPath = "Upload\src\lib\api.ts"
if (Test-Path $apiTsPath) {
    $apiContent = Get-Content $apiTsPath -Raw
    if ($apiContent -match "localhost:3001" -and $apiContent -notmatch "'/api'") {
        Write-Host "  [!] API configuration may need update (will be fixed by install script)" -ForegroundColor Yellow
    } else {
        Write-Host "  [✓] API configuration looks good" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Upload Folder Ready!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Upload the 'Upload' folder to your VPS at /var/www/Upload" -ForegroundColor White
Write-Host "  2. Run the installation script on the VPS" -ForegroundColor White
Write-Host ""

