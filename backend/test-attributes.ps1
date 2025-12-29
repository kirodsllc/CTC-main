# Comprehensive Test Script for Attributes API
# Run this after restarting the backend server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Attributes API Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"
$passed = 0
$failed = 0
$testCategoryId = $null
$testSubcategoryId = $null
$testBrandId = $null

# Test 1: Health Check
Write-Host "[Test 1] Backend Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -ErrorAction Stop
    Write-Host "  ✅ PASSED: $($health.message)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
    $failed++
    Write-Host "  Make sure backend is running: cd backend && npm run dev" -ForegroundColor Yellow
    exit
}

# Test 2: Get All Categories
Write-Host "`n[Test 2] GET /api/dropdowns/categories/all..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/categories/all" -Method GET -ErrorAction Stop
    Write-Host "  ✅ PASSED: Found $($result.Count) categories" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
    $failed++
}

# Test 3: Create Category
Write-Host "`n[Test 3] POST /api/dropdowns/categories..." -ForegroundColor Yellow
try {
    $body = @{
        name = "Test Category $(Get-Date -Format 'HHmmss')"
        status = "Active"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/categories" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    $testCategoryId = $result.id
    Write-Host "  ✅ PASSED: Created category '$($result.name)' (ID: $testCategoryId)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
    $failed++
}

# Test 4: Update Category
if ($testCategoryId) {
    Write-Host "`n[Test 4] PUT /api/dropdowns/categories/$testCategoryId..." -ForegroundColor Yellow
    try {
        $body = @{
            name = "Updated Test Category"
            status = "Inactive"
        } | ConvertTo-Json
        
        $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/categories/$testCategoryId" -Method PUT -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "  ✅ PASSED: Updated category to '$($result.name)'" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
        $failed++
    }
}

# Test 5: Get All Brands
Write-Host "`n[Test 5] GET /api/dropdowns/brands/all..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/brands/all" -Method GET -ErrorAction Stop
    Write-Host "  ✅ PASSED: Found $($result.Count) brands" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
    $failed++
}

# Test 6: Create Brand
Write-Host "`n[Test 6] POST /api/dropdowns/brands..." -ForegroundColor Yellow
try {
    $body = @{
        name = "Test Brand $(Get-Date -Format 'HHmmss')"
        status = "Active"
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/brands" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    $testBrandId = $result.id
    Write-Host "  ✅ PASSED: Created brand '$($result.name)' (ID: $testBrandId)" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
    $failed++
}

# Test 7: Update Brand
if ($testBrandId) {
    Write-Host "`n[Test 7] PUT /api/dropdowns/brands/$testBrandId..." -ForegroundColor Yellow
    try {
        $body = @{
            name = "Updated Test Brand"
            status = "Active"
        } | ConvertTo-Json
        
        $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/brands/$testBrandId" -Method PUT -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "  ✅ PASSED: Updated brand to '$($result.name)'" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
        $failed++
    }
}

# Test 8: Get All Subcategories
Write-Host "`n[Test 8] GET /api/dropdowns/subcategories/all..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/subcategories/all" -Method GET -ErrorAction Stop
    Write-Host "  ✅ PASSED: Found $($result.Count) subcategories" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
    $failed++
}

# Test 9: Create Subcategory (if we have a category)
if ($testCategoryId) {
    Write-Host "`n[Test 9] POST /api/dropdowns/subcategories..." -ForegroundColor Yellow
    try {
        # First, set category back to Active
        $body = @{
            name = "Updated Test Category"
            status = "Active"
        } | ConvertTo-Json
        Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/categories/$testCategoryId" -Method PUT -Body $body -ContentType "application/json" | Out-Null
        
        $body = @{
            name = "Test Subcategory $(Get-Date -Format 'HHmmss')"
            category_id = $testCategoryId
            status = "Active"
        } | ConvertTo-Json
        
        $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/subcategories" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        $testSubcategoryId = $result.id
        Write-Host "  ✅ PASSED: Created subcategory '$($result.name)' (ID: $testSubcategoryId)" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
        $failed++
    }
}

# Test 10: Update Subcategory
if ($testSubcategoryId) {
    Write-Host "`n[Test 10] PUT /api/dropdowns/subcategories/$testSubcategoryId..." -ForegroundColor Yellow
    try {
        $body = @{
            name = "Updated Test Subcategory"
            category_id = $testCategoryId
            status = "Active"
        } | ConvertTo-Json
        
        $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/subcategories/$testSubcategoryId" -Method PUT -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "  ✅ PASSED: Updated subcategory to '$($result.name)'" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
        $failed++
    }
}

# Test 11: Delete Subcategory
if ($testSubcategoryId) {
    Write-Host "`n[Test 11] DELETE /api/dropdowns/subcategories/$testSubcategoryId..." -ForegroundColor Yellow
    try {
        $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/subcategories/$testSubcategoryId" -Method DELETE -ErrorAction Stop
        Write-Host "  ✅ PASSED: Deleted subcategory" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
        $failed++
    }
}

# Test 12: Delete Brand
if ($testBrandId) {
    Write-Host "`n[Test 12] DELETE /api/dropdowns/brands/$testBrandId..." -ForegroundColor Yellow
    try {
        $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/brands/$testBrandId" -Method DELETE -ErrorAction Stop
        Write-Host "  ✅ PASSED: Deleted brand" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
        $failed++
    }
}

# Test 13: Delete Category
if ($testCategoryId) {
    Write-Host "`n[Test 13] DELETE /api/dropdowns/categories/$testCategoryId..." -ForegroundColor Yellow
    try {
        $result = Invoke-RestMethod -Uri "$baseUrl/api/dropdowns/categories/$testCategoryId" -Method DELETE -ErrorAction Stop
        Write-Host "  ✅ PASSED: Deleted category" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
        $failed++
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! Attributes API is fully functional." -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure your frontend dev server is running" -ForegroundColor White
    Write-Host "2. Open the Attributes page in the browser" -ForegroundColor White
    Write-Host "3. Test all CRUD operations - they should work now!" -ForegroundColor White
} else {
    Write-Host "⚠️  Some tests failed. Please:" -ForegroundColor Yellow
    Write-Host "1. Restart the backend server: cd backend && npm run dev" -ForegroundColor White
    Write-Host "2. Run this test script again" -ForegroundColor White
    Write-Host "3. Check backend logs for any errors" -ForegroundColor White
}

Write-Host ""

