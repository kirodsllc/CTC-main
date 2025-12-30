Write-Host "=== Testing Raw API Response ===" -ForegroundColor Cyan
Write-Host ""

$partId = "0d7cd426-50a0-4460-9977-a720e142347b"
$categoryName = "TestCategory_$(Get-Date -Format 'yyyyMMddHHmmss')"
$subcategoryName = "TestSubcategory_$(Get-Date -Format 'yyyyMMddHHmmss')"
$applicationName = "TestApplication_$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "Updating part with:" -ForegroundColor Yellow
Write-Host "  Category: $categoryName" -ForegroundColor Gray
Write-Host "  Subcategory: $subcategoryName" -ForegroundColor Gray
Write-Host "  Application: $applicationName" -ForegroundColor Gray
Write-Host ""

$updateBody = @{
    part_no = "ENG-010"
    category_id = $categoryName
    subcategory_id = $subcategoryName
    application_id = $applicationName
    status = "active"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/parts/$partId" -Method PUT -Body $updateBody -Headers @{ "Content-Type" = "application/json" }
    
    Write-Host "=== RAW RESPONSE ===" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    
    Write-Host "=== KEY FIELDS ===" -ForegroundColor Cyan
    Write-Host "category_name: '$($response.category_name)'" -ForegroundColor $(if ($response.category_name) { "Green" } else { "Red" })
    Write-Host "subcategory_name: '$($response.subcategory_name)'" -ForegroundColor $(if ($response.subcategory_name) { "Green" } else { "Red" })
    Write-Host "application_name: '$($response.application_name)'" -ForegroundColor $(if ($response.application_name) { "Green" } else { "Red" })
    Write-Host ""
    
    # Check if relations are in the response
    if ($response.category) {
        Write-Host "category object exists: $($response.category | ConvertTo-Json)" -ForegroundColor Yellow
    }
    if ($response.subcategory) {
        Write-Host "subcategory object exists: $($response.subcategory | ConvertTo-Json)" -ForegroundColor Yellow
    }
    if ($response.application) {
        Write-Host "application object exists: $($response.application | ConvertTo-Json)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "[ERROR] Request failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

