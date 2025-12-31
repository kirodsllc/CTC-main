# Quick verification script for Attributes routes
# Run this AFTER restarting the backend server

Write-Host "Verifying Attributes Routes..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"
$endpoints = @(
    @{Method="GET"; Path="/api/dropdowns/categories/all"; Name="Get All Categories"},
    @{Method="GET"; Path="/api/dropdowns/subcategories/all"; Name="Get All Subcategories"},
    @{Method="GET"; Path="/api/dropdowns/brands/all"; Name="Get All Brands"},
    @{Method="POST"; Path="/api/dropdowns/categories"; Name="Create Category"; Body='{"name":"Test","status":"Active"}'},
    @{Method="POST"; Path="/api/dropdowns/brands"; Name="Create Brand"; Body='{"name":"Test","status":"Active"}'}
)

$allPassed = $true

foreach ($endpoint in $endpoints) {
    try {
        if ($endpoint.Method -eq "GET") {
            $result = Invoke-RestMethod -Uri "$baseUrl$($endpoint.Path)" -Method GET -ErrorAction Stop
            Write-Host "✅ $($endpoint.Name)" -ForegroundColor Green
        } else {
            $result = Invoke-RestMethod -Uri "$baseUrl$($endpoint.Path)" -Method POST -Body $endpoint.Body -ContentType "application/json" -ErrorAction Stop
            Write-Host "✅ $($endpoint.Name)" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ $($endpoint.Name): $($_.Exception.Message)" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host ""
if ($allPassed) {
    Write-Host "🎉 All routes are working! Attributes page should be functional now." -ForegroundColor Green
} else {
    Write-Host "⚠️  Some routes failed. Make sure backend server is restarted." -ForegroundColor Yellow
}

