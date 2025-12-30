Write-Host "=== Checking Database State ===" -ForegroundColor Cyan
Write-Host ""

# Check if categories were created
Write-Host "Checking categories..." -ForegroundColor Yellow
try {
    $categories = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/categories" -Method GET
    $testCategories = $categories | Where-Object { $_.name -like "TestCategory_*" }
    Write-Host "Found $($testCategories.Count) test categories:" -ForegroundColor $(if ($testCategories.Count -gt 0) { "Green" } else { "Yellow" })
    $testCategories | ForEach-Object {
        Write-Host "  - $($_.name) (ID: $($_.id))" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Failed to get categories: $_" -ForegroundColor Red
}

Write-Host ""

# Check if subcategories were created
Write-Host "Checking subcategories..." -ForegroundColor Yellow
try {
    $subcategories = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/subcategories" -Method GET
    $testSubcategories = $subcategories | Where-Object { $_.name -like "TestSubcategory_*" }
    Write-Host "Found $($testSubcategories.Count) test subcategories:" -ForegroundColor $(if ($testSubcategories.Count -gt 0) { "Green" } else { "Yellow" })
    $testSubcategories | ForEach-Object {
        Write-Host "  - $($_.name) (ID: $($_.id), Category: $($_.categoryId))" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Failed to get subcategories: $_" -ForegroundColor Red
}

Write-Host ""

# Check if applications were created
Write-Host "Checking applications..." -ForegroundColor Yellow
try {
    $applications = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/applications" -Method GET
    $testApplications = $applications | Where-Object { $_.name -like "TestApplication_*" }
    Write-Host "Found $($testApplications.Count) test applications:" -ForegroundColor $(if ($testApplications.Count -gt 0) { "Green" } else { "Yellow" })
    $testApplications | ForEach-Object {
        Write-Host "  - $($_.name) (ID: $($_.id), Subcategory: $($_.subcategoryId))" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Failed to get applications: $_" -ForegroundColor Red
}

Write-Host ""

# Check the part
Write-Host "Checking part..." -ForegroundColor Yellow
try {
    $part = Invoke-RestMethod -Uri "http://localhost:3001/api/parts/0d7cd426-50a0-4460-9977-a720e142347b" -Method GET
    Write-Host "Part: $($part.part_no)" -ForegroundColor Gray
    Write-Host "  Category: '$($part.category_name)'" -ForegroundColor $(if ($part.category_name) { "Green" } else { "Red" })
    Write-Host "  Subcategory: '$($part.subcategory_name)'" -ForegroundColor $(if ($part.subcategory_name) { "Green" } else { "Red" })
    Write-Host "  Application: '$($part.application_name)'" -ForegroundColor $(if ($part.application_name) { "Green" } else { "Red" })
} catch {
    Write-Host "[ERROR] Failed to get part: $_" -ForegroundColor Red
}

