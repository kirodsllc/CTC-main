# Script to prepare files for VPS upload
# This script copies all necessary files to the Upload folder, excluding node_modules, dist, and other build artifacts

$uploadFolder = "Upload"

# Remove existing Upload folder if it exists
if (Test-Path $uploadFolder) {
    Write-Host "Removing existing Upload folder..." -ForegroundColor Yellow
    Remove-Item -Path $uploadFolder -Recurse -Force
}

# Create Upload folder
Write-Host "Creating Upload folder..." -ForegroundColor Green
New-Item -ItemType Directory -Path $uploadFolder | Out-Null

# Function to copy files excluding certain patterns
function Copy-FilesExcluding {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$ExcludePatterns
    )
    
    Get-ChildItem -Path $Source -Recurse | Where-Object {
        $item = $_
        $relativePath = $item.FullName.Substring($Source.Length + 1)
        $shouldExclude = $false
        
        foreach ($pattern in $ExcludePatterns) {
            if ($relativePath -like $pattern -or $item.Name -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        
        return -not $shouldExclude
    } | ForEach-Object {
        $destPath = Join-Path $Destination $_.FullName.Substring($Source.Length + 1)
        $destDir = Split-Path $destPath -Parent
        
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Copy-Item -Path $_.FullName -Destination $destPath -Force
    }
}

# Patterns to exclude
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
    "Upload\*",
    "*.suo",
    "*.ntvs*",
    "*.njsproj",
    "*.sln",
    "*.sw?",
    "bun.lockb"
)

Write-Host "Copying files to Upload folder..." -ForegroundColor Green

# Copy root files
Write-Host "Copying root files..." -ForegroundColor Cyan
Get-ChildItem -Path "." -File | Where-Object {
    $exclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($_.Name -like $pattern) {
            $exclude = $true
            break
        }
    }
    return -not $exclude
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $uploadFolder $_.Name) -Force
}

# Copy directories
Write-Host "Copying directories..." -ForegroundColor Cyan
$directoriesToCopy = @("src", "public", "backend", "docs")

foreach ($dir in $directoriesToCopy) {
    if (Test-Path $dir) {
        Write-Host "Copying $dir..." -ForegroundColor Cyan
        $destDir = Join-Path $uploadFolder $dir
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        
        Get-ChildItem -Path $dir -Recurse | Where-Object {
            $item = $_
            $relativePath = $item.FullName.Substring((Resolve-Path $dir).Path.Length + 1)
            $shouldExclude = $false
            
            foreach ($pattern in $excludePatterns) {
                if ($relativePath -like $pattern -or $item.Name -like $pattern) {
                    $shouldExclude = $true
                    break
                }
            }
            
            return -not $shouldExclude
        } | ForEach-Object {
            $destPath = Join-Path $uploadFolder $_.FullName.Substring((Get-Location).Path.Length + 1)
            $destDirPath = Split-Path $destPath -Parent
            
            if (-not (Test-Path $destDirPath)) {
                New-Item -ItemType Directory -Path $destDirPath -Force | Out-Null
            }
            
            Copy-Item -Path $_.FullName -Destination $destPath -Force
        }
    }
}

# Copy other config files in root
$configFiles = @("tsconfig.json", "tsconfig.app.json", "tsconfig.node.json", "tailwind.config.ts", "postcss.config.js", "vite.config.ts", "eslint.config.js", "components.json")

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination (Join-Path $uploadFolder $file) -Force
    }
}

Write-Host "`nUpload folder prepared successfully!" -ForegroundColor Green
Write-Host "Location: $((Get-Location).Path)\$uploadFolder" -ForegroundColor Yellow
Write-Host "`nYou can now compress this folder and upload it to your VPS." -ForegroundColor Cyan

