Write-Host "=== Testing Application Display in Items List ===" -ForegroundColor Cyan
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

# Test 2: Get existing applications
Write-Host ""
Write-Host "Test 2: Finding existing applications..." -ForegroundColor Yellow
try {
    $allApps = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/applications" -Method GET
    if ($allApps.Count -gt 0) {
        $app = $allApps[0]
        $applicationId = $app.id
        $applicationName = $app.name
        $subcategoryId = $app.subcategoryId
        Write-Host "[OK] Found application: $applicationName (ID: $applicationId)" -ForegroundColor Green
        Write-Host "  Belongs to subcategory ID: $subcategoryId" -ForegroundColor Gray
        
        # Get subcategory details
        $subs = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/subcategories" -Method GET
        $subcategory = $subs | Where-Object { $_.id -eq $subcategoryId }
        if ($subcategory) {
            $categoryId = $subcategory.categoryId
            Write-Host "  Subcategory: $($subcategory.name)" -ForegroundColor Gray
            Write-Host "  Category ID: $categoryId" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARN] No applications found in database" -ForegroundColor Yellow
        Write-Host "[INFO] Please create an application in Attributes page first" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Testing with a part that should have application..." -ForegroundColor Yellow
        
        # Get a part and check if it has application
        $parts = Invoke-RestMethod -Uri "http://localhost:3001/api/parts?limit=10" -Method GET
        $partWithApp = $parts.data | Where-Object { $_.application_name -and $_.application_name -ne "" }
        
        if ($partWithApp) {
            Write-Host "[OK] Found part with application: $($partWithApp.part_no)" -ForegroundColor Green
            Write-Host "  Application: $($partWithApp.application_name)" -ForegroundColor Green
            Write-Host ""
            Write-Host "=== DIAGNOSIS ===" -ForegroundColor Cyan
            Write-Host "The API IS returning applications correctly!" -ForegroundColor Green
            Write-Host "The issue is likely in the frontend display or refresh logic." -ForegroundColor Yellow
            exit 0
        } else {
            Write-Host "[INFO] No parts with applications found" -ForegroundColor Yellow
            Write-Host "[INFO] You need to:" -ForegroundColor Cyan
            Write-Host "  1. Create an application in Attributes page" -ForegroundColor Gray
            Write-Host "  2. Then assign it to a part in Part Entry" -ForegroundColor Gray
            exit 0
        }
    }
} catch {
    Write-Host "[ERROR] Error: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Update a part with the application
Write-Host ""
Write-Host "Test 3: Updating a part with application..." -ForegroundColor Yellow
try {
    $parts = Invoke-RestMethod -Uri "http://localhost:3001/api/parts?limit=1" -Method GET
    if ($parts.data.Count -eq 0) {
        Write-Host "[ERROR] No parts found" -ForegroundColor Red
        exit 1
    }
    
    $partId = $parts.data[0].id
    $partNo = $parts.data[0].part_no
    
    Write-Host "  Part: $partNo" -ForegroundColor Gray
    Write-Host "  Application ID: $applicationId" -ForegroundColor Gray
    Write-Host "  Application Name: $applicationName" -ForegroundColor Gray
    
    $updateBody = @{
        part_no = $partNo
        category_id = $categoryId
        subcategory_id = $subcategoryId
        application_id = $applicationId
        status = "active"
    } | ConvertTo-Json
    
    $updateResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/parts/$partId" -Method PUT -Body $updateBody -Headers @{ "Content-Type" = "application/json" }
    
    Write-Host "[OK] Part updated" -ForegroundColor Green
    Write-Host "  Response application_name: '$($updateResponse.application_name)'" -ForegroundColor $(if ($updateResponse.application_name) { "Green" } else { "Red" })
    
    if (-not $updateResponse.application_name) {
        Write-Host "[ERROR] Application not in update response!" -ForegroundColor Red
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

# Test 4: Verify in GET all parts (Items List API)
Write-Host ""
Write-Host "Test 4: Verifying in Items List API (GET /api/parts)..." -ForegroundColor Yellow
try {
    $allParts = Invoke-RestMethod -Uri "http://localhost:3001/api/parts?limit=1000" -Method GET
    $updatedPart = $allParts.data | Where-Object { $_.id -eq $partId }
    
    if ($updatedPart) {
        Write-Host "  Part No: $($updatedPart.part_no)" -ForegroundColor Gray
        Write-Host "  Category: $($updatedPart.category_name)" -ForegroundColor Gray
        Write-Host "  Subcategory: $($updatedPart.subcategory_name)" -ForegroundColor Gray
        Write-Host "  Application: '$($updatedPart.application_name)'" -ForegroundColor $(if ($updatedPart.application_name) { "Green" } else { "Red" })
        
        if ($updatedPart.application_name) {
            Write-Host ""
            Write-Host "[OK] Application IS in the API response!" -ForegroundColor Green
            Write-Host ""
            Write-Host "=== DIAGNOSIS ===" -ForegroundColor Cyan
            Write-Host "The backend is working correctly." -ForegroundColor Green
            Write-Host "The API returns application_name correctly." -ForegroundColor Green
            Write-Host ""
            Write-Host "If it's not showing in the UI, the issue is:" -ForegroundColor Yellow
            Write-Host "  1. Frontend not refreshing after update" -ForegroundColor Gray
            Write-Host "  2. Data mapping issue in frontend" -ForegroundColor Gray
            Write-Host "  3. Browser cache - try hard refresh (Ctrl+F5)" -ForegroundColor Gray
            exit 0
        } else {
            Write-Host ""
            Write-Host "[ERROR] Application NOT in GET response!" -ForegroundColor Red
            Write-Host "This indicates a backend issue with the update." -ForegroundColor Red
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
