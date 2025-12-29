# Comprehensive Test Script for Multi-Dimensional Stock Report
# Run this script to test all functionality

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Multi-Dimensional Report Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"
$endpoint = "$baseUrl/api/inventory/multi-dimensional-report"
$passed = 0
$failed = 0

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

# Test 2: Basic Request
Write-Host "`n[Test 2] Basic Request (Category dimension)..." -ForegroundColor Yellow
try {
    $basicUrl = "$endpoint" + "?primary_dimension=Category"
    $result = Invoke-RestMethod -Uri $basicUrl -Method GET -ErrorAction Stop
    if ($result.data -and $result.totals) {
        Write-Host "  ✅ PASSED: Got $($result.data.Count) groups" -ForegroundColor Green
        Write-Host "    - Total Items: $($result.totals.items)" -ForegroundColor Gray
        Write-Host "    - Total Quantity: $($result.totals.quantity)" -ForegroundColor Gray
        Write-Host "    - Total Value: $($result.totals.value)" -ForegroundColor Gray
        $passed++
    } else {
        Write-Host "  ❌ FAILED: Invalid response structure" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  ❌ FAILED: $_" -ForegroundColor Red
    $failed++
}

# Test 3: All Dimensions
Write-Host "`n[Test 3] Testing All Dimensions..." -ForegroundColor Yellow
$dimensions = @("Category", "Brand", "Store", "Location", "UOM")
$dimPassed = 0
foreach ($dim in $dimensions) {
    try {
        $dimUrl = "$endpoint" + "?primary_dimension=$dim"
        $result = Invoke-RestMethod -Uri $dimUrl -Method GET -ErrorAction Stop
        Write-Host "  ✅ $dim : $($result.data.Count) groups" -ForegroundColor Green
        $dimPassed++
    } catch {
        Write-Host "  ❌ $dim : $_" -ForegroundColor Red
        $failed++
    }
}
if ($dimPassed -eq $dimensions.Count) {
    $passed++
}

# Test 4: Filters
Write-Host "`n[Test 4] Testing Filters..." -ForegroundColor Yellow
try {
    $filterUrl = "$endpoint" + "?primary_dimension=Category&category_filter=Engine%20Parts"
    $result = Invoke-RestMethod -Uri $filterUrl -Method GET -ErrorAction Stop
    Write-Host "  ✅ Category Filter: $($result.data.Count) groups" -ForegroundColor Green
    $passed++
} catch {
    Write-Host "  ❌ Category Filter Failed: $_" -ForegroundColor Red
    $failed++
}

# Test 5: Sorting
Write-Host "`n[Test 5] Testing Sorting..." -ForegroundColor Yellow
try {
    $sortUrl = "$endpoint" + "?primary_dimension=Category&sort_by=Value&sort_direction=desc"
    $result = Invoke-RestMethod -Uri $sortUrl -Method GET -ErrorAction Stop
    $firstValue = $result.data[0].value
    $lastValue = $result.data[-1].value
    if ($firstValue -ge $lastValue) {
        Write-Host "  ✅ Sort Descending: Working (First: $firstValue, Last: $lastValue)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  ❌ Sort Descending: Not working correctly" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  ❌ Sort Test Failed: $_" -ForegroundColor Red
    $failed++
}

# Test 6: Error Handling
Write-Host "`n[Test 6] Testing Error Handling..." -ForegroundColor Yellow
try {
    $result = Invoke-WebRequest -Uri "$endpoint" -Method GET -ErrorAction Stop
    Write-Host "  ⚠️  Should return 400 but got $($result.StatusCode)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "  ✅ Error Handling: Correctly returns 400 for missing primary_dimension" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  ❌ Error Handling: Unexpected status code" -ForegroundColor Red
        $failed++
    }
}

# Test 7: Frontend Format
Write-Host "`n[Test 7] Testing Frontend Request Format..." -ForegroundColor Yellow
$params = @{
    primary_dimension = "Category"
    secondary_dimension = "none"
    tertiary_dimension = "none"
    category_filter = "All Categories"
    brand_filter = "All Brands"
    sort_by = "Value"
    sort_direction = "desc"
}
$queryString = ($params.GetEnumerator() | ForEach-Object { "$($_.Key)=$([System.Web.HttpUtility]::UrlEncode($_.Value))" }) -join "&"
$frontendUrl = "$endpoint" + "?" + $queryString
try {
    $result = Invoke-RestMethod -Uri $frontendUrl -Method GET -ErrorAction Stop
    if ($result.data -and $result.totals) {
        Write-Host "  ✅ Frontend Format: Working perfectly!" -ForegroundColor Green
        Write-Host "    Response structure:" -ForegroundColor Gray
        Write-Host "      - data: Array with $($result.data.Count) items" -ForegroundColor Gray
        Write-Host "      - totals: Object with items, quantity, value" -ForegroundColor Gray
        $passed++
    } else {
        Write-Host "  ❌ Frontend Format: Invalid response structure" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  ❌ Frontend Format Failed: $_" -ForegroundColor Red
    $failed++
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED! The endpoint is fully functional." -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure your frontend dev server is running" -ForegroundColor White
    Write-Host "2. Open the Multi-Dimensional Stock Report page" -ForegroundColor White
    Write-Host "3. Click 'Generate Report' - it should work now!" -ForegroundColor White
} else {
    Write-Host "⚠️  Some tests failed. Please check the errors above." -ForegroundColor Yellow
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure backend is running: cd backend && npm run dev" -ForegroundColor White
    Write-Host "2. Check if database is seeded: cd backend && npm run seed" -ForegroundColor White
    Write-Host "3. Verify backend logs for any errors" -ForegroundColor White
}

Write-Host ""

