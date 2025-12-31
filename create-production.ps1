# Script to create production-ready folder
# This script copies only production-essential files, excluding development, test, and documentation files

$productionFolder = "Production"

# Remove existing Production folder if it exists
if (Test-Path $productionFolder) {
    Write-Host "Removing existing Production folder..." -ForegroundColor Yellow
    Remove-Item -Path $productionFolder -Recurse -Force
}

# Create Production folder
Write-Host "Creating Production folder..." -ForegroundColor Green
New-Item -ItemType Directory -Path $productionFolder | Out-Null

# Patterns to exclude (production exclusions)
$excludePatterns = @(
    "node_modules\*",
    "dist\*",
    "dist-ssr\*",
    ".next\*",
    ".git\*",
    ".vscode\*",
    ".idea\*",
    "*.log",
    "*.local",
    ".DS_Store",
    "*.suo",
    "*.ntvs*",
    "*.njsproj",
    "*.sln",
    "*.sw?",
    "bun.lockb",
    "Production\*",
    "Upload\*",
    # Documentation files (except README.md)
    "*.md",
    "!README.md",
    # Test files
    "test-*.ps1",
    "test-*.js",
    "test-*.ts",
    "*.test.*",
    "*.spec.*",
    # Development scripts
    "import-*.cjs",
    "import-*.js",
    "extract-*.cjs",
    "pdf-to-*.cjs",
    "parse-and-*.cjs",
    "delete-*.cjs",
    "force-*.cjs",
    "clear-*.ps1",
    "clear-*.cjs",
    "verify-*.ps1",
    "verify-*.js",
    "complete-*.cjs",
    "enhanced-*.cjs",
    # Data files
    "*.xlsx",
    "*.xls",
    "*.csv",
    "*.txt",
    "*.pdf",
    "pdf_*.txt",
    # Python scripts (if not needed in production)
    "*.py",
    # Temporary files
    "temp_*.txt",
    "temp_*.sql"
)

# Essential files to include (root level)
$essentialRootFiles = @(
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "vite.config.ts",
    "tailwind.config.ts",
    "postcss.config.js",
    "eslint.config.js",
    "components.json",
    "index.html"
)

Write-Host "Copying production files..." -ForegroundColor Green

# Copy essential root files
Write-Host "Copying root configuration files..." -ForegroundColor Cyan
foreach ($file in $essentialRootFiles) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination (Join-Path $productionFolder $file) -Force
        Write-Host "  [OK] $file" -ForegroundColor Gray
    }
}

# Copy src directory (frontend source)
Write-Host "Copying src directory..." -ForegroundColor Cyan
if (Test-Path "src") {
    $srcDest = Join-Path $productionFolder "src"
    New-Item -ItemType Directory -Path $srcDest -Force | Out-Null
    
    Get-ChildItem -Path "src" -Recurse -File | Where-Object {
        $item = $_
        $shouldExclude = $false
        
        foreach ($pattern in $excludePatterns) {
            if ($pattern.StartsWith("!")) {
                continue
            }
            if ($item.Name -like $pattern -or $item.FullName -like "*\$pattern") {
                $shouldExclude = $true
                break
            }
        }
        
        return -not $shouldExclude
    } | ForEach-Object {
        $destPath = Join-Path $productionFolder $_.FullName.Substring((Get-Location).Path.Length + 1)
        $destDir = Split-Path $destPath -Parent
        
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Copy-Item -Path $_.FullName -Destination $destPath -Force
    }
    Write-Host "  [OK] src directory copied" -ForegroundColor Gray
}

