# Test Part Deletion Fix
$ErrorActionPreference = "Continue"
$API_BASE = "http://localhost:3001/api"

function Invoke-ApiRequest {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [object]$Body = $null
    )
    
    try {
        Add-Type -AssemblyName System.Web
        $uriBuilder = New-Object System.UriBuilder("$API_BASE$Endpoint")
        $uri = $uriBuilder.ToString()
        
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response; StatusCode = 200 }
    }
    catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        $errorMessage = $_.Exception.Message
        try {
            if ($_.ErrorDetails.Message) {
                $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
                if ($errorBody.error) {
                    $errorMessage = $errorBody.error
                }
            }
        } catch { }
        return @{ Success = $false; Error = $errorMessage; StatusCode = $statusCode; ErrorDetails = $errorBody }
    }
}

Write-Host "Testing Part Deletion Fix..." -ForegroundColor Cyan

# 1. Create a test part
Write-Host "`n1. Creating test part..." -ForegroundColor Yellow
$partData = @{
    part_no = "TEST-DELETE-$(Get-Date -Format 'HHmmss')"
    description = "Test part for deletion"
    cost = 100
    price_a = 150
    status = "active"
}

$result = Invoke-ApiRequest -Endpoint "/parts" -Method "POST" -Body $partData
if ($result.Success) {
    $partId = if ($result.Data.data.id) { $result.Data.data.id } elseif ($result.Data.id) { $result.Data.id } else { $null }
    Write-Host "✅ Part created: $partId" -ForegroundColor Green
    
    # 2. Try to delete the part
    Write-Host "`n2. Attempting to delete part..." -ForegroundColor Yellow
    $deleteResult = Invoke-ApiRequest -Endpoint "/parts/$partId" -Method "DELETE"
    
    if ($deleteResult.Success) {
        Write-Host "✅ Part deleted successfully!" -ForegroundColor Green
        Write-Host "   Response: $($deleteResult.Data.message)" -ForegroundColor Gray
        if ($deleteResult.Data.deletedRelatedRecords) {
            Write-Host "   Deleted related records: $($deleteResult.Data.deletedRelatedRecords | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Delete failed: $($deleteResult.Error)" -ForegroundColor Red
        if ($deleteResult.ErrorDetails) {
            Write-Host "   Details: $($deleteResult.ErrorDetails.details)" -ForegroundColor Yellow
        }
    }
    
    # 3. Test deletion when part is in a kit
    Write-Host "`n3. Testing deletion when part is in a kit..." -ForegroundColor Yellow
    
    # Create another part
    $partData2 = @{
        part_no = "TEST-KIT-PART-$(Get-Date -Format 'HHmmss')"
        description = "Test part for kit"
        cost = 50
        price_a = 75
        status = "active"
    }
    $result2 = Invoke-ApiRequest -Endpoint "/parts" -Method "POST" -Body $partData2
    if ($result2.Success) {
        $partId2 = if ($result2.Data.data.id) { $result2.Data.data.id } elseif ($result2.Data.id) { $result2.Data.id } else { $null }
        Write-Host "✅ Part 2 created: $partId2" -ForegroundColor Green
        
        # Create a kit with this part
        $kitData = @{
            badge = "KIT-TEST-$(Get-Date -Format 'HHmmss')"
            name = "Test Kit"
            sellingPrice = 200
            status = "Active"
            items = @(
                @{
                    partId = $partId2
                    partNo = $partData2.part_no
                    partName = $partData2.description
                    quantity = 2
                    costPerUnit = $partData2.cost
                }
            )
        }
        $kitResult = Invoke-ApiRequest -Endpoint "/kits" -Method "POST" -Body $kitData
        if ($kitResult.Success) {
            Write-Host "✅ Kit created with part" -ForegroundColor Green
            
            # Try to delete the part (should fail)
            $deleteResult2 = Invoke-ApiRequest -Endpoint "/parts/$partId2" -Method "DELETE"
            if (-not $deleteResult2.Success) {
                Write-Host "✅ Correctly prevented deletion (part is in kit)" -ForegroundColor Green
                Write-Host "   Error: $($deleteResult2.Error)" -ForegroundColor Gray
                if ($deleteResult2.ErrorDetails.details) {
                    Write-Host "   Details: $($deleteResult2.ErrorDetails.details)" -ForegroundColor Gray
                }
            } else {
                Write-Host "❌ ERROR: Part was deleted even though it's in a kit!" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "❌ Failed to create test part: $($result.Error)" -ForegroundColor Red
}

Write-Host "`nTest completed!" -ForegroundColor Cyan

