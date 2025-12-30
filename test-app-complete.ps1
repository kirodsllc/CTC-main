Write-Host "=== Complete Application Test ===" -ForegroundColor Cyan
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

# Test 2: Create or get category
Write-Host ""
Write-Host "Test 2: Creating/getting category..." -ForegroundColor Yellow
$categoryName = "TestCategory_$(Get-Date -Format 'yyyyMMddHHmmss')"
try {
    $cats = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/categories" -Method GET
    $category = $cats | Where-Object { $_.name -like "TestCategory_*" } | Select-Object -First 1
    
    if (-not $category) {
        # Create category via parts API (we'll use a workaround - create a part with this category)
        Write-Host "  Creating new category: $categoryName" -ForegroundColor Gray
        # Actually, we can't create categories via parts API. Let's use an existing one or skip
        Write-Host "  [INFO] Using existing category or creating via admin" -ForegroundColor Yellow
        $category = $cats[0]
        if ($category) {
            $categoryName = $category.name
            Write-Host "  Using existing category: $categoryName" -ForegroundColor Gray
        } else {
            Write-Host "[ERROR] No categories found. Please create one in Attributes page." -ForegroundColor Red
            exit 1
        }
    } else {
        $categoryName = $category.name
        Write-Host "  Using existing category: $categoryName" -ForegroundColor Gray
    }
    $categoryId = $category.id
    Write-Host "[OK] Category: $categoryName (ID: $categoryId)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Error: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Create or get subcategory
Write-Host ""
Write-Host "Test 3: Creating/getting subcategory..." -ForegroundColor Yellow
$subcategoryName = "TestSubcategory_$(Get-Date -Format 'yyyyMMddHHmmss')"
try {
    $subs = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/subcategories" -Method GET
    $subcategory = $subs | Where-Object { $_.categoryId -eq $categoryId -and $_.name -like "TestSubcategory_*" } | Select-Object -First 1
    
    if (-not $subcategory) {
        Write-Host "  [INFO] Subcategory will be auto-created when we create a part with it" -ForegroundColor Yellow
        # We'll test auto-creation by using it in a part
    } else {
        $subcategoryName = $subcategory.name
        Write-Host "  Using existing subcategory: $subcategoryName" -ForegroundColor Gray
    }
    $subcategoryId = $subcategory.id
    Write-Host "[OK] Subcategory: $subcategoryName (ID: $subcategoryId)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Error: $_" -ForegroundColor Red
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
    Write-Host "[OK] Found part: $partNo (ID: $partId)" -ForegroundColor Green
    Write-Host "  Current Category: $($parts.data[0].category_name)" -ForegroundColor Gray
    Write-Host "  Current Subcategory: $($parts.data[0].subcategory_name)" -ForegroundColor Gray
    Write-Host "  Current Application: $($parts.data[0].application_name)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Error: $_" -ForegroundColor Red
    exit 1
}

# Test 5: Update part with category, subcategory (name), and application (name) - testing auto-creation
Write-Host ""
Write-Host "Test 5: Updating part with category, subcategory (name), and application (name)..." -ForegroundColor Yellow
$testSubcategoryName = "AutoSubcat_$(Get-Date -Format 'HHmmss')"
$testApplicationName = "AutoApp_$(Get-Date -Format 'HHmmss')"
try {
    $updateBody = @{
        part_no = $partNo
        category_id = $categoryId
        subcategory_id = $testSubcategoryName
        application_id = $testApplicationName
        status = "active"
    } | ConvertTo-Json
    
    Write-Host "  Sending:" -ForegroundColor Gray
    Write-Host "    category_id: $categoryId ($categoryName)" -ForegroundColor Gray
    Write-Host "    subcategory_id: $testSubcategoryName (name - will auto-create)" -ForegroundColor Gray
    Write-Host "    application_id: $testApplicationName (name - will auto-create)" -ForegroundColor Gray
    
    $updateResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/parts/$partId" -Method PUT -Body $updateBody -Headers @{ "Content-Type" = "application/json" }
    
    Write-Host "[OK] Part updated successfully" -ForegroundColor Green
    Write-Host "  Response category_name: '$($updateResponse.category_name)'" -ForegroundColor $(if ($updateResponse.category_name) { "Green" } else { "Red" })
    Write-Host "  Response subcategory_name: '$($updateResponse.subcategory_name)'" -ForegroundColor $(if ($updateResponse.subcategory_name) { "Green" } else { "Red" })
    Write-Host "  Response application_name: '$($updateResponse.application_name)'" -ForegroundColor $(if ($updateResponse.application_name) { "Green" } else { "Red" })
    
    if (-not $updateResponse.application_name) {
        Write-Host "[ERROR] Application is NULL in update response!" -ForegroundColor Red
        Write-Host "  Auto-creation may have failed." -ForegroundColor Red
        exit 1
    }
    
    if ($updateResponse.application_name -ne $testApplicationName) {
        Write-Host "[WARNING] Application name mismatch!" -ForegroundColor Yellow
        Write-Host "  Expected: $testApplicationName" -ForegroundColor Yellow
        Write-Host "  Got: $($updateResponse.application_name)" -ForegroundColor Yellow
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
Write-Host "Test 6: Verifying in GET all parts (Items List API)..." -ForegroundColor Yellow
try {
    $allParts = Invoke-RestMethod -Uri "http://localhost:3001/api/parts?limit=1000" -Method GET
    $updatedPart = $allParts.data | Where-Object { $_.id -eq $partId }
    
    if ($updatedPart) {
        Write-Host "[OK] Part found in GET response" -ForegroundColor Green
        Write-Host "  Part No: $($updatedPart.part_no)" -ForegroundColor Gray
        Write-Host "  Category: '$($updatedPart.category_name)'" -ForegroundColor $(if ($updatedPart.category_name) { "Green" } else { "Red" })
        Write-Host "  Subcategory: '$($updatedPart.subcategory_name)'" -ForegroundColor $(if ($updatedPart.subcategory_name) { "Green" } else { "Red" })
        Write-Host "  Application: '$($updatedPart.application_name)'" -ForegroundColor $(if ($updatedPart.application_name) { "Green" } else { "Red" })
        
        if ($updatedPart.application_name) {
            Write-Host ""
            Write-Host "=== TEST PASSED ===" -ForegroundColor Green
            Write-Host "Application is correctly saved and returned by API!" -ForegroundColor Green
            Write-Host ""
            Write-Host "The frontend should now display the application in the Items List." -ForegroundColor Yellow
            Write-Host "If it's still not showing, check:" -ForegroundColor Yellow
            Write-Host "  1. Frontend is refreshing after updates" -ForegroundColor Yellow
            Write-Host "  2. Items list is using the correct data mapping" -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Host "[ERROR] Application is NULL in GET response!" -ForegroundColor Red
            Write-Host "  The application was not saved to the database." -ForegroundColor Red
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