# Copy public directory
Write-Host "Copying public directory..." -ForegroundColor Cyan
if (Test-Path "public") {
    $publicDest = Join-Path $productionFolder "public"
    New-Item -ItemType Directory -Path $publicDest -Force | Out-Null
    
    Get-ChildItem -Path "public" -Recurse | Where-Object {
        $item = $_
        $shouldExclude = $false
        
        foreach ($pattern in $excludePatterns) {
            if ($pattern.StartsWith("!")) {
                continue
            }
            if ($item.Name -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        
        return -not $shouldExclude
    } | ForEach-Object {
        $destPath = Join-Path $productionFolder $_.FullName.Substring((Get-Location).Path.Length + 1)
        $destDir = Split-Path $destPath -Parent
        
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Copy-Item -Path $_.FullName -Destination $destPath -Force -Recurse
    }
    Write-Host "  [OK] public directory copied" -ForegroundColor Gray
}

# Copy backend directory (with selective exclusions)
Write-Host "Copying backend directory..." -ForegroundColor Cyan
if (Test-Path "backend") {
    $backendDest = Join-Path $productionFolder "backend"
    New-Item -ItemType Directory -Path $backendDest -Force | Out-Null
    
    # Backend files to exclude
    $backendExcludePatterns = @(
        "node_modules\*",
        "dist\*",
        "*.log",
        "*.md",
        "!README.md",
        "test-*.js",
        "test-*.ts",
        "test-*.ps1",
        "verify-*.js",
        "verify-*.ps1",
        "*.db",
        "*.db-journal",
        "temp_*.txt",
        "temp_*.sql"
    )
    
    # Copy backend package files
    $backendEssentialFiles = @("package.json", "package-lock.json", "tsconfig.json")
    foreach ($file in $backendEssentialFiles) {
        $sourcePath = Join-Path "backend" $file
        if (Test-Path $sourcePath) {
            Copy-Item -Path $sourcePath -Destination (Join-Path $backendDest $file) -Force
        }
    }
    
    # Copy backend src directory
    if (Test-Path "backend\src") {
        $backendSrcDest = Join-Path $backendDest "src"
        Get-ChildItem -Path "backend\src" -Recurse -File | ForEach-Object {
            $destPath = Join-Path $backendDest $_.FullName.Substring((Resolve-Path "backend").Path.Length + 1)
            $destDir = Split-Path $destPath -Parent
            
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            Copy-Item -Path $_.FullName -Destination $destPath -Force
        }
    }
    
    # Copy Prisma directory (schema and migrations only, no database files)
    if (Test-Path "backend\prisma") {
        $prismaDest = Join-Path $backendDest "prisma"
        New-Item -ItemType Directory -Path $prismaDest -Force | Out-Null
        
        # Copy schema.prisma
        if (Test-Path "backend\prisma\schema.prisma") {
            Copy-Item -Path "backend\prisma\schema.prisma" -Destination (Join-Path $prismaDest "schema.prisma") -Force
        }
        
        # Copy migrations directory
        if (Test-Path "backend\prisma\migrations") {
            $migrationsDest = Join-Path $prismaDest "migrations"
            Get-ChildItem -Path "backend\prisma\migrations" -Recurse -File | Where-Object {
                $_.Extension -eq ".sql" -or $_.Name -eq "migration_lock.toml"
            } | ForEach-Object {
                $destPath = Join-Path $prismaDest $_.FullName.Substring((Resolve-Path "backend\prisma").Path.Length + 1)
                $destDir = Split-Path $destPath -Parent
                
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                }
                
                Copy-Item -Path $_.FullName -Destination $destPath -Force
            }
        }
    }
    
    # Copy backend scripts directory (only production scripts)
    if (Test-Path "backend\scripts") {
        $scriptsDest = Join-Path $backendDest "scripts"
        Get-ChildItem -Path "backend\scripts" -File | Where-Object {
            $_.Name -notlike "test-*" -and $_.Name -notlike "verify-*" -and $_.Name -notlike "clear-*"
        } | ForEach-Object {
            $destPath = Join-Path $scriptsDest $_.Name
            $destDir = Split-Path $destPath -Parent
            
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            
            Copy-Item -Path $_.FullName -Destination $destPath -Force
        }
    }
    
    # Copy other backend files (excluding test files)
    Get-ChildItem -Path "backend" -File | Where-Object {
        $_.Name -notlike "test-*" -and $_.Name -notlike "verify-*" -and $_.Name -notlike "*.md" -and $_.Name -notlike "*.ps1"
    } | ForEach-Object {
        $destPath = Join-Path $backendDest $_.Name
        Copy-Item -Path $_.FullName -Destination $destPath -Force
    }
    
    Write-Host "  [OK] backend directory copied" -ForegroundColor Gray
}

# Create production README
$productionReadme = @'
# Production Deployment

This is a production-ready build of the application.

## Structure

- `src/` - Frontend source code
- `public/` - Public assets
- `backend/` - Backend API source code
- `backend/prisma/` - Database schema and migrations

## Setup Instructions

See VPS_SETUP_GUIDE.md or VPS_COMMANDS.md for deployment instructions.

## Environment Variables

### Backend (.env)
```
DATABASE_URL="file:./prisma/inventory.db"
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://your-domain.com
```

## Build Commands

### Frontend
```bash
npm install
npm run build
```

### Backend
```bash
cd backend
npm install
npm run build
npx prisma generate
```
'@

$productionReadme | Out-File -FilePath (Join-Path $productionFolder "README.md") -Encoding UTF8

Write-Host "`nProduction folder created successfully!" -ForegroundColor Green
Write-Host "Location: $((Get-Location).Path)\$productionFolder" -ForegroundColor Yellow
Write-Host "`nThis folder contains only production-essential files:" -ForegroundColor Cyan
Write-Host "  [OK] Source code (src/, backend/src/)" -ForegroundColor Gray
Write-Host "  [OK] Configuration files" -ForegroundColor Gray
Write-Host "  [OK] Prisma schema and migrations" -ForegroundColor Gray
Write-Host "  [OK] Public assets" -ForegroundColor Gray
Write-Host "`nExcluded:" -ForegroundColor Cyan
Write-Host "  [X] Documentation files" -ForegroundColor Gray
Write-Host "  [X] Test files" -ForegroundColor Gray
Write-Host "  [X] Development scripts" -ForegroundColor Gray
Write-Host "  [X] Data files (Excel, CSV, etc.)" -ForegroundColor Gray
Write-Host "  [X] Database files (will be created on server)" -ForegroundColor Gray
Write-Host "`nYou can now compress this folder and upload it to your VPS." -ForegroundColor Cyan

