Write-Host "=== Full Application Flow Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check backend
Write-Host "Test 1: Checking backend..." -ForegroundColor Yellow
try {
    $test = Invoke-WebRequest -Uri "http://localhost:3001/api/parts?limit=1" -Method GET -UseBasicParsing -TimeoutSec 3
    Write-Host "[OK] Backend is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend not running!" -ForegroundColor Red
    exit 1
}

# Test 2: Create or find category
Write-Host ""
Write-Host "Test 2: Setting up category..." -ForegroundColor Yellow
$categoryName = "TestCategory_$(Get-Date -Format 'yyyyMMddHHmmss')"
try {
    # Try to find existing category first
    $categories = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/categories" -Method GET
    $category = $categories | Where-Object { $_.name -like "TestCategory_*" } | Select-Object -First 1
    
    if (-not $category) {
        # Create category via parts API (it auto-creates)
        Write-Host "  Creating category: $categoryName" -ForegroundColor Gray
        $category = @{ name = $categoryName }
    } else {
        $categoryName = $category.name
        Write-Host "  Using existing category: $categoryName" -ForegroundColor Gray
    }
    Write-Host "[OK] Category ready: $categoryName" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Category setup failed: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Create or find subcategory
Write-Host ""
Write-Host "Test 3: Setting up subcategory..." -ForegroundColor Yellow
$subcategoryName = "TestSubcategory_$(Get-Date -Format 'yyyyMMddHHmmss')"
try {
    # Try to find existing subcategory
    $subcategories = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/subcategories" -Method GET
    $subcategory = $subcategories | Where-Object { $_.name -like "TestSubcategory_*" } | Select-Object -First 1
    
    if (-not $subcategory) {
        Write-Host "  Subcategory will be auto-created when we update a part" -ForegroundColor Gray
    } else {
        $subcategoryName = $subcategory.name
        Write-Host "  Using existing subcategory: $subcategoryName" -ForegroundColor Gray
    }
    Write-Host "[OK] Subcategory ready: $subcategoryName" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Subcategory setup failed: $_" -ForegroundColor Red
    exit 1
}

# Test 4: Get a part to update
Write-Host ""
Write-Host "Test 4: Getting a part to update..." -ForegroundColor Yellow
try {
    $parts = Invoke-RestMethod -Uri "http://localhost:3001/api/parts?limit=1" -Method GET
    if ($parts.data.Count -eq 0) {
        Write-Host "[ERROR] No parts found" -ForegroundColor Red
        exit 1
    }
    
    $partId = $parts.data[0].id
    $partNo = $parts.data[0].part_no
    Write-Host "  Part: $partNo (ID: $partId)" -ForegroundColor Gray
    Write-Host "[OK] Part found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to get part: $_" -ForegroundColor Red
    exit 1
}

# Test 5: Update part with category, subcategory, and application
Write-Host ""
Write-Host "Test 5: Updating part with category, subcategory, and application..." -ForegroundColor Yellow
$applicationName = "TestApplication_$(Get-Date -Format 'yyyyMMddHHmmss')"
try {
    $updateBody = @{
        part_no = $partNo
        category_id = $categoryName
        subcategory_id = $subcategoryName
        application_id = $applicationName
        status = "active"
    } | ConvertTo-Json
    
    Write-Host "  Category: $categoryName" -ForegroundColor Gray
    Write-Host "  Subcategory: $subcategoryName" -ForegroundColor Gray
    Write-Host "  Application: $applicationName" -ForegroundColor Gray
    
    $updateResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/parts/$partId" -Method PUT -Body $updateBody -Headers @{ "Content-Type" = "application/json" }
    
    Write-Host "[OK] Part updated" -ForegroundColor Green
    Write-Host "  Response category_name: '$($updateResponse.category_name)'" -ForegroundColor $(if ($updateResponse.category_name) { "Green" } else { "Red" })
    Write-Host "  Response subcategory_name: '$($updateResponse.subcategory_name)'" -ForegroundColor $(if ($updateResponse.subcategory_name) { "Green" } else { "Red" })
    Write-Host "  Response application_name: '$($updateResponse.application_name)'" -ForegroundColor $(if ($updateResponse.application_name) { "Green" } else { "Red" })
    
    if (-not $updateResponse.application_name) {
        Write-Host ""
        Write-Host "[ERROR] Application NOT in update response!" -ForegroundColor Red
        Write-Host "This indicates the backend failed to create/find the application." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Update failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Test 6: Verify in GET all parts (Items List API)
Write-Host ""
Write-Host "Test 6: Verifying in Items List API (GET /api/parts)..." -ForegroundColor Yellow
try {
    $allParts = Invoke-RestMethod -Uri "http://localhost:3001/api/parts?limit=1000" -Method GET
    $updatedPart = $allParts.data | Where-Object { $_.id -eq $partId }
    
    if ($updatedPart) {
        Write-Host "  Part No: $($updatedPart.part_no)" -ForegroundColor Gray
        Write-Host "  Category: '$($updatedPart.category_name)'" -ForegroundColor $(if ($updatedPart.category_name) { "Green" } else { "Red" })
        Write-Host "  Subcategory: '$($updatedPart.subcategory_name)'" -ForegroundColor $(if ($updatedPart.subcategory_name) { "Green" } else { "Red" })
        Write-Host "  Application: '$($updatedPart.application_name)'" -ForegroundColor $(if ($updatedPart.application_name) { "Green" } else { "Red" })
        
        if ($updatedPart.application_name -eq $applicationName) {
            Write-Host ""
            Write-Host "[SUCCESS] Application IS correctly saved and returned!" -ForegroundColor Green
            Write-Host ""
            Write-Host "=== DIAGNOSIS ===" -ForegroundColor Cyan
            Write-Host "The backend is working correctly." -ForegroundColor Green
            Write-Host "The API returns application_name correctly." -ForegroundColor Green
            Write-Host ""
            Write-Host "If it's not showing in the UI, check:" -ForegroundColor Yellow
            Write-Host "  1. Frontend refresh logic in Parts.tsx" -ForegroundColor Gray
            Write-Host "  2. Data mapping in fetchItems()" -ForegroundColor Gray
            Write-Host "  3. Browser cache - try hard refresh (Ctrl+F5)" -ForegroundColor Gray
            Write-Host "  4. Check browser console for errors" -ForegroundColor Gray
            exit 0
        } elseif ($updatedPart.application_name) {
            Write-Host ""
            Write-Host "[WARN] Application exists but name doesn't match!" -ForegroundColor Yellow
            Write-Host "  Expected: $applicationName" -ForegroundColor Gray
            Write-Host "  Got: $($updatedPart.application_name)" -ForegroundColor Gray
            exit 0
        } else {
            Write-Host ""
            Write-Host "[ERROR] Application NOT in GET response!" -ForegroundColor Red
            Write-Host "This indicates a backend issue with the response structure." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[ERROR] Part not found in GET response" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Verification failed: $_" -ForegroundColor Red
    exit 1
}

