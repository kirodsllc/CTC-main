Write-Host "=== Simple Application Test ===" -ForegroundColor Cyan
Write-Host ""

# Get a part
$parts = Invoke-RestMethod -Uri "http://localhost:3001/api/parts?limit=1" -Method GET
$partId = $parts.data[0].id
$partNo = $parts.data[0].part_no

Write-Host "Part: $partNo (ID: $partId)" -ForegroundColor Yellow
Write-Host "Current Category: $($parts.data[0].category_name)" -ForegroundColor Gray
Write-Host "Current Subcategory: $($parts.data[0].subcategory_name)" -ForegroundColor Gray
Write-Host "Current Application: $($parts.data[0].application_name)" -ForegroundColor Gray
Write-Host ""

# Get categories
$cats = Invoke-RestMethod -Uri "http://localhost:3001/api/dropdowns/categories" -Method GET
$category = $cats[0]
$categoryId = $category.id
$categoryName = $category.name

Write-Host "Using Category: $categoryName (ID: $categoryId)" -ForegroundColor Yellow
Write-Host ""

# Test: Update with category (ID), subcategory (name), application (name)
$subcategoryName = "TestSub_$(Get-Date -Format 'HHmmss')"
$applicationName = "TestApp_$(Get-Date -Format 'HHmmss')"

Write-Host "Updating with:" -ForegroundColor Yellow
Write-Host "  category_id: $categoryId" -ForegroundColor Gray
Write-Host "  subcategory_id: $subcategoryName (name)" -ForegroundColor Gray
Write-Host "  application_id: $applicationName (name)" -ForegroundColor Gray
Write-Host ""

$updateBody = @{
    part_no = $partNo
    category_id = $categoryId
    subcategory_id = $subcategoryName
    application_id = $applicationName
    status = "active"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/parts/$partId" -Method PUT -Body $updateBody -Headers @{ "Content-Type" = "application/json" }
    
    Write-Host "Response:" -ForegroundColor Green
    Write-Host "  category_name: '$($response.category_name)'" -ForegroundColor $(if ($response.category_name) { "Green" } else { "Red" })
    Write-Host "  subcategory_name: '$($response.subcategory_name)'" -ForegroundColor $(if ($response.subcategory_name) { "Green" } else { "Red" })
    Write-Host "  application_name: '$($response.application_name)'" -ForegroundColor $(if ($response.application_name) { "Green" } else { "Red" })
    
    if ($response.subcategory_name -and $response.application_name) {
        Write-Host ""
        Write-Host "SUCCESS! Both subcategory and application were auto-created!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "FAILED! Check backend logs for errors." -ForegroundColor Red
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

